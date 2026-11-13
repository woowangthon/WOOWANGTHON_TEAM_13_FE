import {
  ArrowRight,
  Check,
  ClipboardList,
  Coffee,
  LoaderCircle,
  MessagesSquare,
} from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { useJoinStore, useVerifyInvite } from '@/lib/api/invitations'
import type { AlreadyJoinedDetail, InviteVerification, StoreTheme } from '@/lib/api/types'
import { useMyStores } from '@/lib/api/users'
import { ApiError } from '@/lib/apiClient'
import { refreshMe } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { env } from '@/lib/env'
import { formatOwner } from '@/lib/format'
import { useStoreStore } from '@/lib/storeStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import {
  OnboardingDoneDesktop,
  type NextStep,
} from '@/pages/owner/store/components/OnboardingDoneDesktop'
import { StoreStepFrame, type OnboardingStep } from '@/pages/owner/store/components/StoreStepFrame'
import { useWide } from '@/pages/owner/useWide'
import { CodeCells } from '@/pages/staff/join/components/CodeCells'
import { CODE_LENGTH, normalizeCode } from '@/pages/staff/join/inviteCode'
import { STORE_ICON } from '@/shared/icons'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'
import { Button } from '@/ui/Button'

// 초대코드 입장 (디자인: docs/design/login-onboarding.html): 6칸 입력 → 확인 · 매장 카드 → 입장 → 완료
// 초대 링크(/staff/join?code=K7P2QX)로 오면 코드를 채우고 바로 확인한다
// 데스크톱(lg 1024px 이상, 11/14 나현 · 민지 OK): 사장님 매장 등록과 같은 틀(owner StoreStepFrame · OnboardingDoneDesktop 을 import)
//   — 왼쪽 세로 타임라인(초대코드 입력 → 매장 확인 → 입장 완료) + 오른쪽 가운데 폼 · 아래 액션 바. 휴대폰은 그대로

/** 데스크톱 왼쪽 타임라인 */
const JOIN_STEPS: OnboardingStep[] = [
  { name: '초대코드 입력', desc: '사장님께 받은 6자리' },
  { name: '매장 확인', desc: '매장 · 내 이름 확인' },
  { name: '입장 완료', desc: '바로 시작해요' },
]

type InviteErrorReason = 'invalid' | 'joined' | 'locked' | 'revoked'

/** BE 에러 코드(docs/07 2-1) → 화면에서 칸 아래에 보여 줄 이유 */
const REASON_BY_CODE: Record<string, InviteErrorReason> = {
  INVITE_INVALID: 'invalid',
  // BE 는 코드에 0 · O · 1 · I 가 있으면 형식 오류(422)로 거절한다 (틀린 횟수에는 안 들어감) → 유효하지 않은 코드로 보여 준다
  VALIDATION_ERROR: 'invalid',
  INVITE_ALREADY_JOINED: 'joined',
  INVITE_LOCKED: 'locked',
  INVITE_REVOKED: 'revoked',
}

const ERROR_TEXT: Record<InviteErrorReason, string> = {
  invalid: '유효하지 않은 코드',
  joined: '이미 들어간 매장이에요',
  // 틀린 횟수는 BE 가 센다. 서버가 잠김을 주면 이 문구만 보여 준다
  locked: '5번 틀려서 10분 동안 입력할 수 없어요',
  revoked: '사장님이 삭제했거나 이미 사용한 코드예요',
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setPendingRole = useAuthStore((state) => state.setPendingRole)
  const setCurrentStoreId = useStoreStore((state) => state.setCurrentStoreId)
  const verify = useVerifyInvite()
  const join = useJoinStore()
  const wide = useWide()
  // 테마가 없는 매장은 내 매장 순서대로 색을 정한다 → 새로 들어가는 매장은 다음 순서
  const myStoreCount = useMyStores().data?.stores.length ?? 0

  const linkCode = normalizeCode(searchParams.get('code') ?? '')
  const [code, setCode] = useState(linkCode)
  const [invite, setInvite] = useState<InviteVerification | null>(null)
  const [error, setError] = useState<InviteErrorReason | null>(null)
  const [joined, setJoined] = useState<{ invite: InviteVerification; theme: StoreTheme } | null>(
    null,
  )
  /** 이미 들어간 매장 코드를 넣었을 때 그 매장 ([○○로 가기]) */
  const [memberStore, setMemberStore] = useState<AlreadyJoinedDetail | null>(null)
  /** 틀렸을 때 남은 횟수 (BE INVITE_INVALID detail.remainingAttempts, 0 이 되면 10분 잠김) */
  const [remaining, setRemaining] = useState<number | null>(null)

  const handleError = (err: unknown, retry: () => void) => {
    setInvite(null)
    const reason = err instanceof ApiError && err.code ? REASON_BY_CODE[err.code] : undefined
    if (reason) {
      setError(reason)
      const left = (err as ApiError).detail as { remainingAttempts?: unknown } | null
      setRemaining(
        reason === 'invalid' && typeof left?.remainingAttempts === 'number'
          ? left.remainingAttempts
          : null,
      )
      setMemberStore(reason === 'joined' ? ((err as ApiError).detail as AlreadyJoinedDetail) : null)
    } else {
      toastApiError(err, '코드를 확인하지 못했어요. 다시 시도해 주세요', retry)
    }
  }

  const goToStore = (store: AlreadyJoinedDetail) => {
    setPendingRole(null)
    setCurrentStoreId(store.storeId)
    navigate('/staff', { replace: true })
  }

  const runVerify = async (value: string) => {
    try {
      setInvite(await verify.mutateAsync(value))
    } catch (err) {
      handleError(err, () => runVerify(value))
    }
  }

  const runJoin = async (value: string, verified: InviteVerification) => {
    // 입장하면 내 매장 목록이 늘어나니, 색은 입장 전에 정해 둔다
    const theme = themeOf(verified.store.theme, myStoreCount)
    try {
      const membership = await join.mutateAsync(value)
      if (!env.skipAuth) await refreshMe() // me 에 매장이 생겨야 알바 화면에 들어갈 수 있다
      setPendingRole(null)
      setCurrentStoreId(membership.storeId)
      setJoined({ invite: verified, theme })
    } catch (err) {
      handleError(err, () => runJoin(value, verified))
    }
  }

  // 초대 링크로 코드가 같이 오면 바로 확인 (한 번만)
  const checkedLink = useRef(false)
  const verifyLinkCode = useEffectEvent(() => runVerify(linkCode))
  useEffect(() => {
    if (checkedLink.current || linkCode.length !== CODE_LENGTH) return
    checkedLink.current = true
    verifyLinkCode()
  }, [linkCode])

  if (joined)
    return (
      <JoinDone
        invite={joined.invite}
        theme={joined.theme}
        // 처음 들어온 알바생: 앱 사용법을 보고 알바 홈으로
        onStart={() => navigate('/staff/guide', { replace: true })}
        wide={wide}
      />
    )

  const changeCode = (value: string) => {
    setCode(value)
    setInvite(null)
    setError(null)
    setMemberStore(null)
    setRemaining(null)
  }

  const full = code.length === CODE_LENGTH
  const pending = verify.isPending || join.isPending
  const locked = error === 'locked'

  const submit = () => {
    if (!full || pending || locked) return
    if (invite) runJoin(code, invite)
    else runVerify(code)
  }

  /** 초대코드 6칸 · 오류 · [○○로 가기] · 안내 (휴대폰 · 데스크톱 같이) */
  const codeBlock = (
    <div className="flex flex-col gap-2">
      <CodeCells value={code} onChange={changeCode} error={error !== null} disabled={locked} />
      {error && (
        <p role="alert" className="m-0 px-1 text-[13px] font-medium text-destructive-foreground">
          {ERROR_TEXT[error]}
          {remaining !== null && remaining > 0 && ` · ${remaining}번 더 틀리면 10분 동안 잠겨요`}
        </p>
      )}
      {error === 'joined' && memberStore && (
        <Button
          variant="soft"
          size="md"
          className="self-start"
          onClick={() => goToStore(memberStore)}
        >
          {withRo(memberStore.storeName)} 가기
          <ArrowRight />
        </Button>
      )}
      <p className="m-0 px-1 text-xs font-medium text-subtle tabular-nums">
        사장님께 받은 6자리 · 예) K7P2QX
      </p>
    </div>
  )
  /** 확인된 매장 미리보기 */
  const preview = invite && (
    <InvitePreview invite={invite} theme={themeOf(invite.store.theme, myStoreCount)} />
  )

  const submitButton = (className: string) => (
    <Button
      type="submit"
      form="join-form"
      className={className}
      disabled={!full || pending || locked}
    >
      {pending ? <LoaderCircle className="size-5 animate-spin" /> : invite ? '입장' : '확인'}
    </Button>
  )

  if (wide)
    return (
      <StoreStepFrame
        heading="근무지 입장"
        subheading="초대코드만 있으면 바로 끝나요"
        steps={JOIN_STEPS}
        narrow
        who="알바생"
        step={invite ? 2 : 1}
        title={invite ? '매장 확인' : '초대코드 입력'}
        onBack={() => navigate('/role')}
        summaries={[code]}
        canGo={() => false}
        onGoStep={() => {}}
        actions={submitButton('h-12 w-full text-base')}
      >
        <form
          id="join-form"
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {codeBlock}
          {preview}
        </form>
      </StoreStepFrame>
    )

  return (
    <AuthFrame tone="white">
      <OnboardingHeader step={1} onBack={() => navigate('/role')} />

      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2 px-1 pt-1">
          <p className="m-0 text-[13px] font-medium text-muted-foreground">알바생</p>
          <h1 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
            초대코드 입력
          </h1>
        </div>

        {codeBlock}

        {preview}

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

/**
 * 확인된 매장 미리보기: 매장 사진(없으면 매장 색 아바타 + 매장 아이콘) · 이름 · "박 사장님 · 지은 님으로 들어가요" · ✓
 * 흰 바탕 위 연한 카드 + 옅은 테두리 (docs/08 4)
 */
function InvitePreview({ invite, theme }: { invite: InviteVerification; theme: StoreTheme }) {
  const Icon = STORE_ICON[theme]
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line/60 bg-card p-4 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none">
      {invite.store.photoUrl ? (
        <img
          src={invite.store.photoUrl}
          alt=""
          className="size-12 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <StoreAvatar color={STORE_THEME[theme].color} size={48}>
          <Icon className="size-6" fill="currentColor" />
        </StoreAvatar>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="truncate text-base leading-[1.4] font-bold">{invite.store.name}</strong>
        <span className="text-[13px] font-medium text-muted-foreground">
          {formatOwner(invite.store.ownerName)} · {invite.staffName} 님으로 들어가요
        </span>
      </span>
      <Check aria-label="확인된 코드" className="size-5 shrink-0 text-brand" strokeWidth={2.4} />
    </div>
  )
}

/** 입장 완료 카드 아래 바로가기 (인수인계 확인은 홈 맨 위 "오늘의 인수인계"). 글자와 같은 뜻의 아이콘은 빼고 글자만 */
const NEXT_LINKS = [
  { to: '/staff/recipes', label: '레시피 보기' },
  { to: '/staff/chat', label: 'AI 사수에게 묻기' },
  { to: '/staff', label: '인수인계 확인' },
]

// 디자인 시안은 초록 카드 — 비어 보여서 매장 사진 + 환영 문구 + 바로가기 칩으로 바꿈
/** 데스크톱 입장 완료 오른쪽 처음 할 일 (휴대폰 바로가기 칩과 같은 곳) */
const NEXT_STEPS: NextStep[] = [
  {
    to: '/staff',
    icon: ClipboardList,
    label: '인수인계 확인',
    desc: '지난 근무자가 남긴 할 일을 확인해요',
  },
  {
    to: '/staff/recipes',
    icon: Coffee,
    label: '레시피 보기',
    desc: '우리 매장 음료 레시피를 볼 수 있어요',
  },
  {
    to: '/staff/chat',
    icon: MessagesSquare,
    label: 'AI 사수에게 묻기',
    desc: '모르는 건 매장 매뉴얼 기준으로 답해요',
  },
]

function JoinDone({
  invite,
  theme: themeKey,
  onStart,
  wide,
}: {
  invite: InviteVerification
  theme: StoreTheme
  onStart: () => void
  /** 데스크톱: 사장님 등록 완료와 같은 두 칸 (owner OnboardingDoneDesktop) */
  wide: boolean
}) {
  const { store, staffName } = invite
  const theme = STORE_THEME[themeKey]
  if (wide)
    return (
      <OnboardingDoneDesktop
        photoUrl={store.photoUrl}
        badge="입장 완료"
        title={store.name}
        meta={`${formatOwner(store.ownerName)} · ${staffName} 님`}
        heading={
          <>
            {staffName} 님,
            <br />
            오늘부터 함께해요
          </>
        }
        description="처음엔 이것부터 해 보세요."
        steps={NEXT_STEPS}
        onStart={onStart}
      />
    )
  return (
    <AuthFrame tone="white" className="gap-6">
      <section
        className="relative isolate flex min-h-[420px] flex-1 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white"
        style={{ background: theme.color }}
      >
        {store.photoUrl && (
          <img
            src={store.photoUrl}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: theme.scrim }}
        />
        <span
          className="flex size-14 items-center justify-center rounded-full bg-white"
          style={{ color: theme.color }}
        >
          <Check className="size-[30px]" />
        </span>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[13px] font-medium text-white/80">{store.name}</p>
            {/* 입장 첫 화면의 큰 카피: 로그인과 같은 34px (docs/08 2 예외) */}
            <h1 className="m-0 text-[34px] leading-[1.22] font-extrabold tracking-[-0.03em]">
              입장 완료
            </h1>
            <p className="m-0 text-[15px] font-medium text-white/90">
              {staffName} 님, 오늘부터 함께해요
            </p>
          </div>
          {/* 사진 위 칩은 검정 반투명 (docs/08 4 예외, 유리 효과 대신) */}
          <nav aria-label="바로가기" className="flex flex-wrap gap-2">
            {NEXT_LINKS.map(({ to, label }) => (
              <Link
                key={label}
                to={to}
                replace
                className="flex h-9 items-center rounded-full bg-black/35 px-3.5 text-[13px] font-bold text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <Button className="h-14 text-base" onClick={onStart}>
        시작하기
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
