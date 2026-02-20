import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

// 消息数据结构
export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  paperId?: number
}

/**
 * 聊天记录存储服务（后端）
 * 使用SQLite数据库
 */
export class ChatStorage {
  private static db: Database | null = null

  /**
   * 初始化数据库
   */
  private static async initDB(): Promise<Database> {
    if (this.db) {
      return this.db
    }

    // 打开数据库连接
    this.db = await open({
      filename: './chat.db',
      driver: sqlite3.Database
    })

    // 创建消息表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        paper_id INTEGER DEFAULT 0
      )
    `)

    // 添加索引以提高查询性能
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_paper_id ON messages (paper_id)
    `)

    return this.db
  }

  /**
   * 保存单条消息
   * @param message 消息对象（不需要包含 id，会自动生成）
   */
  static async saveMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
    const db = await this.initDB()
    const result = await db.run(
      'INSERT INTO messages (role, content, timestamp, paper_id) VALUES (?, ?, ?, ?)',
      [message.role, message.content, message.timestamp || Date.now(), message.paperId || 0]
    )
    return result.lastID as number
  }

  /**
   * 获取指定论文的所有消息（按时间排序）
   * @param paperId 论文 ID
   */
  static async getAllMessages(paperId: number = 0): Promise<ChatMessage[]> {
    const db = await this.initDB()
    const messages = await db.all<ChatMessage[]>(
      'SELECT * FROM messages WHERE paper_id = ? ORDER BY timestamp ASC',
      [paperId]
    )
    return messages
  }

  /**
   * 清空指定论文的所有消息
   * @param paperId 论文 ID
   */
  static async clearMessages(paperId: number = 0): Promise<void> {
    const db = await this.initDB()
    await db.run('DELETE FROM messages WHERE paper_id = ?', [paperId])
  }

  /**
   * 删除单条消息
   * @param id 消息 ID
   */
  static async deleteMessage(id: number): Promise<void> {
    const db = await this.initDB()
    await db.run('DELETE FROM messages WHERE id = ?', [id])
  }
}
