<template>
  <div class="chat-container">
    <div class="chat-header">
      <h3>AI 助手</h3>
      <span class="chat-context">{{ selectedPaper ? selectedPaper.title : '通用会话' }}</span>
    </div>

    <ChatMessageList
      ref="messageListRef"
      :messages="messages"
      :is-loading="isLoading"
      :error-message="errorMessage"
      :show-save-note="Boolean(selectedPaper)"
      @save-note="saveAsNote"
      @clear-error="errorMessage = ''"
    />

    <div class="input-container">
      <StudyAssetsPanel
        v-if="selectedPaper"
        :notes="notes"
        :term-cards="termCards"
        :current-term-card="currentTermCard"
        :term-card-cursor="termCardCursor"
        :has-prev-card="hasPrevCard"
        :has-next-card="hasNextCard"
        :is-loading="isLoading"
        :is-notes-open="isNotesOpen"
        :is-terms-open="isTermsOpen"
        @toggle-section="toggleSection"
        @generate-term-cards="generateTermCards"
        @go-prev-term-card="goPrevTermCard"
        @go-next-term-card="goNextTermCard"
        @mark-reviewed="markReviewed"
      />

      <ChatInputPanel
        v-model="inputText"
        :papers="papers"
        :compare-paper-ids="comparePaperIds"
        :selected-paper-count="selectedPaperCount"
        :is-research-tools-open="isResearchToolsOpen"
        :can-run-compare="canRunCompare"
        :can-run-batch="canRunBatch"
        :research-tool-hint="researchToolHint"
        :quick-actions="quickActions"
        :context-summary="contextSummary"
        :can-send="canSend"
        :is-loading="isLoading"
        @toggle-tools="toggleSection('tools')"
        @toggle-compare-paper="toggleComparePaper"
        @run-compare="runComparePapers"
        @run-batch="runBatchSummaries"
        @run-quick-action="runQuickAction"
        @send="handleSend()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ChatInputPanel from './chat/ChatInputPanel.vue'
import ChatMessageList from './chat/ChatMessageList.vue'
import StudyAssetsPanel from './chat/StudyAssetsPanel.vue'
import type { ChatMessage, Paper, QuickAction, StudyNote, TermCard } from './chat/types'
import { usePanelState } from './chat/composables/usePanelState'
import { useResearchTools } from './chat/composables/useResearchTools'
import { useTermCarousel } from './chat/composables/useTermCarousel'

interface Props {
  selectedPaper: Paper | null
  papers: Paper[]
  readingContext: {
    currentPage: number | null
    selectedText: string
  }
}

type MessageListExpose = {
  scrollToBottom: () => void
}

const PANEL_STATE_KEY = 'paper-assistant-p1-panels-v1'

const props = defineProps<Props>()
const messageListRef = ref<MessageListExpose | null>(null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const notes = ref<StudyNote[]>([])
const termCards = ref<TermCard[]>([])
const {
  comparePaperIds,
  selectedPaperCount,
  canRunCompare,
  canRunBatch,
  researchToolHint,
  toggleComparePaper,
  ensurePaperSelected
} = useResearchTools()
const { isResearchToolsOpen, isNotesOpen, isTermsOpen, restorePanelState, toggleSection } =
  usePanelState(PANEL_STATE_KEY)
const {
  termCardCursor,
  currentTermCard,
  hasPrevCard,
  hasNextCard,
  goPrevTermCard,
  goNextTermCard,
  resetTermCardCursor
} = useTermCarousel(termCards)

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
] satisfies QuickAction[]

const pendingQuickAction = ref<string | undefined>(undefined)

const canSend = computed((): boolean => inputText.value.trim().length > 0 && !isLoading.value)
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

const scrollToBottom = (): void => {
  nextTick(() => {
    messageListRef.value?.scrollToBottom()
  })
}

const appendAssistantMessage = async (content: string): Promise<void> => {
  const aiMessage: Omit<ChatMessage, 'id'> = {
    role: 'assistant',
    content,
    timestamp: Date.now(),
    paperId: props.selectedPaper?.id || 0
  }
  await window.api.chat.saveMessage(aiMessage)
  messages.value.push({ ...aiMessage, id: Date.now() })
  scrollToBottom()
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

  messages.value.push({ ...userMessage, id: Date.now() })
  inputText.value = ''
  scrollToBottom()

  isLoading.value = true
  pendingQuickAction.value = quickActionId
  try {
    const chatHistory = messages.value.map((msg) => ({ role: msg.role, content: msg.content }))
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

const runQuickAction = (actionId: string): void => {
  if (isLoading.value) return
  const action = quickActions.find((item) => item.id === actionId)
  if (!action) return
  inputText.value = action.prompt
  void handleSend(action.id)
}

const runComparePapers = async (): Promise<void> => {
  if (!canRunCompare.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const selected = props.papers.filter((paper) => comparePaperIds.value.includes(paper.id))
    const userMessage: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content: `请对比以下论文：${selected.map((p) => p.title).join('、')}`,
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
    resetTermCardCursor()
    return
  }
  const [loadedNotes, loadedCards] = await Promise.all([
    window.api.study.getNotes(paperId),
    window.api.study.getTermCards(paperId)
  ])
  notes.value = loadedNotes
  termCards.value = loadedCards
  resetTermCardCursor()
}

watch(
  () => props.selectedPaper,
  (newPaper) => {
    if (newPaper) {
      loadHistory(newPaper.id)
      loadStudyAssets(newPaper.id)
      resetTermCardCursor()
      ensurePaperSelected(newPaper.id)
    } else {
      loadHistory(0)
      notes.value = []
      termCards.value = []
      resetTermCardCursor()
    }
  },
  { immediate: true }
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

.input-container {
  padding: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
</style>
