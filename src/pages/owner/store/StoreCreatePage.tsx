import { ArrowRight, BookOpen, Check, Coffee, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/authStore'
import { ApiError } from '@/lib/apiClient'
import {
  DEFAULT_PAYDAY,
  useCreateStore,
  useSaveOwnerShifts,
  useSaveStorePhoto,
} from '@/pages/owner/api/stores'
import type { OwnerStore, StoreSize } from '@/pages/owner/api/types'
import { BizVerifyForm } from '@/pages/owner/components/BizVerifyForm'
import { WeekShiftGrid } from '@/pages/owner/components/WeekShiftGrid'
import { AddressField } from '@/pages/owner/store/components/AddressField'
import { ShiftTemplateStep, type ShiftRow } from '@/pages/owner/store/components/ShiftTemplateStep'
import { PaydayField } from '@/pages/owner/store/components/PaydayField'
import { StorePhotoStep } from '@/pages/owner/store/components/StorePhotoStep'
import { cellKey, DEFAULT_SHIFT_TEMPLATES, shiftTemplatesError } from '@/pages/owner/store/shifts'
import { OWNER_THEME, useOwnerStore } from '@/pages/owner/useOwnerStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 매장 등록 (온보딩, 디자인: 로그인 → 역할 선택 → 사장님) 4단계 (11/12 사업자 확인을 번호만 · ① 에 합침)
//   ① 매장 이름 · 사업자등록번호(국세청 상태조회) · 주소(검색) · 규모 → ② 근무 타임(시간 · 인원) · 휴무 · 급여일 → ③ 사장님 근무(건너뛰기)
//   → [③ 끝에서 매장 등록 + 사장님 고정 근무 저장] → ④ 매장 사진(건너뛰기) → 등록 완료
// 매장 사진은 매장이 생긴 뒤에만 올릴 수 있어서(BE) 맨 끝이다
// 역할 선택에서 [사장님]을 고르거나 마이페이지 [매장 추가]로 여기 온다 (/owner/store/new). BE 는 사업자 확인(VERIFIED) 결과가 있어야 매장을 만든다

// 사업장 규모는 5인 미만 · 이상 두 가지 (BE businessSize, 매장 상세와 같은 기준)
const SIZES: { label: string; size: StoreSize }[] = [
  { label: '5인 미만', size: 'under5' },
  { label: '5인 이상', size: 'over5' },
]

type Step = 'info' | 'shifts' | 'owner' | 'photo'
const STEP_TOTAL = 4

const initialRows = (): ShiftRow[] =>
  DEFAULT_SHIFT_TEMPLATES.map((t, i) => ({ ...t, key: `row_${i}` }))

type OwnerShift = { templateName: string; weekday: number }

export default function StoreCreatePage() {
  const navigate = useNavigate()
  // 마이페이지 [매장 추가]로 왔으면 ① 에서 뒤로 가면 마이페이지로
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/role'
  const create = useCreateStore()
  const saveShifts = useSaveOwnerShifts()
  const savePhoto = useSaveStorePhoto()
  const { setCurrentStoreId } = useOwnerStore()
  const [step, setStep] = useState<Step>('info')
  const [verificationId, setVerificationId] = useState<number | null>(null)
  const [name, setName] = useState('')
  /** 주소 검색에서 고른 도로명 주소 + 상세 주소 */
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [sizeLabel, setSizeLabel] = useState(SIZES[0].label)
  const [rows, setRows] = useState<ShiftRow[]>(initialRows)
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([])
  const [closedOnHolidays, setClosedOnHolidays] = useState(false)
  const [payday, setPayday] = useState(DEFAULT_PAYDAY)
  /** 사장님 근무 칸: cellKey(줄 key, 요일) */
  const [ownerCells, setOwnerCells] = useState<Set<string>>(new Set())
  const [photo, setPhoto] = useState<File | null>(null)
  /** 매장 사진 자르는 중 (아래 [완료] · [건너뛰기]를 숨긴다) */
  const [cropping, setCropping] = useState(false)
  /** ③ 끝에서 만든 매장 (다시 시도해도 두 번 만들지 않게) */
  const [created, setCreated] = useState<OwnerStore | null>(null)
  const [done, setDone] = useState(false)
  const size = SIZES.find((s) => s.label === sizeLabel)?.size ?? 'under5'
  const rowsError = shiftTemplatesError(rows)

  // 빠진 타임 · 휴무 요일의 사장님 근무 칸은 버린다
  const ownerShifts: OwnerShift[] = rows.flatMap((row) =>
    [0, 1, 2, 3, 4, 5, 6]
      .filter((day) => ownerCells.has(cellKey(row.key, day)) && !closedWeekdays.includes(day))
      .map((weekday) => ({ templateName: row.name.trim(), weekday })),
  )

  const enterStore = (store: OwnerStore) => {
    setCurrentStoreId(store.storeId)
    // 로그인 사용자 매장 목록에 사장님 매장을 넣어 화면 보호(역할)를 통과하게 한다
    const { me, setMe } = useAuthStore.getState()
    if (me && !me.stores.some((s) => s.storeId === store.storeId)) {
      setMe({
        ...me,
        stores: [...me.stores, { storeId: store.storeId, storeName: store.name, role: 'owner' }],
      })
    }
  }

  // 사장님 근무 저장 → ④ 사진. 실패해도 매장은 있으니 다시 시도하거나 건너뛸 수 있다
  const saveOwner = (store: OwnerStore, shifts: OwnerShift[]) => {
    if (shifts.length === 0) return setStep('photo')
    saveShifts.mutate(
      { storeId: store.storeId, shifts },
      {
        onSuccess: () => setStep('photo'),
        onError: (error) =>
          toastApiError(error, '내 근무를 저장하지 못했어요. 다시 시도해 주세요', () =>
            saveOwner(store, shifts),
          ),
      },
    )
  }

  // ③ [다음] · [건너뛰기]: 매장 만들기(처음 한 번) → 사장님 근무
  const submit = (shifts: OwnerShift[]) => {
    if (created) return saveOwner(created, shifts)
    create.mutate(
      {
        name: name.trim(),
        address: [address, addressDetail.trim()].filter(Boolean).join(' '),
        size,
        payday,
        businessVerificationId: verificationId!,
        shiftTemplates: rows.map((r) => ({
          name: r.name.trim(),
          start: r.start,
          end: r.end,
          headcount: r.headcount,
        })),
        closedWeekdays,
        closedOnHolidays,
      },
      {
        onSuccess: (store) => {
          enterStore(store)
          setCreated(store)
          saveOwner(store, shifts)
        },
        onError: (error) => {
          // 사업자 확인 결과를 못 쓰면(400) 확인부터 다시
          if (error instanceof ApiError && error.status === 400) {
            setVerificationId(null)
            setStep('info')
            return toast.error('사업자 확인을 다시 해 주세요')
          }
          toastApiError(error, '등록하지 못했어요. 다시 시도해 주세요', () => submit(shifts))
        },
      },
    )
  }

  const finishPhoto = () => {
    if (!photo || !created) return setDone(true)
    savePhoto.mutate(
      { storeId: created.storeId, file: photo },
      {
        onSuccess: (store) => {
          setCreated(store)
          setDone(true)
        },
        onError: (error) => {
          const status = error instanceof ApiError ? error.status : 0
          if (status === 413) return toast.error('10MB 이하 사진으로 다시 골라 주세요')
          if (status === 415) return toast.error('JPG · PNG · WebP 사진만 넣을 수 있어요')
          toastApiError(error, '사진을 저장하지 못했어요. 다시 시도해 주세요', finishPhoto)
        },
      },
    )
  }

  if (done && created)
    return <CreateDone store={created} onStart={() => navigate('/owner', { replace: true })} />

  const pending = create.isPending || saveShifts.isPending

  if (step === 'info')
    return (
      <StepFrame step={1} title="매장 정보" onBack={() => navigate(from)}>
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
          <BizVerifyForm verified={verificationId !== null} onVerified={setVerificationId} />
          <AddressField
            address={address}
            onAddressChange={setAddress}
            detail={addressDetail}
            onDetailChange={setAddressDetail}
          />
          <div className="flex flex-col gap-1.5 rounded-[20px] bg-card px-[18px] py-3.5 shadow-soft">
            <span className="text-xs font-bold text-muted-foreground">사업장 규모</span>
            <div
              className="mt-0.5 grid grid-cols-2 gap-1.5"
              role="radiogroup"
              aria-label="사업장 규모"
            >
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
            직원 수 기준 · 주휴 · 가산 수당 계산에 반영돼요
          </span>
        </div>
        <Button
          className="mt-auto h-14 text-base"
          disabled={!name.trim() || verificationId === null || !address.trim()}
          onClick={() => setStep('shifts')}
        >
          다음
        </Button>
      </StepFrame>
    )

  if (step === 'shifts')
    return (
      <StepFrame step={2} title="근무 타임 · 휴무 · 급여일" onBack={() => setStep('info')}>
        <ShiftTemplateStep
          rows={rows}
          onRowsChange={setRows}
          closedWeekdays={closedWeekdays}
          onClosedWeekdaysChange={setClosedWeekdays}
          closedOnHolidays={closedOnHolidays}
          onClosedOnHolidaysChange={setClosedOnHolidays}
          error={rowsError}
        />
        <section className="flex flex-col gap-2.5">
          <span className="px-1 text-[13px] font-bold text-muted-foreground">급여일</span>
          <PaydayField value={payday} onChange={setPayday} />
        </section>
        <Button
          className="mt-auto h-14 shrink-0 text-base"
          disabled={!!rowsError}
          onClick={() => setStep('owner')}
        >
          다음
        </Button>
      </StepFrame>
    )

  if (step === 'owner')
    return (
      <StepFrame step={3} title="사장님 근무" onBack={() => setStep(created ? 'photo' : 'shifts')}>
        <span className="px-1 text-[13px] text-muted-foreground">
          사장님도 근무하는 요일 · 타임을 눌러 주세요. 같은 날 여러 타임도 돼요
        </span>
        <WeekShiftGrid
          rows={rows.map((r) => ({ key: r.key, label: r.name, sub: `${r.start}~${r.end}` }))}
          value={ownerCells}
          onChange={setOwnerCells}
          closedWeekdays={closedWeekdays}
        />
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button
            variant="soft"
            className="h-14 text-base"
            disabled={pending}
            onClick={() => submit([])}
          >
            건너뛰기
          </Button>
          <Button
            className="h-14 text-base"
            disabled={pending || ownerShifts.length === 0}
            onClick={() => submit(ownerShifts)}
          >
            {pending ? '등록 중…' : '다음'}
          </Button>
        </div>
      </StepFrame>
    )

  return (
    <StepFrame step={4} title="매장 사진" onBack={() => setDone(true)}>
      <StorePhotoStep value={photo} onChange={setPhoto} onCroppingChange={setCropping} />
      {cropping ? null : photo ? (
        <Button
          className="mt-auto h-14 text-base"
          disabled={savePhoto.isPending}
          onClick={finishPhoto}
        >
          {savePhoto.isPending ? '올리는 중…' : '완료'}
        </Button>
      ) : (
        <Button variant="soft" className="mt-auto h-14 text-base" onClick={() => setDone(true)}>
          건너뛰기
        </Button>
      )}
    </StepFrame>
  )
}

/** 단계 화면 틀: 위쪽 뒤로 + 제목 위 "사장님 · 2 / 4" */
function StepFrame({
  step,
  title,
  onBack,
  children,
}: {
  step: number
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    // .owner-wide: 사장님 화면 색 팔레트 (index.css) — 민지 AuthFrame 은 그대로 감싸기만
    <div className="owner-wide">
      <AuthFrame className="gap-[22px]">
        {/* 위쪽 진행 점은 역할 선택 → 매장 등록 두 칸이라(민지 부품) 단계는 제목 위에서 보여 준다 */}
        <OnboardingHeader step={1} onBack={onBack} />
        <div className="flex flex-col gap-2 px-1 pt-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">
            사장님 · {step} / {STEP_TOTAL}
          </span>
          <h1 className="m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em]">
            {title}
          </h1>
        </div>
        {children}
      </AuthFrame>
    </div>
  )
}

/** 처음 할 일 (docs/03 S1: 매뉴얼 → 레시피 → 알바생 초대) */
const NEXT = [
  { to: '/owner/manuals', icon: BookOpen, label: '매뉴얼 등록' },
  { to: '/owner/recipes', icon: Coffee, label: '레시피 등록' },
  { to: '/owner/members/new', icon: UserPlus, label: '알바생 초대' },
]

function CreateDone({ store, onStart }: { store: OwnerStore; onStart: () => void }) {
  // 사장님 화면 매장 색 (useOwnerStore 와 같은 팔레트)
  const theme = { ...STORE_THEME[themeOf(store.theme, 0)], ...OWNER_THEME[themeOf(store.theme, 0)] }
  return (
    <div className="owner-wide">
      <AuthFrame className="gap-[22px]">
        <section
          className="flex min-h-[360px] flex-1 flex-col justify-between rounded-[32px] bg-cover bg-center texture p-6 text-white"
          style={{
            backgroundColor: theme.color,
            // 매장 사진을 넣었으면 그라데이션 없이 사진 그대로 (글씨는 아래 어두운 판 위에)
            backgroundImage: store.photoUrl ? `url(${store.photoUrl})` : undefined,
          }}
        >
          <span
            className="flex size-14 items-center justify-center rounded-full bg-white"
            style={{ color: theme.color }}
          >
            <Check className="size-[30px]" />
          </span>
          <div
            className={cn(
              'flex flex-col gap-[18px]',
              store.photoUrl && 'rounded-[24px] bg-black/35 p-4 backdrop-blur-md',
            )}
          >
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
    </div>
  )
}
