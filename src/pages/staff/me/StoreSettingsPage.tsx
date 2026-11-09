import { Navigate, useParams } from 'react-router'
import { useMyPayrollEstimate } from '@/lib/api/payroll'
import type { PayrollEstimate, TaxType } from '@/lib/api/types'
import { STORE_ICON } from '@/shared/icons'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { useCloseTo } from '@/lib/useCloseTo'
import { useCurrentStore, type StaffStoreView } from '@/pages/staff/useCurrentStore'
import { LoadError } from '@/shared/LoadError'
import { Card } from '@/ui/Card'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'

// 소속 매장 정보 + 내 급여 설정 보기 (시급 · 급여일 · 공제 방식 · 주휴수당)
// 급여 설정은 사장님이 정한다 (시급: 사장님 직원 화면, 급여일: 사장님 매장 설정) → 알바는 보기 전용 (docs/07 질문 4)
// 값은 예상 급여 응답(GET /payroll/estimates/me)에서 읽는다

/** 보여 줄 급여 설정 */
interface PaySettings {
  wage: number
  /** 사장님이 아직 안 정했으면 null */
  payday: number | null
  tax: TaxType
  weeklyAllowance: boolean
}

const toSettings = (estimate: PayrollEstimate): PaySettings => ({
  wage: estimate.hourlyWage,
  payday: estimate.payday,
  tax: estimate.taxType,
  weeklyAllowance: estimate.weeklyAllowanceEnabled,
})

const TAX_TEXT: Record<TaxType, string> = {
  none: '공제 없음',
  '3.3': '3.3% (사업소득)',
  ins: '4대보험',
}

const paydayText = (payday: number | null) =>
  payday === null ? '아직 안 정했어요' : payday === 31 ? '매월 말일' : `매월 ${payday}일`

export default function StoreSettingsPage() {
  const { storeId } = useParams()
  const current = useCurrentStore()
  const store = current.stores.find((s) => s.id === storeId)
  const estimateQuery = useMyPayrollEstimate(storeId ?? '')

  // 내 매장 목록을 받기 전에는 "없는 매장"으로 판단하지 않는다 (주소로 바로 들어오거나 새로고침한 경우)
  if (current.isPending || current.error) {
    return (
      <StaffFrame store={current.store}>
        {current.error ? (
          <LoadError what="매장 정보를" error={current.error} onRetry={() => current.retry()} />
        ) : (
          <Spinner />
        )}
        <Toaster bottom={96} />
      </StaffFrame>
    )
  }
  if (!store) return <Navigate to="/staff/me" replace />
  if (!estimateQuery.data) {
    return (
      <StaffFrame store={store}>
        {estimateQuery.isError ? (
          <LoadError
            what="급여 설정을"
            error={estimateQuery.error}
            onRetry={() => estimateQuery.refetch()}
          />
        ) : (
          <Spinner />
        )}
        <Toaster bottom={96} />
      </StaffFrame>
    )
  }
  return <SettingsView store={store} settings={toSettings(estimateQuery.data)} />
}

function SettingsView({ store, settings }: { store: StaffStoreView; settings: PaySettings }) {
  const close = useCloseTo('/staff/me')
  const Icon = STORE_ICON[store.icon]
  const rows: { label: string; value: string; hint?: string; muted?: boolean }[] = [
    { label: '시급', value: `${settings.wage.toLocaleString('ko-KR')}원` },
    { label: '급여일', value: paydayText(settings.payday), muted: settings.payday === null },
    { label: '공제 방식', value: TAX_TEXT[settings.tax] },
    {
      label: '주휴수당',
      value: settings.weeklyAllowance ? '자동 계산' : '계산 안 함',
      hint: '주 15시간 이상 일한 주에 붙어요',
    },
  ]

  return (
    <StaffFrame store={store} className="gap-5">
      <Header onBack={close} />

      <Card variant="dark" className="gap-[18px] rounded-[30px] p-[22px]">
        <span className="flex size-[46px] items-center justify-center rounded-full bg-white text-brand">
          <Icon className="size-6" fill="currentColor" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            {store.name}
          </h1>
          {store.kind && <span className="text-sm opacity-85">{store.kind}</span>}
          {store.address && <span className="text-sm break-keep opacity-85">{store.address}</span>}
        </div>
      </Card>

      <div className="flex flex-col gap-1 px-1">
        <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">급여 설정</h2>
        <p className="m-0 text-[13px] text-muted-foreground">
          사장님이 정한 급여 설정이에요. 바꾸려면 사장님께 말씀해 주세요
        </p>
      </div>

      <Card className="gap-0 px-5 py-1">
        <dl className="m-0 flex flex-col">
          {rows.map(({ label, value, hint, muted }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 border-b border-[#F0EBE2] py-4 last:border-b-0"
            >
              <dt className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-bold">{label}</span>
                {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
              </dt>
              <dd
                className={
                  muted
                    ? 'm-0 text-right text-base font-semibold text-muted-foreground'
                    : 'm-0 text-right text-lg font-extrabold tabular-nums'
                }
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Toaster />
    </StaffFrame>
  )
}
