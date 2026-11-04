import { HomeHandover } from '@/pages/owner/home/components/HomeHandover'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'

// 인수인계 (사장님): 홈의 인수인계 부분을 따로 크게 본다 (shared 부품 배치)
export default function OwnerHandoverPage() {
  const { store, today } = useOwnerStore()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-1">
        <span className="text-[13px] text-muted-foreground">{store.name}</span>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">인수인계</h1>
      </div>
      <HomeHandover key={store.storeId} storeId={store.storeId} today={today} />
    </div>
  )
}
