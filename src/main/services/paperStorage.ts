import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFParse } from "pdf-parse";
import fs from 'fs'

/**
 * PDF文件数据结构
 */
export interface Paper {
  id: number
  title: string
  path: string
  content?: string
}

/**
 * PDF文件存储服务（后端）
 * 使用SQLite数据库
 */
export class PaperStorage {
  private static db: Database | null = null
  static vectorStore: MemoryVectorStore | null = null

  /**
   * 初始化数据库
   */
  private static async initDB(): Promise<Database> {
    if (this.db) {
      return this.db
    }

    // 打开数据库连接
    this.db = await open({
      filename: './papers.db',
      driver: sqlite3.Database
    })

    // 创建PDF文件表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE
      )
    `)

    return this.db
  }

  /**
   * 保存PDF文件信息
   * @param paper PDF文件信息（不需要包含 id，会自动生成）
   */
  static async savePaper(paper: Omit<Paper, 'id'>): Promise<number> {
    const db = await this.initDB()
    try {
      const result = await db.run('INSERT INTO papers (title, path) VALUES (?, ?)', [
        paper.title,
        paper.path
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
      const papers = await db.all<Paper[]>('SELECT * FROM papers')
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
      const paper = await db.get<Paper>('SELECT * FROM papers WHERE id = ?', [id])
      return paper
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw error
    }
  }

  /**
   * 处理PDF文本的向量化
   * @param path PDF文件路径
   */
  static async processPDFVectorization(path: string): Promise<void> {
    try {
      // 读取PDF文件内容
      const buffer = fs.readFileSync(path);

      const parser = new PDFParse({
        data: buffer
      });

      const content = await parser.getText();
      console.log('===', content)

      // 使用@langchain/textsplitters进行文本分割
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      })
      const chunks = await splitter.splitText(content.text)
      console.log('=== chunks', chunks)

      // 使用OpenAI进行向量化（如果需要其他嵌入模型可以替换）
      const embeddings = new OpenAIEmbeddings()
      console.log('=== embeddings', embeddings)

      this.vectorStore = await MemoryVectorStore.fromTexts(chunks, [], embeddings)

      console.log('PDF向量化完成，生成了', chunks.length, '个文本块')
    } catch (error) {
      console.error('PDF向量化失败:', error)
      this.vectorStore = null
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
}
