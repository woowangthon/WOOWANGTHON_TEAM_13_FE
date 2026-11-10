import { Camera, Images } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ImageCropper } from '@/ui/ImageCropper'
import { toast } from '@/ui/toastStore'

// 메뉴 사진 1장: 찍기 · 갤러리(파일)에서 고르기 → 자르기 · 바꾸기 · 빼기 (레시피 작성 · 수정 시트)
// value: 새로 고른 파일 · null 뺌 · undefined 그대로(currentUrl)

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

export function RecipePhotoField({
  currentUrl,
  value,
  onChange,
}: {
  currentUrl: string | null
  value: File | null | undefined
  onChange: (value: File | null | undefined) => void
}) {
  const fileUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => void (fileUrl && URL.revokeObjectURL(fileUrl)), [fileUrl])
  const shown = value === undefined ? currentUrl : fileUrl
  /** 고르고 아직 자르지 않은 사진 */
  const [picked, setPicked] = useState<File | null>(null)

  const confirm = (file: File) => {
    if (file.size > MAX_BYTES) return toast.error('10MB 이하 사진으로 골라 주세요')
    setPicked(null)
    onChange(file)
  }

  if (picked) {
    return (
      <ImageCropper
        file={picked}
        hint="메뉴가 잘 보이게 모서리를 끌어 잘라 주세요"
        confirmLabel="넣기"
        onCancel={() => setPicked(null)}
        onConfirm={confirm}
      />
    )
  }

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative flex size-[92px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-line bg-white text-[#6B7068]">
        {shown ? (
          <img src={shown} alt="메뉴 사진" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Camera className="size-6" />
            <span className="text-xs font-semibold">사진</span>
          </>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">메뉴 사진</span>
        <span className="text-xs text-muted-foreground">
          {shown ? '찍거나 골라서 바꿀 수 있어요' : '알바생 레시피 화면에 보여요'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <PickChip icon={<Camera />} label="사진 찍기" capture onPick={setPicked} />
          <PickChip icon={<Images />} label="갤러리" onPick={setPicked} />
        </div>
        {shown && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="self-start p-0 text-xs font-semibold text-destructive-foreground"
          >
            사진 빼기
          </button>
        )}
      </div>
    </div>
  )
}

/** 작은 사진 고르기 버튼 (capture 면 폰에서 바로 카메라가 열린다) */
function PickChip({
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
    <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 text-xs font-bold [&_svg]:size-4">
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
