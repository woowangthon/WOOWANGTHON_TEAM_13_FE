import { Camera, Images, Store } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { toast } from '@/ui/toastStore'

// 매장 등록 ④ 매장 사진 (선택): 찍기 · 갤러리(파일)에서 고르기. 저장하면 사장님 홈 매장 카드에 보인다
// 자르기는 나중에 정한다 (11/11)

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

export function StorePhotoStep({
  value,
  onChange,
}: {
  value: File | null
  onChange: (file: File | null) => void
}) {
  const url = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const pick = (file: File) => {
    if (file.size > MAX_BYTES) return toast.error('10MB 이하 사진으로 골라 주세요')
    onChange(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="px-1 text-[13px] text-muted-foreground">
        매장 사진은 홈 매장 카드에 보여요. 나중에 넣어도 돼요
      </span>
      <div className="relative flex h-[220px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[26px] border-[1.5px] border-dashed border-line bg-card text-[#6B7068]">
        {url ? (
          <img src={url} alt="매장 사진" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Store className="size-7" />
            <span className="text-sm font-semibold">아직 사진이 없어요</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PickButton
          icon={<Camera />}
          label={value ? '다시 찍기' : '사진 찍기'}
          capture
          onPick={pick}
        />
        <PickButton icon={<Images />} label="갤러리 · 파일" onPick={pick} />
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-center p-0 text-[13px] font-semibold text-destructive-foreground"
        >
          사진 빼기
        </button>
      )}
    </div>
  )
}

/** 사진 고르기 버튼 (capture 면 폰에서 바로 카메라가 열린다) */
function PickButton({
  icon,
  label,
  capture,
  onPick,
}: {
  icon: ReactNode
  label: string
  capture?: boolean
  onPick: (file: File) => void
}) {
  return (
    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-card text-sm font-bold [&_svg]:size-[18px]">
      {icon}
      {label}
      <input
        type="file"
        accept={ACCEPT}
        capture={capture ? 'environment' : undefined}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onPick(file)
        }}
      />
    </label>
  )
}
