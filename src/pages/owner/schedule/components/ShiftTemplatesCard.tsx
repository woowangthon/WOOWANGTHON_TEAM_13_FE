import { Clock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { useSaveShiftTemplates, useShiftTemplates } from '@/pages/owner/api/fixedSchedule'
import type { ShiftTemplate } from '@/pages/owner/api/types'
import { ShiftTemplateStep, type ShiftRow } from '@/pages/owner/store/components/ShiftTemplateStep'
import { shiftTemplatesError } from '@/pages/owner/store/shifts'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 근무 타임 (오픈 · 미들 · 마감 …): 시간 · 인원 보기 + [수정] → 매장 등록 ③과 같은 화면 (휠 · 인원 · 추가 · 빼기)
export function ShiftTemplatesCard({ storeId }: { storeId: string }) {
  const query = useShiftTemplates(storeId)
  const [editing, setEditing] = useState(false)
  const templates = query.data ?? []

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="m-0 text-[15px] font-extrabold">근무 타임</h2>
        {query.data && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="근무 타임 수정"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft active:bg-brand-soft"
          >
            <Pencil className="size-[17px]" />
          </button>
        )}
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.error ? (
        <LoadError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="flex flex-col rounded-[22px] bg-card px-[18px] py-1 shadow-soft">
          {templates.length === 0 ? (
            <span className="py-3.5 text-sm text-muted-foreground">
              아직 근무 타임이 없어요. [수정]으로 만들어 주세요
            </span>
          ) : (
            templates.map((t) => (
              <div
                key={t.templateId}
                className="flex items-center justify-between gap-2 border-b border-[#F0EBE2] py-3 last:border-b-0"
              >
                <span className="flex items-center gap-2 text-[15px] font-bold">
                  <Clock className="size-4 text-subtle" />
                  {t.name}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t.start}~{t.end} · {t.headcount ?? 1}명
                </span>
              </div>
            ))
          )}
        </div>
      )}
      {editing && (
        <EditSheet storeId={storeId} templates={templates} onClose={() => setEditing(false)} />
      )}
    </section>
  )
}

function EditSheet({
  storeId,
  templates,
  onClose,
}: {
  storeId: string
  templates: ShiftTemplate[]
  onClose: () => void
}) {
  const [rows, setRows] = useState<ShiftRow[]>(() =>
    templates.map((t) => ({
      key: t.templateId,
      templateId: t.templateId,
      name: t.name,
      start: t.start,
      end: t.end,
      headcount: t.headcount ?? 1,
    })),
  )
  const save = useSaveShiftTemplates(storeId)
  const error = shiftTemplatesError(rows)
  const removed = templates.filter((t) => !rows.some((r) => r.templateId === t.templateId))

  const submit = () =>
    save.mutate(
      { before: templates, rows: rows.map((r) => ({ ...r, name: r.name.trim() })) },
      {
        onSuccess: () => {
          toast('저장했어요')
          onClose()
        },
        onError: (err) => toastApiError(err, '저장하지 못했어요. 다시 시도해 주세요', submit),
      },
    )

  return (
    <BottomSheet open onClose={onClose} label="근무 타임 수정" closeButton>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">근무 타임</h2>
        <ShiftTemplateStep rows={rows} onRowsChange={setRows} error={error} />
        {removed.length > 0 && (
          <span className="rounded-[18px] bg-destructive-soft px-4 py-3 text-[13px] text-[#7E352C]">
            {removed.map((t) => t.name).join(' · ')} 타임을 빼면 그 타임 고정 근무도 같이 빠져요
          </span>
        )}
        <Button className="h-[54px]" disabled={!!error || save.isPending} onClick={submit}>
          저장
        </Button>
      </div>
    </BottomSheet>
  )
}
