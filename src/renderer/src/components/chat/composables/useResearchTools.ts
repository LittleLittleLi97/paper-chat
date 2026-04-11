import { computed, ref, type ComputedRef, type Ref } from 'vue'

interface UseResearchToolsResult {
  comparePaperIds: Ref<number[]>
  selectedPaperCount: ComputedRef<number>
  canRunCompare: ComputedRef<boolean>
  canRunBatch: ComputedRef<boolean>
  researchToolHint: ComputedRef<string>
  toggleComparePaper: (paperId: number) => void
  ensurePaperSelected: (paperId: number) => void
}

export function useResearchTools(): UseResearchToolsResult {
  const comparePaperIds = ref<number[]>([])

  const selectedPaperCount = computed((): number => comparePaperIds.value.length)
  const canRunCompare = computed((): boolean => comparePaperIds.value.length >= 2)
  const canRunBatch = computed((): boolean => comparePaperIds.value.length > 0)
  const researchToolHint = computed((): string => {
    if (comparePaperIds.value.length === 0) return '至少勾选 1 篇论文可执行批量摘要'
    if (comparePaperIds.value.length === 1) return '再勾选 1 篇可执行多论文对比'
    return '已满足对比与批量摘要条件'
  })

  const toggleComparePaper = (paperId: number): void => {
    if (comparePaperIds.value.includes(paperId)) {
      comparePaperIds.value = comparePaperIds.value.filter((id) => id !== paperId)
      return
    }
    comparePaperIds.value = [...comparePaperIds.value, paperId]
  }

  const ensurePaperSelected = (paperId: number): void => {
    if (!comparePaperIds.value.includes(paperId)) {
      comparePaperIds.value = [...comparePaperIds.value, paperId]
    }
  }

  return {
    comparePaperIds,
    selectedPaperCount,
    canRunCompare,
    canRunBatch,
    researchToolHint,
    toggleComparePaper,
    ensurePaperSelected
  }
}
