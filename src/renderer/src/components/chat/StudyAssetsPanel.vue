<template>
  <div class="assets-panel">
    <div class="collapsible-panel">
      <button class="section-toggle" @click="$emit('toggle-section', 'notes')">
        <span>阅读笔记</span>
        <span class="badge">{{ notes.length }}</span>
      </button>
      <div v-if="isNotesOpen" class="section-body notes-scroll">
        <div v-if="notes.length === 0" class="study-empty">暂无笔记</div>
        <div v-for="note in notes" :key="note.id" class="study-item">
          <div class="study-item-content">{{ note.content }}</div>
          <div class="study-item-meta">{{ formatTime(note.timestamp) }}</div>
        </div>
      </div>
    </div>

    <div class="collapsible-panel">
      <button class="section-toggle" @click="$emit('toggle-section', 'terms')">
        <span>术语卡片</span>
        <span class="badge">{{ termCards.length }}</span>
      </button>
      <div v-if="isTermsOpen" class="section-body">
        <div class="study-title-row">
          <div class="study-empty">单卡浏览</div>
          <button
            class="mini-action-btn"
            :disabled="isLoading"
            @click="$emit('generate-term-cards')"
          >
            从会话生成
          </button>
        </div>
        <div v-if="!currentTermCard" class="study-empty">暂无术语卡片</div>
        <div v-else class="study-item">
          <div class="study-item-content">
            <strong>{{ currentTermCard.term }}</strong
            >：{{ currentTermCard.definition }}
          </div>
          <div class="carousel-controls">
            <button class="review-btn" :disabled="!hasPrevCard" @click="$emit('go-prev-term-card')">
              上一张
            </button>
            <span class="study-item-meta">{{ termCardCursor + 1 }} / {{ termCards.length }}</span>
            <button class="review-btn" :disabled="!hasNextCard" @click="$emit('go-next-term-card')">
              下一张
            </button>
            <button class="review-btn" @click="$emit('mark-reviewed', currentTermCard)">
              已复习 {{ currentTermCard.reviewCount || 0 }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TermCard, StudyNote } from './types'

defineProps<{
  notes: StudyNote[]
  termCards: TermCard[]
  currentTermCard: TermCard | null
  termCardCursor: number
  hasPrevCard: boolean
  hasNextCard: boolean
  isLoading: boolean
  isNotesOpen: boolean
  isTermsOpen: boolean
}>()

defineEmits<{
  'toggle-section': [section: 'notes' | 'terms']
  'generate-term-cards': []
  'go-prev-term-card': []
  'go-next-term-card': []
  'mark-reviewed': [card: TermCard]
}>()

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.assets-panel {
  margin-bottom: 8px;
}

.collapsible-panel {
  margin-bottom: 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-panel-soft) 72%, transparent);
}

.section-toggle {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.badge {
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 10px;
  color: var(--text-muted);
  min-width: 20px;
  text-align: center;
  padding: 1px 6px;
}

.section-body {
  border-top: 1px solid var(--border-subtle);
  padding: 8px;
}

.notes-scroll {
  max-height: 160px;
  overflow-y: auto;
}

.study-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.study-item {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px;
  margin-bottom: 8px;
  background: color-mix(in srgb, var(--bg-panel) 88%, transparent);
}

.study-item-content {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
  white-space: pre-wrap;
}

.study-item-meta {
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-muted);
}

.study-empty {
  font-size: 11px;
  color: var(--text-muted);
}

.mini-action-btn {
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-panel-soft) 86%, transparent);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}

.review-btn {
  margin-top: 6px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 3px 7px;
  font-size: 10px;
  cursor: pointer;
}

.carousel-controls {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
