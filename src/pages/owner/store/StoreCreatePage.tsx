import { ArrowRight, BookOpen, Check, Coffee, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/authStore'
import { useCreateStore } from '@/pages/owner/api/stores'
import type { OwnerStore, StoreSize } from '@/pages/owner/api/types'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/utils'

// 매장 등록 (온보딩, 디자인: 로그인 → 역할 선택 → 사장님): 매장 이름 · 주소 · 직원 수 → 등록 완료
// 역할 선택에서 [사장님]을 고르면 여기로 온다 (/owner/store/new)

const SIZES: { label: string; size: StoreSize }[] = [
  { label: '1~4명', size: 'under5' },
  { label: '5~9명', size: 'over5' },
  { label: '10명+', size: 'over5' },
]

export default function StoreCreatePage() {
  const navigate = useNavigate()
  const create = useCreateStore()
  const { setCurrentStoreId } = useOwnerStore()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [sizeLabel, setSizeLabel] = useState(SIZES[0].label)
  const [created, setCreated] = useState<OwnerStore | null>(null)
  const size = SIZES.find((s) => s.label === sizeLabel)?.size ?? 'under5'

  const submit = () =>
    create.mutate(
      { name: name.trim(), address: address.trim(), size },
      {
        onSuccess: (store) => {
          setCurrentStoreId(store.storeId)
          // 로그인 사용자 매장 목록에 사장님 매장을 넣어 화면 보호(역할)를 통과하게 한다
          const { me, setMe } = useAuthStore.getState()
          if (me) {
            setMe({
              ...me,
              stores: [
                ...me.stores,
                { storeId: store.storeId, storeName: store.name, role: 'owner' },
              ],
            })
          }
          setCreated(store)
        },
        onError: (error) => toastApiError(error, '등록하지 못했어요. 다시 시도해 주세요', submit),
      },
    )

  if (created)
    return <CreateDone store={created} onStart={() => navigate('/owner', { replace: true })} />

  return (
    <AuthFrame className="gap-[22px]">
      <OnboardingHeader step={1} onBack={() => navigate('/role')} />
      <div className="flex flex-col gap-2 px-1 pt-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">사장님</span>
        <h1 className="m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em]">
          매장 등록
        </h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1.5 rounded-[20px] bg-card px-[18px] py-3.5 shadow-soft">
          <span className="text-xs font-bold text-muted-foreground">매장 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="달빛 카페"
            className="min-w-0 border-none bg-transparent p-0 text-[17px] font-bold placeholder:text-faint"
          />
        </label>
        <label className="flex flex-col gap-1.5 rounded-[20px] bg-card px-[18px] py-3.5 shadow-soft">
          <span className="text-xs font-bold text-muted-foreground">매장 주소</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="서울 마포구 와우산로21길 8"
            className="min-w-0 border-none bg-transparent p-0 text-[17px] font-bold placeholder:text-faint"
          />
        </label>
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-card px-[18px] py-3.5 shadow-soft">
          <span className="text-xs font-bold text-muted-foreground">직원 수</span>
          <div className="mt-0.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="직원 수">
            {SIZES.map((s) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={sizeLabel === s.label}
                onClick={() => setSizeLabel(s.label)}
                className={cn(
                  'h-[42px] rounded-[14px] text-sm font-bold whitespace-nowrap',
                  sizeLabel === s.label ? 'bg-brand text-white' : 'bg-background text-foreground',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <span className="px-2 text-xs text-muted-foreground">
          {size === 'under5' ? '5인 미만' : '5인 이상'} 사업장 · 급여 계산에 반영돼요
        </span>
      </div>

      <Button
        className="mt-auto h-14 text-base"
        disabled={!name.trim() || !address.trim() || create.isPending}
        onClick={submit}
      >
        시작하기
      </Button>
    </AuthFrame>
  )
}

/** 처음 할 일 (docs/03 S1: 매뉴얼 → 레시피 → 알바생 초대) */
const NEXT = [
  { to: '/owner/manuals', icon: BookOpen, label: '매뉴얼 등록' },
  { to: '/owner/recipes', icon: Coffee, label: '레시피 등록' },
  { to: '/owner/members/new', icon: UserPlus, label: '알바생 초대' },
]

function CreateDone({ store, onStart }: { store: OwnerStore; onStart: () => void }) {
  const theme = STORE_THEME[themeOf(store.theme, 0)]
  return (
    <AuthFrame className="gap-[22px]">
      <section
        className="flex min-h-[360px] flex-1 flex-col justify-between rounded-[32px] texture p-6 text-white"
        style={{ backgroundColor: theme.color }}
      >
        <span
          className="flex size-14 items-center justify-center rounded-full bg-white"
          style={{ color: theme.color }}
        >
          <Check className="size-[30px]" />
        </span>
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-sm opacity-75">사장님</p>
            <h1 className="m-0 text-[32px] leading-[1.22] font-extrabold tracking-[-0.035em] break-keep">
              {store.name}
              <br />
              등록 완료
            </h1>
          </div>
          <nav aria-label="처음 할 일" className="flex flex-wrap gap-2">
            {NEXT.map(({ to, icon: Icon, label }) => (
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
