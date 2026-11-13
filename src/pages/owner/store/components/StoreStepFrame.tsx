import { ArrowLeft, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/lib/authStore'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { IconButton } from '@/ui/IconButton'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 매장 등록 단계 화면 틀 (11/14 나현). 바탕은 사장님 홈(OwnerFrame)과 같게: 가운데 기둥 · 데스크톱 오른쪽 흰색, 바깥 canvas. 휴대폰 · 태블릿은 예전 그대로(가운데 460px 기둥 + 위쪽 뒤로 · 점 + "사장님 · 2 / 4"),
// 데스크톱(lg 1024px 이상)은 두 칸: 왼쪽 420px 패널(로고 · 제목 · 세로 타임라인) + 오른쪽(뒤로 · 계정 · 가운데 폼 · 아래 액션 바).
// 같은 children 한 벌을 CSS 로만 나눠서(.lg:) 창 크기를 바꿔도 입력한 값이 그대로다. 진행 표시는 데스크톱에서 왼쪽 타임라인 하나로.
// 민지 부품은 OnboardingHeader · ProviderLogo 를 import 만 한다 (AuthFrame 은 쓰지 않고 같은 모양을 여기서 만든다)

const STEPS = [
  { name: '매장 정보', desc: '이름 · 사업자번호 · 주소' },
  { name: '근무 타임 · 휴무 · 급여일', desc: '영업 시간과 급여 지급일' },
  { name: '사장님 근무', desc: '사장님도 근무하나요?' },
  { name: '매장 사진', desc: '선택 사항' },
]

export function StoreStepFrame({
  step,
  title,
  onBack,
  summaries,
  canGo,
  onGoStep,
  status,
  actions,
  actionsWide = false,
  children,
}: {
  /** 지금 단계 1~4 */
  step: number
  title: string
  onBack: () => void
  /** 끝낸 단계 아래에 보여 줄 입력값 요약 (단계 순서, 없으면 안내 문구) */
  summaries: (string | undefined)[]
  /** 타임라인에서 그 단계로 갈 수 있나 (지난 단계 · 앞 단계를 다 채운 다음 단계. 매장을 만든 뒤에는 없음) */
  canGo: (step: number) => boolean
  /** 타임라인에서 단계를 눌렀을 때 */
  onGoStep: (step: number) => void
  /** 데스크톱 액션 바 왼쪽 글자 ("필수 항목 2개 남음") */
  status?: string
  /** 아래 버튼들 (휴대폰은 맨 아래 가득, 데스크톱은 액션 바 오른쪽). 없으면 액션 바도 없다 */
  actions?: ReactNode
  /** 버튼이 둘이면 액션 바 오른쪽 칸을 넓게 */
  actionsWide?: boolean
  children: ReactNode
}) {
  const provider = useAuthStore((state) => state.me?.provider)
  return (
    // .owner-wide: 사장님 화면 색 팔레트 (index.css)
    <div className="owner-wide">
      <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[420px_1fr] lg:bg-white">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-9 bg-brand-soft p-11 lg:flex">
          <span className="flex items-center gap-2.5">
            <img src="/logo-bean.png" alt="" className="h-11 w-auto" />
            <img src="/logo-crewbean.png" alt="crewBean" className="h-8 w-auto" />
          </span>
          <div className="my-auto flex flex-col gap-9">
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
                매장 등록
              </h2>
              <p className="m-0 text-[13px] text-muted-foreground">4단계, 약 3분이면 끝나요</p>
            </div>
            <ol className="m-0 flex list-none flex-col p-0">
              {STEPS.map((s, i) => {
                const n = i + 1
                const on = n === step
                const done = n < step
                const clickable = canGo(n)
                const text = (
                  <>
                    <span
                      className={cn(
                        'block text-base',
                        on ? 'font-extrabold text-foreground' : 'font-medium text-muted-foreground',
                      )}
                    >
                      {s.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {done ? (summaries[i] ?? s.desc) : s.desc}
                    </span>
                  </>
                )
                return (
                  <li
                    key={s.name}
                    aria-current={on ? 'step' : undefined}
                    // 세로 연결선: 원 아래에서 다음 원까지 (마지막 단계는 없음)
                    className={cn(
                      'relative flex gap-4 pb-7 last:pb-0',
                      n < STEPS.length &&
                        'after:absolute after:top-10 after:bottom-0 after:left-[19px] after:w-0.5 after:bg-faint/40',
                    )}
                  >
                    <span
                      className={cn(
                        'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums ring-[5px] ring-brand-soft',
                        on || done ? 'bg-brand text-white' : 'bg-card text-muted-foreground',
                      )}
                    >
                      {done ? <Check aria-hidden="true" className="size-5" /> : n}
                    </span>
                    {clickable ? (
                      <button
                        type="button"
                        onClick={() => onGoStep(n)}
                        className="min-w-0 flex-1 cursor-pointer p-0 pt-px text-left"
                      >
                        {text}
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1 pt-px">{text}</div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </aside>

        <main className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-[22px] bg-white px-4 pt-3.5 pb-7 lg:mx-0 lg:max-w-none lg:gap-0 lg:px-14 lg:py-9">
          {/* 휴대폰: 뒤로 + 진행 점 + 로그인 방식 (민지 부품) */}
          <div className="lg:hidden">
            <OnboardingHeader step={1} onBack={onBack} />
          </div>
          {/* 데스크톱: 뒤로 + 로그인 계정 (진행 표시는 왼쪽 타임라인) */}
          <div className="hidden items-center justify-between lg:flex">
            <IconButton aria-label="뒤로" onClick={onBack}>
              <ArrowLeft />
            </IconButton>
            {provider && (
              <span className="flex items-center gap-1.5 rounded-full bg-card py-2 pr-3.5 pl-2.5 text-[13px] font-bold text-muted-foreground">
                <ProviderLogo provider={provider} size={16} />
                {provider === 'kakao' ? '카카오 계정' : 'Google 계정'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-[22px] lg:my-auto lg:w-full lg:max-w-[680px] lg:self-center lg:py-8">
            <div className="flex flex-col gap-2 px-1 pt-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">
                사장님 · {step} / {STEPS.length}
              </span>
              <h1 className="m-0 text-[26px] leading-[1.3] font-extrabold tracking-[-0.03em]">
                {title}
              </h1>
            </div>
            {children}
          </div>

          {actions && (
            <div className="mt-auto lg:mt-0 lg:flex lg:w-full lg:max-w-[680px] lg:items-center lg:justify-between lg:gap-6 lg:self-center lg:pt-2">
              {status && (
                <span className="hidden text-[13px] text-muted-foreground lg:block">{status}</span>
              )}
              <div className={cn('lg:ml-auto', actionsWide ? 'lg:w-[400px]' : 'lg:w-[260px]')}>
                {actions}
              </div>
            </div>
          )}
        </main>
      </div>
      <Toaster bottom={32} />
    </div>
  )
}
