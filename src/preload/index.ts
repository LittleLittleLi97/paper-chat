import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 聊天存储相关API
  chat: {
    saveMessage: (message: any) => ipcRenderer.invoke('chat:saveMessage', message),
    getAllMessages: () => ipcRenderer.invoke('chat:getAllMessages'),
    clearMessages: () => ipcRenderer.invoke('chat:clearMessages'),
    deleteMessage: (id: number) => ipcRenderer.invoke('chat:deleteMessage', id)
  },
  // AI服务相关API
  ai: {
    chat: (messages: any[]) => ipcRenderer.invoke('ai:chat', messages)
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
