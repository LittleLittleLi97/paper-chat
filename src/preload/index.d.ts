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
      }
      file: {
        selectPDF: () => Promise<string[] | null>
      }
      paper: {
        savePaper: (paper: Omit<Paper, 'id'>) => Promise<number>
        getAllPapers: () => Promise<Paper[]>
        getPaperById: (id: number) => Promise<Paper | null>
        deletePaper: (id: number) => Promise<void>
        readPDF: (path: string) => Promise<number[]>
      }
      rag: {
        addPaper: (paperId: number, pdfPath: string) => Promise<void>
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
}

export {}
