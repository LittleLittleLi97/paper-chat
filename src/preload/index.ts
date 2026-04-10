import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 聊天存储相关API
  chat: {
    saveMessage: (message: { role: 'user' | 'assistant'; content: string; timestamp: number; paperId?: number }) => ipcRenderer.invoke('chat:saveMessage', message),
    getAllMessages: (paperId?: number) => ipcRenderer.invoke('chat:getAllMessages', paperId),
    clearMessages: (paperId?: number) => ipcRenderer.invoke('chat:clearMessages', paperId),
    deleteMessage: (id: number) => ipcRenderer.invoke('chat:deleteMessage', id)
  },
  // AI服务相关API
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
    }) => ipcRenderer.invoke('ai:chat', payload),
    comparePapers: (payload: { papers: Array<{ id: number; title: string }>; focus?: string }) =>
      ipcRenderer.invoke('ai:comparePapers', payload),
    batchSummaries: (payload: { papers: Array<{ id: number; title: string }> }) =>
      ipcRenderer.invoke('ai:batchSummaries', payload),
    extractTermCards: (payload: {
      paper: { id: number; title: string }
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    }) => ipcRenderer.invoke('ai:extractTermCards', payload)
  },
  // 文件选择相关API
  file: {
    selectPDF: () => ipcRenderer.invoke('file:selectPDF')
  },
  // PDF文件存储相关API
  paper: {
    savePaper: (paper: { title: string; path: string }) => ipcRenderer.invoke('paper:savePaper', paper),
    getAllPapers: () => ipcRenderer.invoke('paper:getAllPapers'),
    getPaperById: (id: number) => ipcRenderer.invoke('paper:getPaperById', id),
    deletePaper: (id: number) => ipcRenderer.invoke('paper:deletePaper', id),
    readPDF: (path: string) => ipcRenderer.invoke('paper:readPDF', path)
  },
  // RAG 相关API
  rag: {
    addPaper: (paperId: number, pdfPath: string) => ipcRenderer.invoke('rag:addPaper', paperId, pdfPath)
  },
  study: {
    saveNote: (payload: {
      paperId: number
      content: string
      sourceMessage?: string
      timestamp: number
    }) => ipcRenderer.invoke('study:saveNote', payload),
    getNotes: (paperId: number) => ipcRenderer.invoke('study:getNotes', paperId),
    saveTermCards: (cards: Array<{ paperId: number; term: string; definition: string; createdAt: number }>) =>
      ipcRenderer.invoke('study:saveTermCards', cards),
    getTermCards: (paperId: number) => ipcRenderer.invoke('study:getTermCards', paperId),
    markTermReviewed: (id: number) => ipcRenderer.invoke('study:markTermReviewed', id)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
