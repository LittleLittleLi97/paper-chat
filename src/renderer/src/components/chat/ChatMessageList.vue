<template>
  <div ref="messagesContainerRef" class="messages-container">
    <div class="messages-list">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message-item', message.role === 'user' ? 'user-message' : 'ai-message']"
      >
        <div class="message-avatar">
          <img v-if="message.role === 'user'" :src="userIcon" alt="user" />
          <img v-else :src="assistantIcon" alt="assistant" />
        </div>
        <div class="message-content">
          <div :class="['message-bubble', message.role === 'user' ? 'user-bubble' : 'ai-bubble']">
            <div class="message-text">{{ message.content }}</div>
            <div v-if="message.role === 'assistant' && showSaveNote" class="message-actions">
              <button class="mini-action-btn" @click="$emit('save-note', message)">存为笔记</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="message-item ai-message">
        <div class="message-avatar">
          <img :src="assistantIcon" alt="assistant" />
        </div>
        <div class="message-content">
          <div class="message-bubble ai-bubble">
            <div class="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message-banner">
        <img :src="warningIcon" alt="warning" />
        <span>{{ errorMessage }}</span>
        <button class="error-close" @click="$emit('clear-error')">×</button>
      </div>

      <div v-if="messages.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">
          <img :src="emptyIcon" alt="empty" />
        </div>
        <div class="empty-text">开始与 AI 对话</div>
        <div class="empty-hint">你可以提问摘要、翻译、术语解释和阅读建议</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import userIcon from '../../assets/svg/chat-user.svg'
import assistantIcon from '../../assets/svg/chat-assistant.svg'
import warningIcon from '../../assets/svg/chat-warning.svg'
import emptyIcon from '../../assets/svg/chat-empty.svg'
import type { ChatMessage } from './types'

defineProps<{
  messages: ChatMessage[]
  isLoading: boolean
  errorMessage: string
  showSaveNote: boolean
}>()

defineEmits<{
  'save-note': [message: ChatMessage]
  'clear-error': []
}>()

const messagesContainerRef = ref<HTMLDivElement | null>(null)

const scrollToBottom = (): void => {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4);
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--border-strong) 82%, transparent);
  border-radius: 10px;
}

.messages-list {
  max-width: 100%;
  margin: 0 auto;
}

.message-item {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  align-items: flex-start;
}

.message-item.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-avatar img {
  width: 20px;
  height: 20px;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
}

.ai-message .message-avatar {
  background: color-mix(in srgb, var(--bg-hover) 90%, transparent);
}

.message-content {
  flex: 1;
  min-width: 0;
  max-width: 84%;
}

.message-bubble {
  padding: 11px 14px;
  border-radius: var(--radius-md);
  word-wrap: break-word;
  line-height: 1.5;
  border: 1px solid transparent;
}

.user-bubble {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #eef4ff;
  margin-left: auto;
}

.ai-bubble {
  background: color-mix(in srgb, var(--bg-panel) 80%, transparent);
  color: var(--text-primary);
  border-color: var(--border-subtle);
}

.message-text {
  white-space: pre-wrap;
  font-size: 13px;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-6) var(--space-4);
}

.empty-icon img {
  width: 40px;
  height: 40px;
  margin-bottom: var(--space-3);
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 600;
}

.empty-hint {
  font-size: 12px;
}

.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.loading-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.error-message-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 12px;
  margin: var(--space-4);
  background: color-mix(in srgb, var(--danger) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 48%, transparent);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 12px;
}

.error-message-banner img {
  width: 16px;
  height: 16px;
}

.error-message-banner span {
  flex: 1;
}

.error-close {
  background: transparent;
  border: none;
  color: var(--danger);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
</style>
