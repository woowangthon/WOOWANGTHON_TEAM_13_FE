import { create } from 'zustand'

/*
 * 토스트 띄우기 — 담당: 나현
 * 화면 어디서나: toast('저장했어요') / toast.error('불러오지 못했어요. 다시 시도해 주세요', { onRetry })
 * 화면 틀에 <Toaster /> (src/ui/Toast.tsx) 를 한 번만 둔다.
 */

export interface ToastItem {
  id: number
  message: string
  tone: 'default' | 'error'
  onRetry?: () => void
}

interface ToastState {
  current: ToastItem | null
  show: (item: Omit<ToastItem, 'id'>) => void
  hide: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (item) => {
    clearTimeout(timer)
    set({ current: { ...item, id: Date.now() } })
    timer = setTimeout(() => set({ current: null }), item.onRetry ? 4000 : 2200)
  },
  hide: () => set({ current: null }),
}))

export function toast(message: string) {
  useToastStore.getState().show({ message, tone: 'default' })
}

toast.error = (message: string, options: { onRetry?: () => void } = {}) => {
  useToastStore.getState().show({ message, tone: 'error', onRetry: options.onRetry })
}
