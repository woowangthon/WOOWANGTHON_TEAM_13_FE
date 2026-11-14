import type { ReactNode } from 'react'
import { useThemeColor, WHITE_THEME_COLOR } from '@/lib/useThemeColor'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 로그인 · 역할 선택 화면 바탕: 알바 화면(StaffFrame)과 같은 가운데 460px 기둥 + 기본 매장 색
// tone: 기본 cream = 지금(--background, 사장님 매장 등록이 씀) · white = 흰색 + 보이는 동안 상태 바도 흰색
//       (로그인 · 역할 · 로그인 확인 · 초대코드 입장 — docs/08 4)
// 데스크톱(lg 1024px 이상, 11/13 나현 · 민지 OK): 두 칸 — 왼쪽 소개 패널(aside, 없으면 기본 소개) · 오른쪽 가운데에 지금 화면.
//   showcase 를 주면(로그인, 11/14 나현 · 민지 OK): 왼쪽 640px 패널에 aside(헤드라인 · 버튼)를 세로 가운데로 ·
//   오른쪽 전체에 showcase(대화 미리보기) · children 은 휴대폰 · 태블릿에서만 보인다. 높이는 화면 높이(최소 860px)
//   desktopForm 을 주면(역할 선택, 11/14 나현 · 민지 OK): 같은 왼쪽 640px 패널 + 오른쪽 흰 칸에 desktopTop(뒤로 · 계정) 아래 가운데 desktopForm(폭 640px).
//   children 은 휴대폰 · 태블릿에서만 보인다
//   mobileOnly 면(알바생 초대코드 입장 · 입장 완료, 11/14 나현 · 민지 OK): 데스크톱도 휴대폰과 같은 가운데 460px 기둥 하나 (알바 화면은 모바일만)
//   휴대폰 · 태블릿은 그대로
export function AuthFrame({
  children,
  className,
  tone = 'cream',
  aside,
  showcase,
  desktopTop,
  desktopForm,
  mobileOnly = false,
}: {
  children: ReactNode
  className?: string
  tone?: 'cream' | 'white'
  /** 데스크톱 왼쪽 패널 내용 (매장 등록은 단계 목록 · 로그인은 헤드라인 + 버튼). 없으면 crewBean 소개 */
  aside?: ReactNode
  /** 데스크톱 오른쪽 전체 (로그인 대화 미리보기). 주면 children 은 데스크톱에서 숨긴다 */
  showcase?: ReactNode
  /** 데스크톱 오른쪽 위 바 (역할 선택: 뒤로 + 로그인 계정). desktopForm 과 같이 쓴다 */
  desktopTop?: ReactNode
  /** 데스크톱 오른쪽 가운데 내용 (폭 640px). 주면 children 은 데스크톱에서 숨긴다 */
  desktopForm?: ReactNode
  /** 데스크톱에서도 두 칸 없이 휴대폰 화면(가운데 460px 기둥)만 */
  mobileOnly?: boolean
}) {
  useThemeColor(tone === 'white' ? WHITE_THEME_COLOR : null)
  if (mobileOnly) {
    return (
      <div className="min-h-dvh bg-canvas">
        <main
          className={cn(
            'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 px-4 pt-3.5 pb-7',
            tone === 'white' ? 'bg-white' : 'bg-background',
            className,
          )}
        >
          {children}
        </main>
        <Toaster bottom={32} />
      </div>
    )
  }
  /** 왼쪽 640px 패널 + 오른쪽 칸 구성 (로그인 · 역할 선택) */
  const split = !!showcase || !!desktopForm
  const logo = (
    <span className="flex items-center gap-2.5">
      <img src="/logo-bean.png" alt="" className="h-11 w-auto" />
      <img src="/logo-crewbean.png" alt="crewBean" className="h-8 w-auto" />
    </span>
  )
  return (
    <div
      className={cn(
        'min-h-dvh bg-canvas lg:grid',
        split
          ? 'lg:grid-cols-[560px_1fr] xl:grid-cols-[640px_1fr]'
          : 'lg:grid-cols-[minmax(360px,5fr)_7fr]',
      )}
    >
      {split ? (
        <aside className="hidden h-dvh min-h-[860px] flex-col bg-[#e8e9dc] px-14 py-12 lg:flex xl:px-[72px]">
          {logo}
          <div className="my-auto">{aside}</div>
        </aside>
      ) : (
        <aside className="sticky top-0 hidden h-dvh flex-col justify-between gap-10 bg-brand-soft p-12 lg:flex">
          {logo}
          {aside ?? <DefaultAside />}
          <span className="text-xs text-muted-foreground">개인 카페를 위한 매뉴얼 · AI 사수</span>
        </aside>
      )}
      {showcase && (
        <section className="relative hidden h-dvh min-h-[860px] overflow-hidden bg-[#373d20] lg:block">
          {showcase}
        </section>
      )}
      {desktopForm && (
        <section className="hidden min-h-[860px] flex-col bg-white px-14 py-9 lg:flex lg:min-h-dvh">
          {desktopTop}
          <div className="my-auto w-full max-w-[640px] self-center py-8">{desktopForm}</div>
        </section>
      )}
      <div
        className={cn(
          'lg:flex lg:min-h-dvh lg:items-center lg:justify-center',
          tone === 'white' ? 'lg:bg-white' : 'lg:bg-background',
          split && 'lg:hidden',
        )}
      >
        <main
          className={cn(
            'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 px-4 pt-3.5 pb-7',
            tone === 'white' ? 'bg-white' : 'bg-background',
            // 데스크톱: 화면 가운데 폼 (높이는 내용만큼)
            'lg:min-h-0 lg:py-12',
            className,
          )}
        >
          {children}
        </main>
      </div>
      <Toaster bottom={32} />
    </div>
  )
}

/** 데스크톱 왼쪽 기본 소개 */
function DefaultAside() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-[32px] leading-[1.3] font-extrabold tracking-[-0.03em] break-keep text-foreground">
        매장 매뉴얼은 익히고,
        <br />
        궁금한 건 AI 사수에게
      </h2>
      <p className="m-0 text-base leading-[1.6] break-keep text-muted-foreground">
        사장님은 레시피 · 매뉴얼을 올리고, 알바생은 근무 중에 바로 물어봐요. 매뉴얼에 없으면 AI가
        지어내지 않고 사장님께 넘겨요.
      </p>
    </div>
  )
}
