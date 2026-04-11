import { ref, type Ref } from 'vue'

export type SectionKey = 'tools' | 'notes' | 'terms'

interface PanelState {
  tools: boolean
  notes: boolean
  terms: boolean
}

interface UsePanelStateResult {
  isResearchToolsOpen: Ref<boolean>
  isNotesOpen: Ref<boolean>
  isTermsOpen: Ref<boolean>
  restorePanelState: () => void
  toggleSection: (sectionKey: SectionKey) => void
}

export function usePanelState(storageKey: string): UsePanelStateResult {
  const isResearchToolsOpen = ref(false)
  const isNotesOpen = ref(false)
  const isTermsOpen = ref(false)

  const persistPanelState = (): void => {
    const state: PanelState = {
      tools: isResearchToolsOpen.value,
      notes: isNotesOpen.value,
      terms: isTermsOpen.value
    }
    localStorage.setItem(storageKey, JSON.stringify(state))
  }

  const restorePanelState = (): void => {
    const raw = localStorage.getItem(storageKey)
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
    if (sectionKey === 'tools') isResearchToolsOpen.value = !isResearchToolsOpen.value
    else if (sectionKey === 'notes') isNotesOpen.value = !isNotesOpen.value
    else isTermsOpen.value = !isTermsOpen.value
    persistPanelState()
  }

  return {
    isResearchToolsOpen,
    isNotesOpen,
    isTermsOpen,
    restorePanelState,
    toggleSection
  }
}
