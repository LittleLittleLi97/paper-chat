<template>
  <div class="paper-list">
    <h3>论文列表</h3>
    <ul>
      <li
        v-for="paper in papers"
        :key="paper.id"
        :class="{ active: selectedPaper && selectedPaper.id === paper.id }"
        @click="selectPaper(paper)"
      >
        {{ paper.title }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface Paper {
  id: number
  title: string
  content: string
}

interface Props {
  papers: Paper[]
  selectedPaper: Paper | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectPaper: [paper: Paper]
}>()

const selectPaper = (paper: Paper) => {
  emit('selectPaper', paper)
}
</script>

<style scoped>
.paper-list {
  width: 100%;
  height: 100%;
  background-color: #252526;
  color: #cccccc;
  padding: 10px;
  box-sizing: border-box;
}

h3 {
  margin: 0 0 10px 0;
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 3px;
  margin-bottom: 2px;
  font-size: 13px;
  transition: background-color 0.1s;
}

li:hover {
  background-color: #37373d;
}

li.active {
  background-color: #37373d;
  border-left: 2px solid #007acc;
}
</style>