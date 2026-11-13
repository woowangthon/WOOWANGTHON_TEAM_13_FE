import type { ReactNode } from 'react'
import loginPhoto from '@/pages/auth/assets/login-photo.webp'
import { cn } from '@/ui/utils'

// 로그인 데스크톱(lg 1024px 이상) 오른쪽: 매장 사진 위에 AI 사수 대화 예시 (11/14 나현 · 민지 OK)
// 실제 데이터와 무관한 정적 예시. 문구는 실제 서비스 그대로 — 출처 칩 "레시피 › 카페라떼"(SourceCard),
// 못 찾았을 때 "매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요." + [사장님께 물어보기](AskOwnerButton)
// 말풍선은 차례로 나타난다 (움직임 줄이기 설정이면 바로 보임)
export function LoginShowcase() {
  return (
    <>
      {/* 사진이 비치되 글자가 잘 보이게 (사진 50% · 휴대폰 사진 카드와 같은 짙은 올리브 덮개 70%) */}
      <img src={loginPhoto} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(40,44,28,0.7)]" />

      <div
        role="img"
        aria-label="AI 사수 대화 예시: 아이스 라떼 샷 개수는 레시피를 근거로 답하고, 매뉴얼에 없는 질문은 지어내지 않고 사장님께 물어봐요"
        className="relative flex h-full flex-col justify-center gap-4 px-10 xl:px-[72px]"
      >
        <p className={cn('m-0 text-[13px] font-bold tracking-[0.5px] text-[#adc178]', APPEAR)}>
          알바생이 근무 중에 물어보면
        </p>
        <Question delay={300}>아이스 라떼 샷 몇 개 들어가요?</Question>
        <Answer delay={1500} label="AI 사수 · 매뉴얼 기준" chip="출처 · 레시피 › 카페라떼">
          얼음 → 우유 → 샷 순서로, 샷은 2개 넣어요.
        </Answer>
        <Question delay={4500} className="mt-2.5">
          비건 시럽은 어디 있어요?
        </Question>
        <Answer delay={5700} label="AI 사수" chip="사장님께 물어보기">
          매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요.
        </Answer>
      </div>
    </>
  )
}

/** 아래에서 살짝 올라오며 나타남. 지연 시간은 style 로 (클래스 이름을 조합하면 Tailwind 가 못 찾는다) */
const APPEAR =
  'animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 motion-reduce:animate-none'
const delayStyle = (ms: number) => ({ animationDelay: `${ms}ms` })

function Question({
  children,
  delay,
  className,
}: {
  children: ReactNode
  delay: number
  className?: string
}) {
  return (
    <p
      className={cn(
        'm-0 max-w-[420px] self-end rounded-[24px_24px_6px_24px] bg-[#fbfaf5] px-[22px] py-4 text-[17px] font-bold break-keep text-[#1f2a22]',
        APPEAR,
        className,
      )}
      style={delayStyle(delay)}
    >
      {children}
    </p>
  )
}

function Answer({
  children,
  delay,
  label,
  chip,
}: {
  children: ReactNode
  delay: number
  label: string
  chip: string
}) {
  return (
    <div
      className={cn(
        'flex max-w-[480px] flex-col items-start gap-2 self-start rounded-[24px_24px_24px_6px] bg-[#606c38] px-[22px] py-[18px] text-white',
        APPEAR,
      )}
      style={delayStyle(delay)}
    >
      <span className="text-xs font-extrabold text-[#d9e6b8]">{label}</span>
      <p className="m-0 text-base leading-[1.6] break-keep">{children}</p>
      <span className="rounded-full bg-[#373d20] px-3 py-1.5 text-xs font-bold text-[#adc178]">
        {chip}
      </span>
    </div>
  )
}
