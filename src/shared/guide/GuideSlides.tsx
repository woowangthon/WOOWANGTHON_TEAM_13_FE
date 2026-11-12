import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/utils'

/*
 * 공용 보기 부품: 앱 사용법 카드 넘기기 · 사장/알바 화면이 함께 사용 — 담당: 민지
 * 전체 화면(하단 탭 없음). 위 [건너뛰기] · 가운데 그림 + 제목 + 설명 · 아래 점 + [다음](마지막 장은 doneLabel), 2장부터 [이전]도.
 * 옆으로 밀거나(터치 · 마우스) 버튼 · 키보드 ← → 로 넘긴다. prefers-reduced-motion 이면 애니메이션 없이.
 * [건너뛰기] · 마지막 [시작하기] 둘 다 onDone (본 것으로 기록 · 어디로 갈지는 화면이 정한다).
 * 매장 색(--brand)은 바깥(화면)에서 정한다. 그림(visual)은 화면이 만들고, 이 부품이 조작 안 되게(inert · aria-hidden) 감싼다
 *
 * 사용 예:
 *   <GuideSlides
 *     slides={[{ tab: '홈', title: '출근하면 인수인계부터 확인해요', body: '…', visual: <HomePicture /> }]}
 *     onDone={() => navigate('/owner', { replace: true })}
 *   />
 */

export interface GuideSlide {
  /** 제목 위 작은 칩 (예: 홈 · 레시피). 없으면 안 보임 */
  tab?: string
  title: string
  /** 설명 (2줄 이내) */
  body: string
  /** 그림: 실제 화면을 작게 줄인 모양 */
  visual: ReactNode
}

interface GuideSlidesProps {
  slides: GuideSlide[]
  onDone: () => void
  /** 마지막 장 버튼 (기본 "시작하기") */
  doneLabel?: string
}

/** 이만큼(px) 밀면 넘긴다 */
const SWIPE_PX = 48

export function GuideSlides({ slides, onDone, doneLabel = '시작하기' }: GuideSlidesProps) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const last = slides.length - 1
  const isLast = index === last

  const go = (next: number) => setIndex(Math.min(last, Math.max(0, next)))
  const next = () => (isLast ? onDone() : go(index + 1))
  const buttonRow = useRef<HTMLDivElement>(null)
  const prev = () => {
    go(index - 1)
    // 첫 장으로 오면 [이전]이 사라지니, 키보드 사용자를 위해 [다음]으로 초점을 옮긴다
    if (index - 1 === 0) buttonRow.current?.querySelector<HTMLButtonElement>('[data-next]')?.focus()
  }

  // 키보드 ← → (마지막 장에서 → 는 끝내지 않고 그대로)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1))
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  const onPointerMove = (event: PointerEvent) => {
    const s = start.current
    if (!s || s.id !== event.pointerId) return
    const dx = event.clientX - s.x
    // 세로로 더 움직이면 넘기기가 아니다
    if (!dragging && Math.abs(dx) < 8) return
    if (!dragging && Math.abs(event.clientY - s.y) > Math.abs(dx)) {
      start.current = null
      return
    }
    if (!dragging) {
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    // 처음 · 마지막 장 바깥으로는 덜 끌린다
    const edge = (index === 0 && dx > 0) || (isLast && dx < 0)
    setDrag(edge ? dx / 3 : dx)
  }
  const endDrag = (commit: boolean) => {
    if (commit && drag <= -SWIPE_PX) go(index + 1)
    if (commit && drag >= SWIPE_PX) go(index - 1)
    start.current = null
    setDragging(false)
    setDrag(0)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="앱 사용법"
      className="flex h-dvh flex-col overflow-hidden bg-background pt-3 pb-[max(20px,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-10 shrink-0 items-center justify-end px-4">
        <button
          type="button"
          onClick={onDone}
          className={cn(
            'rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground',
            isLast && 'invisible',
          )}
        >
          건너뛰기
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
      >
        <div
          className={cn(
            'flex w-full',
            !dragging && 'transition-transform duration-300 ease-out motion-reduce:transition-none',
          )}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
        >
          {slides.map((slide, i) => {
            const current = i === index
            return (
              <div
                key={slide.title}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${slides.length}`}
                aria-hidden={!current}
                inert={!current}
                className="flex w-full shrink-0 flex-col gap-5 px-6"
              >
                <div
                  aria-hidden="true"
                  inert
                  className="pointer-events-none flex min-h-0 flex-1 items-center justify-center overflow-hidden"
                >
                  {slide.visual}
                </div>
                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  {slide.tab && (
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                      {slide.tab}
                    </span>
                  )}
                  <h2 className="m-0 text-[22px] leading-[1.3] font-extrabold tracking-[-0.02em] text-balance break-keep">
                    {slide.title}
                  </h2>
                  {/* 2줄 높이를 늘 잡아 둬서 장마다 버튼 위치가 같다 */}
                  <p className="m-0 min-h-[3.1em] text-[15px] leading-[1.55] text-balance break-keep text-muted-foreground">
                    {slide.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-4 px-4 pt-4">
        <div className="flex justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`${i + 1}번째 장`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => go(i)}
              className="flex h-5 items-center px-0.5"
            >
              <span
                className={cn(
                  'h-2 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none',
                  i === index ? 'w-5 bg-brand' : 'w-2 bg-line',
                )}
              />
            </button>
          ))}
        </div>
        {/* 첫 장은 [다음]만 꽉 차게, 2장부터 [이전] + [다음](마지막은 doneLabel). 두 버튼 높이가 같아서 줄 높이는 그대로 */}
        <div
          ref={buttonRow}
          className={cn('grid gap-2', index > 0 ? 'grid-cols-[1fr_1.6fr]' : 'grid-cols-1')}
        >
          {index > 0 && (
            <Button
              variant="soft"
              size="lg"
              className="h-[54px]"
              aria-label="이전 장"
              onClick={prev}
            >
              이전
            </Button>
          )}
          <Button
            data-next
            size="lg"
            className="h-[54px]"
            aria-label={isLast ? undefined : '다음 장'}
            onClick={next}
          >
            {isLast ? doneLabel : '다음'}
          </Button>
        </div>
      </div>

      {/* 화면 읽기 프로그램: 장이 바뀌면 읽어 준다 */}
      <p aria-live="polite" className="sr-only">
        {`${index + 1} / ${slides.length}. ${slides[index]?.title ?? ''}`}
      </p>
    </section>
  )
}
