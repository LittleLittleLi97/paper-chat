<template>
  <div>
    <div v-if="papers.length > 1" class="collapsible-panel">
      <button class="section-toggle" @click="$emit('toggle-tools')">
        <span>研究工具</span>
        <span class="badge">{{ selectedPaperCount }}</span>
      </button>
      <div v-if="isResearchToolsOpen" class="section-body">
        <div class="compare-paper-list">
          <label v-for="paper in papers" :key="paper.id" class="paper-check-item">
            <input
              type="checkbox"
              :value="paper.id"
              :checked="comparePaperIds.includes(paper.id)"
              @change="$emit('toggle-compare-paper', paper.id)"
            />
            <span>{{ paper.title }}</span>
          </label>
        </div>
        <div class="p1-actions">
          <button
            class="quick-action-btn"
            :disabled="isLoading || !canRunCompare"
            @click="$emit('run-compare')"
          >
            多论文快速对比
          </button>
          <button
            class="quick-action-btn"
            :disabled="isLoading || !canRunBatch"
            @click="$emit('run-batch')"
          >
            批量摘要卡片
          </button>
        </div>
        <div class="tool-hint">{{ researchToolHint }}</div>
      </div>
    </div>

    <div class="quick-actions">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="quick-action-btn"
        :disabled="isLoading"
        @click="$emit('run-quick-action', action.id)"
      >
        {{ action.label }}
      </button>
    </div>
    <div v-if="contextSummary" class="context-summary">{{ contextSummary }}</div>
    <div class="input-wrapper">
      <textarea
        :value="modelValue"
        class="message-input"
        placeholder="输入消息..."
        rows="1"
        @input="onInput"
        @keydown.enter.exact.prevent="$emit('send')"
      ></textarea>
      <button
        class="send-button"
        :disabled="!canSend || isLoading"
        title="发送 (Enter)"
        @click="$emit('send')"
      >
        <img :src="sendIcon" alt="send" />
      </button>
    </div>
    <div class="input-hint">
      <span>Enter 发送，Shift + Enter 换行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import sendIcon from '../../assets/svg/chat-send.svg'
import type { Paper, QuickAction } from './types'

defineProps<{
  papers: Paper[]
  comparePaperIds: number[]
  selectedPaperCount: number
  isResearchToolsOpen: boolean
  canRunCompare: boolean
  canRunBatch: boolean
  researchToolHint: string
  quickActions: QuickAction[]
  contextSummary: string
  canSend: boolean
  isLoading: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'toggle-tools': []
  'toggle-compare-paper': [paperId: number]
  'run-compare': []
  'run-batch': []
  'run-quick-action': [actionId: string]
  send: []
  'update:modelValue': [value: string]
}>()

const onInput = (event: Event): void => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  target.style.height = 'auto'
  target.style.height = `${Math.min(target.scrollHeight, 200)}px`
}
</script>

<style scoped>
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

.compare-paper-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  max-height: 90px;
  overflow: auto;
}

.paper-check-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.p1-actions {
  display: flex;
  gap: var(--space-2);
}

.tool-hint {
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-muted);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.quick-action-btn {
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-panel) 84%, transparent);
  color: var(--text-secondary);
  border-radius: 999px;
  font-size: 11px;
  padding: 5px 9px;
  cursor: pointer;
}

.quick-action-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--text-primary);
}

.quick-action-btn:disabled {
  cursor: not-allowed;
  color: var(--text-muted);
}

.context-summary {
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-input) 86%, transparent);
  padding: 8px 10px;
  transition: border-color 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: color-mix(in srgb, var(--accent) 72%, transparent);
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  max-height: 200px;
  overflow-y: auto;
  font-family: inherit;
  padding: 4px 0;
}

.message-input::placeholder {
  color: var(--text-muted);
}

.send-button {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.2s ease;
  padding: 0;
}

.send-button img {
  width: 20px;
  height: 20px;
}

.send-button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.send-button:disabled {
  background: color-mix(in srgb, var(--bg-hover) 75%, transparent);
  color: var(--text-muted);
  border-color: var(--border-subtle);
  cursor: not-allowed;
}

.input-hint {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}
</style>
