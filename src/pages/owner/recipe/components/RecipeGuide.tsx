import { Camera, Plus } from 'lucide-react'
import { Button } from '@/ui/Button'

// 매장 정보 › 레시피 첫 안내 (P2): 사진으로 추가 · 직접 추가 버튼 위치와 쓰임새. 한 번 [알겠어요] 하면 다시 안 뜬다
// 본 기록은 이 브라우저에만 남긴다 (사장님 편의용이라 서버에 저장하지 않음)

export function RecipeGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section
      aria-label="레시피 추가 안내"
      className="flex flex-col gap-3.5 rounded-[24px] border-[1.5px] border-[#E8C66A] bg-[#FFF8E3] p-[18px]"
    >
      <h2 className="m-0 text-base font-extrabold">레시피는 이렇게 추가해요</h2>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-foreground text-white">
          <Camera className="size-5" />
        </span>
        <p className="m-0 text-sm leading-[1.55] break-keep">
          <b>사진으로 추가</b> · 검색창 오른쪽 카메라 버튼
          <br />
          <span className="text-muted-foreground">
            종이 레시피를 찍으면 AI가 메뉴 · 재료를 채워 줘요. 여러 메뉴도 한 번에 넣을 수 있어요
          </span>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <span className="flex h-10 shrink-0 items-center gap-1 rounded-[13px] bg-white px-2.5 text-[13px] font-bold text-brand">
          <Plus className="size-4" />
          추가
        </span>
        <p className="m-0 text-sm leading-[1.55] break-keep">
          <b>직접 추가</b> · 메뉴 목록 오른쪽 위
          <br />
          <span className="text-muted-foreground">
            아메리카노 · 라떼 같은 템플릿을 고르거나 재료와 순서를 직접 써요
          </span>
        </p>
      </div>
      <Button size="md" className="h-[44px]" onClick={onDismiss}>
        알겠어요
      </Button>
    </section>
  )
}
