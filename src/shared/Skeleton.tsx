import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/ui/utils'

/*
 * 공용 보기 부품: 로딩 뼈대(스켈레톤) · 사장/알바 화면이 함께 사용 — 담당: 민지 (docs/08 6. 로딩)
 * 진짜 화면과 같은 자리 · 크기 · 모서리의 회색(bg-muted) 상자. 움직임 줄이기면 깜빡이지 않는다.
 * ui 에 스켈레톤이 생기면 그걸로 바꾼다
 *
 * 사용 예:
 *   <SkeletonGroup label="홈을 불러오는 중">
 *     <Skeleton shape="line" className="w-28" />
 *     <Skeleton className="h-44 rounded-3xl" />
 *   </SkeletonGroup>
 */

/**
 * 뼈대 조각 하나. 크기 · 모서리는 className 으로 진짜 화면에 맞춘다.
 * line: 글자 한 줄(높이 12px · 알약) · box: 카드 · 사진(모서리 16px) · circle: 아바타 · 체크
 */
export function Skeleton({
  shape = 'box',
  className,
}: {
  shape?: 'line' | 'box' | 'circle'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block shrink-0 bg-muted motion-safe:animate-pulse',
        shape === 'line' && 'h-3 rounded-full',
        shape === 'box' && 'rounded-2xl',
        shape === 'circle' && 'rounded-full',
        className,
      )}
    />
  )
}

/**
 * 뼈대 묶음: 화면 읽기 프로그램에 "불러오는 중"을 알리고, 0.3초 안에 끝나면 아무것도 안 보여 준다 (깜빡임 방지).
 * className 으로 묶음의 배치(flex · gap)를 정한다
 */
export function SkeletonGroup({
  label,
  children,
  className,
  delay = 300,
}: {
  /** 예: 홈을 불러오는 중 */
  label: string
  children: ReactNode
  className?: string
  delay?: number
}) {
  const [show, setShow] = useState(delay <= 0)
  useEffect(() => {
    if (delay <= 0) return
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {show && children}
    </div>
  )
}
