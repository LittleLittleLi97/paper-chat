import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { TermCard } from '../types'

interface UseTermCarouselResult {
  termCardCursor: Ref<number>
  currentTermCard: ComputedRef<TermCard | null>
  hasPrevCard: ComputedRef<boolean>
  hasNextCard: ComputedRef<boolean>
  goPrevTermCard: () => void
  goNextTermCard: () => void
  resetTermCardCursor: () => void
}

export function useTermCarousel(termCards: Ref<TermCard[]>): UseTermCarouselResult {
  const termCardCursor = ref(0)

  const currentTermCard = computed((): TermCard | null => {
    if (termCards.value.length === 0) return null
    const safeCursor = Math.min(Math.max(termCardCursor.value, 0), termCards.value.length - 1)
    return termCards.value[safeCursor] ?? null
  })

  const hasPrevCard = computed((): boolean => termCardCursor.value > 0)
  const hasNextCard = computed((): boolean => termCardCursor.value < termCards.value.length - 1)

  const goPrevTermCard = (): void => {
    if (!hasPrevCard.value) return
    termCardCursor.value -= 1
  }

  const goNextTermCard = (): void => {
    if (!hasNextCard.value) return
    termCardCursor.value += 1
  }

  const resetTermCardCursor = (): void => {
    termCardCursor.value = 0
  }

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

  return {
    termCardCursor,
    currentTermCard,
    hasPrevCard,
    hasNextCard,
    goPrevTermCard,
    goNextTermCard,
    resetTermCardCursor
  }
}
