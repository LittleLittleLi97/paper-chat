<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <div class="messages-container" ref="messagesContainerRef">
      <div class="messages-list">
        <!-- 真实消息列表 -->
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message-item', message.role === 'user' ? 'user-message' : 'ai-message']"
        >
          <div class="message-avatar">
            <svg v-if="message.role === 'user'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
              <path d="M10 12C5.58172 12 2 14.2386 2 17V20H18V17C18 14.2386 14.4183 12 10 12Z" fill="currentColor"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z" fill="currentColor"/>
              <path d="M9 5H11V7H9V5ZM9 9H11V15H9V9Z" fill="currentColor"/>
            </svg>
          </div>
          <div class="message-content">
            <div :class="['message-bubble', message.role === 'user' ? 'user-bubble' : 'ai-bubble']">
              <div class="message-text">{{ message.content }}</div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="message-item ai-message">
          <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z" fill="currentColor"/>
              <path d="M9 5H11V7H9V5ZM9 9H11V15H9V9Z" fill="currentColor"/>
            </svg>
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

        <!-- 错误消息 -->
        <div v-if="errorMessage" class="error-message-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z" fill="currentColor"/>
          </svg>
          <span>{{ errorMessage }}</span>
          <button @click="errorMessage = ''" class="error-close">×</button>
        </div>

        <!-- 空状态提示 -->
        <div v-if="messages.length === 0 && !isLoading" class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="empty-text">开始与AI对话</div>
          <div class="empty-hint">输入您的问题，AI将为您提供帮助</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="inputText"
          class="message-input"
          placeholder="输入消息..."
          rows="1"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewLine"
          @input="handleInput"
          ref="inputRef"
        ></textarea>
        <button 
          class="send-button"
          :disabled="!canSend || isLoading"
          @click="handleSend"
          title="发送 (Enter)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="input-hint">
        <span>Enter 发送，Shift + Enter 换行</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { AIService, type ChatMessage as AIChatMessage } from '../../../services/aiService'
import { ChatStorage, type ChatMessage } from '../../../services/chatStorage'

// 消息列表
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const messagesContainerRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')

// 是否可以发送
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !isLoading.value
})

// 处理输入
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  // 自动调整高度
  target.style.height = 'auto'
  target.style.height = `${Math.min(target.scrollHeight, 200)}px`
}

// 处理换行
const handleNewLine = () => {
  // Shift + Enter 时插入换行，不做任何处理
}

// 处理发送
const handleSend = async () => {
  if (!canSend.value) return
  
  const userContent = inputText.value.trim()
  if (!userContent) return

  // 清除错误消息
  errorMessage.value = ''

  // 创建用户消息
  const userMessage: Omit<ChatMessage, 'id'> = {
    role: 'user',
    content: userContent,
    timestamp: Date.now(),
  }

  // 保存用户消息到 IndexedDB
  try {
    await ChatStorage.saveMessage(userMessage)
  } catch (error) {
    console.error('保存用户消息失败:', error)
    errorMessage.value = '保存消息失败，请重试'
    return
  }

  // 添加到消息列表
  const savedUserMessage: ChatMessage = {
    ...userMessage,
    id: Date.now(), // 临时 ID，实际会从 IndexedDB 获取
  }
  messages.value.push(savedUserMessage)

  // 清空输入框
  inputText.value = ''
  
  // 重置输入框高度
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }

  // 滚动到底部
  scrollToBottom()

  // 设置加载状态
  isLoading.value = true

  try {
    // 构建消息历史（用于 AI 调用）
    const chatHistory: AIChatMessage[] = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // 调用 AI 服务
    const aiResponse = await AIService.chat(chatHistory)

    // 创建 AI 消息
    const aiMessage: Omit<ChatMessage, 'id'> = {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now(),
    }

    // 保存 AI 消息到 IndexedDB
    await ChatStorage.saveMessage(aiMessage)

    // 添加到消息列表
    const savedAiMessage: ChatMessage = {
      ...aiMessage,
      id: Date.now(), // 临时 ID
    }
    messages.value.push(savedAiMessage)

    // 滚动到底部
    scrollToBottom()
  } catch (error) {
    console.error('AI 调用失败:', error)
    errorMessage.value = error instanceof Error ? error.message : 'AI 服务调用失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

// 加载历史记录
const loadHistory = async () => {
  try {
    const historyMessages = await ChatStorage.getAllMessages()
    messages.value = historyMessages
    // 加载后滚动到底部
    scrollToBottom()
  } catch (error) {
    console.error('加载历史记录失败:', error)
    errorMessage.value = '加载历史记录失败'
  }
}

// 组件挂载时加载历史记录
onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: #2d2d2d;
  border-left: 1px solid #404040;
  overflow: hidden;
}

/* 消息列表区域 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #2d2d2d;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #505050;
}

.messages-list {
  max-width: 100%;
  margin: 0 auto;
}

/* 消息项 */
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.message-item.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #404040;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: #0066cc;
}

.ai-message .message-avatar {
  background: #404040;
}

.message-content {
  flex: 1;
  min-width: 0;
  max-width: 80%;
}

/* 消息气泡 */
.message-bubble {
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
  line-height: 1.5;
}

.user-bubble {
  background: #0066cc;
  color: #fff;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.ai-bubble {
  background: #404040;
  color: #fff;
  border-bottom-left-radius: 4px;
}

.message-text {
  white-space: pre-wrap;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: #888;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  color: #555;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #aaa;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-hint {
  font-size: 14px;
  color: #777;
}

/* 输入区域 */
.input-container {
  padding: 16px;
  background: #2d2d2d;
  border-top: 1px solid #404040;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #404040;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #0066cc;
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 200px;
  overflow-y: auto;
  font-family: inherit;
  padding: 4px 0;
}

.message-input::placeholder {
  color: #888;
}

.message-input::-webkit-scrollbar {
  width: 6px;
}

.message-input::-webkit-scrollbar-track {
  background: transparent;
}

.message-input::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.send-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #0066cc;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
  padding: 0;
}

.send-button:hover:not(:disabled) {
  background: #0052a3;
}

.send-button:disabled {
  background: #404040;
  color: #666;
  cursor: not-allowed;
  opacity: 0.5;
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #777;
  text-align: center;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.loading-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #888;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 错误消息横幅 */
.error-message-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 14px;
}

.error-message-banner svg {
  flex-shrink: 0;
}

.error-message-banner span {
  flex: 1;
}

.error-close {
  background: transparent;
  border: none;
  color: #ff6b6b;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.error-close:hover {
  background: rgba(255, 107, 107, 0.2);
}
</style>