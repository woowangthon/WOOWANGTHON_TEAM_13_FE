import { Camera } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { toast } from '@/ui/toastStore'

// 메뉴 사진 1장: 고르기 · 바꾸기 · 빼기 (레시피 작성 · 수정 시트)
// value: 새로 고른 파일 · null 뺌 · undefined 그대로(currentUrl)

const MAX_BYTES = 10 * 1024 * 1024

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

  const pick = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) return toast.error('10MB 이하 사진으로 골라 주세요')
    onChange(file)
  }

  return (
    <div className="flex items-center gap-3.5">
      <label className="relative flex size-[92px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-line bg-white text-[#6B7068]">
        {shown ? (
          <img src={shown} alt="메뉴 사진" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Camera className="size-6" />
            <span className="text-xs font-semibold">사진</span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={shown ? '메뉴 사진 바꾸기' : '메뉴 사진 넣기'}
          onChange={(event) => {
            pick(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold">메뉴 사진</span>
        <span className="text-xs text-muted-foreground">
          {shown ? '사진을 눌러 바꿀 수 있어요' : '알바생 레시피 화면에 보여요'}
        </span>
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
