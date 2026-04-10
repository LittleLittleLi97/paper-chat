<template>
  <div class="app-shell" :class="{ 'is-resizing': isResizing }">
    <header class="app-header">
      <div class="header-title-wrap">
        <h1 class="app-title">Paper Assistant</h1>
        <p class="app-subtitle">面向文献阅读与问答的桌面工作台</p>
      </div>
      <div class="header-stats">
        <span class="stat-chip">文献 {{ papers.length }}</span>
        <span class="stat-chip">{{ selectedPaper ? `当前：${selectedPaper.title}` : '未选择文献' }}</span>
      </div>
    </header>

    <main ref="workbenchRef" class="workbench">
      <section class="panel panel-left">
        <PaperList
          :papers="papers"
          :selected-paper="selectedPaper"
          :index-status-map="indexStatusMap"
          @select-paper="selectPaper"
          @add-paper="addPaper"
        />
      </section>

      <div
        class="splitter"
        role="separator"
        aria-label="调整左侧宽度"
        @pointerdown="startResize('left', $event)"
      ></div>

      <section class="panel panel-center">
        <PaperReader
          :selected-paper="selectedPaper"
          :reading-context="readingContext"
          @update-context="handleReaderContextUpdate"
        />
      </section>

      <div
        class="splitter"
        role="separator"
        aria-label="调整右侧宽度"
        @pointerdown="startResize('right', $event)"
      ></div>

      <section class="panel panel-right">
        <AIChat :selected-paper="selectedPaper" :reading-context="readingContext" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import PaperList from './components/PaperList.vue'
import PaperReader from './components/PaperReader.vue'
import AIChat from './components/AIChat.vue'

interface Paper {
  id: number
  title: string
  path: string
}

type IndexStatus = 'idle' | 'indexing' | 'ready' | 'failed'

interface ReadingContext {
  currentPage: number | null
  selectedText: string
}

type ResizeSide = 'left' | 'right'

interface LayoutState {
  leftWidth: number
  rightWidth: number
}

const LAYOUT_STORAGE_KEY = 'paper-assistant-layout-v1'
const MIN_SIDE_WIDTH = 240
const MAX_SIDE_WIDTH = 520
const DEFAULT_LEFT_WIDTH = 300
const DEFAULT_RIGHT_WIDTH = 360
const MIN_CENTER_WIDTH = 480

const selectedPaper = ref<Paper | null>(null)
const papers = ref<Paper[]>([])
const indexStatusMap = ref<Record<number, IndexStatus>>({})
const readingContext = ref<ReadingContext>({
  currentPage: null,
  selectedText: ''
})
const leftWidth = ref(DEFAULT_LEFT_WIDTH)
const rightWidth = ref(DEFAULT_RIGHT_WIDTH)
const isResizing = ref(false)
const workbenchRef = ref<HTMLElement | null>(null)

let activeResize: ResizeSide | null = null
let activePointerId: number | null = null
let activeSplitterEl: HTMLElement | null = null
let draftLeftWidth = DEFAULT_LEFT_WIDTH
let draftRightWidth = DEFAULT_RIGHT_WIDTH

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const persistLayout = (): void => {
  const payload: LayoutState = {
    leftWidth: leftWidth.value,
    rightWidth: rightWidth.value
  }
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload))
}

const applyWorkbenchWidths = (left: number, right: number): void => {
  if (!workbenchRef.value) return
  workbenchRef.value.style.setProperty('--left-width', `${left}px`)
  workbenchRef.value.style.setProperty('--right-width', `${right}px`)
}

const normalizeByViewport = (left: number, right: number): LayoutState => {
  const viewportWidth = window.innerWidth
  const sideMin = MIN_SIDE_WIDTH

  let nextLeft = clamp(left, sideMin, MAX_SIDE_WIDTH)
  let rightMax = Math.min(MAX_SIDE_WIDTH, viewportWidth - nextLeft - MIN_CENTER_WIDTH)
  if (rightMax < sideMin) rightMax = sideMin

  let nextRight = clamp(right, sideMin, rightMax)
  let leftMax = Math.min(MAX_SIDE_WIDTH, viewportWidth - nextRight - MIN_CENTER_WIDTH)
  if (leftMax < sideMin) leftMax = sideMin
  nextLeft = clamp(nextLeft, sideMin, leftMax)

  return {
    leftWidth: nextLeft,
    rightWidth: nextRight
  }
}

const applyStoredLayout = (): void => {
  const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as Partial<LayoutState>
    const normalized = normalizeByViewport(
      parsed.leftWidth ?? DEFAULT_LEFT_WIDTH,
      parsed.rightWidth ?? DEFAULT_RIGHT_WIDTH
    )
    leftWidth.value = normalized.leftWidth
    rightWidth.value = normalized.rightWidth
    applyWorkbenchWidths(normalized.leftWidth, normalized.rightWidth)
  } catch (error) {
    console.warn('读取布局配置失败，已使用默认值:', error)
  }
}

const selectPaper = (paper: Paper): void => {
  selectedPaper.value = paper
  readingContext.value = {
    currentPage: null,
    selectedText: ''
  }
}

const handleReaderContextUpdate = (payload: ReadingContext): void => {
  readingContext.value = payload
}

const setPaperIndexStatus = (paperId: number, status: IndexStatus): void => {
  indexStatusMap.value = {
    ...indexStatusMap.value,
    [paperId]: status
  }
}

const addPaper = async (): Promise<void> => {
  try {
    const filePaths = await window.api.file.selectPDF()
    if (!filePaths || filePaths.length === 0) return

    for (const path of filePaths) {
      const title = path.split('\\').pop() || path
      const newPaper: Omit<Paper, 'id'> = { title, path }
      const id = await window.api.paper.savePaper(newPaper)
      setPaperIndexStatus(id, 'indexing')
      window.api.rag
        .addPaper(id, path)
        .then(() => {
          setPaperIndexStatus(id, 'ready')
        })
        .catch((err) => {
          console.error(`论文向量化失败 (id=${id}):`, err)
          setPaperIndexStatus(id, 'failed')
        })

      const paperWithId: Paper = { ...newPaper, id }
      papers.value.push(paperWithId)
      if (!selectedPaper.value) {
        selectedPaper.value = paperWithId
      }
    }
  } catch (error) {
    console.error('添加PDF文件失败:', error)
  }
}

const initPapers = async (): Promise<void> => {
  try {
    const loadedPapers = await window.api.paper.getAllPapers()
    papers.value = loadedPapers || []
    const statusSeed: Record<number, IndexStatus> = {}
    for (const paper of papers.value) {
      statusSeed[paper.id] = 'idle'
    }
    indexStatusMap.value = statusSeed
    if (!selectedPaper.value && papers.value.length > 0) {
      selectedPaper.value = papers.value[0]
    }
  } catch (error) {
    console.error('加载PDF文件失败:', error)
  }
}

const stopResize = (): void => {
  if (!activeResize) return

  const committed = normalizeByViewport(draftLeftWidth, draftRightWidth)
  leftWidth.value = committed.leftWidth
  rightWidth.value = committed.rightWidth
  applyWorkbenchWidths(committed.leftWidth, committed.rightWidth)

  activeResize = null
  isResizing.value = false
  if (activeSplitterEl && activePointerId !== null && activeSplitterEl.hasPointerCapture(activePointerId)) {
    activeSplitterEl.releasePointerCapture(activePointerId)
  }
  activeSplitterEl = null
  activePointerId = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  persistLayout()
}

const applyResizeAt = (clientX: number): void => {
  const viewportWidth = window.innerWidth
  if (activeResize === 'left') {
    const maxLeft = Math.max(
      MIN_SIDE_WIDTH,
      Math.min(MAX_SIDE_WIDTH, viewportWidth - rightWidth.value - MIN_CENTER_WIDTH)
    )
    draftLeftWidth = clamp(clientX, MIN_SIDE_WIDTH, maxLeft)
    draftRightWidth = rightWidth.value
    applyWorkbenchWidths(draftLeftWidth, draftRightWidth)
    return
  }

  const candidateRight = viewportWidth - clientX
  const maxRight = Math.max(
    MIN_SIDE_WIDTH,
    Math.min(MAX_SIDE_WIDTH, viewportWidth - leftWidth.value - MIN_CENTER_WIDTH)
  )
  draftRightWidth = clamp(candidateRight, MIN_SIDE_WIDTH, maxRight)
  draftLeftWidth = leftWidth.value
  applyWorkbenchWidths(draftLeftWidth, draftRightWidth)
}

const handleResizeMove = (event: PointerEvent): void => {
  if (!activeResize) return
  if (activePointerId !== null && event.pointerId !== activePointerId) return
  applyResizeAt(event.clientX)
}

const startResize = (side: ResizeSide, event: PointerEvent): void => {
  event.preventDefault()
  activeResize = side
  isResizing.value = true
  activePointerId = event.pointerId
  activeSplitterEl = event.currentTarget as HTMLElement | null
  draftLeftWidth = leftWidth.value
  draftRightWidth = rightWidth.value
  activeSplitterEl?.setPointerCapture(event.pointerId)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  applyResizeAt(event.clientX)
}

onMounted(async (): Promise<void> => {
  applyStoredLayout()
  applyWorkbenchWidths(leftWidth.value, rightWidth.value)
  await initPapers()
  window.addEventListener('pointermove', handleResizeMove)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
  window.addEventListener('blur', stopResize)
})

onBeforeUnmount((): void => {
  window.removeEventListener('pointermove', handleResizeMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
  window.removeEventListener('blur', stopResize)
  stopResize()
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: var(--space-5);
  gap: var(--space-4);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-panel) 88%, transparent);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.header-title-wrap {
  min-width: 0;
}

.app-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.app-subtitle {
  margin: var(--space-1) 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.stat-chip {
  max-width: 320px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-panel-soft);
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workbench {
  --left-width: 300px;
  --right-width: 360px;
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  min-height: 0;
  flex: 1;
}

.panel {
  min-height: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-elevated) 84%, transparent);
  box-shadow: var(--shadow-panel);
}

.panel-left,
.panel-right {
  flex-shrink: 0;
  will-change: width;
}

.panel-left {
  width: var(--left-width);
}

.panel-right {
  width: var(--right-width);
}

.panel-center {
  flex: 1;
  min-width: 0;
}

.splitter {
  width: 10px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--border-subtle) 60%, transparent),
    color-mix(in srgb, var(--border-strong) 80%, transparent)
  );
  cursor: col-resize;
  transition: background 0.2s ease;
}

.splitter:hover {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent) 45%, transparent),
    color-mix(in srgb, var(--accent-strong) 60%, transparent)
  );
}

.is-resizing .panel {
  box-shadow: none;
}

.is-resizing .panel-center iframe {
  pointer-events: none;
}
</style>
