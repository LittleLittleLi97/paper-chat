<template>
  <div class="paper-reader">
    <h3>{{ selectedPaper ? selectedPaper.title : '论文阅读器' }}</h3>
    <div class="content">
      <p v-if="selectedPaper">{{ selectedPaper.content }}</p>
      <p v-else>请选择左侧的一篇论文开始阅读</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Paper {
  id: number
  title: string
  content: string
}

interface Props {
  selectedPaper: Paper | null
}

defineProps<Props>()
</script>

<style scoped>
.paper-reader {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  color: #cccccc;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

h3 {
  margin: 0 0 20px 0;
  color: #cccccc;
  font-size: 16px;
  font-weight: 600;
}

.content {
  line-height: 1.6;
  font-size: 14px;
}
</style>