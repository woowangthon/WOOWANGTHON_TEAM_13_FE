import type { ReactNode } from 'react'
import { useThemeColor, WHITE_THEME_COLOR } from '@/lib/useThemeColor'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 로그인 · 역할 선택 화면 바탕: 알바 화면(StaffFrame)과 같은 가운데 460px 기둥 + 기본 매장 색
// tone: 기본 cream = 지금(--background, 사장님 매장 등록이 씀) · white = 흰색 + 보이는 동안 상태 바도 흰색
//       (로그인 · 역할 · 로그인 확인 · 초대코드 입장 — docs/08 4)
// 데스크톱(lg 1024px 이상, 11/13 나현 · 민지 OK): 두 칸 — 왼쪽 소개 패널(aside, 없으면 기본 소개) · 오른쪽 가운데에 지금 화면.
//   휴대폰 · 태블릿은 그대로
export function AuthFrame({
  children,
  className,
  tone = 'cream',
  aside,
}: {
  children: ReactNode
  className?: string
  tone?: 'cream' | 'white'
  /** 데스크톱 왼쪽 패널 내용 (매장 등록은 단계 목록). 없으면 crewBean 소개 */
  aside?: ReactNode
}) {
  useThemeColor(tone === 'white' ? WHITE_THEME_COLOR : null)
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(360px,5fr)_7fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between gap-10 bg-brand-soft p-12 lg:flex">
        <span className="flex items-center gap-2.5">
          <img src="/logo-bean.png" alt="" className="h-11 w-auto" />
          <img src="/logo-crewbean.png" alt="crewBean" className="h-8 w-auto" />
        </span>
        {aside ?? <DefaultAside />}
        <span className="text-xs text-muted-foreground">개인 카페를 위한 매뉴얼 · AI 사수</span>
      </aside>
      <div
        className={cn(
          'lg:flex lg:min-h-dvh lg:items-center lg:justify-center',
          tone === 'white' ? 'lg:bg-white' : 'lg:bg-background',
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
