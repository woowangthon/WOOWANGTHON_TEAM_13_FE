import { useLayoutEffect, useRef, type DependencyList } from 'react'

/*
 * 공용: 스크롤해서 화면에 처음 들어올 때 한 번만 "아래 8px → 제자리 + 투명 → 보임" (220ms ease-out) — 담당: 민지 (docs/08 5. 움직임)
 * - 처음 그릴 때 이미 화면 안에 있는 것은 움직이지 않는다 (첫 화면 깜빡임 없음)
 * - prefers-reduced-motion 이면 아무것도 안 한다 (그냥 보인다)
 * - transform · opacity 만 바꿔서 스크롤이 버벅이지 않게, 다 나타나면 inline 스타일을 지운다
 *
 * 사용 예:
 *   const ref = useReveal<HTMLElement>()            // 섹션 하나
 *   <section ref={ref}>…</section>
 *
 *   const grid = useRevealChildren<HTMLDivElement>([items.length])   // 격자 · 목록의 자식마다, 같이 들어온 줄끼리 35ms 차이
 *   <div ref={grid}>{items.map(…)}</div>
 *   자식 하나가 여러 덩어리를 감싸면 그 자식에 data-reveal-group 을 붙인다 (그 안의 자식마다 따로)
 */

const DURATION = 220
/** 같이 들어온 줄 사이 지연 · 최대 단계 (너무 길게 끌지 않게: 35ms × 4 = 140ms 까지) */
const STAGGER = 35
const MAX_STEPS = 4

function reducedMotion() {
  return (
    typeof window === 'undefined' ||
    !('IntersectionObserver' in window) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 화면 아래쪽 밖에 있으면 숨겨 두고 true (처음부터 보이는 것은 그대로 두고 false) */
function hideIfBelow(el: HTMLElement) {
  if (el.getBoundingClientRect().top < window.innerHeight) return false
  el.style.opacity = '0'
  el.style.transform = 'translateY(8px)'
  return true
}

function show(el: HTMLElement, delay: number) {
  el.style.transition = `opacity ${DURATION}ms ease-out ${delay}ms, transform ${DURATION}ms ease-out ${delay}ms`
  el.style.opacity = ''
  el.style.transform = ''
  window.setTimeout(
    () => {
      el.style.transition = ''
    },
    DURATION + delay + 50,
  )
}

/** 화면 아래 끝에서 조금 올라왔을 때 시작 (살짝 보인 뒤 떠오르게) */
const OBSERVE = { rootMargin: '0px 0px -24px 0px' }

export function useReveal<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el || reducedMotion() || !hideIfBelow(el)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      show(el, 0)
    }, OBSERVE)
    observer.observe(el)
    return () => {
      observer.disconnect()
      el.style.opacity = ''
      el.style.transform = ''
    }
  }, [enabled])
  return ref
}

/** 자식 요소마다 useReveal. 한 번에 같이 들어온 것끼리는 줄(같은 높이)마다 35ms 씩 늦게. deps 가 바뀌면 새 자식을 다시 본다 */
export function useRevealChildren<T extends HTMLElement>(
  deps: DependencyList = [],
  enabled = true,
) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const parent = ref.current
    if (!enabled || !parent || reducedMotion()) return
    // 바로 아래 자식마다. 단 data-reveal-group 이 붙은 자식은 그 안의 자식마다 (한 덩어리 안에서도 따로 떠오르게)
    const targets = parent.querySelectorAll(
      ':scope > :not([data-reveal-group]), :scope > [data-reveal-group] > *',
    )
    const hidden = [...targets].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && hideIfBelow(child),
    )
    if (hidden.length === 0) return
    const observer = new IntersectionObserver((entries) => {
      const tops: number[] = []
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((entry) => {
          const top = Math.round(entry.boundingClientRect.top)
          if (!tops.includes(top)) tops.push(top)
          const el = entry.target as HTMLElement
          observer.unobserve(el)
          show(el, Math.min(tops.length - 1, MAX_STEPS) * STAGGER)
        })
    }, OBSERVE)
    hidden.forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
      hidden.forEach((el) => {
        el.style.opacity = ''
        el.style.transform = ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 부르는 쪽이 자식 목록이 바뀌는 값을 deps 로 준다
  }, [enabled, ...deps])
  return ref
}
