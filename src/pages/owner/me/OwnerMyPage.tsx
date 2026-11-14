import { BookOpen, ChevronRight, Pencil, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { OAuthProvider } from '@/lib/auth'
import { refreshMe, signOut, withdrawAccount } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { toastApiError } from '@/lib/api/errors'
import { useMembers } from '@/pages/owner/api/members'
import { useDeleteStore, useOwnerProfile, useUpdateOwnerProfile } from '@/pages/owner/api/stores'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
import { useOwnerStore, type OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { PushNotificationSetting } from '@/shared/PushNotificationSetting'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { STORE_ICON } from '@/shared/icons'
import { SectionHeader } from '@/shared/SectionHeader'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사장님 마이페이지: 이름 · 연결된 계정 · 내 매장(상세 · 삭제 · [매장 추가] → 매장 등록 4단계) · 앱 사용법 · 로그아웃 · 탈퇴
export default function OwnerMyPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/owner')
  const { store, stores, isPending, setCurrentStoreId } = useOwnerStore()
  const profile = useOwnerProfile()
  const [askWithdraw, setAskWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  // 탈퇴도 매장 삭제처럼 같은 순간 두 번 눌러도 한 번만 부르게 잠금
  const withdrawLock = useRef(false)
  // 매장 삭제: 줄의 X → 아래 확인 상자(탈퇴 확인과 같은 모양) → [매장 삭제]에서만 API
  const [askDelete, setAskDelete] = useState<OwnerStoreView | null>(null)
  const remove = useDeleteStore()
  // isPending 은 다시 그린 뒤에야 true 라, 같은 순간 두 번 눌러도 한 번만 부르게 잠금
  const deleteLock = useRef(false)
  const setPendingRole = useAuthStore((state) => state.setPendingRole)

  const deleteStore = (target: OwnerStoreView) => {
    if (deleteLock.current) return
    deleteLock.current = true
    remove.mutate(target.storeId, {
      onSuccess: async () => {
        setAskDelete(null)
        toast(`${target.name} 매장을 삭제했어요`)
        // 내 정보(매장 목록) 다시 받기 — 로그인 없이 보는 중(가짜)에는 실패해도 그대로 진행
        await refreshMe().catch(() => {})
        const rest = stores.filter((s) => s.storeId !== target.storeId)
        if (rest.length > 0) {
          if (target.storeId === store.storeId) setCurrentStoreId(rest[0].storeId)
          return
        }
        // 마지막 매장: 지금 매장 · 고른 역할을 비우고 역할 선택으로 (뒤로 가도 마이페이지로 안 돌아오게 replace)
        setCurrentStoreId(null)
        setPendingRole(null)
        navigate('/role', { replace: true })
      },
      onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요'),
      onSettled: () => {
        deleteLock.current = false
      },
    })
  }

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // 탈퇴: DELETE /users/me 뒤 로그아웃 (알바 마이페이지와 같게). 같은 계정으로 다시 로그인하면 새 사용자로 시작 (BE 11/14)
  const withdraw = async () => {
    if (withdrawLock.current) return
    withdrawLock.current = true
    setWithdrawing(true)
    try {
      await withdrawAccount()
      navigate('/login', { replace: true })
      toast('탈퇴했어요')
    } catch (error) {
      withdrawLock.current = false
      setWithdrawing(false)
      toastApiError(error, '탈퇴하지 못했어요. 다시 시도해 주세요')
    }
  }

  return (
    <OwnerFrame colors={store} narrow className="gap-8 pb-10">
      <Header title="마이페이지" onBack={close} />

      {profile.data ? (
        <ProfileName key={profile.data.name} name={profile.data.name} />
      ) : (
        <Spinner />
      )}

      <LinkedAccount />

      <PushNotificationSetting />

      <section className="flex flex-col gap-3">
        <SectionHeader title="내 매장" />
        {isPending ? (
          <Spinner />
        ) : (
          // 알바 마이페이지 소속 매장처럼 카드 한 장 안에 줄 + 구분선 (11/14)
          <div className="flex flex-col overflow-hidden rounded-[22px] border border-line/60 bg-card">
            {stores.map((s) => (
              <StoreRow key={s.storeId} store={s} onAskDelete={() => setAskDelete(s)} />
            ))}
          </div>
        )}
        {/* 매장 삭제 확인: 회원탈퇴 확인과 같은 상자 */}
        {askDelete && (
          <div className="flex flex-col gap-3 rounded-3xl bg-destructive-soft p-4">
            <span className="text-[15px] leading-[1.55] font-bold break-keep text-destructive-foreground">
              정말 '{askDelete.name}'{objectParticle(askDelete.name)} 삭제할까요?
            </span>
            <span className="text-[13px] leading-[1.45] font-medium break-keep text-destructive-foreground">
              삭제하면 매장 정보와 레시피·매뉴얼, 직원·근무·급여 기록을 더 이상 확인할 수 없어요.
              소속 직원들도 매장에 접근할 수 없어요.
              <br />
              삭제한 매장은 앱에서 복구할 수 없어요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="white" size="md" onClick={() => setAskDelete(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={remove.isPending}
                onClick={() => deleteStore(askDelete)}
              >
                매장 삭제
              </Button>
            </div>
          </div>
        )}
        {/* 매장 추가는 온보딩과 같은 4단계로 (사업자등록번호 · 근무 타임 · 사진까지) */}
        <Link
          to="/owner/store/new"
          state={{ from: '/owner/me' }}
          className="flex h-[54px] items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line text-[13px] font-bold text-muted-foreground"
        >
          <Plus className="size-[18px]" />
          매장 추가
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="도움말" />
        <button
          type="button"
          // 다 보면(또는 건너뛰면) 마이페이지로 돌아온다
          onClick={() => navigate('/owner/guide', { state: { returnTo: '/owner/me' } })}
          className="flex items-center gap-3.5 rounded-[22px] border border-line/60 bg-card px-4 py-3.5 text-left"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <BookOpen className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-base font-extrabold">앱 사용법</span>
            <span className="text-[13px] text-muted-foreground">
              탭마다 무엇을 하는지 다시 보기
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-subtle" />
        </button>
      </section>

      {/* 로그아웃 · 탈퇴: 알바 마이페이지처럼 맨 아래 작은 글자 버튼 한 줄, 탈퇴는 위에 한 번 더 묻기 (11/14) */}
      <div className="flex flex-col gap-3">
        {askWithdraw && (
          <div className="flex flex-col gap-3 rounded-3xl bg-destructive-soft p-4">
            <span className="text-[15px] leading-[1.55] font-bold break-keep text-destructive-foreground">
              정말 탈퇴할까요? 탈퇴하면 내 매장과 레시피·매뉴얼, 직원 기록을 더 이상 볼 수 없어요.
              같은 계정으로 다시 가입하면 새 계정으로 시작해요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="white" size="md" onClick={() => setAskWithdraw(false)}>
                취소
              </Button>
              <Button variant="danger" size="md" disabled={withdrawing} onClick={withdraw}>
                탈퇴하기
              </Button>
            </div>
          </div>
        )}
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
    </OwnerFrame>
  )
}

/** 머리: 알바 마이페이지와 같은 모양 — 56px 이니셜 원 + 이름(눌러서 고치기, 칸을 벗어나면 저장), 왼쪽 정렬 · 매장 이름은 없음 (11/14) */
function ProfileName({ name }: { name: string }) {
  const [value, setValue] = useState(name)
  const update = useUpdateOwnerProfile()
  const save = () => {
    if (value.trim() === name || !value.trim()) return setValue(name)
    update.mutate(value, {
      onSuccess: () => toast('이름을 바꿨어요'),
      onError: (error) => {
        setValue(name)
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요')
      },
    })
  }
  return (
    <section className="-mt-4 flex items-center gap-4 px-1">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-[26px] font-extrabold text-background">
        {(value || name).slice(0, 1)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* 이름 옆 연필 · 점선 밑줄로 고칠 수 있다는 힌트 */}
        <label className="group flex min-h-8 w-full items-center gap-1.5">
          <span className="inline-grid max-w-[calc(100%-2rem)]">
            <span
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 overflow-hidden px-0.5 text-[19px] font-bold tracking-[-0.02em] whitespace-pre"
            >
              {value || ' '}
            </span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onBlur={save}
              // 기본 너비를 없애야 보이지 않는 글자 길이만큼만 넓어진다
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
      </div>
    </section>
  )
}

function LinkedAccount() {
  const me = useAuthStore((state) => state.me)
  const provider: OAuthProvider = me?.provider === 'google' ? 'google' : 'kakao'
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="연결된 계정" />
      <div className="flex items-center gap-3.5 rounded-[22px] border border-line/60 bg-card px-4 py-3.5">
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
          <span className="truncate text-[13px] text-muted-foreground">
            {me?.email ?? me?.nickname ?? '로그인 없이 보는 중'}
          </span>
        </span>
        <Badge variant="soft" size="md">
          연결됨
        </Badge>
      </div>
    </section>
  )
}

/** 받침에 맞는 목적격 조사: '달빛 카페'를 · '감자빵'을. 한글로 안 끝나면(영어 · 숫자) 을(를) */
function objectParticle(word: string) {
  const code = word.trim().charCodeAt(word.trim().length - 1) - 0xac00
  if (code < 0 || code > 11171) return '을(를)'
  return code % 28 === 0 ? '를' : '을'
}

function StoreRow({ store, onAskDelete }: { store: OwnerStoreView; onAskDelete: () => void }) {
  const members = useMembers(store.storeId)
  const Icon = STORE_ICON[store.icon]
  const count = members.data?.members.length ?? store.staffCount
  const payday = store.payday === 31 ? '말일' : `${store.payday}일`

  return (
    <div className="flex items-center gap-3 border-b border-line/60 py-3 pr-3 pl-3.5 last:border-b-0">
      <Link
        to={`/owner/stores/${store.storeId}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-foreground"
      >
        <StoreAvatar color={store.color}>
          <Icon className="size-5" fill="currentColor" />
        </StoreAvatar>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-extrabold">{store.name}</span>
          <span className="text-[13px] text-muted-foreground">
            직원 {count}명 · 매월 {payday} 급여
          </span>
        </span>
        <ChevronRight className="size-[22px] shrink-0 text-faint" />
      </Link>
      <button
        type="button"
        aria-label={`${store.name} 삭제`}
        onClick={onAskDelete}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
      >
        <X className="size-5" />
      </button>
    </div>
  )
}
