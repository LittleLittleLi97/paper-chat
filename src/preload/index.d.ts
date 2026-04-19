declare global {
  interface Window {
    electron: Electron.CrossProcessExports
    api: {
      chat: {
        saveMessage: (message: Omit<ChatMessage, 'id'>) => Promise<number>
        getAllMessages: (paperId?: number) => Promise<ChatMessage[]>
        clearMessages: (paperId?: number) => Promise<void>
        deleteMessage: (id: number) => Promise<void>
      }
      ai: {
        chat: (payload: {
          messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
          context?: {
            paperId?: number
            paperTitle?: string
            currentPage?: number | null
            selectedText?: string
            quickAction?: string
          }
        }) => Promise<string>
        comparePapers: (payload: {
          papers: Array<{ id: number; title: string }>
          focus?: string
        }) => Promise<string>
        batchSummaries: (payload: { papers: Array<{ id: number; title: string }> }) => Promise<string>
        extractTermCards: (payload: {
          paper: { id: number; title: string }
          messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
        }) => Promise<Array<{ term: string; definition: string }>>
      }
      file: {
        selectPDF: () => Promise<string[] | null>
      }
      paper: {
        savePaper: (paper: Omit<Paper, 'id' | 'indexStatus'> & { indexStatus?: Paper['indexStatus'] }) => Promise<number>
        getAllPapers: () => Promise<Paper[]>
        getPaperById: (id: number) => Promise<Paper | null>
        deletePaper: (id: number) => Promise<void>
        updateIndexStatus: (id: number, status: 'idle' | 'indexing' | 'ready' | 'failed') => Promise<void>
        readPDF: (path: string) => Promise<number[]>
      }
      rag: {
        addPaper: (paperId: number, pdfPath: string) => Promise<void>
      }
      study: {
        saveNote: (payload: {
          paperId: number
          content: string
          sourceMessage?: string
          timestamp: number
        }) => Promise<number>
        getNotes: (paperId: number) => Promise<
          Array<{
            id?: number
            paperId: number
            content: string
            sourceMessage?: string
            timestamp: number
          }>
        >
        saveTermCards: (
          cards: Array<{ paperId: number; term: string; definition: string; createdAt: number }>
        ) => Promise<void>
        getTermCards: (paperId: number) => Promise<
          Array<{
            id?: number
            paperId: number
            term: string
            definition: string
            reviewCount?: number
            lastReviewedAt?: number | null
            createdAt: number
          }>
        >
        markTermReviewed: (id: number) => Promise<void>
      }
    }
  }
}

interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  paperId?: number
}

interface Paper {
  id: number
  title: string
  path: string
  indexStatus: 'idle' | 'indexing' | 'ready' | 'failed'
}

export {}
