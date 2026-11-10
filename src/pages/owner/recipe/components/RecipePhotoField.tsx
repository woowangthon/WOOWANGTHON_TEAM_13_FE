import { Camera, Images } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isMenuPhotoUrl } from '@/api/mocks/owner/menuPhotos'
import { ImageCropper } from '@/ui/ImageCropper'
import { toast } from '@/ui/toastStore'

// 메뉴 사진 1장 (레시피 작성 ① 사진 단계): 찍기 · 갤러리(파일)에서 고르기 → 자르기 · 바꾸기 · 빼기
// value: 새로 고른 파일 · null 뺌 · undefined 그대로(currentUrl)
// 기본 사진(메뉴 이름으로 찾은 시연 사진)은 저장된 사진이 아니라서 [사진 빼기] 없이 바꾸기만 안내한다

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

export function RecipePhotoField({
  currentUrl,
  value,
  onChange,
  onCroppingChange,
}: {
  currentUrl: string | null
  value: File | null | undefined
  onChange: (value: File | null | undefined) => void
  /** 자르기 화면이 열리고 닫힐 때 (시트 아래 버튼을 숨기려고) */
  onCroppingChange?: (cropping: boolean) => void
}) {
  const fileUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => void (fileUrl && URL.revokeObjectURL(fileUrl)), [fileUrl])
  const shown = value === undefined ? currentUrl : fileUrl
  const isDefault = value === undefined && isMenuPhotoUrl(currentUrl)
  /** 고르고 아직 자르지 않은 사진 */
  const [picked, setPickedState] = useState<File | null>(null)

  const setPicked = (file: File | null) => {
    setPickedState(file)
    onCroppingChange?.(!!file)
  }

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
    <div className="flex flex-col gap-3">
      <span className="text-[13px] text-[#6B7068]">
        {isDefault
          ? '기본 사진이에요. 찍거나 골라서 우리 매장 사진으로 바꿔요'
          : '메뉴 사진은 알바생 레시피 화면에 보여요. 없으면 건너뛰어도 돼요'}
      </span>
      <div className="relative flex h-[200px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[22px] border-[1.5px] border-dashed border-line bg-white text-[#6B7068]">
        {shown ? (
          <>
            <img src={shown} alt="메뉴 사진" className="absolute inset-0 size-full object-cover" />
            {isDefault && (
              <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-foreground">
                기본 사진
              </span>
            )}
          </>
        ) : (
          <>
            <Camera className="size-7" />
            <span className="text-sm font-semibold">아직 사진이 없어요</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PickButton
          icon={<Camera />}
          label={shown && !isDefault ? '다시 찍기' : '사진 찍기'}
          capture
          onPick={setPicked}
        />
        <PickButton icon={<Images />} label="갤러리 · 파일" onPick={setPicked} />
      </div>
      {shown && !isDefault && (
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
    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white text-sm font-bold [&_svg]:size-[18px]">
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
