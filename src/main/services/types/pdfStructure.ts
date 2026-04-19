export type SectionType =
  | 'title'
  | 'abstract'
  | 'introduction'
  | 'related_work'
  | 'method'
  | 'experiment'
  | 'result'
  | 'discussion'
  | 'conclusion'
  | 'reference'
  | 'other'

export interface PdfTextItem {
  text: string
  pageNumber: number
  pageWidth: number
  pageHeight: number
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  hasEOL: boolean
}

export interface PdfLineBlock {
  text: string
  pageNumber: number
  pageWidth: number
  pageHeight: number
  xMin: number
  xMax: number
  y: number
  fontSizeAvg: number
  fontSizeMax: number
  fontNames: string[]
  isLikelyHeaderFooter: boolean
}

export interface SectionCandidate {
  lineIndex: number
  pageNumber: number
  title: string
  level: number
  score: number
  type: SectionType
}

export interface StructuredSection {
  sectionId: string
  order: number
  title: string
  type: SectionType
  level: number
  content: string
  pageStart: number
  pageEnd: number
  lineStart: number
  lineEnd: number
}

export interface StructuredChunkMetadata extends Record<string, string | number | boolean> {
  paperId: number
  source: string
  chunkIndex: number
  chunkInSection: number
  sectionId: string
  sectionOrder: number
  sectionTitle: string
  sectionType: SectionType
  sectionLevel: number
  pageStart: number
  pageEnd: number
}

export interface StructuredChunk {
  id: string
  text: string
  metadata: StructuredChunkMetadata
}
