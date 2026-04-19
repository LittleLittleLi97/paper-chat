import fs from 'fs'
import type { PdfLineBlock, PdfTextItem } from './types/pdfStructure'

type PdfJsTextItem = {
  str?: string
  transform?: number[]
  width?: number
  height?: number
  fontName?: string
  hasEOL?: boolean
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isPdfTextItem(item: unknown): item is PdfJsTextItem {
  return Boolean(item && typeof item === 'object' && 'str' in item)
}

function deriveFontSize(item: PdfJsTextItem): number {
  const transform = Array.isArray(item.transform) ? item.transform : []
  const xScale = Math.abs(Number(transform[0] ?? 0))
  const yScale = Math.abs(Number(transform[3] ?? 0))
  const height = Math.abs(Number(item.height ?? 0))
  return Math.max(height, xScale, yScale, 1)
}

function toPdfTextItem(item: PdfJsTextItem, pageNumber: number, pageWidth: number, pageHeight: number): PdfTextItem | null {
  const text = normalizeWhitespace(String(item.str ?? ''))
  if (!text) return null

  const transform = Array.isArray(item.transform) ? item.transform : []
  const x = Number(transform[4] ?? 0)
  const y = Number(transform[5] ?? 0)
  const width = Math.abs(Number(item.width ?? 0))
  const height = Math.abs(Number(item.height ?? 0))

  return {
    text,
    pageNumber,
    pageWidth,
    pageHeight,
    x,
    y,
    width,
    height,
    fontName: String(item.fontName ?? ''),
    fontSize: deriveFontSize(item),
    hasEOL: Boolean(item.hasEOL)
  }
}

function buildLineText(items: PdfTextItem[]): string {
  const ordered = [...items].sort((a, b) => a.x - b.x)
  let text = ''

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i]
    if (!current) continue

    if (i === 0) {
      text = current.text
      continue
    }

    const previous = ordered[i - 1]
    const previousRight = previous.x + previous.width
    const gap = current.x - previousRight
    const joinWithoutSpace =
      previous.text.endsWith('-') || previous.text.endsWith('/') || current.text.startsWith(',') || current.text.startsWith('.')

    if (!joinWithoutSpace && gap > Math.max(previous.fontSize * 0.15, 1.5)) {
      text += ' '
    }

    text += current.text
  }

  return normalizeWhitespace(text)
}

function groupItemsIntoLines(items: PdfTextItem[]): PdfLineBlock[] {
  if (items.length === 0) return []

  const ordered = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.1) {
      return b.y - a.y
    }
    return a.x - b.x
  })

  const lines: PdfTextItem[][] = []

  for (const item of ordered) {
    const lastLine = lines[lines.length - 1]
    if (!lastLine || lastLine.length === 0) {
      lines.push([item])
      continue
    }

    const anchor = lastLine[0]
    const tolerance = Math.max(Math.min(anchor.fontSize, item.fontSize) * 0.45, 2)
    if (Math.abs(anchor.y - item.y) <= tolerance) {
      lastLine.push(item)
      continue
    }

    lines.push([item])
  }

  return lines.reduce<PdfLineBlock[]>((accumulator, lineItems) => {
      const orderedItems = [...lineItems].sort((a, b) => a.x - b.x)
      const fontNames = Array.from(new Set(orderedItems.map((item) => item.fontName).filter(Boolean)))
      const fontSizes = orderedItems.map((item) => item.fontSize).filter((size) => Number.isFinite(size) && size > 0)
      const xMin = Math.min(...orderedItems.map((item) => item.x))
      const xMax = Math.max(...orderedItems.map((item) => item.x + item.width))
      const yValues = orderedItems.map((item) => item.y)
      const text = buildLineText(orderedItems)

      if (!text) return accumulator

      accumulator.push({
        text,
        pageNumber: orderedItems[0].pageNumber,
        pageWidth: orderedItems[0].pageWidth,
        pageHeight: orderedItems[0].pageHeight,
        xMin,
        xMax,
        y: yValues.reduce((sum, value) => sum + value, 0) / yValues.length,
        fontSizeAvg: fontSizes.reduce((sum, value) => sum + value, 0) / fontSizes.length,
        fontSizeMax: Math.max(...fontSizes),
        fontNames,
        isLikelyHeaderFooter: false
      })

      return accumulator
    }, [])
}

function markHeaderFooterLines(lines: PdfLineBlock[]): PdfLineBlock[] {
  const repeatedEdgeTexts = new Map<string, number>()

  for (const line of lines) {
    const normalizedKey = line.text.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!normalizedKey || normalizedKey.length > 120) continue

    const isNearTop = line.y >= line.pageHeight * 0.9
    const isNearBottom = line.y <= line.pageHeight * 0.1
    if (!isNearTop && !isNearBottom) continue

    repeatedEdgeTexts.set(normalizedKey, (repeatedEdgeTexts.get(normalizedKey) ?? 0) + 1)
  }

  return lines.map((line) => {
    const normalizedKey = line.text.replace(/\s+/g, ' ').trim().toLowerCase()
    const isPageNumber = /^-?\d{1,4}-?$/.test(normalizedKey)
    const repeatedOnEdges = (repeatedEdgeTexts.get(normalizedKey) ?? 0) >= 2
    const isLikelyHeaderFooter = isPageNumber || repeatedOnEdges

    return {
      ...line,
      isLikelyHeaderFooter
    }
  })
}

export async function extractPdfLines(pdfPath: string): Promise<PdfLineBlock[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buffer = new Uint8Array(fs.readFileSync(pdfPath))
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const lines: PdfLineBlock[] = []

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const textContent = await page.getTextContent()

      const items: PdfTextItem[] = []
      for (const rawItem of textContent.items as unknown[]) {
        if (!isPdfTextItem(rawItem)) continue
        const normalizedItem = toPdfTextItem(rawItem, pageNumber, viewport.width, viewport.height)
        if (normalizedItem) {
          items.push(normalizedItem)
        }
      }

      lines.push(...groupItemsIntoLines(items))
    }
  } finally {
    await loadingTask.destroy()
  }

  return markHeaderFooterLines(lines)
}
