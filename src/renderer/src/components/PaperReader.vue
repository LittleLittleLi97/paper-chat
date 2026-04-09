<template>
  <div class="pdf-viewer-container">
    <div v-if="isLoading" class="status-message">正在加载 PDF...</div>
    <div v-else-if="errorMessage" class="status-message error-message">{{ errorMessage }}</div>
    <div v-else-if="!pdfBlobUrl" class="status-message">请选择一个 PDF 文件</div>
    <iframe
      v-else
      class="pdf-iframe"
      :src="pdfBlobUrl"
      title="PDF 预览"
    ></iframe>
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

interface Props {
  selectedPaper: Paper | null
}

const props = defineProps<Props>()

const isLoading = ref(false)
const errorMessage = ref('')
const pdfBlobUrl = ref('')

const clearBlobUrl = () => {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
    pdfBlobUrl.value = ''
  }
}

const resetState = () => {
  isLoading.value = false
  errorMessage.value = ''
  clearBlobUrl()
}

const loadPDF = async (path: string) => {
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

onUnmounted(() => {
  clearBlobUrl()
})
</script>

<style scoped>
.pdf-viewer-container {
  width: 100%;
  height: 100%;
  background: #525252;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #ffffff;
  font-size: 16px;
  padding: 20px;
  box-sizing: border-box;
}

.error-message {
  color: #ff6b6b;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}
</style>
