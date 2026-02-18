import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// 消息数据结构
export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 数据库结构定义
interface ChatDB extends DBSchema {
  messages: {
    key: number
    value: ChatMessage
    indexes: { 'by-timestamp': number }
  }
}

const DB_NAME = 'chatDB'
const DB_VERSION = 1
const STORE_NAME = 'messages'

let dbInstance: IDBPDatabase<ChatDB> | null = null

/**
 * 初始化 IndexedDB 数据库
 */
async function initDB(): Promise<IDBPDatabase<ChatDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        })
        // 创建时间戳索引，用于排序
        store.createIndex('by-timestamp', 'timestamp')
      }
    },
  })

  return dbInstance
}

/**
 * 聊天记录存储服务
 */
export class ChatStorage {
  /**
   * 确保数据库已初始化
   */
  private static async ensureDB() {
    if (!dbInstance) {
      await initDB()
    }
    return dbInstance!
  }

  /**
   * 保存单条消息
   * @param message 消息对象（不需要包含 id，会自动生成）
   */
  static async saveMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const messageWithTimestamp: Omit<ChatMessage, 'id'> = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    }

    const id = await store.add(messageWithTimestamp as ChatMessage)
    await tx.done
    return id as number
  }

  /**
   * 获取所有消息（按时间排序）
   */
  static async getAllMessages(): Promise<ChatMessage[]> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('by-timestamp')

    const messages = await index.getAll()
    await tx.done

    // 按时间戳排序（升序）
    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * 清空所有消息
   */
  static async clearMessages(): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    await store.clear()
    await tx.done
  }

  /**
   * 删除单条消息
   * @param id 消息 ID
   */
  static async deleteMessage(id: number): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    await store.delete(id)
    await tx.done
  }
}