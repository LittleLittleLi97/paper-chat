<template>
  <div class="chat-container">
    <div class="chat-header">
      <h3>AI 助手</h3>
      <span class="chat-context">{{ selectedPaper ? selectedPaper.title : '通用会话' }}</span>
    </div>

    <div ref="messagesContainerRef" class="messages-container">
      <div class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message-item', message.role === 'user' ? 'user-message' : 'ai-message']"
        >
          <div class="message-avatar">
            <svg
              v-if="message.role === 'user'"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
                fill="currentColor"
              />
              <path
                d="M10 12C5.58172 12 2 14.2386 2 17V20H18V17C18 14.2386 14.4183 12 10 12Z"
                fill="currentColor"
              />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z"
                fill="currentColor"
              />
              <path d="M9 5H11V7H9V5ZM9 9H11V15H9V9Z" fill="currentColor" />
            </svg>
          </div>
          <div class="message-content">
            <div :class="['message-bubble', message.role === 'user' ? 'user-bubble' : 'ai-bubble']">
              <div class="message-text">{{ message.content }}</div>
              <div v-if="message.role === 'assistant' && selectedPaper" class="message-actions">
                <button class="mini-action-btn" @click="saveAsNote(message)">存为笔记</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="message-item ai-message">
          <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z"
                fill="currentColor"
              />
              <path d="M9 5H11V7H9V5ZM9 9H11V15H9V9Z" fill="currentColor" />
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

        <div v-if="errorMessage" class="error-message-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z"
              fill="currentColor"
            />
          </svg>
          <span>{{ errorMessage }}</span>
          <button class="error-close" @click="errorMessage = ''">×</button>
        </div>

        <div v-if="messages.length === 0 && !isLoading" class="empty-state">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="empty-text">开始与 AI 对话</div>
          <div class="empty-hint">你可以提问摘要、翻译、术语解释和阅读建议</div>
        </div>
      </div>
    </div>

    <div class="input-container">
      <div v-if="selectedPaper" class="collapsible-panel">
        <button class="section-toggle" @click="toggleSection('notes')">
          <span>阅读笔记</span>
          <span class="badge">{{ notesCount }}</span>
        </button>
        <div v-if="isNotesOpen" class="section-body notes-scroll">
          <div v-if="notes.length === 0" class="study-empty">暂无笔记</div>
          <div v-for="note in notes" :key="note.id" class="study-item">
            <div class="study-item-content">{{ note.content }}</div>
            <div class="study-item-meta">{{ formatTime(note.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div v-if="selectedPaper" class="collapsible-panel">
        <button class="section-toggle" @click="toggleSection('terms')">
          <span>术语卡片</span>
          <span class="badge">{{ termCardsCount }}</span>
        </button>
        <div v-if="isTermsOpen" class="section-body">
          <div class="study-title-row">
            <div class="study-empty">单卡浏览</div>
            <button class="mini-action-btn" :disabled="isLoading" @click="generateTermCards">
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
              <button class="review-btn" :disabled="!hasPrevCard" @click="goPrevTermCard">
                上一张
              </button>
              <span class="study-item-meta">{{ termCardCursor + 1 }} / {{ termCardsCount }}</span>
              <button class="review-btn" :disabled="!hasNextCard" @click="goNextTermCard">
                下一张
              </button>
              <button class="review-btn" @click="markReviewed(currentTermCard)">
                已复习 {{ currentTermCard.reviewCount || 0 }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="papers.length > 1" class="collapsible-panel">
        <button class="section-toggle" @click="toggleSection('tools')">
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
                @change="toggleComparePaper(paper.id)"
              />
              <span>{{ paper.title }}</span>
            </label>
          </div>
          <div class="p1-actions">
            <button
              class="quick-action-btn"
              :disabled="isLoading || !canRunCompare"
              @click="runComparePapers"
            >
              多论文快速对比
            </button>
            <button
              class="quick-action-btn"
              :disabled="isLoading || !canRunBatch"
              @click="runBatchSummaries"
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
          @click="runQuickAction(action.id)"
        >
          {{ action.label }}
        </button>
      </div>
      <div v-if="contextSummary" class="context-summary">{{ contextSummary }}</div>
      <div class="input-wrapper">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="message-input"
          placeholder="输入消息..."
          rows="1"
          @keydown.enter.exact.prevent="handleSendKeydown"
          @keydown.enter.shift.exact="handleNewLine"
          @input="handleInput"
        ></textarea>
        <button
          class="send-button"
          :disabled="!canSend || isLoading"
          title="发送 (Enter)"
          @click="handleSendClick"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
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
import { ref, computed, nextTick, onMounted, watch } from 'vue'

interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  paperId?: number
}

interface Paper {
  id: number
  title: string
  path: string
}

interface Props {
  selectedPaper: Paper | null
  papers: Paper[]
  readingContext: {
    currentPage: number | null
    selectedText: string
  }
}

const props = defineProps<Props>()

interface StudyNote {
  id?: number
  paperId: number
  content: string
  sourceMessage?: string
  timestamp: number
}

interface TermCard {
  id?: number
  paperId: number
  term: string
  definition: string
  reviewCount?: number
  lastReviewedAt?: number | null
  createdAt: number
}

type SectionKey = 'tools' | 'notes' | 'terms'

interface PanelState {
  tools: boolean
  notes: boolean
  terms: boolean
}

const PANEL_STATE_KEY = 'paper-assistant-p1-panels-v1'

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const messagesContainerRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const notes = ref<StudyNote[]>([])
const termCards = ref<TermCard[]>([])
const comparePaperIds = ref<number[]>([])
const isResearchToolsOpen = ref(false)
const isNotesOpen = ref(false)
const isTermsOpen = ref(false)
const termCardCursor = ref(0)

const quickActions = [
  {
    id: 'quick-read',
    label: '3分钟速读',
    prompt: '请对当前论文做3分钟速读，包含研究问题、方法、核心贡献。'
  },
  {
    id: 'section-summary',
    label: '章节摘要',
    prompt: '请按论文结构输出章节摘要，优先给出每章一句话要点。'
  },
  {
    id: 'term-explain',
    label: '术语解释',
    prompt: '请解释当前论文中的关键术语，给出通俗定义和论文语境下含义。'
  },
  {
    id: 'key-findings',
    label: '关键结论提取',
    prompt: '请提取当前论文关键结论，并标注适合写入笔记的要点。'
  }
] as const

const pendingQuickAction = ref<string | undefined>(undefined)

const canSend = computed((): boolean => {
  return inputText.value.trim().length > 0 && !isLoading.value
})

const notesCount = computed((): number => notes.value.length)
const termCardsCount = computed((): number => termCards.value.length)
const selectedPaperCount = computed((): number => comparePaperIds.value.length)
const canRunCompare = computed((): boolean => comparePaperIds.value.length >= 2)
const canRunBatch = computed((): boolean => comparePaperIds.value.length > 0)
const researchToolHint = computed((): string => {
  if (comparePaperIds.value.length === 0) return '至少勾选 1 篇论文可执行批量摘要'
  if (comparePaperIds.value.length === 1) return '再勾选 1 篇可执行多论文对比'
  return '已满足对比与批量摘要条件'
})
const currentTermCard = computed((): TermCard | null => {
  if (termCards.value.length === 0) return null
  const safeCursor = Math.min(Math.max(termCardCursor.value, 0), termCards.value.length - 1)
  return termCards.value[safeCursor] ?? null
})
const hasPrevCard = computed((): boolean => termCardCursor.value > 0)
const hasNextCard = computed((): boolean => termCardCursor.value < termCards.value.length - 1)

const contextSummary = computed((): string => {
  const details: string[] = []
  if (
    typeof props.readingContext.currentPage === 'number' &&
    props.readingContext.currentPage > 0
  ) {
    details.push(`页码 ${props.readingContext.currentPage}`)
  }
  if (props.readingContext.selectedText.trim()) {
    details.push(`已附带选中文本 ${props.readingContext.selectedText.trim().length} 字`)
  }
  return details.length ? `阅读上下文：${details.join('，')}` : ''
})

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const persistPanelState = (): void => {
  const state: PanelState = {
    tools: isResearchToolsOpen.value,
    notes: isNotesOpen.value,
    terms: isTermsOpen.value
  }
  localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state))
}

const restorePanelState = (): void => {
  const raw = localStorage.getItem(PANEL_STATE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Partial<PanelState>
    isResearchToolsOpen.value = Boolean(parsed.tools)
    isNotesOpen.value = Boolean(parsed.notes)
    isTermsOpen.value = Boolean(parsed.terms)
  } catch {
    isResearchToolsOpen.value = false
    isNotesOpen.value = false
    isTermsOpen.value = false
  }
}

const toggleSection = (sectionKey: SectionKey): void => {
  if (sectionKey === 'tools') {
    isResearchToolsOpen.value = !isResearchToolsOpen.value
  } else if (sectionKey === 'notes') {
    isNotesOpen.value = !isNotesOpen.value
  } else {
    isTermsOpen.value = !isTermsOpen.value
  }
  persistPanelState()
}

const goPrevTermCard = (): void => {
  if (!hasPrevCard.value) return
  termCardCursor.value -= 1
}

const goNextTermCard = (): void => {
  if (!hasNextCard.value) return
  termCardCursor.value += 1
}

const handleInput = (event: Event): void => {
  const target = event.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = `${Math.min(target.scrollHeight, 200)}px`
}

const handleNewLine = (): void => {
  // Shift + Enter 时插入换行，不做额外处理
}

const handleSend = async (quickActionId?: string): Promise<void> => {
  if (!canSend.value) return

  const userContent = inputText.value.trim()
  if (!userContent) return

  errorMessage.value = ''

  const userMessage: Omit<ChatMessage, 'id'> = {
    role: 'user',
    content: userContent,
    timestamp: Date.now(),
    paperId: props.selectedPaper?.id || 0
  }

  try {
    await window.api.chat.saveMessage(userMessage)
  } catch (error) {
    console.error('保存用户消息失败:', error)
    errorMessage.value = '保存消息失败，请重试'
    return
  }

  messages.value.push({
    ...userMessage,
    id: Date.now()
  })

  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
  scrollToBottom()

  isLoading.value = true
  pendingQuickAction.value = quickActionId
  try {
    const chatHistory = messages.value.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))
    const aiResponse = await window.api.ai.chat({
      messages: chatHistory,
      context: {
        paperId: props.selectedPaper?.id,
        paperTitle: props.selectedPaper?.title,
        currentPage: props.readingContext.currentPage,
        selectedText: props.readingContext.selectedText,
        quickAction: pendingQuickAction.value
      }
    })

    await appendAssistantMessage(aiResponse)
  } catch (error) {
    console.error('AI 调用失败:', error)
    errorMessage.value = error instanceof Error ? error.message : 'AI 服务调用失败，请稍后重试'
  } finally {
    isLoading.value = false
    pendingQuickAction.value = undefined
  }
}

const appendAssistantMessage = async (content: string): Promise<void> => {
  const aiMessage: Omit<ChatMessage, 'id'> = {
    role: 'assistant',
    content,
    timestamp: Date.now(),
    paperId: props.selectedPaper?.id || 0
  }
  await window.api.chat.saveMessage(aiMessage)
  messages.value.push({
    ...aiMessage,
    id: Date.now()
  })
  scrollToBottom()
}

const toggleComparePaper = (paperId: number): void => {
  if (comparePaperIds.value.includes(paperId)) {
    comparePaperIds.value = comparePaperIds.value.filter((id) => id !== paperId)
    return
  }
  comparePaperIds.value = [...comparePaperIds.value, paperId]
}

const runComparePapers = async (): Promise<void> => {
  if (!canRunCompare.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const selected = props.papers.filter((paper) => comparePaperIds.value.includes(paper.id))
    const userPrompt = `请对比以下论文：${selected.map((p) => p.title).join('、')}`
    const userMessage: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
      paperId: props.selectedPaper?.id || 0
    }
    await window.api.chat.saveMessage(userMessage)
    messages.value.push({ ...userMessage, id: Date.now() })

    const result = await window.api.ai.comparePapers({
      papers: selected.map((paper) => ({ id: paper.id, title: paper.title }))
    })
    await appendAssistantMessage(result)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '多论文对比失败'
  } finally {
    isLoading.value = false
  }
}

const runBatchSummaries = async (): Promise<void> => {
  if (!canRunBatch.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const selected = props.papers.filter((paper) => comparePaperIds.value.includes(paper.id))
    const userMessage: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content: `请批量生成摘要卡片：${selected.map((p) => p.title).join('、')}`,
      timestamp: Date.now(),
      paperId: props.selectedPaper?.id || 0
    }
    await window.api.chat.saveMessage(userMessage)
    messages.value.push({ ...userMessage, id: Date.now() })

    const result = await window.api.ai.batchSummaries({
      papers: selected.map((paper) => ({ id: paper.id, title: paper.title }))
    })
    await appendAssistantMessage(result)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '批量摘要失败'
  } finally {
    isLoading.value = false
  }
}

const saveAsNote = async (message: ChatMessage): Promise<void> => {
  if (!props.selectedPaper) return
  try {
    await window.api.study.saveNote({
      paperId: props.selectedPaper.id,
      content: message.content,
      sourceMessage: 'assistant',
      timestamp: Date.now()
    })
    await loadStudyAssets(props.selectedPaper.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存笔记失败'
  }
}

const generateTermCards = async (): Promise<void> => {
  if (!props.selectedPaper) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const cardDrafts = await window.api.ai.extractTermCards({
      paper: { id: props.selectedPaper.id, title: props.selectedPaper.title },
      messages: messages.value.map((item) => ({ role: item.role, content: item.content }))
    })
    await window.api.study.saveTermCards(
      cardDrafts.map((card) => ({
        paperId: props.selectedPaper!.id,
        term: card.term,
        definition: card.definition,
        createdAt: Date.now()
      }))
    )
    await loadStudyAssets(props.selectedPaper.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成术语卡片失败'
  } finally {
    isLoading.value = false
  }
}

const markReviewed = async (card: TermCard): Promise<void> => {
  if (!card.id || !props.selectedPaper) return
  await window.api.study.markTermReviewed(card.id)
  await loadStudyAssets(props.selectedPaper.id)
}

const runQuickAction = (actionId: (typeof quickActions)[number]['id']): void => {
  if (isLoading.value) return
  const action = quickActions.find((item) => item.id === actionId)
  if (!action) return
  inputText.value = action.prompt
  void handleSend(action.id)
}

const handleSendClick = (): void => {
  void handleSend()
}

const handleSendKeydown = (): void => {
  void handleSend()
}

const scrollToBottom = (): void => {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

const loadHistory = async (paperId: number = 0): Promise<void> => {
  try {
    const historyMessages = await window.api.chat.getAllMessages(paperId)
    messages.value = historyMessages
    scrollToBottom()
  } catch (error) {
    console.error('加载历史记录失败:', error)
    errorMessage.value = '加载历史记录失败'
  }
}

const loadStudyAssets = async (paperId: number): Promise<void> => {
  if (!paperId) {
    notes.value = []
    termCards.value = []
    termCardCursor.value = 0
    return
  }
  const [loadedNotes, loadedCards] = await Promise.all([
    window.api.study.getNotes(paperId),
    window.api.study.getTermCards(paperId)
  ])
  notes.value = loadedNotes
  termCards.value = loadedCards
  termCardCursor.value = 0
}

watch(
  () => props.selectedPaper,
  (newPaper) => {
    if (newPaper) {
      loadHistory(newPaper.id)
      loadStudyAssets(newPaper.id)
      termCardCursor.value = 0
      if (!comparePaperIds.value.includes(newPaper.id)) {
        comparePaperIds.value = [...comparePaperIds.value, newPaper.id]
      }
    } else {
      loadHistory(0)
      notes.value = []
      termCards.value = []
      termCardCursor.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => termCards.value.length,
  (length) => {
    if (length === 0) {
      termCardCursor.value = 0
      return
    }
    if (termCardCursor.value >= length) {
      termCardCursor.value = length - 1
    }
  }
)

onMounted(() => {
  restorePanelState()
  loadHistory(props.selectedPaper?.id || 0)
  if (props.selectedPaper?.id) {
    loadStudyAssets(props.selectedPaper.id)
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: color-mix(in srgb, var(--bg-panel-soft) 76%, transparent);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.chat-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.chat-context {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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
  color: #eef4ff;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
}

.ai-message .message-avatar {
  background: color-mix(in srgb, var(--bg-hover) 90%, transparent);
  color: var(--text-secondary);
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

.empty-icon {
  color: color-mix(in srgb, var(--text-muted) 76%, transparent);
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

.input-container {
  padding: var(--space-4);
  border-top: 1px solid var(--border-subtle);
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

.section-body {
  border-top: 1px solid var(--border-subtle);
  padding: 8px;
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

.carousel-controls {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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
  color: #eef4ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.2s ease;
  padding: 0;
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
