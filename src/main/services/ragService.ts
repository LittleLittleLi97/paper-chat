import { ChildProcess, execSync, spawn } from 'child_process'
import { ChromaClient } from 'chromadb'
import type { Collection } from 'chromadb'
import { OllamaEmbeddings } from '@langchain/ollama'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { PDFParse } from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import dotenv from 'dotenv'
import { extractPdfLines } from './pdfLayoutService'
import { detectStructuredSections } from './pdfStructureService'
import type { StructuredChunk, StructuredChunkMetadata, StructuredSection } from './types/pdfStructure'

dotenv.config()

type SearchOptions = { paperId?: number }

/**
 * RAG 服务类
 * 管理 ChromaDB 子进程、PDF 向量化、相似度检索
 */
export class RAGService {
  private static client: ChromaClient | null = null
  private static collection: Collection | null = null
  private static chromaProcess: ChildProcess | null = null

  private static readonly COLLECTION_NAME = 'papers'
  private static readonly CHROMA_PORT = 8100

  private static readonly embeddings = new OllamaEmbeddings({
    model: 'qwen3-embedding:4b',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  })

  private static readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  })

  private static readonly NON_SEARCHABLE_SECTION_TYPES = new Set(['title', 'reference'])

  /**
   * 初始化：启动 ChromaDB 子进程并连接
   */
  static async init(): Promise<void> {
    await this.startChromaServer()
    await this.connectToChroma()
    console.log('RAGService initialized')
  }

  /**
   * 在 PATH 和常见安装位置中查找 chroma 可执行文件
   */
  private static findChromaExecutable(): string {
    const candidates =
      process.platform === 'win32'
        ? ['chroma.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Scripts', 'chroma.exe')]
        : ['chroma']

    for (const candidate of candidates) {
      if (path.isAbsolute(candidate) && fs.existsSync(candidate)) {
        return candidate
      }
    }

    // 尝试从 python -c 获取 Scripts 目录
    try {
      const scriptsDir = execSync('python -c "import sysconfig; print(sysconfig.get_path(\'scripts\'))"', {
        encoding: 'utf-8',
        timeout: 5000
      }).trim()
      const chromaPath = path.join(scriptsDir, process.platform === 'win32' ? 'chroma.exe' : 'chroma')
      if (fs.existsSync(chromaPath)) {
        return chromaPath
      }
    } catch {
      // fallback
    }

    return 'chroma'
  }

  /**
   * 启动 ChromaDB 服务子进程
   */
  private static async startChromaServer(): Promise<void> {
    const chromaDataDir = path.join(app.getPath('userData'), 'chroma_data')

    if (!fs.existsSync(chromaDataDir)) {
      fs.mkdirSync(chromaDataDir, { recursive: true })
    }

    const chromaExe = this.findChromaExecutable()
    console.log('ChromaDB executable:', chromaExe)
    console.log('ChromaDB data dir:', chromaDataDir)

    this.chromaProcess = spawn(
      chromaExe,
      ['run', '--path', chromaDataDir, '--port', String(this.CHROMA_PORT)],
      { stdio: 'pipe' }
    )

    this.chromaProcess.stdout?.on('data', (data: Buffer) => {
      console.log('ChromaDB stdout:', data.toString())
    })

    this.chromaProcess.stderr?.on('data', (data: Buffer) => {
      console.log('ChromaDB stderr:', data.toString())
    })

    this.chromaProcess.on('error', (err) => {
      console.error('ChromaDB process error:', err)
    })

    this.chromaProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error('ChromaDB process exited with code:', code)
      }
    })

    await this.waitForServer()
  }

  /**
   * 轮询等待 ChromaDB 服务就绪
   */
  private static async waitForServer(maxRetries = 30, intervalMs = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${this.CHROMA_PORT}/api/v2/heartbeat`)
        if (response.ok) {
          console.log('ChromaDB server is ready')
          return
        }
      } catch {
        // not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error('ChromaDB server failed to start within timeout')
  }

  /**
   * 连接到 ChromaDB 并获取/创建 collection
   */
  private static async connectToChroma(): Promise<void> {
    this.client = new ChromaClient({ host: 'localhost', port: this.CHROMA_PORT })
    this.collection = await this.client.getOrCreateCollection({ name: this.COLLECTION_NAME })
  }

  /**
   * 向量化一篇论文的 PDF 并存入 ChromaDB
   * 如果该论文已有向量数据，先删除再重新添加
   */
  static async addPaper(paperId: number, pdfPath: string): Promise<void> {
    if (!this.collection) {
      throw new Error('RAGService not initialized')
    }

    await this.removePaper(paperId)

    const chunks = await this.buildPaperChunks(paperId, pdfPath)
    const vectors = await this.embeddings.embedDocuments(chunks.map((chunk) => chunk.text))

    await this.collection.add({
      ids: chunks.map((chunk) => chunk.id),
      documents: chunks.map((chunk) => chunk.text),
      embeddings: vectors,
      metadatas: chunks.map((chunk) => chunk.metadata)
    })

    console.log(`Paper ${paperId} vectorized: ${chunks.length} chunks`)
  }

  /**
   * 删除指定论文的所有向量
   */
  static async removePaper(paperId: number): Promise<void> {
    if (!this.collection) return

    try {
      await this.collection.delete({ where: { paperId } })
      console.log(`Paper ${paperId} vectors removed`)
    } catch (error) {
      console.error(`Failed to remove paper ${paperId} vectors:`, error)
    }
  }

  /**
   * 全局相似度检索（跨所有论文）
   * 返回 LangChain Document 格式，兼容 tools.ts
   */
  static async search(query: string, k: number = 4, options: SearchOptions = {}): Promise<Document[]> {
    if (!this.collection) return []

    try {
      const queryEmbedding = await this.embeddings.embedQuery(query)

      const queryOptions: {
        queryEmbeddings: number[][]
        nResults: number
        where?: { paperId: number }
      } = {
        queryEmbeddings: [queryEmbedding],
        nResults: k
      }

      if (typeof options.paperId === 'number' && options.paperId > 0) {
        queryOptions.where = { paperId: options.paperId }
      }

      const results = await this.collection.query(queryOptions)

      const documents: Document[] = []
      if (results.documents?.[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const doc = results.documents[0][i]
          const meta = results.metadatas?.[0]?.[i]
          if (doc) {
            documents.push(
              new Document({
                pageContent: doc,
                metadata: meta ?? {}
              })
            )
          }
        }
      }

      return documents
    } catch (error) {
      console.error('RAG search failed:', error)
      return []
    }
  }

  /**
   * 关闭 ChromaDB 子进程
   */
  static async shutdown(): Promise<void> {
    if (this.chromaProcess) {
      this.chromaProcess.kill()
      this.chromaProcess = null
      console.log('ChromaDB process stopped')
    }
    this.client = null
    this.collection = null
  }

  private static async buildPaperChunks(paperId: number, pdfPath: string): Promise<StructuredChunk[]> {
    try {
      const lines = await extractPdfLines(pdfPath)
      const sections = detectStructuredSections(lines)
      const structuredChunks = await this.buildStructuredChunks(paperId, pdfPath, sections)

      if (structuredChunks.length > 0) {
        this.logStructuredSections(paperId, sections, structuredChunks.length)
        return structuredChunks
      }

      console.warn(`Paper ${paperId} structure detected no searchable chunks, fallback to plain text indexing`)
    } catch (error) {
      console.warn(`Paper ${paperId} structure-aware indexing failed, fallback to plain text indexing`, error)
    }

    return this.buildFallbackChunks(paperId, pdfPath)
  }

  private static async buildStructuredChunks(
    paperId: number,
    pdfPath: string,
    sections: StructuredSection[]
  ): Promise<StructuredChunk[]> {
    const searchableSections = sections.filter(
      (section) =>
        !this.NON_SEARCHABLE_SECTION_TYPES.has(section.type) &&
        section.content.trim() &&
        section.content.trim().length >= 40
    )

    const structuredChunks: StructuredChunk[] = []
    let globalChunkIndex = 0

    for (const section of searchableSections) {
      const sectionChunks = await this.splitter.splitText(section.content)

      for (let chunkInSection = 0; chunkInSection < sectionChunks.length; chunkInSection += 1) {
        const chunkText = sectionChunks[chunkInSection]?.trim()
        if (!chunkText) continue

        const metadata: StructuredChunkMetadata = {
          paperId,
          source: pdfPath,
          chunkIndex: globalChunkIndex,
          chunkInSection,
          sectionId: section.sectionId,
          sectionOrder: section.order,
          sectionTitle: section.title,
          sectionType: section.type,
          sectionLevel: section.level,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd
        }

        structuredChunks.push({
          id: `paper-${paperId}-chunk-${globalChunkIndex}`,
          text: chunkText,
          metadata
        })

        globalChunkIndex += 1
      }
    }

    return structuredChunks
  }

  private static async buildFallbackChunks(paperId: number, pdfPath: string): Promise<StructuredChunk[]> {
    const buffer = fs.readFileSync(pdfPath)
    const parser = new PDFParse({ data: buffer })
    const content = await parser.getText()
    const fallbackChunks = await this.splitter.splitText(content.text)

    const chunks: StructuredChunk[] = []

    for (let index = 0; index < fallbackChunks.length; index += 1) {
      const trimmed = fallbackChunks[index]?.trim()
      if (!trimmed) continue

      chunks.push({
        id: `paper-${paperId}-chunk-${index}`,
        text: trimmed,
        metadata: {
          paperId,
          source: pdfPath,
          chunkIndex: index,
          chunkInSection: index,
          sectionId: `paper-${paperId}-body`,
          sectionOrder: 0,
          sectionTitle: 'Body',
          sectionType: 'other',
          sectionLevel: 1,
          pageStart: 0,
          pageEnd: 0
        } satisfies StructuredChunkMetadata
      })
    }

    return chunks
  }

  private static logStructuredSections(paperId: number, sections: StructuredSection[], chunkCount: number): void {
    const summary = sections
      .map((section) => `${section.order}:${section.type}:${section.title} [${section.pageStart}-${section.pageEnd}]`)
      .join(' | ')

    console.log(`Paper ${paperId} structured sections (${sections.length}) => ${summary}`)
    console.log(`Paper ${paperId} structured indexing chunks => ${chunkCount}`)
  }
}
