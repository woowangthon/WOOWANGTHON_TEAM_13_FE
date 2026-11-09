import { LoaderCircle, LogOut, X } from 'lucide-react'
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
    <StaffFrame store={store} className="gap-[22px] pb-10">
      <Header title="마이페이지" onBack={close} />

      <section className="flex flex-col items-center gap-3.5 pt-1.5 pb-0.5">
        <span className="flex size-24 items-center justify-center rounded-full bg-brand text-[40px] font-extrabold text-background">
          {profileName.slice(0, 1)}
        </span>
        <form
          className="flex w-full flex-col items-center gap-2.5"
          onSubmit={(event) => {
            event.preventDefault()
            saveName()
          }}
        >
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={NICKNAME_MAX}
            aria-label="이름"
            className="w-full border-none bg-transparent p-0 text-center text-[28px] font-extrabold tracking-[-0.03em]"
          />
          {nameChanged && (
            <div className="flex gap-2">
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

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 px-1 text-[13px] font-bold text-[#6B7068]">연결된 계정</h2>
        <div className="flex items-center gap-3.5 rounded-[22px] bg-card px-4 py-3.5 shadow-soft">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full',
              provider === 'kakao' ? 'bg-[#FEE500]' : 'border border-line bg-white',
            )}
          >
            <ProviderLogo provider={provider} size={provider === 'kakao' ? 22 : 20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-base font-extrabold">
              {provider === 'kakao' ? '카카오' : 'Google'}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">{profileName}</span>
          </span>
          <Badge variant="soft" size="md">
            연결됨
          </Badge>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 px-1 text-[13px] font-bold text-[#6B7068]">소속 매장</h2>
        {stores.map((s) => {
          const Icon = STORE_ICON[s.icon]
          const asking = askDeleteId === s.id
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-3.5 shadow-soft',
                // 매장 줄을 눌렀을 때만 줄 전체가 눌림 (삭제 버튼은 따로)
                'transition-[transform,box-shadow] duration-150 ease-out has-[button.store-row:active]:scale-[0.98] has-[button.store-row:active]:shadow-[0_3px_10px_rgba(40,46,36,0.05)] motion-reduce:transition-none',
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
                  <span className="text-base font-extrabold">{s.name}</span>
                  <span className="text-[13px] text-muted-foreground">{s.meta}</span>
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
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-[#6B7068]"
                  >
                    <X className="size-5" />
                  </button>
                ))}
            </div>
          )
        })}

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
            className="flex-1 font-mono tracking-[0.12em] uppercase placeholder:font-sans placeholder:tracking-normal"
          />
          <Button type="submit" variant="ink" className="text-sm">
            근무지 추가
          </Button>
        </form>
        {codeError && (
          <span role="alert" className="px-1.5 text-[13px] text-destructive-foreground">
            {codeError}
          </span>
        )}
      </section>

      <div className="mt-1.5 flex flex-col gap-2.5">
        <Button variant="soft" className="h-[54px] text-base" onClick={logout}>
          <LogOut className="size-5" />
          로그아웃
        </Button>
        {askWithdraw ? (
          <div className="flex flex-col gap-3 rounded-[22px] bg-destructive-soft p-4">
            <span className="text-[15px] leading-normal font-bold break-keep text-[#7E352C]">
              정말 탈퇴할까요? 탈퇴하면 이 계정으로 다시 들어올 수 없어요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="white"
                className="h-12"
                disabled={withdrawing}
                onClick={() => setAskWithdraw(false)}
              >
                취소
              </Button>
              <Button variant="danger" className="h-12" disabled={withdrawing} onClick={withdraw}>
                {withdrawing ? <LoaderCircle className="size-5 animate-spin" /> : '탈퇴하기'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAskWithdraw(true)}
            className="p-2 text-sm font-semibold text-destructive-foreground"
          >
            회원탈퇴
          </button>
        )}
      </div>

      <Toaster bottom={32} />
    </StaffFrame>
  )
}
