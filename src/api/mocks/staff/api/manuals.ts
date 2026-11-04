import { storeManuals, type Manual as MockManual } from '@/api/mocks/staff/manuals'
import { isUmbrellaAdded } from '@/api/mocks/staff/api/db'
import { ApiError } from '@/lib/apiClient'
import type { Manual, ManualList } from '@/lib/api/types'

// 가짜 서버: 매뉴얼 API (docs/07 4) — keywords · answer 는 가짜 AI 답변용이라 응답에서 뺀다

const UPDATED_AT = '2026-11-15T10:00:00+09:00'
const NEW_UPDATED_AT = '2026-11-20T19:43:00+09:00'

function toManual(m: MockManual): Manual {
  return {
    manualId: m.id,
    icon: m.icon,
    title: m.title,
    body: m.body,
    isNew: !!m.isNew,
    updatedAt: m.isNew ? NEW_UPDATED_AT : UPDATED_AT,
  }
}

/** GET /stores/{storeId}/manuals */
export async function getManuals(storeId: string): Promise<ManualList> {
  return { manuals: storeManuals(storeId, isUmbrellaAdded()).map(toManual) }
}

/** GET /stores/{storeId}/manuals/{manualId} */
export async function getManual(storeId: string, manualId: string): Promise<Manual> {
  const manual = storeManuals(storeId, isUmbrellaAdded()).find((m) => m.id === manualId)
  if (!manual) {
    throw new ApiError(404, { code: 'NOT_FOUND', message: '매뉴얼을 찾지 못했어요', detail: null })
  }
  return toManual(manual)
}
