/**
 * ChromaDB 调试脚本
 *
 * 使用方式：
 * 1. 输出总览 JSON（论文列表、集合信息、总 chunk 数）
 *    npm run debug:chroma
 *
 * 2. 输出指定论文的调试 JSON
 *    npm run debug:chroma -- 2
 *    npm run debug:chroma -- --paper 2
 *
 * 3. 指定样本数量与预览长度
 *    npm run debug:chroma -- 2 20 240
 *    npm run debug:chroma -- --paper 2 --limit 20 --preview 240
 *
 * 参数说明：
 * - paperId / --paper: 目标论文 ID
 * - limit / --limit: 输出到 chunkSamples 的样本条数
 * - preview / --preview: 每条 chunk 预览文本长度
 *
 * 输出位置：
 * - 总览：log/debug-chroma-overview-时间戳.json
 * - 单篇论文：log/debug-chroma-paper-{paperId}-时间戳.json
 */
const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const { ChromaClient } = require('chromadb')

const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'db', 'papers.db')
const LOG_DIR = path.join(ROOT, 'log')
const DEFAULT_LIMIT = 10
const DEFAULT_PREVIEW_LENGTH = 180

function parseArgs(argv) {
  const options = {
    paperId: null,
    limit: DEFAULT_LIMIT,
    previewLength: DEFAULT_PREVIEW_LENGTH
  }
  const positional = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    if (arg === '--paper' || arg === '--paperId') {
      options.paperId = Number(argv[i + 1] ?? '')
      i += 1
      continue
    }
    if (arg === '--limit') {
      options.limit = Number(argv[i + 1] ?? DEFAULT_LIMIT)
      i += 1
      continue
    }
    if (arg === '--preview') {
      options.previewLength = Number(argv[i + 1] ?? DEFAULT_PREVIEW_LENGTH)
      i += 1
    }
  }

  if (options.paperId === null && positional.length > 0) {
    options.paperId = Number(positional[0] ?? '')
  }
  if ((options.limit === DEFAULT_LIMIT || !Number.isFinite(options.limit)) && positional.length > 1) {
    options.limit = Number(positional[1] ?? DEFAULT_LIMIT)
  }
  if (
    (options.previewLength === DEFAULT_PREVIEW_LENGTH || !Number.isFinite(options.previewLength)) &&
    positional.length > 2
  ) {
    options.previewLength = Number(positional[2] ?? DEFAULT_PREVIEW_LENGTH)
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    options.limit = DEFAULT_LIMIT
  }
  if (!Number.isFinite(options.previewLength) || options.previewLength <= 0) {
    options.previewLength = DEFAULT_PREVIEW_LENGTH
  }
  if (!Number.isFinite(options.paperId)) {
    options.paperId = null
  }

  return options
}

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateText(text, length) {
  const normalized = normalizeText(text)
  if (normalized.length <= length) {
    return normalized
  }
  return `${normalized.slice(0, length)}...`
}

function formatTimestampForFilename(date = new Date()) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

async function loadPaperRows() {
  if (!fs.existsSync(DB_PATH)) {
    return []
  }

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  })

  try {
    return await db.all('SELECT id, title, path, index_status as indexStatus FROM papers ORDER BY id DESC')
  } finally {
    await db.close()
  }
}

function buildSectionSummary(metadatas) {
  const sectionMap = new Map()
  const sectionTypeMap = new Map()

  for (const metadata of metadatas) {
    const sectionTitle = metadata?.sectionTitle ?? 'Body'
    const sectionType = metadata?.sectionType ?? 'other'
    const pageStart = metadata?.pageStart ?? '?'
    const pageEnd = metadata?.pageEnd ?? pageStart
    const sectionKey = `${sectionTitle} (${sectionType}) [${pageStart}-${pageEnd}]`

    sectionMap.set(sectionKey, (sectionMap.get(sectionKey) ?? 0) + 1)
    sectionTypeMap.set(sectionType, (sectionTypeMap.get(sectionType) ?? 0) + 1)
  }

  return {
    sectionTypeCounts: [...sectionTypeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sectionType, count]) => ({ sectionType, count })),
    sectionCounts: [...sectionMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sectionKey, count]) => ({ sectionKey, count }))
  }
}

function buildChunkRecords(result, previewLength) {
  const count = result.ids?.length ?? 0
  const chunks = []

  for (let i = 0; i < count; i += 1) {
    const metadata = result.metadatas?.[i] ?? {}
    const document = result.documents?.[i] ?? ''
    const id = result.ids?.[i] ?? `chunk-${i}`

    chunks.push({
      id,
      metadata,
      preview: truncateText(document, previewLength),
      document
    })
  }

  return chunks
}

async function inspectPaper(collection, paperId, limit, previewLength) {
  const result = await collection.get({
    where: { paperId },
    include: ['documents', 'metadatas']
  })

  const chunkCount = result.ids?.length ?? 0
  const chunkRecords = buildChunkRecords(result, previewLength)
  const chunkSamples = chunkRecords.slice(0, Math.min(limit, chunkRecords.length))
  const sectionSummary = buildSectionSummary(result.metadatas ?? [])

  return {
    paperId,
    chunkCount,
    sectionTypeCounts: sectionSummary.sectionTypeCounts,
    sectionCounts: sectionSummary.sectionCounts,
    chunkSamples,
    chunks: chunkRecords
  }
}

function writeJsonReport(payload, paperId) {
  ensureLogDir()
  const suffix = paperId === null ? 'overview' : `paper-${paperId}`
  const filename = `debug-chroma-${suffix}-${formatTimestampForFilename()}.json`
  const filePath = path.join(LOG_DIR, filename)
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return filePath
}

async function main() {
  const { paperId, limit, previewLength } = parseArgs(process.argv.slice(2))
  const paperRows = await loadPaperRows()

  const client = new ChromaClient({ host: 'localhost', port: 8100 })
  const collections = await client.listCollections()
  const collectionNames = collections.map((collection) => collection.name || collection._name)

  const collection = await client.getCollection({ name: 'papers' })
  const totalCount = await collection.count()
  const matchedPaper = paperRows.find((row) => row.id === paperId) ?? null

  const report = {
    generatedAt: new Date().toISOString(),
    options: {
      paperId,
      limit,
      previewLength
    },
    sqlite: {
      dbPath: DB_PATH,
      paperCount: paperRows.length,
      papers: paperRows
    },
    chroma: {
      host: 'localhost',
      port: 8100,
      collections: collectionNames,
      papersCollectionChunkCount: totalCount
    },
    targetPaper: matchedPaper,
    inspect: paperId === null ? null : await inspectPaper(collection, paperId, limit, previewLength),
    usage: ['npm run debug:chroma', 'npm run debug:chroma -- 2', 'npm run debug:chroma -- 2 20 240']
  }

  const filePath = writeJsonReport(report, paperId)

  console.log(`调试结果已写入: ${path.relative(ROOT, filePath)}`)
  console.log(`SQLite 论文数: ${paperRows.length}`)
  console.log(`Chroma collections: ${collectionNames.join(', ') || '(empty)'}`)
  console.log(`papers 集合总 chunks: ${totalCount}`)

  if (paperId !== null) {
    console.log(`paperId=${paperId} chunks: ${report.inspect?.chunkCount ?? 0}`)
  } else {
    console.log('未指定 paperId，本次输出为总览 JSON。')
  }
}

main().catch((error) => {
  console.error('\n调试脚本执行失败:')
  console.error(error)
  process.exit(1)
})
