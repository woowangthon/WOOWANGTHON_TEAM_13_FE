import { ChevronRight, LogOut, X } from 'lucide-react'
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
  useVerifyBizNo,
} from '@/pages/owner/api/stores'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
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
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        aria-label="이름"
        className="w-full border-none bg-transparent p-0 text-center text-[28px] font-extrabold tracking-[-0.03em]"
      />
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

/** 매장 추가: 이름 · 주소 + 사업자등록번호 확인(P2) → 추가 */
function AddStore({ onAdded }: { onAdded: (storeId: string) => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [bizNo, setBizNo] = useState('')
  const [verified, setVerified] = useState(false)
  const [bizError, setBizError] = useState('')
  const verify = useVerifyBizNo()
  const create = useCreateStore()

  const formatBizNo = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 10)
    if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
    if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`
    return d
  }

  const check = () => {
    if (bizNo.replace(/\D/g, '').length !== 10) {
      return setBizError('사업자등록번호 10자리를 입력해 주세요')
    }
    verify.mutate(bizNo, {
      onSuccess: () => setVerified(true),
      onError: (error) => toastApiError(error, '확인하지 못했어요. 다시 시도해 주세요', check),
    })
  }

  const add = () =>
    create.mutate(
      { name: name.trim(), address: address.trim(), size: 'under5', bizNo },
      {
        onSuccess: (store) => {
          toast(`${store.name} 매장을 추가했어요`)
          setName('')
          setAddress('')
          setBizNo('')
          setVerified(false)
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
      <div className="flex gap-2">
        <Input
          variant="card"
          inputMode="numeric"
          value={bizNo}
          onChange={(event) => {
            setBizNo(formatBizNo(event.target.value))
            setVerified(false)
            setBizError('')
          }}
          placeholder="사업자등록번호 000-00-00000"
          aria-label="사업자등록번호"
          className="flex-1"
        />
        <Button
          variant={verified ? 'soft' : 'ink'}
          className={cn('text-sm', verified && 'bg-accent text-brand')}
          disabled={verify.isPending || verified}
          onClick={check}
        >
          {verify.isPending ? '확인 중…' : verified ? '확인됨' : '확인'}
        </Button>
      </div>
      {bizError && (
        <span role="alert" className="px-1 text-[13px] text-destructive-foreground">
          {bizError}
        </span>
      )}
      <Button
        className="text-sm"
        disabled={!name.trim() || !address.trim() || !verified || create.isPending}
        onClick={add}
      >
        매장 추가
      </Button>
    </div>
  )
}
