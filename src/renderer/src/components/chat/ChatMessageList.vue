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
            <div class="message-text markdown-body" v-html="renderMarkdown(message.content)"></div>
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
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
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
const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true
})

const defaultLinkOpenRenderer = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self): string => {
  const token = tokens[index]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpenRenderer
    ? defaultLinkOpenRenderer(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}

const renderMarkdown = (content: string): string => {
  return DOMPurify.sanitize(markdown.render(content), {
    ADD_ATTR: ['target']
  })
}

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
  font-size: 13px;
  line-height: 1.62;
  overflow-wrap: anywhere;
}

.markdown-body :deep(*) {
  max-width: 100%;
}

.markdown-body :deep(*:first-child) {
  margin-top: 0;
}

.markdown-body :deep(*:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre),
.markdown-body :deep(table) {
  margin: 0 0 0.7em;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 0.8em 0 0.45em;
  line-height: 1.28;
  font-weight: 700;
}

.markdown-body :deep(h1) {
  font-size: 18px;
}

.markdown-body :deep(h2) {
  font-size: 16px;
}

.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 14px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.45em;
}

.markdown-body :deep(li + li) {
  margin-top: 0.25em;
}

.markdown-body :deep(blockquote) {
  padding: 2px 0 2px 10px;
  border-left: 3px solid color-mix(in srgb, currentColor 28%, transparent);
  color: color-mix(in srgb, currentColor 82%, transparent);
}

.markdown-body :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(code) {
  border-radius: 4px;
  padding: 1px 5px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  font-size: 0.92em;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: color-mix(in srgb, #111827 88%, transparent);
  color: #f8fafc;
}

.markdown-body :deep(pre code) {
  display: block;
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  line-height: 1.55;
}

.markdown-body :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 5px 8px;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}

.markdown-body :deep(img) {
  height: auto;
  border-radius: var(--radius-sm);
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
