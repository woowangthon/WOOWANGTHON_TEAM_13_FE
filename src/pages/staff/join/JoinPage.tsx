import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, ClipboardList, Coffee, LoaderCircle, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  InviteError,
  joinStore,
  verifyInviteCode,
  type InviteErrorReason,
  type InviteInfo,
} from '@/api/mocks/staff/join'
import type { StaffStore } from '@/api/mocks/staff/stores'
import { refreshMe } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { env } from '@/lib/env'
import { useStoreStore } from '@/lib/storeStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { CodeCells } from '@/pages/staff/join/components/CodeCells'
import { CODE_LENGTH, normalizeCode } from '@/pages/staff/join/inviteCode'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 초대코드 입장 (디자인: docs/design/login-onboarding.html): 6칸 입력 → 확인 · 매장 카드 → 입장 → 완료
// 초대 링크(/staff/join?code=K7P2QX)로 오면 코드를 채우고 바로 확인한다

const ERROR_TEXT: Record<InviteErrorReason, string> = {
  invalid: '유효하지 않은 코드',
  joined: '이미 들어간 매장이에요',
  // 틀린 횟수는 BE 가 센다. 서버가 잠김을 주면 이 문구만 보여 준다
  locked: '5번 틀려서 10분 동안 입력할 수 없어요',
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setPendingRole = useAuthStore((state) => state.setPendingRole)
  const setCurrentStoreId = useStoreStore((state) => state.setCurrentStoreId)

  const linkCode = normalizeCode(searchParams.get('code') ?? '')
  const [code, setCode] = useState(linkCode)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<InviteErrorReason | null>(null)
  const [joined, setJoined] = useState<InviteInfo | null>(null)
  /** 이미 들어간 매장 코드를 넣었을 때 그 매장 ([○○로 가기]) */
  const [memberStore, setMemberStore] = useState<StaffStore | null>(null)

  const handleError = (err: unknown, retry: () => void) => {
    setInvite(null)
    if (err instanceof InviteError) {
      setError(err.reason)
      setMemberStore(err.store ?? null)
    } else {
      toast.error('코드를 확인하지 못했어요. 다시 시도해 주세요', { onRetry: retry })
    }
  }

  const goToStore = (store: StaffStore) => {
    setPendingRole(null)
    setCurrentStoreId(store.id)
    navigate('/staff', { replace: true })
  }

  const verify = useMutation({
    mutationFn: verifyInviteCode,
    onSuccess: setInvite,
    onError: (err, value) => handleError(err, () => verify.mutate(value)),
  })

  const join = useMutation({
    mutationFn: async (value: string) => {
      const info = await joinStore(value)
      if (!env.skipAuth) await refreshMe() // me 에 매장이 생겨야 알바 화면에 들어갈 수 있다
      return info
    },
    onSuccess: (info) => {
      setPendingRole(null)
      setCurrentStoreId(info.store.id)
      setJoined(info)
    },
    onError: (err, value) => handleError(err, () => join.mutate(value)),
  })

  // 초대 링크로 코드가 같이 오면 바로 확인 (한 번만)
  const checkedLink = useRef(false)
  useEffect(() => {
    if (checkedLink.current || linkCode.length !== CODE_LENGTH) return
    checkedLink.current = true
    verify.mutate(linkCode)
  }, [linkCode, verify])

  if (joined)
    return <JoinDone invite={joined} onStart={() => navigate('/staff', { replace: true })} />

  const changeCode = (value: string) => {
    setCode(value)
    setInvite(null)
    setError(null)
    setMemberStore(null)
  }

  const full = code.length === CODE_LENGTH
  const pending = verify.isPending || join.isPending
  const locked = error === 'locked'

  const submit = () => {
    if (!full || pending || locked) return
    if (invite) join.mutate(code)
    else verify.mutate(code)
  }

  return (
    <AuthFrame>
      <OnboardingHeader step={1} onBack={() => navigate('/role')} />

      <form
        className="flex flex-1 flex-col gap-[22px]"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2 px-1 pt-1.5">
          <p className="m-0 text-[13px] font-medium text-muted-foreground">알바생</p>
          <h1 className="m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em]">
            초대코드 입력
          </h1>
        </div>

        <div className="flex flex-col gap-2.5">
          <CodeCells value={code} onChange={changeCode} error={error !== null} disabled={locked} />
          {error && (
            <p role="alert" className="m-0 px-1.5 text-[13px] text-destructive-foreground">
              {ERROR_TEXT[error]}
            </p>
          )}
          {error === 'joined' && memberStore && (
            <Button
              variant="ink"
              size="md"
              className="self-start"
              onClick={() => goToStore(memberStore)}
            >
              {withRo(memberStore.name)} 가기
              <ArrowRight />
            </Button>
          )}
          <p className="m-0 px-1.5 text-xs text-subtle">사장님께 받은 6자리 · 예) K7P2QX</p>
        </div>

        {invite && (
          <div className="flex items-center gap-3.5 rounded-[24px] bg-card p-4 shadow-soft animate-in fade-in-0 slide-in-from-bottom-2">
            <span
              className="size-[52px] shrink-0 overflow-hidden rounded-[18px]"
              style={{ background: invite.store.color }}
            >
              {invite.store.photo && (
                <img src={invite.store.photo} alt="" className="size-full object-cover" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <strong className="text-[17px] font-extrabold">{invite.store.name}</strong>
              <span className="text-[13px] text-muted-foreground">
                {invite.store.ownerName} · {invite.staffName} 님 자리
              </span>
            </span>
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Check className="size-[18px]" />
            </span>
          </div>
        )}

        <Button
          type="submit"
          className="mt-auto h-14 text-base"
          disabled={!full || pending || locked}
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : invite ? '입장' : '확인'}
        </Button>
      </form>
    </AuthFrame>
  )
}

/** 입장 완료 카드 아래 바로가기 (인수인계 확인은 홈 맨 위 "오늘의 인수인계") */
const NEXT_LINKS = [
  { to: '/staff/recipes', icon: Coffee, label: '레시피 보기' },
  { to: '/staff/chat', icon: Sparkles, label: 'AI 사수에게 묻기' },
  { to: '/staff', icon: ClipboardList, label: '인수인계 확인' },
]

// 디자인 시안은 초록 카드 — 비어 보여서 매장 사진 + 환영 문구 + 바로가기 칩으로 바꿈
function JoinDone({ invite, onStart }: { invite: InviteInfo; onStart: () => void }) {
  const { store, staffName } = invite
  return (
    <AuthFrame className="gap-[22px]">
      <section
        className="relative isolate flex min-h-[420px] flex-1 flex-col justify-between overflow-hidden rounded-[32px] p-6 text-white"
        style={{ background: store.color }}
      >
        {store.photo && (
          <img src={store.photo} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: store.scrim }}
        />
        <span
          className="flex size-14 items-center justify-center rounded-full bg-white"
          style={{ color: store.color }}
        >
          <Check className="size-[30px]" />
        </span>
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-sm opacity-80">{store.name}</p>
            <h1 className="m-0 text-[32px] leading-[1.22] font-extrabold tracking-[-0.035em]">
              입장 완료
            </h1>
            <p className="m-0 text-[15px] opacity-90">{staffName} 님, 오늘부터 함께해요</p>
          </div>
          <nav aria-label="바로가기" className="flex flex-wrap gap-2">
            {NEXT_LINKS.map(({ to, icon: Icon, label }) => (
              <Link
                key={label}
                to={to}
                replace
                className="flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-2 text-[13px] font-semibold text-white backdrop-blur-[8px]"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <Button variant="ink" className="h-14 text-base" onClick={onStart}>
        시작하기
        <ArrowRight className="size-5" />
      </Button>
    </AuthFrame>
  )
}

/** 받침에 맞춰 "로/으로"를 붙인다 (받침 없거나 ㄹ 받침이면 "로": 달빛 카페로 · 오후의 커피로) */
function withRo(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`
}
