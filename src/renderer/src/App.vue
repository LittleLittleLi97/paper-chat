<template>
  <div class="app-container">
    <div class="sidebar">
      <PaperList
        :papers="papers"
        :selected-paper="selectedPaper"
        @select-paper="selectPaper"
        @add-paper="addPaper"
      />
    </div>
    <div class="main-content">
      <PaperReader :selected-paper="selectedPaper" />
    </div>
    <div class="panel">
      <AIChat :selected-paper="selectedPaper" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PaperList from './components/PaperList.vue'
import PaperReader from './components/PaperReader.vue'
import AIChat from './components/AIChat.vue'

interface Paper {
  id: number
  title: string
  path: string
}

const selectedPaper = ref<Paper | null>(null)

const papers = ref<Paper[]>([])

const selectPaper = (paper: Paper) => {
  selectedPaper.value = paper
}

const addPaper = async (): Promise<void> => {
  try {
    const filePaths = await window.api.file.selectPDF()
    if (filePaths && filePaths.length > 0) {
      // 处理选择的PDF文件
      for (const path of filePaths) {
        // 从路径中提取文件名作为标题
        const title = path.split('\\').pop() || path
        // 创建新的paper对象（不包含id，由数据库自动生成）
        const newPaper: Omit<Paper, 'id'> = {
          title,
          path
        }
        // 保存到数据库
        const id = await window.api.paper.savePaper(newPaper)
        // 向量化论文内容（异步，不阻塞UI）
        window.api.rag.addPaper(id, path).catch((err) => {
          console.error(`论文向量化失败 (id=${id}):`, err)
        })
        // 创建包含id的paper对象
        const paperWithId: Paper = {
          ...newPaper,
          id
        }
        // 添加到papers数组
        papers.value.push(paperWithId)
      }
    }
  } catch (error) {
    console.error('添加PDF文件失败:', error)
  }
}

// 初始化函数，从数据库加载PDF文件
const initPapers = async (): Promise<void> => {
  try {
    const loadedPapers = await window.api.paper.getAllPapers()
    if (loadedPapers && loadedPapers.length > 0) {
      papers.value = loadedPapers
    }
  } catch (error) {
    console.error('加载PDF文件失败:', error)
  }
}

// 组件挂载时初始化
onMounted(async (): Promise<void> => {
  await initPapers()
})
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #1e1e1e; /* VSCode dark theme background */
  color: #cccccc;
}

.sidebar {
  width: 250px;
  background-color: #252526;
  border-right: 1px solid #3e3e42;
}

.main-content {
  flex: 1;
  background-color: #1e1e1e;
  border-right: 1px solid #3e3e42;
}

.panel {
  width: 300px;
  background-color: #252526;
}
</style>
