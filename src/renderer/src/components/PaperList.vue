<template>
  <div class="paper-list">
    <div class="paper-list-header">
      <div class="header-title-wrap">
        <h3>文献库</h3>
        <p>{{ papers.length }} 篇文献</p>
      </div>
      <button class="add-button" @click="addPaper">导入 PDF</button>
    </div>

    <ul v-if="papers.length > 0" class="paper-items">
      <li
        v-for="paper in papers"
        :key="paper.id"
        :class="{ active: selectedPaper && selectedPaper.id === paper.id }"
        :title="paper.path"
        @click="selectPaper(paper)"
      >
        <div class="paper-headline">
          <div class="paper-title">{{ paper.title }}</div>
          <span :class="['index-badge', `status-${indexStatusMap[paper.id] || 'idle'}`]">
            {{ statusLabelMap[indexStatusMap[paper.id] || 'idle'] }}
          </span>
        </div>
        <div class="paper-path">{{ paper.path }}</div>
      </li>
    </ul>

    <div v-else class="empty-state">
      <div class="empty-title">还没有文献</div>
      <div class="empty-hint">点击右上角“导入 PDF”开始建立文献库</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Paper {
  id: number
  title: string
  path: string
}

interface Props {
  papers: Paper[]
  selectedPaper: Paper | null
  indexStatusMap: Record<number, 'idle' | 'indexing' | 'ready' | 'failed'>
}

defineProps<Props>()

const statusLabelMap = {
  idle: '待索引',
  indexing: '索引中',
  ready: '可问答',
  failed: '索引失败'
} as const

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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: color-mix(in srgb, var(--bg-panel-soft) 76%, transparent);
}

.paper-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.header-title-wrap h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-title-wrap p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.add-button {
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #eef4ff;
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.add-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.add-button:active {
  transform: translateY(0);
}

.paper-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
  min-height: 0;
}

.paper-items::-webkit-scrollbar {
  width: 8px;
}

.paper-items::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--border-strong) 82%, transparent);
  border-radius: 10px;
}

.paper-items li {
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.paper-items li:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: color-mix(in srgb, var(--bg-hover) 78%, transparent);
}

.paper-items li.active {
  border-color: color-mix(in srgb, var(--accent) 64%, transparent);
  background: color-mix(in srgb, var(--bg-active) 78%, transparent);
}

.paper-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  min-width: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-headline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.index-badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
  border: 1px solid var(--border-subtle);
}

.index-badge.status-idle {
  color: var(--text-muted);
}

.index-badge.status-indexing {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.index-badge.status-ready {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 55%, transparent);
}

.index-badge.status-failed {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 55%, transparent);
}

.paper-path {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  flex: 1;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-4);
}

.empty-title {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.empty-hint {
  font-size: 12px;
}
</style>
