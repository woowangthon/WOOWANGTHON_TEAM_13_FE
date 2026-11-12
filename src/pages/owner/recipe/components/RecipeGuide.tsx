import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  markRecipeGuideSeen,
  RECIPE_GUIDE_STEPS,
  type GuideStep,
} from '@/pages/owner/recipe/components/recipeGuideSteps'
import { cn } from '@/ui/utils'

// 매장 정보 › 레시피 단계별 코치마크 (디자인: Guide Variants 2a)
// 화면 전체를 어둡게 덮고, 실제 버튼(data-guide="…") 위치를 getBoundingClientRect 로 재서 그 자리만 밝게 + 링, 옆에 말풍선.
// 어두운 곳을 누르거나 [다음] · Enter · → 로 다음 단계, 마지막 단계 · [건너뛰기] · ESC 는 닫기 (닫으면 "봤음" 저장).
// 단계 데이터 · 본 기록은 recipeGuideSteps.ts

// 디자인 수치
const DIM = 'rgba(20,30,24,.66)'
const RING = '0 0 0 5px #fff, 0 0 0 9px #e9bf5c'
const GAP = 22 // 링(9px) + 화살표(7px) + 여백
const EDGE = 16 // 화면 가장자리 여백
const BUBBLE_W = 290

/** 대상을 찾을 때까지 기다리는 시간 (목록을 불러오는 중이면 버튼이 늦게 생긴다) */
const FIND_TIMEOUT = 3000

const findTarget = (target: string) =>
  document.querySelector<HTMLElement>(`[data-guide="${target}"]`)

export function RecipeGuide({
  steps = RECIPE_GUIDE_STEPS,
  onClose,
}: {
  steps?: GuideStep[]
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  /** 잰 위치 (어느 단계 대상인지 같이 — 단계가 바뀌면 새로 잴 때까지 null) */
  const [measured, setMeasured] = useState<{ target: string; rect: DOMRect } | null>(null)
  const [radius, setRadius] = useState('14px')
  const [bubbleH, setBubbleH] = useState(170)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()
  const step = steps[index]
  const isLast = index === steps.length - 1
  const rect = measured?.target === step.target ? measured.rect : null

  const close = useCallback(() => {
    markRecipeGuideSeen()
    onClose()
  }, [onClose])
  const next = useCallback(() => {
    if (isLast) close()
    else setIndex((i) => i + 1)
  }, [isLast, close])

  // 단계가 바뀌면 대상을 찾아 화면 안으로 스크롤하고 위치를 잰다 · 크기 바뀜 · 스크롤에 다시 잰다
  useEffect(() => {
    let el: HTMLElement | null = null
    let frame = 0
    let timer = 0
    const started = Date.now()
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!el?.isConnected) el = findTarget(step.target)
        if (el) setMeasured({ target: step.target, rect: el.getBoundingClientRect() })
      })
    }
    const find = () => {
      el = findTarget(step.target)
      if (!el) {
        // 대상이 끝내 안 생기면 그 단계는 건너뛴다
        if (Date.now() - started > FIND_TIMEOUT) next()
        else timer = window.setTimeout(find, 100)
        return
      }
      setRadius(getComputedStyle(el).borderRadius || '14px')
      const box = el.getBoundingClientRect()
      if (box.top < EDGE || box.bottom > window.innerHeight - EDGE) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
      }
      measure()
    }
    find()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target, next])

  // 말풍선 높이 (뒤집을지 정할 때)
  useLayoutEffect(() => {
    if (bubbleRef.current) setBubbleH(bubbleRef.current.offsetHeight)
  }, [index, rect])

  // 단계가 바뀌면 말풍선 버튼으로 포커스
  useEffect(() => {
    if (rect) primaryRef.current?.focus({ preventScroll: true })
  }, [index, rect === null]) // eslint-disable-line react-hooks/exhaustive-deps

  // 닫히면 열기 전에 포커스가 있던 곳(예: [?] 버튼)으로 돌려준다
  useEffect(() => {
    const before = document.activeElement
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus({ preventScroll: true })
    }
  }, [])

  // 키보드: Enter · → 다음, ESC 닫기
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) {
        // 버튼에 포커스가 있으면 그 버튼이 처리한다
        event.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, next])

  // 말풍선 자리: 대상 아래(또는 위), 가로는 대상 가운데에 맞추되 화면 안으로
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight
  const width = Math.min(BUBBLE_W, vw - EDGE * 2)
  let placement = step.placement
  let left = 0
  let top = 0
  let arrowX = width / 2
  if (rect) {
    const below = rect.bottom + GAP
    const above = rect.top - GAP - bubbleH
    if (placement === 'bottom' && below + bubbleH > vh - EDGE && above >= EDGE) placement = 'top'
    if (placement === 'top' && above < EDGE && below + bubbleH <= vh - EDGE) placement = 'bottom'
    const cx = rect.left + rect.width / 2
    left = Math.min(Math.max(cx - width / 2, EDGE), vw - EDGE - width)
    top = placement === 'bottom' ? below : above
    arrowX = Math.min(Math.max(cx - left, 22), width - 22)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* 어두운 곳 누르면 다음 (마지막이면 닫기) */}
      <div aria-hidden="true" className="absolute inset-0" onClick={next} />
      {rect ? (
        <>
          {/* 강조: 대상 자리만 밝게 + 흰 · 노란 링, 나머지는 어둡게 */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: radius,
              boxShadow: `${RING}, 0 0 0 9999px ${DIM}`,
            }}
          />
          <div
            key={index}
            ref={bubbleRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onClick={(event) => event.stopPropagation()}
            className="fixed flex flex-col gap-1.5 rounded-[22px] bg-white px-5 py-[18px] text-foreground shadow-[0_18px_40px_rgba(0,0,0,.3)] animate-in duration-300 ease-out fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
            style={{ top, left, width }}
          >
            {/* 화살표: 대상 쪽 */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute size-3.5 rotate-45 rounded-[3px] bg-white',
                placement === 'bottom' ? '-top-1.5' : '-bottom-1.5',
              )}
              style={{ left: arrowX - 7 }}
            />
            <span className="text-[11px] font-bold tracking-[.08em] text-[#a47d12]">
              {index + 1}/{steps.length} · {step.label}
            </span>
            <h2 id={titleId} className="m-0 text-[17px] font-black text-[#2b4636]">
              {step.title}
            </h2>
            <p
              id={bodyId}
              className="m-0 text-[13.5px] leading-[1.5] text-pretty break-keep text-[#5d625d]"
            >
              {step.body}
            </p>
            <div className="mt-2.5 flex items-center justify-end gap-3">
              {!isLast && (
                <button
                  type="button"
                  onClick={close}
                  className="px-1 py-2 text-[13px] font-semibold text-[#80857f]"
                >
                  건너뛰기
                </button>
              )}
              <button
                ref={primaryRef}
                type="button"
                onClick={next}
                className="rounded-full bg-[#2b4636] px-5 py-[9px] text-sm font-bold text-white transition-transform active:scale-[0.97] motion-reduce:transition-none"
              >
                {isLast ? '시작하기' : '다음'}
              </button>
            </div>
          </div>
        </>
      ) : (
        // 대상을 찾는 동안은 어둡게만
        <div aria-hidden="true" className="absolute inset-0" style={{ background: DIM }} />
      )}
    </div>,
    document.body,
  )
}
