import { ArrowRight, Check, ChevronRight, Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { NO_PHOTO_BACKGROUND } from '@/pages/owner/store/noPhotoBackground'
import { Button } from '@/ui/Button'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 온보딩 끝 화면 데스크톱(lg 1024px 이상) 두 칸 (11/14 나현): 왼쪽 680px 매장 사진(없으면 연한 매장 색 + 점 무늬) · 아래 배지 · 매장 이름 · 한 줄
// + 오른쪽 다음 할 일 카드 → [시작하기]. 사장님 매장 등록 완료(StoreCreateDone)가 쓴다 (알바생 화면은 모바일만이라 안 씀)
// 휴대폰 화면은 각 화면이 따로 그린다 (이 부품은 hidden lg:grid)

export interface NextStep {
  to: string
  icon: LucideIcon
  label: string
  desc: string
}

export function OnboardingDoneDesktop({
  photoUrl,
  badge,
  title,
  meta,
  onEditPhoto,
  heading,
  description,
  steps,
  onStart,
  laterLabel,
}: {
  photoUrl: string | null
  /** 왼쪽 아래 배지 (등록 완료 · 입장 완료) */
  badge: string
  /** 매장 이름 */
  title: string
  /** 매장 이름 아래 한 줄 */
  meta: string
  /** 주면 사진 바꾸기 버튼 · 사진이 없을 때 올리기 안내 (사장님만) */
  onEditPhoto?: () => void
  heading: ReactNode
  description: string
  steps: NextStep[]
  onStart: () => void
  /** 주면 [시작하기] 아래 글자 버튼 (같은 onStart) */
  laterLabel?: string
}) {
  const hasPhoto = !!photoUrl
  return (
    <div className="hidden min-h-[860px] bg-white lg:grid lg:min-h-dvh lg:grid-cols-[680px_1fr]">
      <section
        className="relative overflow-hidden"
        style={hasPhoto ? undefined : NO_PHOTO_BACKGROUND}
      >
        {hasPhoto && (
          <>
            <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
            {/* 사진 위 흰 글자가 읽히게 아래에서 위로 어둡게 (docs/06 사진 위 어둡게 예외) */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(0deg,rgba(26,22,14,0.88)_0%,rgba(26,22,14,0.55)_32%,transparent_62%)]"
            />
          </>
        )}
        {onEditPhoto &&
          (hasPhoto ? (
            <button
              type="button"
              onClick={onEditPhoto}
              className="absolute top-8 right-8 h-10 rounded-full bg-card/95 px-4 text-[13px] font-bold text-foreground"
            >
              사진 바꾸기
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditPhoto}
              className="absolute top-11 right-14 left-14 flex flex-col gap-1 rounded-[20px] border-2 border-dashed border-faint bg-transparent p-5 text-left text-foreground"
            >
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Plus aria-hidden="true" className="size-4" />
                매장 사진을 올리면 이 자리에 보여요
              </span>
              <span className="text-[13px] font-medium text-muted-foreground">
                사장님 홈에서 언제든 추가할 수 있어요
              </span>
            </button>
          ))}
        <div
          className={cn(
            'absolute right-14 bottom-[52px] left-14 flex flex-col items-start gap-3',
            hasPhoto ? 'text-white' : 'text-foreground',
          )}
        >
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold',
              hasPhoto ? 'bg-accent text-accent-foreground' : 'bg-white text-accent-foreground',
            )}
          >
            <Check aria-hidden="true" className="size-4" />
            {badge}
          </span>
          <h1 className="m-0 text-[40px] leading-[1.1] font-extrabold tracking-[-0.03em] break-keep">
            {title}
          </h1>
          <p className={cn('m-0 text-base', hasPhoto && 'text-white/90')}>{meta}</p>
        </div>
      </section>

      <section className="flex flex-col px-[72px] py-12">
        <img src="/logo-crewbean.png" alt="crewBean" className="h-10 w-auto self-end" />
        <div className="my-auto flex w-full max-w-[560px] flex-col gap-7 self-center py-8">
          <div className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[26px] leading-[1.3] font-extrabold tracking-[-0.03em]">
              {heading}
            </h2>
            <p className="m-0 text-[15px] text-muted-foreground">{description}</p>
          </div>
          <nav aria-label="처음 할 일" className="flex flex-col gap-3.5">
            {steps.map(({ to, icon: Icon, label, desc }, i) => (
              <Link
                key={label}
                to={to}
                replace
                className="flex items-center gap-4 rounded-[22px] bg-card px-5 py-[18px] text-foreground transition-colors hover:bg-brand-soft"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-extrabold text-white tabular-nums"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-base font-bold">
                    <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{desc}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-subtle" />
              </Link>
            ))}
          </nav>
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ink"
              className="h-[60px] w-full text-base font-extrabold"
              onClick={onStart}
            >
              시작하기
              <ArrowRight className="size-5" />
            </Button>
            {laterLabel && (
              <button
                type="button"
                onClick={onStart}
                className="p-1 text-[15px] font-medium text-muted-foreground underline underline-offset-4"
              >
                {laterLabel}
              </button>
            )}
          </div>
        </div>
      </section>
      <Toaster bottom={32} />
    </div>
  )
}
