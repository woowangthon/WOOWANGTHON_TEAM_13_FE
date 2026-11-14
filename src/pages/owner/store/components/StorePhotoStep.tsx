import { Camera, Crop, Images, Store } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ImageCropper } from '@/ui/ImageCropper'
import { toast } from '@/ui/toastStore'

// 매장 사진 (매장 등록 ④ · 홈 매장 카드 [사진 변경] 시트): 찍기 · 갤러리(파일)에서 고르기 → 자르기(ImageCropper, 16:9 고정)
// 미리보기 칸은 홈 매장 카드와 같은 모양이라 자른 결과가 카드에 어떻게 보일지 알 수 있다
// [사진 조정]을 누르면 처음 고른 원본에서 다시 자른다 (11/12)

const MAX_BYTES = 10 * 1024 * 1024
/** 매장 사진 틀 (가로 ÷ 세로) — 홈 매장 카드(휴대폰 알바 약 1.7 · 사장 약 1.9)에 맞춰 16:9 고정 */
const STORE_PHOTO_RATIO = 16 / 9
const ACCEPT = 'image/jpeg,image/png,image/webp'

export function StorePhotoStep({
  value,
  onChange,
  onCroppingChange,
}: {
  value: File | null
  onChange: (file: File | null) => void
  /** 자르는 중인지 — 부모가 아래 [저장] · [건너뛰기]를 숨긴다 */
  onCroppingChange?: (cropping: boolean) => void
}) {
  const url = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  /** 처음 고른 원본 (다시 조정할 때 여기서 자른다) */
  const [original, setOriginal] = useState<File | null>(null)
  const [cropping, setCroppingState] = useState(false)

  const setCropping = (next: boolean) => {
    setCroppingState(next)
    onCroppingChange?.(next)
  }

  const pick = (file: File) => {
    setOriginal(file)
    setCropping(true)
  }

  const confirm = (file: File) => {
    if (file.size > MAX_BYTES) return toast.error('10MB 이하 사진으로 골라 주세요')
    setCropping(false)
    onChange(file)
  }

  if (cropping && original) {
    return (
      <ImageCropper
        file={original}
        hint="홈 매장 카드 틀에 맞춰 위치 · 크기를 정해 주세요"
        aspect={STORE_PHOTO_RATIO}
        cancelLabel={value ? '취소' : '다시 고르기'}
        confirmLabel="넣기"
        onCancel={() => {
          setCropping(false)
          if (!value) setOriginal(null)
        }}
        onConfirm={confirm}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="px-1 text-[13px] text-muted-foreground">
        매장 사진은 홈 매장 카드에 보여요. 나중에 넣어도 돼요
      </span>
      <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[26px] border-[1.5px] border-dashed border-line bg-card text-muted-foreground">
        {url ? (
          <img src={url} alt="매장 사진" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Store className="size-7" />
            <span className="text-[15px] font-medium">아직 사진이 없어요</span>
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
        <div className="flex items-center justify-center gap-5">
          {original && (
            <button
              type="button"
              onClick={() => setCropping(true)}
              className="inline-flex items-center gap-1 p-0 text-[13px] font-medium text-brand"
            >
              <Crop className="size-4" />
              사진 조정
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOriginal(null)
            }}
            className="p-0 text-[13px] font-medium text-destructive-foreground"
          >
            사진 빼기
          </button>
        </div>
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
    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-card text-[15px] font-bold [&_svg]:size-[18px]">
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
