import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { OwnerHandoverWriteSheet } from '@/pages/owner/handover/components/OwnerHandoverWriteSheet'
import { HomeHandover } from '@/pages/owner/home/components/HomeHandover'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { Button } from '@/ui/Button'

// 인수인계 (사장님): 홈의 인수인계 부분을 따로 크게 본다 (shared 부품 배치) + [인수인계 남기기]
// 하단 + 메뉴에서 오면 ?write=1 로 작성 시트를 바로 연다
export default function OwnerHandoverPage() {
  const { store, today } = useOwnerStore()
  const [params, setParams] = useSearchParams()
  const writing = params.get('write') === '1'
  const setWriting = (on: boolean) => setParams(on ? { write: '1' } : {}, { replace: !on })

  return (
    // 데스크톱은 가운데 좁은 칸 (한 줄 목록이라 너무 길어지지 않게)
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[760px]">
      <div className="flex items-end justify-between gap-2.5 px-1">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">{store.name}</span>
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em]">인수인계</h1>
        </div>
        <Button size="md" onClick={() => setWriting(true)}>
          <Plus />
          남기기
        </Button>
      </div>
      <HomeHandover key={store.storeId} storeId={store.storeId} today={today} />
      {writing && (
        <OwnerHandoverWriteSheet
          storeId={store.storeId}
          storeName={store.name}
          today={today}
          onClose={() => setWriting(false)}
        />
      )}
    </div>
  )
}
