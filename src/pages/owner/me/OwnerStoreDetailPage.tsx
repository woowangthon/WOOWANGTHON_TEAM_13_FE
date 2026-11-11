import { Pencil } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useParams } from 'react-router'
import { MIN_WAGE } from '@/api/mocks/owner/data'
import { toastApiError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { useMembers, useUpdateHourlyWage } from '@/pages/owner/api/members'
import { useUpdateStore } from '@/pages/owner/api/stores'
import type { Member, StoreSize } from '@/pages/owner/api/types'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
import { avatarColors } from '@/pages/owner/components/avatarColors'
import { ClosedDaysField } from '@/pages/owner/store/components/ClosedDaysField'
import { useOwnerStore, type OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { Button } from '@/ui/Button'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Tabs } from '@/ui/Tabs'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 매장 상세 (마이페이지 › 내 매장): 매장 이름 · 급여일 · 사업장 규모 · 쉬는 날(요일 · 공휴일) · 직원별 시급 → 저장

// 급여일: 1~30일 · 말일(31) — BE 마이그레이션 17로 1~31 을 받는다 (31 은 짧은 달에도 마지막 날)
const DAYS = [...Array.from({ length: 30 }, (_, i) => i + 1), 31]
const ROW = 44

export default function OwnerStoreDetailPage() {
  const { storeId } = useParams()
  const { stores, isPending } = useOwnerStore()
  const store = stores.find((s) => s.storeId === storeId)
  const members = useMembers(storeId ?? '')

  if (!isPending && !store) return <Navigate to="/owner/me" replace />
  if (!store || !members.data) {
    return (
      <OwnerFrame colors={{ color: '#2A4536', soft: '#E3E8DC' }}>
        <Spinner />
      </OwnerFrame>
    )
  }
  return <DetailForm key={store.storeId} store={store} members={members.data.members} />
}

function DetailForm({ store, members }: { store: OwnerStoreView; members: Member[] }) {
  const close = useCloseTo('/owner/me')
  const [name, setName] = useState(store.name)
  const [payday, setPayday] = useState(store.payday)
  const [size, setSize] = useState<StoreSize>(store.size)
  const [closedWeekdays, setClosedWeekdays] = useState(store.closedWeekdays)
  const [closedOnHolidays, setClosedOnHolidays] = useState(store.closedOnHolidays)
  const [wages, setWages] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.memberId, String(m.hourlyWage)])),
  )
  const [saving, setSaving] = useState(false)
  const wheel = useRef<HTMLDivElement>(null)
  const updateStore = useUpdateStore(store.storeId)
  const updateWage = useUpdateHourlyWage(store.storeId)
  const low = members.some((m) => Number(wages[m.memberId]) < MIN_WAGE)

  // 처음 열 때 저장된 급여일로 휠을 맞춘다
  useEffect(() => {
    wheel.current?.scrollTo({ top: Math.max(0, DAYS.indexOf(store.payday)) * ROW })
  }, [store.payday])

  const onWheel = () => {
    if (!wheel.current) return
    const index = Math.max(0, Math.min(DAYS.length - 1, Math.round(wheel.current.scrollTop / ROW)))
    if (DAYS[index] !== payday) setPayday(DAYS[index])
  }

  const save = async () => {
    if (low || !name.trim()) return
    setSaving(true)
    try {
      await updateStore.mutateAsync({
        name: name.trim(),
        payday,
        size,
        closedWeekdays,
        closedOnHolidays,
      })
      // 시급은 직원마다 저장하고, 못 바꾼 직원(입장 전 등)은 칸을 원래 시급으로 되돌린다
      let failed: unknown = null
      for (const m of members) {
        const next = Number(wages[m.memberId])
        if (next === m.hourlyWage) continue
        try {
          await updateWage.mutateAsync({
            memberId: m.memberId,
            hourlyWage: next,
            invited: m.status === 'invited',
          })
        } catch (error) {
          failed ??= error
          setWages((w) => ({ ...w, [m.memberId]: String(m.hourlyWage) }))
        }
      }
      if (failed) {
        // 입장 전은 다시 해도 같아서 [다시 시도] 없이 안내만
        const retry =
          failed instanceof ApiError && failed.code === 'MEMBER_NOT_JOINED' ? undefined : save
        toastApiError(failed, '시급을 저장하지 못했어요. 다시 시도해 주세요', retry)
        return
      }
      toast('저장했어요')
      close()
    } catch (error) {
      toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', save)
    } finally {
      setSaving(false)
    }
  }

  return (
    <OwnerFrame colors={store} className="gap-[22px] pb-10">
      <Header title="매장 상세" onBack={close} />
      {/* 이름 옆 연필 · 점선 밑줄로 고칠 수 있다는 힌트 (알바 마이페이지와 같은 모양) */}
      <label className="group flex min-w-0 items-center gap-2 px-1">
        <span className="inline-grid min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 overflow-hidden px-0.5 text-[28px] font-extrabold tracking-[-0.03em] whitespace-pre"
          >
            {name || ' '}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            // 기본 너비를 없애야 보이지 않는 글자 길이만큼만 넓어진다
            size={1}
            aria-label="매장 이름"
            className="col-start-1 row-start-1 w-full min-w-[2ch] border-none bg-transparent p-0 text-[28px] font-extrabold tracking-[-0.03em] underline decoration-line decoration-dotted decoration-2 underline-offset-[6px] focus:decoration-brand"
          />
        </span>
        <Pencil
          aria-hidden="true"
          className="size-[18px] shrink-0 text-subtle group-focus-within:text-brand"
        />
      </label>

      <Section label="급여일">
        <div className="relative overflow-hidden rounded-[22px] bg-card shadow-soft">
          <div className="pointer-events-none absolute inset-x-3 top-11 h-11 rounded-[14px] bg-brand-soft" />
          <div
            ref={wheel}
            onScroll={onWheel}
            role="listbox"
            aria-label="급여일"
            className="no-scrollbar relative h-[132px] snap-y snap-mandatory overflow-y-auto py-11"
          >
            {DAYS.map((day) => {
              const on = day === payday
              return (
                <div
                  key={day}
                  role="option"
                  aria-selected={on}
                  className={cn(
                    'flex h-11 snap-center items-center justify-center',
                    on ? 'text-xl font-extrabold text-brand' : 'text-base font-medium text-faint',
                  )}
                >
                  매월 {day === 31 ? '말일' : `${day}일`}
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      <Section label="사업장 규모">
        <Tabs<StoreSize>
          fill
          options={[
            { value: 'under5', label: '5인 미만' },
            { value: 'over5', label: '5인 이상' },
          ]}
          value={size}
          onChange={setSize}
        />
      </Section>

      <Section label="쉬는 날">
        <ClosedDaysField
          closedWeekdays={closedWeekdays}
          onClosedWeekdaysChange={setClosedWeekdays}
          closedOnHolidays={closedOnHolidays}
          onClosedOnHolidaysChange={setClosedOnHolidays}
        />
      </Section>

      <Section label="직원별 시급">
        {members.length === 0 ? (
          <div className="rounded-[22px] bg-card p-5 text-center text-sm text-muted-foreground">
            아직 직원이 없어요
          </div>
        ) : (
          members.map((m, i) => {
            const [bg, fg] = avatarColors(i)
            const value = wages[m.memberId] ?? ''
            const isLow = Number(value) < MIN_WAGE
            return (
              <div
                key={m.memberId}
                className="flex items-center gap-3 rounded-[22px] bg-card px-3 py-2.5 shadow-soft"
              >
                <span
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-full text-base font-extrabold"
                  style={{ background: bg, color: fg }}
                >
                  {m.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 text-base font-bold">{m.name}</span>
                <label
                  className={cn(
                    'flex h-11 w-[150px] items-center gap-1.5 rounded-[14px] border-[1.5px] bg-white px-3',
                    isLow ? 'border-[#E7A39D]' : 'border-[#E1DED5]',
                  )}
                >
                  <input
                    inputMode="numeric"
                    value={value ? Number(value).toLocaleString('ko-KR') : ''}
                    onChange={(event) =>
                      setWages((w) => ({
                        ...w,
                        [m.memberId]: event.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    aria-label={`${m.name} 시급`}
                    aria-invalid={isLow}
                    className="min-w-0 flex-1 border-none bg-transparent text-right text-base font-bold"
                  />
                  <span className="text-sm text-muted-foreground">원</span>
                </label>
              </div>
            )
          })
        )}
        {low && (
          <span role="alert" className="px-1 text-[13px] text-destructive-foreground">
            최저시급 {MIN_WAGE.toLocaleString('ko-KR')}원보다 낮은 시급이 있어요
          </span>
        )}
      </Section>

      <Button
        className="h-[54px] text-base"
        disabled={low || !name.trim() || saving}
        onClick={save}
      >
        저장
      </Button>
      <Toaster bottom={32} />
    </OwnerFrame>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 px-1 text-[13px] font-bold text-[#6B7068]">{label}</h2>
      {children}
    </section>
  )
}
