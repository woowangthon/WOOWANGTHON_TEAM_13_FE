import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// className 합치기 — 담당: 나현. Tailwind 클래스가 겹치면 뒤에 온 값이 이긴다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
