import {
  Blender,
  Coffee,
  Croissant,
  CupSoda,
  ArrowLeftRight,
  Droplet,
  Leaf,
  Milk,
  Moon,
  Sun,
  Sunset,
  StickyNote,
  Toilet,
  Truck,
  Umbrella,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { HandoverTag, ManualIcon, StoreTheme } from '@/lib/api/types'

// 아이콘 · 카테고리 색 모음 — 사장 · 알바 화면이 함께 사용 (담당: 민지)

/** 매장 테마별 아이콘 (색은 shared/storeTheme) */
export const STORE_ICON: Record<StoreTheme, LucideIcon> = { moon: Moon, sunset: Sunset }

/** 레시피 카테고리 아이콘 (카테고리 이름은 사장님이 정해서, 없는 이름은 getCategoryIcon 기본값) */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  커피: Coffee,
  라떼: Milk,
  에이드: CupSoda,
  스무디: Blender,
  티: Leaf,
  디저트: Croissant,
}

/** 카테고리 타일 색 [바탕, 글자] */
export const CATEGORY_TINT: Record<string, [string, string]> = {
  커피: ['#EDE4D8', '#6B4A2F'],
  라떼: ['#F2E9DC', '#8A6A45'],
  에이드: ['#FBE4DE', '#B0473A'],
  스무디: ['#FCEAD0', '#A8681F'],
  티: ['#E2ECDF', '#3F6B45'],
  디저트: ['#F3E4D2', '#8C5A33'],
}

/** 매뉴얼 아이콘. 직접 추가한 매뉴얼(icon: null)은 DEFAULT_MANUAL_ICON */
export const MANUAL_ICON: Record<ManualIcon, LucideIcon> = {
  wifi: Wifi,
  restroom: Toilet,
  open: Sun,
  close: Moon,
  delivery: Truck,
  refund: ArrowLeftRight,
  milk: Droplet,
  umbrella: Umbrella,
}

/** 없는 카테고리 · 직접 추가한 매뉴얼의 기본 아이콘 (CATEGORY_ICON[c] ?? DEFAULT_CATEGORY_ICON 처럼 쓴다) */
export const DEFAULT_CATEGORY_ICON: LucideIcon = Coffee
export const DEFAULT_MANUAL_ICON: LucideIcon = StickyNote

/** 카테고리 타일 색 [바탕, 글자]. 없는 이름은 커피 색 */
export function getCategoryTint(category: string): [string, string] {
  return CATEGORY_TINT[category] ?? CATEGORY_TINT['커피']
}

/** 인수인계 태그 화면 글자 (API 는 credit · stock · etc) */
export const HANDOVER_TAG_LABEL: Record<HandoverTag, string> = {
  credit: '외상',
  stock: '재고',
  etc: '기타',
}

/** 인수인계 태그 점 색 */
export const HANDOVER_TAG_COLOR: Record<HandoverTag, string> = {
  credit: '#A86A26',
  stock: '#2A4536',
  etc: '#C0463F',
}

/** 인수인계 태그 알약 [바탕, 글자] */
export const HANDOVER_TAG_PILL: Record<HandoverTag, readonly [string, string]> = {
  credit: ['#F5E6D6', '#8A5630'],
  stock: ['#E3E8DC', '#2A4536'],
  etc: ['#F1EFE9', '#5F6862'],
}
