export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  paperId?: number
}

export interface Paper {
  id: number
  title: string
  path: string
}

export interface StudyNote {
  id?: number
  paperId: number
  content: string
  sourceMessage?: string
  timestamp: number
}

export interface TermCard {
  id?: number
  paperId: number
  term: string
  definition: string
  reviewCount?: number
  lastReviewedAt?: number | null
  createdAt: number
}

export interface QuickAction {
  id: string
  label: string
  prompt: string
}

