<template>
  <div class="paper-list">
    <div class="paper-list-header">
      <h3>论文列表</h3>
      <button class="add-button" @click="addPaper">添加</button>
    </div>
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
  content?: string
  path: string
}

interface Props {
  papers: Paper[]
  selectedPaper: Paper | null
}

defineProps<Props>()

const emit = defineEmits<{
  selectPaper: [paper: Paper]
  addPaper: []
}>()

const selectPaper = (paper: Paper): void => {
  emit('selectPaper', paper)
}

const addPaper = (): void => {
  emit('addPaper')
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

.paper-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h3 {
  margin: 0;
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
}

.add-button {
  background-color: #0e639c;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.add-button:hover {
  background-color: #1177bb;
}

.add-button:active {
  background-color: #0c5a8a;
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
