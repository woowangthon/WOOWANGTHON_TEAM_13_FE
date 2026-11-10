import { ChevronRight, LogOut, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { OAuthProvider } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'
import { toastApiError } from '@/lib/api/errors'
import { useMembers } from '@/pages/owner/api/members'
import {
  useCreateStore,
  useDeleteStore,
  useOwnerProfile,
  useUpdateOwnerProfile,
} from '@/pages/owner/api/stores'
import { BizVerifyForm } from '@/pages/owner/components/BizVerifyForm'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
import { DEFAULT_SHIFT_TEMPLATES } from '@/pages/owner/store/shifts'
import { useOwnerStore, type OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { STORE_ICON } from '@/shared/icons'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Header } from '@/ui/Header'
import { Input } from '@/ui/Input'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사장님 마이페이지: 이름 · 연결된 계정 · 내 매장(상세 · 삭제 · 추가 + 사업자번호 확인) · 로그아웃 · 탈퇴
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
    <OwnerFrame colors={store} className="gap-[22px] pb-10">
      <Header title="마이페이지" onBack={close} />

      {profile.data ? (
        <ProfileName key={profile.data.name} name={profile.data.name} />
      ) : (
        <Spinner />
      )}

      <LinkedAccount />

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 px-1 text-[13px] font-bold text-[#6B7068]">내 매장</h2>
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
        <AddStore onAdded={(id) => setCurrentStoreId(id)} />
      </section>

      <div className="mt-1.5 flex flex-col gap-2.5">
        <Button variant="soft" className="h-[54px] text-base" onClick={logout}>
          <LogOut className="size-5" />
          로그아웃
        </Button>
        {askWithdraw ? (
          <div className="flex flex-col gap-3 rounded-[22px] bg-destructive-soft p-4">
            <span className="text-[15px] leading-normal font-bold break-keep text-[#7E352C]">
              탈퇴하면 매장, 레시피, 매뉴얼, 직원 기록이 모두 삭제돼요.
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
    </OwnerFrame>
  )
}

/** 이름: 칸을 벗어나면 저장 */
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
    <section className="flex flex-col items-center gap-3.5 pt-1.5 pb-0.5">
      <span className="flex size-24 items-center justify-center rounded-full bg-brand text-[40px] font-extrabold text-background">
        {(value || name).slice(0, 1)}
      </span>
      {/* 이름 옆 연필 · 점선 밑줄로 고칠 수 있다는 힌트 (알바 마이페이지와 같은 모양) */}
      <label className="group flex w-full items-center justify-center gap-1.5">
        <span className="inline-grid max-w-[calc(100%-2rem)]">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 overflow-hidden px-0.5 text-[28px] font-extrabold tracking-[-0.03em] whitespace-pre"
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
            className="col-start-1 row-start-1 w-full min-w-[2ch] border-none bg-transparent p-0 text-center text-[28px] font-extrabold tracking-[-0.03em] underline decoration-line decoration-dotted decoration-2 underline-offset-[6px] focus:decoration-brand"
          />
        </span>
        <Pencil
          aria-hidden="true"
          className="size-[18px] shrink-0 text-subtle group-focus-within:text-brand"
        />
      </label>
    </section>
  )
}

function LinkedAccount() {
  const me = useAuthStore((state) => state.me)
  const provider: OAuthProvider = me?.provider === 'google' ? 'google' : 'kakao'
  return (
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
    <div className="flex items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-3.5 shadow-soft">
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
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-[#6B7068]"
          >
            <X className="size-5" />
          </button>
        ))}
    </div>
  )
}

/** 매장 추가: 이름 · 주소 + 사업자 확인(국세청 진위확인) → 추가 */
function AddStore({ onAdded }: { onAdded: (storeId: string) => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [verificationId, setVerificationId] = useState<number | null>(null)
  /** 추가한 뒤 사업자 칸을 비우려고 바꾸는 키 */
  const [formKey, setFormKey] = useState(0)
  const create = useCreateStore()

  const add = () =>
    create.mutate(
      {
        name: name.trim(),
        address: address.trim(),
        size: 'under5',
        businessVerificationId: verificationId!,
        // 근무 타임은 기본(오픈 · 미들 · 마감)으로 만들고 매장 상세에서 고친다
        shiftTemplates: DEFAULT_SHIFT_TEMPLATES,
        closedWeekdays: [],
        closedOnHolidays: false,
      },
      {
        onSuccess: (store) => {
          toast(`${store.name} 매장을 추가했어요`)
          setName('')
          setAddress('')
          setVerificationId(null)
          setFormKey((k) => k + 1)
          onAdded(store.storeId)
        },
        onError: (error) => toastApiError(error, '추가하지 못했어요. 다시 시도해 주세요', add),
      },
    )

  return (
    <div className="flex flex-col gap-2">
      <Input
        variant="card"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="매장 이름"
        aria-label="새 매장 이름"
      />
      <Input
        variant="card"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="매장 주소"
        aria-label="새 매장 주소"
      />
      <BizVerifyForm
        key={formKey}
        verified={verificationId !== null}
        onVerified={setVerificationId}
      />
      <Button
        className="text-sm"
        disabled={!name.trim() || !address.trim() || verificationId === null || create.isPending}
        onClick={add}
      >
        매장 추가
      </Button>
    </div>
  )
}
