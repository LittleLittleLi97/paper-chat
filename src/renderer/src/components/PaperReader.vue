<template>
  <div class="reader-container">
    <div class="reader-header">
      <h3 class="reader-title">{{ selectedPaper ? selectedPaper.title : '阅读区' }}</h3>
      <span class="reader-subtitle">{{ selectedPaper ? 'PDF 预览' : '等待选择文献' }}</span>
    </div>
    <div class="reader-context-bar">
      <div class="context-field">
        <label>当前页</label>
        <input
          type="number"
          min="1"
          class="page-input"
          v-model.number="currentPageInput"
          @change="emitContext"
          placeholder="例如 3"
        />
      </div>
      <div class="context-field text-field">
        <label>选中文本（可粘贴）</label>
        <textarea
          v-model="selectedTextInput"
          class="excerpt-input"
          rows="2"
          @change="emitContext"
          placeholder="粘贴你正在阅读的段落，问答会优先基于该片段解释"
        ></textarea>
      </div>
      <button class="context-btn" @click="emitContext">同步到问答</button>
    </div>

    <div class="reader-body">
      <div v-if="isLoading" class="status-message">正在加载 PDF...</div>
      <div v-else-if="errorMessage" class="status-message error-message">{{ errorMessage }}</div>
      <div v-else-if="!pdfBlobUrl" class="status-message">请选择一个 PDF 文件</div>
      <div v-else class="iframe-shell">
        <iframe class="pdf-iframe" :src="pdfBlobUrl" title="PDF 预览"></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

interface Paper {
  id: number
  title: string
  content?: string
  path: string
}

interface ReadingContext {
  currentPage: number | null
  selectedText: string
}

interface Props {
  selectedPaper: Paper | null
  readingContext: ReadingContext
}

const props = defineProps<Props>()
const emit = defineEmits<{
  updateContext: [payload: ReadingContext]
}>()

const isLoading = ref(false)
const errorMessage = ref('')
const pdfBlobUrl = ref('')
const currentPageInput = ref<number | null>(props.readingContext.currentPage ?? null)
const selectedTextInput = ref(props.readingContext.selectedText ?? '')

const emitContext = (): void => {
  const normalizedPage =
    typeof currentPageInput.value === 'number' && currentPageInput.value > 0
      ? Math.floor(currentPageInput.value)
      : null
  emit('updateContext', {
    currentPage: normalizedPage,
    selectedText: selectedTextInput.value.trim()
  })
}

const clearBlobUrl = (): void => {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
    pdfBlobUrl.value = ''
  }
}

const resetState = (): void => {
  isLoading.value = false
  errorMessage.value = ''
  clearBlobUrl()
}

const loadPDF = async (path: string): Promise<void> => {
  isLoading.value = true
  errorMessage.value = ''
  clearBlobUrl()

  try {
    const bytes = await window.api.paper.readPDF(path)
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
    pdfBlobUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    errorMessage.value = `PDF 加载失败: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.selectedPaper,
  async (paper) => {
    if (!paper?.path) {
      resetState()
      return
    }
    await loadPDF(paper.path)
  },
  { immediate: true }
)

watch(
  () => props.readingContext,
  (next) => {
    currentPageInput.value = next.currentPage
    selectedTextInput.value = next.selectedText
  },
  { deep: true }
)

onUnmounted(() => {
  clearBlobUrl()
})
</script>

<style scoped>
.reader-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--bg-panel) 74%, transparent);
}

.reader-header {
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.reader-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reader-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.reader-body {
  flex: 1;
  min-height: 0;
  padding: var(--space-4);
}

.reader-context-bar {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-4);
}

.context-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-field label {
  font-size: 11px;
  color: var(--text-muted);
}

.text-field {
  flex: 1;
}

.page-input,
.excerpt-input {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-input) 85%, transparent);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  padding: 6px 8px;
}

.page-input {
  width: 88px;
}

.excerpt-input {
  width: 100%;
  resize: vertical;
}

.context-btn {
  margin-top: 22px;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  font-size: 12px;
  cursor: pointer;
}

.status-message {
  width: 100%;
  height: 100%;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-panel-soft) 70%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: var(--space-4);
}

.error-message {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 50%, transparent);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.iframe-shell {
  width: 100%;
  height: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #ffffff;
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
