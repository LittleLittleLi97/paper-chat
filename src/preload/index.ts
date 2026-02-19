import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 聊天存储相关API
  chat: {
    saveMessage: (message: { role: 'user' | 'assistant'; content: string; timestamp: number }) => ipcRenderer.invoke('chat:saveMessage', message),
    getAllMessages: () => ipcRenderer.invoke('chat:getAllMessages'),
    clearMessages: () => ipcRenderer.invoke('chat:clearMessages'),
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
    savePaper: (paper: { title: string; content: string; path?: string }) => ipcRenderer.invoke('paper:savePaper', paper),
    getAllPapers: () => ipcRenderer.invoke('paper:getAllPapers'),
    getPaperById: (id: number) => ipcRenderer.invoke('paper:getPaperById', id),
    deletePaper: (id: number) => ipcRenderer.invoke('paper:deletePaper', id),
    readPDF: (path: string) => ipcRenderer.invoke('paper:readPDF', path)
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
