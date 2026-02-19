declare global {
  interface Window {
    electron: Electron.CrossProcessExports
    api: {
      chat: {
        saveMessage: (message: Omit<ChatMessage, 'id'>) => Promise<number>
        getAllMessages: () => Promise<ChatMessage[]>
        clearMessages: () => Promise<void>
        deleteMessage: (id: number) => Promise<void>
      }
      ai: {
        chat: (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => Promise<string>
      }
    }
  }
}

interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export {}
