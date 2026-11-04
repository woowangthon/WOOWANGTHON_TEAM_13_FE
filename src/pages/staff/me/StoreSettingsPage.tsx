import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import {
  MIN_HOURLY_WAGE as MIN_WAGE,
  useMyPayrollEstimate,
  useSaveMyPaySettings,
} from '@/lib/api/payroll'
import type { PayrollEstimate, TaxType } from '@/lib/api/types'
import { STORE_ICON } from '@/shared/icons'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { useCurrentStore, type StaffStoreView } from '@/pages/staff/useCurrentStore'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Switch } from '@/ui/Switch'
import { Tabs } from '@/ui/Tabs'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'

// 소속 매장 정보 + 내 급여 설정 (시급 · 급여일 · 세금 방식 · 주휴수당)
// 값은 예상 급여 응답에서 받고, 저장은 임시 훅(useSaveMyPaySettings · 가짜 서버만) — BE 답(docs/07 질문 4) 전까지

/** 폼에서 쓰는 급여 설정 */
interface PaySettings {
  wage: number
  payday: number
  tax: TaxType
  weeklyAllowance: boolean
}

const toSettings = (estimate: PayrollEstimate): PaySettings => ({
  wage: estimate.hourlyWage,
  payday: estimate.payday,
  tax: estimate.taxType,
  weeklyAllowance: estimate.weeklyAllowanceEnabled,
})

const PAYDAYS = [...Array.from({ length: 28 }, (_, i) => i + 1), 31]
const ROW = 44

export default function StoreSettingsPage() {
  const { storeId } = useParams()
  const { stores } = useCurrentStore()
  const store = stores.find((s) => s.id === storeId)
  const estimateQuery = useMyPayrollEstimate(storeId ?? '')

  if (!store) return <Navigate to="/staff/me" replace />
  if (!estimateQuery.data) {
    return (
      <StaffFrame store={store}>
        <Spinner />
      </StaffFrame>
    )
  }
  return <SettingsForm key={store.id} store={store} saved={toSettings(estimateQuery.data)} />
}

function SettingsForm({ store, saved }: { store: StaffStoreView; saved: PaySettings }) {
  const close = useCloseTo('/staff/me')
  const savePaySettings = useSaveMyPaySettings(store.id)
  const [draft, setDraft] = useState(saved)
  const [wageText, setWageText] = useState(String(saved.wage))
  const wheel = useRef<HTMLDivElement>(null)
  const Icon = STORE_ICON[store.icon]

  // 처음 열 때 저장된 급여일로 휠을 맞춘다
  useEffect(() => {
    wheel.current?.scrollTo({ top: PAYDAYS.indexOf(saved.payday) * ROW })
  }, [saved.payday])

  const onWheelScroll = () => {
    if (!wheel.current) return
    const index = Math.max(
      0,
      Math.min(PAYDAYS.length - 1, Math.round(wheel.current.scrollTop / ROW)),
    )
    if (PAYDAYS[index] !== draft.payday) setDraft((d) => ({ ...d, payday: PAYDAYS[index] }))
  }

  const save = () => {
    const wage = parseInt(wageText, 10) || 0
    if (wage < MIN_WAGE) {
      toast.error(`최저시급 ${MIN_WAGE.toLocaleString('ko-KR')}원보다 낮아요. 다시 확인해 주세요`)
      return
    }
    savePaySettings.mutate(
      {
        hourlyWage: wage,
        payday: draft.payday,
        taxType: draft.tax,
        weeklyAllowanceEnabled: draft.weeklyAllowance,
      },
      {
        onSuccess: () => {
          toast('저장했어요')
          close()
        },
        onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', save),
      },
    )
  }

  return (
    <StaffFrame store={store} className="gap-5 pb-[120px]">
      <Header onBack={close} />

      <Card variant="dark" className="gap-[18px] rounded-[30px] p-[22px]">
        <span className="flex size-[46px] items-center justify-center rounded-full bg-white text-brand">
          <Icon className="size-6" fill="currentColor" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            {store.name}
          </h1>
          <span className="text-sm opacity-85">{store.kind}</span>
          <span className="text-sm break-keep opacity-85">{store.address}</span>
        </div>
      </Card>

      <h2 className="m-0 px-1 text-xl font-extrabold tracking-[-0.02em]">급여 설정</h2>

      <div className="flex flex-col gap-2.5">
        <Card className="flex-row items-center justify-between gap-3 px-5 py-4">
          <label htmlFor="wage" className="text-base font-bold">
            시급
          </label>
          <span className="flex min-w-0 items-baseline gap-1.5">
            <input
              id="wage"
              inputMode="numeric"
              value={wageText ? Number(wageText).toLocaleString('ko-KR') : ''}
              onChange={(event) => setWageText(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-[130px] min-w-0 border-none bg-transparent p-0 text-right text-[28px] font-extrabold tracking-[-0.02em]"
            />
            <span className="text-base font-bold text-muted-foreground">원</span>
          </span>
        </Card>

        <Card className="gap-3 px-5 pt-4 pb-[18px]">
          <span className="flex items-baseline justify-between gap-2.5">
            <span className="text-base font-bold">급여일</span>
            <span className="text-base font-extrabold text-brand">
              {draft.payday === 31 ? '매월 말일' : `매월 ${draft.payday}일`}
            </span>
          </span>
          <div className="relative h-[132px]">
            <div className="absolute inset-x-0 top-11 h-11 rounded-[14px] bg-background" />
            <div
              ref={wheel}
              onScroll={onWheelScroll}
              role="listbox"
              aria-label="급여일"
              className="no-scrollbar relative h-[132px] snap-y snap-mandatory overflow-y-auto py-11 [mask-image:linear-gradient(transparent,#000_28%,#000_72%,transparent)]"
            >
              {PAYDAYS.map((day) => {
                const on = day === draft.payday
                return (
                  <div
                    key={day}
                    role="option"
                    aria-selected={on}
                    className={
                      on
                        ? 'flex h-11 snap-center items-center justify-center text-xl font-extrabold text-foreground'
                        : 'flex h-11 snap-center items-center justify-center text-base font-medium text-faint'
                    }
                  >
                    {day === 31 ? '말일' : `${day}일`}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="gap-3 px-5 pt-4 pb-[18px]">
          <span className="text-base font-bold">세금 방식</span>
          <Tabs<TaxType>
            fill
            className="bg-background"
            options={[
              { value: 'none', label: '없음' },
              { value: '3.3', label: '3.3%' },
              { value: 'ins', label: '4대보험' },
            ]}
            value={draft.tax}
            onChange={(tax) => setDraft((d) => ({ ...d, tax }))}
          />
        </Card>

        <Card className="flex-row items-center justify-between gap-3.5 px-5 py-4">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-base font-bold">주휴수당 자동 계산</span>
            <span className="text-[13px] break-keep text-muted-foreground">
              주 15시간 이상 근무 시 적용
            </span>
          </span>
          <Switch
            label="주휴수당 자동 계산"
            checked={draft.weeklyAllowance}
            onChange={(weeklyAllowance) => setDraft((d) => ({ ...d, weeklyAllowance }))}
          />
        </Card>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[460px] -translate-x-1/2 bg-[linear-gradient(rgba(241,236,227,0),#F1ECE3_40%)] px-4 pt-3.5 pb-5">
        <Button size="xl" className="w-full" onClick={save}>
          저장
        </Button>
      </div>

      <Toaster bottom={96} />
    </StaffFrame>
  )
}
