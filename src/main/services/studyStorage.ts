import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import fs from 'fs'
import path from 'path'

export interface StudyNote {
  id?: number
  paperId: number
  content: string
  sourceMessage?: string
  timestamp: number
}

export interface TermCard {
  id?: number
  paperId: number
  term: string
  definition: string
  reviewCount?: number
  lastReviewedAt?: number | null
  createdAt: number
}

export class StudyStorage {
  private static db: Database | null = null
  private static readonly DB_DIR = path.resolve(process.cwd(), 'db')
  private static readonly DB_PATH = path.join(StudyStorage.DB_DIR, 'study.db')

  private static async initDB(): Promise<Database> {
    if (this.db) return this.db

    if (!fs.existsSync(this.DB_DIR)) {
      fs.mkdirSync(this.DB_DIR, { recursive: true })
    }

    this.db = await open({
      filename: this.DB_PATH,
      driver: sqlite3.Database
    })

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        source_message TEXT,
        timestamp INTEGER NOT NULL
      )
    `)

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS term_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER NOT NULL,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        review_count INTEGER DEFAULT 0,
        last_reviewed_at INTEGER,
        created_at INTEGER NOT NULL,
        UNIQUE(paper_id, term)
      )
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_paper_id ON notes (paper_id);
      CREATE INDEX IF NOT EXISTS idx_term_cards_paper_id ON term_cards (paper_id);
    `)

    return this.db
  }

  static async saveNote(note: Omit<StudyNote, 'id'>): Promise<number> {
    const db = await this.initDB()
    const result = await db.run(
      'INSERT INTO notes (paper_id, content, source_message, timestamp) VALUES (?, ?, ?, ?)',
      [note.paperId, note.content, note.sourceMessage || '', note.timestamp || Date.now()]
    )
    return result.lastID as number
  }

  static async getNotes(paperId: number): Promise<StudyNote[]> {
    const db = await this.initDB()
    const rows = await db.all<
      Array<{
        id: number
        paper_id: number
        content: string
        source_message: string
        timestamp: number
      }>
    >('SELECT * FROM notes WHERE paper_id = ? ORDER BY timestamp DESC', [paperId])

    return rows.map((row) => ({
      id: row.id,
      paperId: row.paper_id,
      content: row.content,
      sourceMessage: row.source_message,
      timestamp: row.timestamp
    }))
  }

  static async saveTermCards(cards: Array<Omit<TermCard, 'id' | 'reviewCount' | 'lastReviewedAt'>>): Promise<void> {
    if (cards.length === 0) return
    const db = await this.initDB()
    for (const card of cards) {
      await db.run(
        'INSERT OR IGNORE INTO term_cards (paper_id, term, definition, created_at) VALUES (?, ?, ?, ?)',
        [card.paperId, card.term.trim(), card.definition.trim(), card.createdAt || Date.now()]
      )
    }
  }

  static async getTermCards(paperId: number): Promise<TermCard[]> {
    const db = await this.initDB()
    const rows = await db.all<
      Array<{
        id: number
        paper_id: number
        term: string
        definition: string
        review_count: number
        last_reviewed_at: number | null
        created_at: number
      }>
    >('SELECT * FROM term_cards WHERE paper_id = ? ORDER BY created_at DESC', [paperId])

    return rows.map((row) => ({
      id: row.id,
      paperId: row.paper_id,
      term: row.term,
      definition: row.definition,
      reviewCount: row.review_count,
      lastReviewedAt: row.last_reviewed_at,
      createdAt: row.created_at
    }))
  }

  static async markTermReviewed(id: number): Promise<void> {
    const db = await this.initDB()
    await db.run(
      'UPDATE term_cards SET review_count = COALESCE(review_count, 0) + 1, last_reviewed_at = ? WHERE id = ?',
      [Date.now(), id]
    )
  }
}

