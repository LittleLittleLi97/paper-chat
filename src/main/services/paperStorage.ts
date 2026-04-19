import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import fs from 'fs'
import path from 'path'

/**
 * PDF文件数据结构
 */
export interface Paper {
  id: number
  title: string
  path: string
  indexStatus: IndexStatus
}

export type IndexStatus = 'idle' | 'indexing' | 'ready' | 'failed'

/**
 * PDF文件存储服务（后端）
 * 使用SQLite数据库
 */
export class PaperStorage {
  private static db: Database | null = null
  private static readonly DB_DIR = path.resolve(process.cwd(), 'db')
  private static readonly DB_PATH = path.join(PaperStorage.DB_DIR, 'papers.db')

  /**
   * 初始化数据库
   */
  private static async initDB(): Promise<Database> {
    if (this.db) {
      return this.db
    }

    // 打开数据库连接
    if (!fs.existsSync(this.DB_DIR)) {
      fs.mkdirSync(this.DB_DIR, { recursive: true })
    }
    this.db = await open({
      filename: this.DB_PATH,
      driver: sqlite3.Database
    })

    // 创建PDF文件表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        index_status TEXT NOT NULL DEFAULT 'idle'
      )
    `)

    return this.db
  }

  /**
   * 保存PDF文件信息
   * @param paper PDF文件信息（不需要包含 id，会自动生成）
   */
  static async savePaper(
    paper: Omit<Paper, 'id' | 'indexStatus'> & { indexStatus?: IndexStatus }
  ): Promise<number> {
    const db = await this.initDB()
    try {
      const result = await db.run('INSERT INTO papers (title, path, index_status) VALUES (?, ?, ?)', [
        paper.title,
        paper.path,
        paper.indexStatus || 'idle'
      ])
      return result.lastID as number
    } catch (error) {
      console.error('保存PDF文件失败:', error)
      throw error
    }
  }

  /**
   * 获取所有PDF文件信息
   */
  static async getAllPapers(): Promise<Paper[]> {
    const db = await this.initDB()
    try {
      const papers = await db.all<Paper[]>(
        'SELECT id, title, path, index_status as indexStatus FROM papers ORDER BY id DESC'
      )
      return papers
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取PDF文件信息
   * @param id PDF文件ID
   */
  static async getPaperById(id: number): Promise<Paper | undefined> {
    const db = await this.initDB()
    try {
      const paper = await db.get<Paper>(
        'SELECT id, title, path, index_status as indexStatus FROM papers WHERE id = ?',
        [id]
      )
      return paper
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw error
    }
  }

  /**
   * 删除PDF文件信息
   * @param id PDF文件ID
   */
  static async deletePaper(id: number): Promise<void> {
    const db = await this.initDB()
    try {
      await db.run('DELETE FROM papers WHERE id = ?', [id])
    } catch (error) {
      console.error('删除PDF文件失败:', error)
      throw error
    }
  }

  static async updateIndexStatus(id: number, status: IndexStatus): Promise<void> {
    const db = await this.initDB()
    try {
      await db.run('UPDATE papers SET index_status = ? WHERE id = ?', [status, id])
    } catch (error) {
      console.error('更新索引状态失败:', error)
      throw error
    }
  }
}
