import { BookOpen, ChevronRight, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { OAuthProvider } from '@/lib/auth'
import { signOut } from '@/lib/auth'
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

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <OwnerFrame colors={store} narrow className="gap-8 pb-10">
      <Header title="마이페이지" onBack={close} />

      {profile.data ? (
        <ProfileName key={profile.data.name} name={profile.data.name} storeName={store.name} />
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
          stores.map((s) => (
            <StoreRow
              key={s.storeId}
              store={s}
              canDelete={stores.length > 1}
              onDeleted={() => {
                if (s.storeId === store.storeId) {
                  setCurrentStoreId(stores.find((o) => o.storeId !== s.storeId)?.storeId ?? null)
                }
              }}
            />
          ))
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
              탈퇴하면 매장, 레시피, 매뉴얼, 직원 기록이 모두 삭제돼요.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="white" size="md" onClick={() => setAskWithdraw(false)}>
                취소
              </Button>
              <Button variant="danger" size="md" onClick={logout}>
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

/** 머리: 알바 마이페이지와 같은 모양 — 56px 이니셜 원 + 이름(눌러서 고치기, 칸을 벗어나면 저장) · 지금 매장 한 줄, 왼쪽 정렬 (11/14) */
function ProfileName({ name, storeName }: { name: string; storeName: string }) {
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
    <section className="-mt-4 flex items-start gap-4 px-1">
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
        <span className="truncate text-[13px] font-medium text-muted-foreground">{storeName}</span>
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

function StoreRow({
  store,
  canDelete,
  onDeleted,
}: {
  store: OwnerStoreView
  canDelete: boolean
  onDeleted: () => void
}) {
  const [asking, setAsking] = useState(false)
  const remove = useDeleteStore()
  const members = useMembers(store.storeId)
  const Icon = STORE_ICON[store.icon]
  const count = members.data?.members.length ?? store.staffCount
  const payday = store.payday === 31 ? '말일' : `${store.payday}일`

  const doDelete = () =>
    remove.mutate(store.storeId, {
      onSuccess: () => {
        onDeleted()
        toast(`${store.name} 매장을 삭제했어요`)
      },
      onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요'),
    })

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-line/60 bg-card py-3 pr-3 pl-3.5">
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
      {canDelete &&
        (asking ? (
          <Button variant="danger" size="sm" disabled={remove.isPending} onClick={doDelete}>
            삭제
          </Button>
        ) : (
          <button
            type="button"
            aria-label={`${store.name} 삭제`}
            onClick={() => setAsking(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
          >
            <X className="size-5" />
          </button>
        ))}
    </div>
  )
}
