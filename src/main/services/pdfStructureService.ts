import type { PdfLineBlock, SectionCandidate, SectionType, StructuredSection } from './types/pdfStructure'

const EXACT_SECTION_TYPES: Array<[RegExp, SectionType]> = [
  [/^abstract$/i, 'abstract'],
  [/^introduction$/i, 'introduction'],
  [/^related work$/i, 'related_work'],
  [/^(background|preliminar(?:y|ies))$/i, 'related_work'],
  [/^(method|methods|methodology|approach|approaches|model|models)$/i, 'method'],
  [/^(experiment|experiments|experimental setup|evaluation|evaluations)$/i, 'experiment'],
  [/^(results|main results|empirical results|ablation|ablation study|ablation studies)$/i, 'result'],
  [/^(discussion|analysis|error analysis)$/i, 'discussion'],
  [/^(conclusion|conclusions|future work|limitations)$/i, 'conclusion'],
  [/^(references|bibliography)$/i, 'reference']
]

const SECTION_NUMBERING_RE = /^(?:\d+(?:\.\d+){0,3}|[ivxlcdm]+)\s+(.+)$/i

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function normalizeHeadingText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^(\d+(?:\.\d+){0,3}|[ivxlcdm]+)\s+/i, '')
    .trim()
}

function inferSectionType(title: string): SectionType {
  const normalized = normalizeHeadingText(title)
  for (const [pattern, type] of EXACT_SECTION_TYPES) {
    if (pattern.test(normalized)) {
      return type
    }
  }

  if (/\b(dataset|implementation|training|optimization)\b/i.test(normalized)) return 'experiment'
  if (/\b(result|metric|baseline|comparison|ablation)\b/i.test(normalized)) return 'result'
  if (/\b(limit|future work|conclusion)\b/i.test(normalized)) return 'conclusion'
  if (/\b(discussion|analysis)\b/i.test(normalized)) return 'discussion'
  if (/\b(method|approach|framework|architecture)\b/i.test(normalized)) return 'method'
  return 'other'
}

function inferHeadingLevel(title: string): number {
  const numbered = title.match(/^(\d+(?:\.\d+){0,3})\s+/)
  if (numbered?.[1]) {
    return Math.min(numbered[1].split('.').length, 3)
  }

  if (/^[ivxlcdm]+\s+/i.test(title)) {
    return 1
  }

  return 1
}

function isLikelyCentered(line: PdfLineBlock): boolean {
  const leftMargin = line.xMin
  const rightMargin = Math.max(line.pageWidth - line.xMax, 0)
  return Math.abs(leftMargin - rightMargin) <= line.pageWidth * 0.08 && leftMargin >= line.pageWidth * 0.12
}

function looksLikeSentence(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/[.!?;:]$/.test(trimmed)) return true
  return trimmed.split(/\s+/).length > 18
}

function computeHeadingScore(
  line: PdfLineBlock,
  previousLine: PdfLineBlock | undefined,
  nextLine: PdfLineBlock | undefined,
  baselineFontSize: number,
  lineIndex: number
): { score: number; type: SectionType } {
  const title = line.text.trim()
  const inferredType = inferSectionType(title)
  const isKnownHeading = inferredType !== 'other'
  const isNumberedHeading = SECTION_NUMBERING_RE.test(title)
  const wordCount = title.split(/\s+/).filter(Boolean).length

  let score = 0

  if (isKnownHeading) score += 4
  if (isNumberedHeading) score += 3
  if (wordCount <= 12) score += 0.8
  if (title.length <= 90) score += 0.6
  if (line.fontSizeMax >= baselineFontSize * 1.35) score += 1.8
  else if (line.fontSizeMax >= baselineFontSize * 1.18) score += 1.1
  if (isLikelyCentered(line)) score += 0.5

  if (previousLine && previousLine.pageNumber === line.pageNumber) {
    const gapAbove = previousLine.y - line.y
    if (gapAbove > line.fontSizeMax * 1.3) score += 0.5
  }
  if (nextLine && nextLine.pageNumber === line.pageNumber) {
    const gapBelow = line.y - nextLine.y
    if (gapBelow > line.fontSizeMax * 1.1) score += 0.3
  }

  if (/^[A-Z][A-Z0-9\s\-:&/()]+$/.test(title)) score += 0.4
  if (looksLikeSentence(title)) score -= 1.4
  if (/\b(figure|table)\s+\d+/i.test(title)) score -= 2.5
  if (/@|http/i.test(title)) score -= 2

  if (line.pageNumber === 1 && lineIndex <= 5 && line.fontSizeMax >= baselineFontSize * 1.5 && wordCount <= 20) {
    return {
      score: score + 2,
      type: 'title'
    }
  }

  return {
    score,
    type: inferredType
  }
}

function buildCandidates(lines: PdfLineBlock[]): SectionCandidate[] {
  const bodyFontSizes = lines
    .filter((line) => !line.isLikelyHeaderFooter)
    .map((line) => line.fontSizeAvg)
    .filter((size) => Number.isFinite(size) && size > 0)
  const baselineFontSize = median(bodyFontSizes) || 10
  const candidates: SectionCandidate[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.isLikelyHeaderFooter || !line.text.trim()) continue

    const previousLine = i > 0 ? lines[i - 1] : undefined
    const nextLine = i < lines.length - 1 ? lines[i + 1] : undefined
    const { score, type } = computeHeadingScore(line, previousLine, nextLine, baselineFontSize, i)
    const isNumberedHeading = SECTION_NUMBERING_RE.test(line.text)
    const isStrongCandidate = type !== 'other' || score >= 3.8 || (isNumberedHeading && score >= 3.2)

    if (!isStrongCandidate) continue

    candidates.push({
      lineIndex: i,
      pageNumber: line.pageNumber,
      title: line.text.trim(),
      level: inferHeadingLevel(line.text),
      score,
      type
    })
  }

  return candidates.filter((candidate, index, source) => {
    if (index === 0) return true
    const previous = source[index - 1]
    const isVeryClose = candidate.lineIndex - previous.lineIndex <= 1 && candidate.pageNumber === previous.pageNumber
    if (!isVeryClose) return true
    return candidate.score > previous.score
  })
}

function buildSectionFromRange(
  lines: PdfLineBlock[],
  startIndex: number,
  endIndex: number,
  order: number,
  title: string,
  type: SectionType,
  level: number
): StructuredSection | null {
  const scopedLines = lines.slice(startIndex, endIndex + 1).filter((line) => !line.isLikelyHeaderFooter && line.text.trim())
  if (scopedLines.length === 0) return null

  const content = scopedLines.map((line) => line.text.trim()).join('\n').trim()
  if (!content) return null

  return {
    sectionId: `section-${order}-${type}`,
    order,
    title,
    type,
    level,
    content,
    pageStart: scopedLines[0].pageNumber,
    pageEnd: scopedLines[scopedLines.length - 1].pageNumber,
    lineStart: startIndex,
    lineEnd: endIndex
  }
}

export function detectStructuredSections(lines: PdfLineBlock[]): StructuredSection[] {
  const contentLines = lines.filter((line) => line.text.trim())
  if (contentLines.length === 0) return []

  const candidates = buildCandidates(contentLines)
  if (candidates.length === 0) {
    const fallbackSection = buildSectionFromRange(contentLines, 0, contentLines.length - 1, 0, 'Body', 'other', 1)
    return fallbackSection ? [fallbackSection] : []
  }

  const sections: StructuredSection[] = []
  const firstCandidate = candidates[0]

  if (firstCandidate.lineIndex > 0) {
    const frontMatter = buildSectionFromRange(
      contentLines,
      0,
      firstCandidate.lineIndex - 1,
      0,
      'Front Matter',
      'title',
      1
    )
    if (frontMatter) {
      sections.push(frontMatter)
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]
    const nextCandidate = candidates[i + 1]
    const section = buildSectionFromRange(
      contentLines,
      candidate.lineIndex,
      (nextCandidate?.lineIndex ?? contentLines.length) - 1,
      sections.length,
      candidate.title,
      candidate.type,
      candidate.level
    )
    if (section) {
      sections.push(section)
    }
  }

  return sections.length > 0 ? sections : []
}
