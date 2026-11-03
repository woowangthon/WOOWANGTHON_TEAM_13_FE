import { LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { signOut, type OAuthProvider } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { STORE_ICON } from '@/shared/icons'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { useProfileName } from '@/pages/staff/useProfileName'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Header } from '@/ui/Header'
import { Input } from '@/ui/Input'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 마이페이지: 이름 · 연결된 계정 · 소속 매장(삭제 · 코드로 추가) · 로그아웃 · 탈퇴
export default function MyPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/staff')
  const { store, stores, setCurrentStoreId } = useCurrentStore()
  const [profileName, setProfileName] = useProfileName()
  // 로그인 방식. SKIP_AUTH 로 로그인 없이 볼 때는 가짜(카카오)
  const loginProvider = useAuthStore((state) => state.provider)
  const provider: OAuthProvider = loginProvider === 'google' ? 'google' : 'kakao'
  const removeStore = useStaffStore((state) => state.removeStore)
  const restoreStoreByCode = useStaffStore((state) => state.restoreStoreByCode)

  const [askDeleteId, setAskDeleteId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [askWithdraw, setAskWithdraw] = useState(false)

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const addByCode = () => {
    const value = code.trim()
    if (!value) return setCodeError('코드를 입력해 주세요')
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
        <input
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          aria-label="이름"
          className="w-full border-none bg-transparent p-0 text-center text-[28px] font-extrabold tracking-[-0.03em]"
        />
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
              className="flex items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-3.5 shadow-soft"
            >
              <button
                type="button"
                onClick={() => navigate(`/staff/stores/${s.id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <StoreAvatar color={s.color}>
                  <Icon className="size-5" fill="currentColor" />
                </StoreAvatar>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-extrabold">{s.name}</span>
                  <span className="text-[13px] text-muted-foreground">{s.meta}</span>
                </span>
              </button>
              {stores.length > 1 &&
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
              탈퇴하면 근무 기록과 급여 설정이 모두 삭제돼요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="white" className="h-12" onClick={() => setAskWithdraw(false)}>
                취소
              </Button>
              <Button variant="danger" className="h-12" onClick={logout}>
                탈퇴하기
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
