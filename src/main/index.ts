import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ChatStorage } from './services/chatStorage'
import { AIService } from './services/aiService'
import { PaperStorage } from './services/paperStorage'
import { RAGService } from './services/ragService'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 设置IPC处理程序
function setupIpcHandlers(): void {
  // 聊天存储相关IPC
  ipcMain.handle('chat:saveMessage', async (_, message) => {
    try {
      return await ChatStorage.saveMessage(message)
    } catch (error) {
      console.error('保存消息失败:', error)
      throw error
    }
  })

  ipcMain.handle('chat:getAllMessages', async (_, paperId) => {
    try {
      return await ChatStorage.getAllMessages(paperId)
    } catch (error) {
      console.error('获取消息失败:', error)
      throw error
    }
  })

  ipcMain.handle('chat:clearMessages', async (_, paperId) => {
    try {
      return await ChatStorage.clearMessages(paperId)
    } catch (error) {
      console.error('清空消息失败:', error)
      throw error
    }
  })

  ipcMain.handle('chat:deleteMessage', async (_, id) => {
    try {
      return await ChatStorage.deleteMessage(id)
    } catch (error) {
      console.error('删除消息失败:', error)
      throw error
    }
  })

  // AI服务相关IPC
  ipcMain.handle('ai:chat', async (_, payload) => {
    try {
      return await AIService.chat(payload)
    } catch (error) {
      console.error('AI聊天失败:', error)
      throw error
    }
  })

  // 文件选择相关IPC
  ipcMain.handle('file:selectPDF', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'PDF文件',
            extensions: ['pdf']
          }
        ]
      })
      if (canceled) {
        return null
      }
      return filePaths
    } catch (error) {
      console.error('选择PDF文件失败:', error)
      throw error
    }
  })

  // PDF文件存储相关IPC
  ipcMain.handle('paper:savePaper', async (_, paper) => {
    try {
      return await PaperStorage.savePaper(paper)
    } catch (error) {
      console.error('保存PDF文件失败:', error)
      throw error
    }
  })

  ipcMain.handle('paper:getAllPapers', async () => {
    try {
      return await PaperStorage.getAllPapers()
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw error
    }
  })

  ipcMain.handle('paper:getPaperById', async (_, id) => {
    try {
      return await PaperStorage.getPaperById(id)
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw error
    }
  })

  ipcMain.handle('paper:deletePaper', async (_, id) => {
    try {
      await RAGService.removePaper(id)
      return await PaperStorage.deletePaper(id)
    } catch (error) {
      console.error('删除PDF文件失败:', error)
      throw error
    }
  })

  // PDF文件读取相关IPC（用于解决本地文件加载问题）
  ipcMain.handle('paper:readPDF', async (_, path: string) => {
    try {
      const fs = await import('fs/promises')
      const data = await fs.readFile(path)
      return Array.from(data)
    } catch (error) {
      console.error('读取PDF文件失败:', error)
      throw error
    }
  })

  // RAG 相关IPC
  ipcMain.handle('rag:addPaper', async (_, paperId: number, pdfPath: string) => {
    try {
      await RAGService.addPaper(paperId, pdfPath)
    } catch (error) {
      console.error('论文向量化失败:', error)
      throw error
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化 RAG 服务（启动 ChromaDB 子进程）
  try {
    await RAGService.init()
  } catch (error) {
    console.error('RAGService init failed:', error)
  }

  // 设置IPC处理程序
  setupIpcHandlers()

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('before-quit', async () => {
  await RAGService.shutdown()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
