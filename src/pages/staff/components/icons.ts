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
  Toilet,
  Umbrella,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { ManualIcon } from '@/api/mocks/staff/manuals'
import type { RecipeCategory } from '@/api/mocks/staff/recipes'
import type { StoreIcon } from '@/api/mocks/staff/stores'

// 알바생 화면 아이콘 · 카테고리 색 모음

export const STORE_ICON: Record<StoreIcon, LucideIcon> = { moon: Moon, sunset: Sunset }

export const CATEGORY_ICON: Record<RecipeCategory, LucideIcon> = {
  커피: Coffee,
  라떼: Milk,
  에이드: CupSoda,
  스무디: Blender,
  티: Leaf,
  디저트: Croissant,
}

/** 카테고리 타일 색 [바탕, 글자] */
export const CATEGORY_TINT: Record<RecipeCategory, [string, string]> = {
  커피: ['#EDE4D8', '#6B4A2F'],
  라떼: ['#F2E9DC', '#8A6A45'],
  에이드: ['#FBE4DE', '#B0473A'],
  스무디: ['#FCEAD0', '#A8681F'],
  티: ['#E2ECDF', '#3F6B45'],
  디저트: ['#F3E4D2', '#8C5A33'],
}

export const MANUAL_ICON: Record<ManualIcon, LucideIcon> = {
  wifi: Wifi,
  restroom: Toilet,
  open: Sun,
  close: Moon,
  refund: ArrowLeftRight,
  milk: Droplet,
  umbrella: Umbrella,
}

/** 인수인계 태그 점 색 */
export const HANDOVER_TAG_COLOR = { 외상: '#A86A26', 재고: '#2A4536', 기타: '#C0463F' } as const

/** 인수인계 태그 알약 [바탕, 글자] */
export const HANDOVER_TAG_PILL = {
  외상: ['#F5E6D6', '#8A5630'],
  재고: ['#E3E8DC', '#2A4536'],
  기타: ['#F1EFE9', '#5F6862'],
} as const
