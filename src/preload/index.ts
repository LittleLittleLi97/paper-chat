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
    chat: (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => ipcRenderer.invoke('ai:chat', messages)
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
