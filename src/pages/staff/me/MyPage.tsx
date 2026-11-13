import { BookOpen, ChevronRight, LoaderCircle, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { isRealApi } from '@/lib/api/source'
import { NICKNAME_MAX, useUpdateNickname } from '@/lib/api/users'
import { refreshMe, signOut, withdrawAccount, type OAuthProvider } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { STORE_ICON } from '@/shared/icons'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCloseTo } from '@/lib/useCloseTo'
import { CODE_LENGTH, normalizeCode } from '@/pages/staff/join/inviteCode'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { useProfileName } from '@/pages/staff/useProfileName'
import { SectionHeader } from '@/shared/SectionHeader'
import { PushNotificationSetting } from '@/shared/PushNotificationSetting'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Header } from '@/ui/Header'
import { Input } from '@/ui/Input'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 마이페이지: 이름(PATCH /users/me) · 연결된 계정 · 소속 매장(GET /users/me/stores, 삭제 · 코드로 추가) · 로그아웃 · 탈퇴(DELETE /users/me)
// 근무지 추가 · 매장 삭제는 기획 대기: 진짜 API 면 근무지 추가는 초대코드 입장(/staff/join)으로, 매장 삭제는 BE 에 알바용 API 가 없어 숨긴다
export default function MyPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/staff')
  const { store, stores, setCurrentStoreId } = useCurrentStore()
  const [profileName, setProfileName] = useProfileName()
  // 로그인 방식. SKIP_AUTH 로 로그인 없이 볼 때는 가짜(카카오)
  const loginProvider = useAuthStore((state) => state.me?.provider)
  const provider: OAuthProvider = loginProvider === 'google' ? 'google' : 'kakao'
  const removeStore = useStaffStore((state) => state.removeStore)
  const restoreStoreByCode = useStaffStore((state) => state.restoreStoreByCode)

  const [askDeleteId, setAskDeleteId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [askWithdraw, setAskWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const real = isRealApi('users')

  // 이름: 고친 뒤 [저장] (Enter 도 저장)
  const me = useAuthStore((state) => state.me)
  const setMe = useAuthStore((state) => state.setMe)
  const updateNickname = useUpdateNickname()
  const [nameDraft, setNameDraft] = useState(profileName)
  const nextName = nameDraft.trim()
  const nameChanged = nextName !== '' && nextName !== profileName
  const saveName = () => {
    if (!nameChanged || updateNickname.isPending) return
    // 로그인 없이 볼 때(VITE_SKIP_AUTH) · 가짜 서버: 화면 안의 값만
    if (!me || !real) {
      if (me) setMe({ ...me, nickname: nextName })
      else setProfileName(nextName)
      setNameDraft(nextName)
      return void toast('저장했어요')
    }
    updateNickname.mutate(nextName, {
      onSuccess: async () => {
        // 저장한 이름을 GET /users/me 로 다시 받아 상단 동그라미 · 역할 선택 인사까지 맞춘다
        await refreshMe().catch(() => {})
        setNameDraft(nextName)
        toast('저장했어요')
      },
      onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', saveName),
    })
  }

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const withdraw = async () => {
    setWithdrawing(true)
    try {
      await withdrawAccount()
      navigate('/login', { replace: true })
      toast('탈퇴했어요')
    } catch (error) {
      setWithdrawing(false)
      toastApiError(error, '탈퇴하지 못했어요. 다시 시도해 주세요')
    }
  }

  const addByCode = () => {
    const value = code.trim()
    if (!value) return setCodeError('코드를 입력해 주세요')
    // 진짜 API: 초대코드 입장 화면에서 확인 · 입장 (입장하면 내 매장에 생긴다)
    if (real) {
      const normalized = normalizeCode(value)
      if (normalized.length !== CODE_LENGTH) return setCodeError('6자리 코드를 입력해 주세요')
      return navigate(`/staff/join?code=${normalized}`)
    }
    const restoredId = restoreStoreByCode(value)
    if (!restoredId) return setCodeError('유효하지 않은 코드예요')
    setCode('')
    setCodeError('')
    toast('근무지를 추가했어요')
  }

  return (
    <StaffFrame store={store} className="gap-8 pb-10">
      <Header title="마이페이지" onBack={close} />

      {/* 머리: 56px 이니셜 원 + 이름(눌러서 고치기) · 지금 매장 한 줄, 왼쪽 정렬 (큰 가운데 히어로 대신 — docs/08 챕터 6) */}
      <section className="-mt-4 flex items-start gap-4 px-1">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-[26px] font-extrabold text-background">
          {profileName.slice(0, 1)}
        </span>
        <form
          className="flex min-w-0 flex-1 flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault()
            saveName()
          }}
        >
          {/* 이름은 눌러서 고칠 수 있다는 힌트: 이름 바로 옆 연필 + 옅은 점선 밑줄.
              입력칸 너비를 글자 길이에 맞추려고 같은 글자를 안 보이게 겹쳐 둔다 (grid 한 칸) */}
          <label className="group flex min-h-8 w-full items-center gap-1.5">
            <span className="inline-grid max-w-[calc(100%-2rem)]">
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 overflow-hidden px-0.5 text-[19px] font-bold tracking-[-0.02em] whitespace-pre"
              >
                {nameDraft || ' '}
              </span>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={NICKNAME_MAX}
                // 기본 너비(약 20자)를 없애야 보이지 않는 글자 길이만큼만 넓어진다
                size={1}
                aria-label="이름"
                className="col-start-1 row-start-1 w-full min-w-[2ch] border-none bg-transparent p-0 text-[19px] font-bold tracking-[-0.02em] underline decoration-line decoration-dotted decoration-2 underline-offset-4 focus:decoration-brand"
              />
            </span>
            <Pencil
              aria-hidden="true"
              className="size-4 shrink-0 text-subtle group-focus-within:text-brand"
            />
          </label>
          <span className="truncate text-[13px] font-medium text-muted-foreground">
            {store.name}
          </span>
          {nameChanged && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="soft"
                size="sm"
                onClick={() => setNameDraft(profileName)}
                disabled={updateNickname.isPending}
              >
                취소
              </Button>
              <Button type="submit" size="sm" disabled={updateNickname.isPending}>
                {updateNickname.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          )}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="연결된 계정" />
        <div className={LIST}>
          <div className={ROW}>
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                provider === 'kakao' ? 'bg-[#FEE500]' : 'border border-line bg-white',
              )}
            >
              <ProviderLogo provider={provider} size={provider === 'kakao' ? 20 : 18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base leading-[1.4] font-bold">
                {provider === 'kakao' ? '카카오' : 'Google'}
              </span>
              <span className="truncate text-[13px] font-medium text-muted-foreground">
                {profileName}
              </span>
            </span>
            <Badge variant="soft" size="md">
              연결됨
            </Badge>
          </div>
        </div>
      </section>

      <PushNotificationSetting />

      <section className="flex flex-col gap-3">
        <SectionHeader title="소속 매장" />
        <div className={LIST}>
          {stores.map((s) => {
            const Icon = STORE_ICON[s.icon]
            const asking = askDeleteId === s.id
            return (
              <div
                key={s.id}
                className={cn(
                  ROW,
                  // 매장 줄을 눌렀을 때만 줄 바탕이 살짝 어두워짐 (삭제 버튼은 따로)
                  'transition-colors duration-150 has-[button.store-row:active]:bg-secondary motion-reduce:transition-none',
                )}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/staff/stores/${s.id}`)}
                  className="store-row flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <StoreAvatar color={s.color}>
                    <Icon className="size-5" fill="currentColor" />
                  </StoreAvatar>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base leading-[1.4] font-bold">{s.name}</span>
                    <span className="truncate text-[13px] font-medium text-muted-foreground">
                      {s.meta}
                    </span>
                  </span>
                </button>
                {/* 매장 삭제(기획 대기): BE 에 알바가 매장에서 나가는 API 가 없어 진짜 API 면 숨긴다 */}
                {!real &&
                  stores.length > 1 &&
                  (asking ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        removeStore(s.id)
                        if (s.id === store.id) {
                          setCurrentStoreId(stores.find((other) => other.id !== s.id)?.id ?? null)
                        }
                        setAskDeleteId(null)
                        toast(`${s.name} 매장을 삭제했어요`)
                      }}
                    >
                      삭제
                    </Button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`${s.name} 삭제`}
                      onClick={() => setAskDeleteId(s.id)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
                    >
                      <X className="size-5" />
                    </button>
                  ))}
                {/* 다른 줄처럼 › 로 "눌러서 들어가는 줄"임을 보여 준다 (삭제 버튼이 있으면 그 자리) */}
                {(real || stores.length <= 1) && (
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-subtle" />
                )}
              </div>
            )
          })}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addByCode()
          }}
        >
          <Input
            variant="card"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
              setCodeError('')
            }}
            placeholder="초대코드"
            aria-label="초대코드"
            // 흰 바탕 위 크림색 입력칸이라 옅은 테두리. 코드는 앱 글꼴 그대로 고정폭 숫자 + 넓은 자간
            className="flex-1 border border-line/60 tracking-[0.12em] tabular-nums uppercase placeholder:tracking-normal"
          />
          <Button type="submit">근무지 추가</Button>
        </form>
        {codeError && (
          <span role="alert" className="px-1 text-[13px] font-medium text-destructive-foreground">
            {codeError}
          </span>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="도움말" />
        <div className={LIST}>
          <button
            type="button"
            // 다 보면(또는 건너뛰면) 마이페이지로 돌아온다
            onClick={() => navigate('/staff/guide', { state: { returnTo: '/staff/me' } })}
            className={cn(
              ROW,
              'w-full text-left transition-colors duration-150 active:bg-secondary motion-reduce:transition-none',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base leading-[1.4] font-bold">앱 사용법</span>
              <span className="text-[13px] font-medium text-muted-foreground">
                탭마다 무엇을 하는지 다시 보기
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-subtle" />
          </button>
        </div>
      </section>

      {/* 로그아웃 · 탈퇴: 맨 아래 작은 글자 버튼 (위험한 동작은 작게 — docs/08 챕터 6) */}
      <div className="flex flex-col gap-3">
        {askWithdraw ? (
          <div className="flex flex-col gap-3 rounded-3xl bg-destructive-soft p-4">
            <span className="text-[15px] leading-[1.55] font-bold break-keep text-destructive-foreground">
              정말 탈퇴할까요? 탈퇴하면 이 계정으로 다시 들어올 수 없어요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="white"
                size="md"
                disabled={withdrawing}
                onClick={() => setAskWithdraw(false)}
              >
                취소
              </Button>
              <Button variant="danger" size="md" disabled={withdrawing} onClick={withdraw}>
                {withdrawing ? <LoaderCircle className="size-5 animate-spin" /> : '탈퇴하기'}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-center gap-1 text-[13px] font-medium">
          <button
            type="button"
            onClick={logout}
            className="rounded-full px-3 py-2 text-muted-foreground active:bg-secondary"
          >
            로그아웃
          </button>
          <span aria-hidden="true" className="text-faint">
            ·
          </span>
          <button
            type="button"
            onClick={() => setAskWithdraw(true)}
            className="rounded-full px-3 py-2 text-destructive-foreground active:bg-secondary"
          >
            회원탈퇴
          </button>
        </div>
      </div>

      <Toaster bottom={32} />
    </StaffFrame>
  )
}

/** 마이페이지 목록 카드 · 줄 (연결된 계정 · 소속 매장 · 도움말이 같은 모양) */
const LIST = 'flex flex-col overflow-hidden rounded-3xl border border-line/60 bg-card'
const ROW = 'flex items-center gap-3 border-b border-line/60 px-4 py-3.5 last:border-b-0'
