<template>
  <div class="pdf-viewer-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="zoomOut" :disabled="scale <= 0.25" title="缩小">−</button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" :disabled="scale >= 3" title="放大">+</button>
        <button @click="fitWidth" title="适应宽度">适应宽度</button>
        <button @click="fitHeight" title="适应高度">适应高度</button>
        <button @click="fitPage" title="适应页面">适应页面</button>
      </div>
      
      <div class="toolbar-group">
        <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
      </div>

      <div class="toolbar-group">
        <button 
          @click="applyHighlight" 
          title="高亮选中文本"
        >
          高亮
        </button>
        <button 
          @click="setTool('select')" 
          :class="{ active: currentTool === 'select' }"
          title="选择工具"
        >
          选择
        </button>
        <button @click="clearAnnotations" title="清除标注">清除</button>
      </div>
    </div>

    <!-- PDF 显示区域 -->
    <div class="pdf-viewport" ref="viewportRef" @scroll="handleScroll">
      <div v-if="isLoading" class="loading-message">正在加载 PDF...</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-show="!isLoading && !errorMessage" class="pdf-pages-container">
        <div 
          v-for="pageNum in totalPages" 
          :key="pageNum"
          class="pdf-page-wrapper"
          :data-page="pageNum"
        >
          <canvas 
            :ref="el => setPageCanvas(pageNum, el)"
            class="pdf-canvas"
          ></canvas>
          <!-- 文本层 -->
          <div 
            :ref="el => setTextLayer(pageNum, el)"
            class="text-layer"
          ></div>
          <!-- 标注层 -->
          <canvas 
            :ref="el => setAnnotationCanvas(pageNum, el)"
            class="annotation-canvas"
          ></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// PDF 文档路径 - 使用静态导入
import pdfFileUrl from '../assets/test.pdf?url'

const pdfUrl = pdfFileUrl

// 加载状态
const isLoading = ref(false)
const errorMessage = ref('')

// 状态管理
const viewportRef = ref<HTMLDivElement | null>(null)

// 多页面 Canvas 引用
const pageCanvases = ref<Map<number, HTMLCanvasElement>>(new Map())
const annotationCanvases = ref<Map<number, HTMLCanvasElement>>(new Map())
const textLayers = ref<Map<number, HTMLDivElement>>(new Map())

// 设置页面 Canvas 引用
const setPageCanvas = (pageNum: number, el: any) => {
  if (el && el instanceof HTMLCanvasElement) {
    pageCanvases.value.set(pageNum, el)
  } else {
    pageCanvases.value.delete(pageNum)
  }
}

// 设置标注 Canvas 引用
const setAnnotationCanvas = (pageNum: number, el: any) => {
  if (el && el instanceof HTMLCanvasElement) {
    annotationCanvases.value.set(pageNum, el)
  } else {
    annotationCanvases.value.delete(pageNum)
  }
}

// 设置文本层引用
const setTextLayer = (pageNum: number, el: any) => {
  if (el && el instanceof HTMLDivElement) {
    textLayers.value.set(pageNum, el)
  } else {
    textLayers.value.delete(pageNum)
  }
}

// 使用 shallowRef 避免 Vue 3 代理 PDF.js 对象（包含私有字段）
const pdfDoc = shallowRef<any>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const pageInput = ref(1)
const scale = ref(1)
const pageRendered = ref(false)

// 渲染任务管理（用于取消之前的渲染任务）
const renderTasks = ref<Map<number, any>>(new Map())
let renderDebounceTimer: number | null = null

// 标注相关
const currentTool = ref<'select' | 'highlight'>('select')
const annotations = ref<Map<number, any[]>>(new Map())

// 加载 PDF 文档
const loadPDF = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    console.log('开始加载 PDF，URL:', pdfUrl)
    const loadingTask = pdfjsLib.getDocument({ 
      url: pdfUrl,
      verbosity: 0, // 减少控制台输出
      useSystemFonts: false,
      standardFontDataUrl: undefined
    })
    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    currentPage.value = 1
    pageInput.value = 1
    console.log('PDF 加载成功，总页数:', totalPages.value)
    
    // 等待一下确保文档完全初始化
    await new Promise(resolve => setTimeout(resolve, 100))
    
    await nextTick() // 确保 DOM 已更新
    await renderAllPages()
  } catch (error) {
    console.error('PDF 加载失败:', error)
    errorMessage.value = `PDF 加载失败: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoading.value = false
  }
}

// 渲染单个页面
const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value) {
    console.warn('PDF 文档未加载')
    return
  }
  
  // 等待 Canvas 元素准备好（最多等待 1 秒）
  let retries = 10
  while (!pageCanvases.value.has(pageNum) && retries > 0) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    retries--
  }
  
  const canvas = pageCanvases.value.get(pageNum)
  if (!canvas) {
    console.warn(`第 ${pageNum} 页 Canvas 元素未准备好`)
    return
  }

  try {
    // 获取页面对象
    const page = await pdfDoc.value.getPage(pageNum)
    
    // 确保页面对象有效
    if (!page || typeof page.getViewport !== 'function') {
      throw new Error('页面对象无效或未正确初始化')
    }
    
    // 添加小延迟确保页面完全初始化
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const dpr = window.devicePixelRatio || 1
    
    // 先计算基础 viewport（scale = 1）用于显示尺寸
    const baseViewport = page.getViewport({ scale: 1 })
    
    // 计算实际渲染的 viewport（包含缩放和设备像素比）
    const renderScale = scale.value * dpr
    const viewport = page.getViewport({ scale: renderScale })
    
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      console.error('无法获取 Canvas 2D 上下文')
      return
    }

    // 设置 Canvas 实际像素尺寸（用于渲染）
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    // 设置 Canvas 显示尺寸（CSS 像素）
    canvas.style.width = `${baseViewport.width * scale.value}px`
    canvas.style.height = `${baseViewport.height * scale.value}px`

    // 清除画布并设置白色背景
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // 创建渲染上下文
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      enableWebGL: false
    }

    // 取消之前的渲染任务（如果存在）
    const existingTask = renderTasks.value.get(pageNum)
    if (existingTask) {
      try {
        existingTask.cancel()
      } catch (e) {
        // 忽略取消错误
      }
      renderTasks.value.delete(pageNum)
    }
    
    // 渲染页面
    const renderTask = page.render(renderContext)
    renderTasks.value.set(pageNum, renderTask)
    
    try {
      await renderTask.promise
      console.log(`第 ${pageNum} 页渲染完成`)
    } catch (error: any) {
      // 如果是取消错误，忽略
      if (error?.name === 'RenderingCancelledException') {
        console.log(`第 ${pageNum} 页渲染已取消`)
        return
      }
      throw error
    } finally {
      renderTasks.value.delete(pageNum)
    }
    
    // 渲染文本层
    await nextTick()
    await renderTextLayer(pageNum, page, baseViewport)
    
    // 重新渲染标注
    await nextTick()
    renderPageAnnotations(pageNum)
  } catch (error) {
    console.error(`第 ${pageNum} 页渲染失败:`, error)
  }
}

// 渲染所有页面
const renderAllPages = async () => {
  if (!pdfDoc.value || totalPages.value === 0) return
  
  pageRendered.value = false
  
  // 并行渲染所有页面（限制并发数避免性能问题）
  const concurrency = 3
  for (let i = 0; i < totalPages.value; i += concurrency) {
    const pagePromises = []
    for (let j = 0; j < concurrency && i + j < totalPages.value; j++) {
      pagePromises.push(renderPage(i + j + 1))
    }
    await Promise.all(pagePromises)
  }
  
  pageRendered.value = true
  console.log('所有页面渲染完成')
}


// 缩放功能
const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.25, 3)
  renderAllPages()
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.25, 0.25)
  renderAllPages()
}

const fitWidth = async () => {
  if (!pdfDoc.value || !viewportRef.value) return
  const page = await pdfDoc.value.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const containerWidth = viewportRef.value.clientWidth - 40
  scale.value = containerWidth / viewport.width
  await renderAllPages()
}

const fitHeight = async () => {
  if (!pdfDoc.value || !viewportRef.value) return
  const page = await pdfDoc.value.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const containerHeight = viewportRef.value.clientHeight - 40
  scale.value = containerHeight / viewport.height
  await renderAllPages()
}

const fitPage = async () => {
  if (!pdfDoc.value || !viewportRef.value) return
  const page = await pdfDoc.value.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const containerWidth = viewportRef.value.clientWidth - 40
  const containerHeight = viewportRef.value.clientHeight - 40
  scale.value = Math.min(containerWidth / viewport.width, containerHeight / viewport.height)
  await renderAllPages()
}

// 滚动功能 - 计算当前可见的页面
const calculateVisiblePage = () => {
  if (!viewportRef.value) return
  
  const scrollTop = viewportRef.value.scrollTop
  const viewportHeight = viewportRef.value.clientHeight
  const centerY = scrollTop + viewportHeight / 2
  
  // 遍历所有页面，找到中心点所在的页面
  let currentTop = 0
  for (let i = 1; i <= totalPages.value; i++) {
    const pageWrapper = viewportRef.value.querySelector(`[data-page="${i}"]`) as HTMLElement
    if (pageWrapper) {
      const pageHeight = pageWrapper.offsetHeight
      if (centerY >= currentTop && centerY < currentTop + pageHeight) {
        currentPage.value = i
        return
      }
      currentTop += pageHeight
    }
  }
  
  // 如果没找到，使用最后一个页面
  if (currentTop > 0) {
    currentPage.value = totalPages.value
  }
}

// 滚动事件处理（使用 requestAnimationFrame 优化性能）
let scrollTimer: number | null = null
const handleScroll = () => {
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer)
  }
  scrollTimer = requestAnimationFrame(() => {
    calculateVisiblePage()
  })
}

// 工具切换
const setTool = (tool: 'select' | 'highlight') => {
  currentTool.value = tool
}

// 渲染文本层
const renderTextLayer = async (pageNum: number, page: any, baseViewport: any) => {
  const textLayer = textLayers.value.get(pageNum)
  if (!textLayer) return

  try {
    const textContent = await page.getTextContent()
    textLayer.innerHTML = ''
    
    // 设置文本层尺寸与Canvas显示尺寸一致
    const canvas = pageCanvases.value.get(pageNum)
    if (canvas) {
      textLayer.style.width = canvas.style.width
      textLayer.style.height = canvas.style.height
    } else {
      textLayer.style.width = `${baseViewport.width * scale.value}px`
      textLayer.style.height = `${baseViewport.height * scale.value}px`
    }
    
    textLayer.style.left = '0px'
    textLayer.style.top = '0px'

    const textContentItems = textContent.items
    for (let i = 0; i < textContentItems.length; i++) {
      const item = textContentItems[i]
      const tx = item.transform
      const span = document.createElement('span')
      span.textContent = item.str
      span.style.position = 'absolute'
      
      // PDF坐标系：左下角为原点，Y轴向上
      // 屏幕坐标系：左上角为原点，Y轴向下
      // tx[4]是X坐标，tx[5]是Y坐标（PDF坐标系，通常是基线位置）
      const pdfX = tx[4]
      const pdfY = tx[5]
      const fontSize = Math.abs(tx[0]) * scale.value
      
      // 转换为屏幕坐标
      // tx[5]是基线位置，需要向上调整以对齐文本顶部
      // 根据实际测试，需要减去字体大小的约85-90%来对齐文本顶部
      const screenY = (baseViewport.height - pdfY) * scale.value - fontSize * 0.85
      
      span.style.left = `${pdfX * scale.value}px`
      span.style.top = `${screenY}px`
      
      // 字体大小需要考虑缩放
      span.style.fontSize = `${fontSize}px`
      span.style.fontFamily = item.fontName || 'sans-serif'
      span.style.lineHeight = '1'
      span.style.verticalAlign = 'top'
      span.style.transformOrigin = '0% 0%'
      span.style.whiteSpace = 'pre'
      span.style.cursor = 'text'
      span.style.color = 'transparent'
      span.style.userSelect = 'text'
      textLayer.appendChild(span)
    }
  } catch (error) {
    console.error(`第 ${pageNum} 页文本层渲染失败:`, error)
  }
}

// 保存标注（支持多页面）
const saveAnnotation = (type: string, data: any, pageNum?: number) => {
  const targetPage = pageNum || currentPage.value
  if (!annotations.value.has(targetPage)) {
    annotations.value.set(targetPage, [])
  }
  const pageAnnotations = annotations.value.get(targetPage)!
  pageAnnotations.push({
    type,
    ...data,
    timestamp: Date.now()
  })
  renderPageAnnotations(targetPage)
}

// 渲染单页标注
const renderPageAnnotations = (pageNum: number) => {
  const canvas = annotationCanvases.value.get(pageNum)
  const pdfCanvas = pageCanvases.value.get(pageNum)
  if (!canvas || !pdfCanvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 同步标注画布尺寸与 PDF 画布尺寸
  canvas.width = pdfCanvas.width
  canvas.height = pdfCanvas.height
  canvas.style.width = pdfCanvas.style.width
  canvas.style.height = pdfCanvas.style.height

  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 获取该页的标注
  const pageAnnotations = annotations.value.get(pageNum) || []
  
  pageAnnotations.forEach((annotation: any) => {
    if (annotation.type === 'highlight' && annotation.rects) {
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
      annotation.rects.forEach((rect: any) => {
        // Canvas的实际尺寸已经包含了dpr，所以rect坐标不需要再乘以dpr
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      })
      ctx.restore()
    }
  })
}

// 应用高亮
const applyHighlight = async () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    alert('请先选中要高亮的文本')
    return
  }

  const range = selection.getRangeAt(0)
  const selectedText = range.toString().trim()
  if (!selectedText) {
    alert('请先选中要高亮的文本')
    return
  }

  // 找到选中文本所在的页面
  let targetPage = 1
  let textLayerEl: HTMLDivElement | null = null
  
  for (const [pageNum, layer] of textLayers.value.entries()) {
    if (layer && (layer.contains(range.commonAncestorContainer) || 
                  layer.contains(range.startContainer) ||
                  layer.contains(range.endContainer))) {
      targetPage = pageNum
      textLayerEl = layer
      break
    }
  }

  if (!textLayerEl) {
    // 如果找不到，尝试通过位置判断
    const rangeRects = range.getClientRects()
    if (rangeRects.length > 0 && rangeRects[0]) {
      const firstRect = rangeRects[0]
      for (const [pageNum, layer] of textLayers.value.entries()) {
        const layerRect = layer.getBoundingClientRect()
        if (firstRect.top >= layerRect.top && firstRect.top <= layerRect.bottom) {
          targetPage = pageNum
          textLayerEl = layer
          break
        }
      }
    }
    
    if (!textLayerEl) {
      targetPage = currentPage.value
      textLayerEl = textLayers.value.get(targetPage) || null
    }
  }

  if (!textLayerEl) {
    alert('无法找到文本层')
    return
  }

  try {
    if (!pdfDoc.value) {
      alert('PDF 文档未加载')
      return
    }

    // 获取选中文本的DOM位置
    const rangeRects = range.getClientRects()
    if (rangeRects.length === 0) {
      alert('无法获取选中文本的位置')
      return
    }

    const pdfCanvas = pageCanvases.value.get(targetPage)
    if (!pdfCanvas) {
      alert('无法找到PDF画布')
      return
    }

    const canvasRect = pdfCanvas.getBoundingClientRect()
    const layerRect = textLayerEl.getBoundingClientRect()
    
    // 计算缩放比例（从文本层的显示尺寸到Canvas的实际尺寸）
    const scaleX = pdfCanvas.width / canvasRect.width
    const scaleY = pdfCanvas.height / canvasRect.height

    const rects: Array<{ x: number; y: number; width: number; height: number }> = []
    
    for (let i = 0; i < rangeRects.length; i++) {
      const rect = rangeRects[i]
      if (!rect) continue
      
      // 计算相对于文本层的坐标
      const relativeX = rect.left - layerRect.left
      const relativeY = rect.top - layerRect.top
      
      // 转换为Canvas坐标（相对于Canvas的实际尺寸）
      const x = relativeX * scaleX
      const y = relativeY * scaleY
      const width = rect.width * scaleX
      const height = rect.height * scaleY
      
      rects.push({ x, y, width, height })
    }

    if (rects.length > 0) {
      saveAnnotation('highlight', {
        rects: rects,
        text: selectedText
      }, targetPage)
      
      // 清除选择
      selection.removeAllRanges()
    } else {
      alert('无法确定选中文本的位置')
    }
  } catch (error) {
    console.error('应用高亮失败:', error)
    alert('应用高亮失败，请重试')
  }
}

// 清除标注
const clearAnnotations = () => {
  if (confirm('确定要清除当前页的所有标注吗？')) {
    annotations.value.delete(currentPage.value)
    renderPageAnnotations(currentPage.value)
  }
}

// 监听缩放变化
watch(scale, () => {
  if (pageRendered.value) {
    renderAllPages()
  }
})

// 生命周期
onMounted(async () => {
  // 等待 DOM 完全渲染
  await nextTick()
  // 额外等待确保 Canvas 元素已创建
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // 加载 PDF
  await loadPDF()
})

onUnmounted(() => {
  // 取消所有渲染任务
  renderTasks.value.forEach((task) => {
    try {
      task.cancel()
    } catch (e) {
      // 忽略错误
    }
  })
  renderTasks.value.clear()
  
  // 清理定时器
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer)
  }
})
</script>

<style scoped>
.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #525252;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
  flex-wrap: wrap;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar button {
  padding: 6px 12px;
  background: #404040;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.toolbar button:hover:not(:disabled) {
  background: #505050;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar button.active {
  background: #0066cc;
  border-color: #0052a3;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  color: #fff;
  font-size: 14px;
}

.page-input {
  width: 60px;
  padding: 4px 8px;
  background: #404040;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

.page-info {
  color: #fff;
  font-size: 14px;
}

.pdf-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  background: #525252;
}

.pdf-pages-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.pdf-page-wrapper {
  position: relative;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background: #fff;
  margin-bottom: 20px;
}

.loading-message,
.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-size: 16px;
  padding: 20px;
}

.error-message {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  margin: 20px;
}

.pdf-container {
  position: relative;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background: #fff;
  min-width: 100px;
  min-height: 100px;
}

.pdf-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.annotation-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 2;
}

.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  opacity: 0.2;
  line-height: 1;
  user-select: text;
  pointer-events: auto;
  z-index: 1;
}
</style>