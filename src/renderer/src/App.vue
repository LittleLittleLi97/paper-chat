<template>
  <div class="app-container">
    <div class="sidebar">
      <PaperList :papers="papers" :selected-paper="selectedPaper" @select-paper="selectPaper" />
    </div>
    <div class="main-content">
      <PaperReader :selected-paper="selectedPaper" />
    </div>
    <div class="panel">
      <AIChat />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PaperList from './components/PaperList.vue'
import PaperReader from './components/PaperReader.vue'
import AIChat from './components/AIChat.vue'

interface Paper {
  id: number
  title: string
  content: string
}

const selectedPaper = ref<Paper | null>(null)

const papers = ref<Paper[]>([
  { id: 1, title: '论文1: 人工智能的发展', content: '人工智能（Artificial Intelligence，简称AI）是指由人制造出来的系统所表现出来的智能。通常，人工智能是指通过普通计算机程序来呈现人类智能的技术。人工智能的发展历程可以追溯到20世纪中叶，当时计算机科学家开始探索如何让机器模拟人类的思维过程。\n\n人工智能的发展经历了几个阶段：\n1. 早期阶段（1950s-1960s）：图灵测试和专家系统\n2. 知识工程阶段（1970s-1980s）：知识表示和推理\n3. 机器学习阶段（1990s-现在）：神经网络和深度学习\n\n近年来，随着计算能力的提升和大数据的可用性，人工智能取得了重大突破，在图像识别、自然语言处理、自动驾驶等领域取得了显著进展。' },
  { id: 2, title: '论文2: 机器学习基础', content: '机器学习是人工智能的一个子领域，它使计算机能够从数据中学习，而无需显式编程。机器学习算法可以分为三大类：监督学习、无监督学习和强化学习。\n\n监督学习使用标记的训练数据来学习输入到输出的映射。例如，分类和回归问题。\n\n无监督学习则是在没有标记的数据中发现隐藏的模式，如聚类和降维。\n\n强化学习通过与环境的交互来学习最优策略，适用于游戏和机器人控制等领域。\n\n机器学习的核心是算法和数据。常见的算法包括线性回归、决策树、支持向量机、神经网络等。随着深度学习的兴起，神经网络已成为最强大的机器学习工具之一。' },
])

const selectPaper = (paper: Paper) => {
  selectedPaper.value = paper
}
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
