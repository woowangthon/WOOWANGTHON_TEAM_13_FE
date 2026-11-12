import { ChevronLeft } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import type { GuideSlide } from '@/shared/guide/GuideSlides'
import { cn } from '@/ui/utils'

// 사장님 앱 사용법 데스크톱(lg 1024px 이상) 모양 — 휴대폰은 공용 틀 GuideSlides 그대로.
// 가운데 큰 카드: 왼쪽 로고 · 단계 목록(눌러서 이동) · 지금 단계 제목 · 설명 · [이전] [다음/시작하기](두 버튼 같은 너비) / 오른쪽 그 단계 그림을 크게.
// 키보드 ← → 로 넘긴다 (마지막에서 → 는 끝내지 않음). [건너뛰기] · 마지막 [시작하기] 둘 다 onDone

export function GuideDesktop({
  slides,
  onDone,
  doneLabel = '시작하기',
}: {
  slides: GuideSlide[]
  onDone: () => void
  doneLabel?: string
}) {
  const [index, setIndex] = useState(0)
  const last = slides.length - 1
  const isLast = index === last
  const slide = slides[index]

  const go = (to: number) => setIndex(Math.min(last, Math.max(0, to)))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1))
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-8">
      <section
        aria-roledescription="carousel"
        aria-label="앱 사용법"
        className="grid min-h-[min(620px,calc(100dvh-64px))] w-full max-w-[1040px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] overflow-hidden rounded-[36px] bg-white shadow-float"
      >
        {/* 왼쪽: 로고 · 단계 목록 · 설명 · 버튼 */}
        <div className="flex flex-col gap-7 p-10 xl:gap-8 xl:p-12">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <img src="/logo-bean.png" alt="" className="h-9 w-auto" />
              <img src="/logo-crewbean.png" alt="crewBean" className="h-7 w-auto" />
            </span>
            {!isLast && (
              <button
                type="button"
                onClick={onDone}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background"
              >
                건너뛰기
              </button>
            )}
          </div>

          <ol aria-label="단계" className="m-0 flex list-none flex-col gap-1 p-0">
            {slides.map((s, i) => {
              const on = i === index
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    onClick={() => go(i)}
                    className={cn(
                      // 블록 없이: 지금 단계는 번호 동그라미가 매장 색 + 바깥 링, 글자 굵고 진하게 · 나머지는 흐리게
                      'flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[15px] transition-colors',
                      on
                        ? 'font-extrabold text-foreground'
                        : 'font-semibold text-subtle hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums transition-[background-color,box-shadow]',
                        on
                          ? 'bg-brand text-white ring-4 ring-brand-soft'
                          : 'bg-background text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    {s.tab ?? s.title}
                  </button>
                </li>
              )
            })}
          </ol>

          {/* 지금 단계 설명 (장이 바뀌면 화면 읽기 프로그램이 읽는다) */}
          <div
            key={index}
            aria-live="polite"
            className="flex flex-col gap-2.5 animate-in duration-300 ease-out fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
          >
            <h2 className="m-0 text-[30px] leading-[1.3] font-extrabold tracking-[-0.03em] text-balance break-keep">
              {slide.title}
            </h2>
            <p className="m-0 text-base leading-[1.6] text-balance break-keep text-muted-foreground">
              {slide.body}
            </p>
          </div>

          <div className="mt-auto flex items-center gap-3">
            <span className="mr-auto text-sm font-semibold text-muted-foreground tabular-nums">
              {index + 1} / {slides.length}
            </span>
            {index > 0 && (
              <button
                type="button"
                aria-label="이전 장"
                onClick={() => go(index - 1)}
                className="flex h-12 w-[110px] items-center justify-center gap-1 rounded-full bg-background text-[15px] font-bold transition-transform active:scale-[0.98]"
              >
                <ChevronLeft className="size-5" />
                이전
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onDone() : go(index + 1))}
              className="h-12 w-[110px] rounded-full bg-brand text-[15px] font-extrabold text-white transition-transform active:scale-[0.98]"
            >
              {isLast ? doneLabel : '다음'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 그 단계 그림 (휴대폰 버전과 같은 그림을 크게, 누를 수 없음) */}
        <div
          aria-hidden="true"
          inert
          className="pointer-events-none flex items-center justify-center bg-brand-soft/60 p-10"
        >
          <div
            key={index}
            className="animate-in duration-300 ease-out fade-in-0 zoom-in-95 motion-reduce:animate-none"
            style={{ zoom: 1.35 } as CSSProperties}
          >
            {slide.visual}
          </div>
        </div>
      </section>
    </div>
  )
}
