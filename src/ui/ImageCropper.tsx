import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/utils'

// 사진 자르기 — 담당: 나현. 네 모서리를 끌어 크기를, 안쪽을 끌어 위치를 바꾼다.
// 자유형(aspect 없음, 레시피 종이 스캔): 처음엔 사진 전체가 선택돼 있고, 그대로 확인하면 원본 파일을 그대로 돌려준다.
// 고정형(aspect = 가로 ÷ 세로, 메뉴 사진 · 매장 사진): 틀 비율 그대로만 늘리고 줄인다. 처음엔 가운데 가장 큰 틀, 확인하면 늘 그 틀로 자른다.
// 브라우저가 띄우지 못하는 사진(크롬의 HEIC 등)은 자르지 않고 원본을 돌려준다.

/** 사진 기준 비율 (0~1) */
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 }
/** 가장 작게 자를 수 있는 크기 (사진의 10%) */
const MIN = 0.1
/** 잘라 낸 사진의 긴 변 최대 픽셀 (업로드 10MB 제한 안쪽으로) */
const MAX_SIDE = 2400

const CORNERS: { corner: Corner; className: string }[] = [
  { corner: 'nw', className: '-top-3.5 -left-3.5 cursor-nwse-resize' },
  { corner: 'ne', className: '-top-3.5 -right-3.5 cursor-nesw-resize' },
  { corner: 'sw', className: '-bottom-3.5 -left-3.5 cursor-nesw-resize' },
  { corner: 'se', className: '-right-3.5 -bottom-3.5 cursor-nwse-resize' },
]

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * 고정형 틀의 비율 (사진 기준 0~1 좌표에서 w ÷ h). 사진이 가로로 길면 같은 틀도 비율 좌표에서는 세로로 길어진다
 * ratio: 원하는 가로 ÷ 세로(픽셀), photo: 사진 가로 ÷ 세로(픽셀)
 */
const rectRatio = (ratio: number, photo: number) => ratio / photo

/** 사진 가운데 가장 큰 고정형 틀 */
function fitted(k: number): Rect {
  const w = k >= 1 ? 1 : k
  const h = k >= 1 ? 1 / k : 1
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
}

/** 고정형 모서리 끌기: 반대쪽 모서리는 그대로 두고 비율(k)을 지키며 크기만 바꾼다 */
function resizedFixed(start: Rect, mode: Corner, dx: number, dy: number, k: number): Rect {
  const left = mode === 'nw' || mode === 'sw'
  const top = mode === 'nw' || mode === 'ne'
  const anchorX = left ? start.x + start.w : start.x
  const anchorY = top ? start.y + start.h : start.y
  // 가로 · 세로로 끈 것 중 더 많이 바뀐 쪽을 따른다
  const fromX = start.w + (left ? -dx : dx)
  const fromY = (start.h + (top ? -dy : dy)) * k
  let w = Math.abs(fromX - start.w) >= Math.abs(fromY - start.w) ? fromX : fromY
  const maxW = Math.min(left ? anchorX : 1 - anchorX, (top ? anchorY : 1 - anchorY) * k)
  w = clamp(w, Math.max(MIN, MIN * k), maxW)
  const h = w / k
  return { x: left ? anchorX - w : anchorX, y: top ? anchorY - h : anchorY, w, h }
}

/** 끌기 시작 위치 · 사각형에서 dx · dy(비율)만큼 움직인 사각형. k 가 있으면 고정형 */
function moved(start: Rect, mode: Corner | 'move', dx: number, dy: number, k?: number): Rect {
  if (mode !== 'move' && k) return resizedFixed(start, mode, dx, dy, k)
  if (mode === 'move') {
    return {
      ...start,
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
    }
  }
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (mode === 'nw' || mode === 'sw') left = clamp(left + dx, 0, right - MIN)
  else right = clamp(right + dx, left + MIN, 1)
  if (mode === 'nw' || mode === 'ne') top = clamp(top + dy, 0, bottom - MIN)
  else bottom = clamp(bottom + dy, top + MIN, 1)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

/** 사진에서 rect 부분만 JPEG 파일로 */
async function cropFile(image: HTMLImageElement, rect: Rect, name: string): Promise<File> {
  const sx = Math.round(rect.x * image.naturalWidth)
  const sy = Math.round(rect.y * image.naturalHeight)
  const sw = Math.round(rect.w * image.naturalWidth)
  const sh = Math.round(rect.h * image.naturalHeight)
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  canvas.getContext('2d')!.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  )
  if (!blob) throw new Error('crop failed')
  return new File([blob], name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export function ImageCropper({
  file,
  onCancel,
  onConfirm,
  cancelLabel = '다시 고르기',
  confirmLabel = '자르기',
  hint = '모서리를 끌어 필요한 부분만 남겨 주세요',
  aspect,
}: {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => void
  cancelLabel?: string
  confirmLabel?: string
  hint?: string
  /** 고정형 틀 비율 (가로 ÷ 세로, 예: 16 / 9). 없으면 자유형 */
  aspect?: number
}) {
  // data URL 로 읽는다 (blob 주소는 StrictMode 정리 단계에서 지워져 사진이 안 뜬다)
  const [src, setSrc] = useState<string>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported'>('loading')
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => setSrc(reader.result as string)
    reader.onerror = () => setStatus('unsupported')
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  const imageRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ mode: Corner | 'move'; x: number; y: number; rect: Rect } | null>(null)
  const [rect, setRect] = useState<Rect>(FULL)
  /** 고정형 틀의 비율 좌표 w ÷ h (사진을 불러온 뒤 정한다) */
  const [k, setK] = useState<number>()
  const [working, setWorking] = useState(false)

  const start = (event: PointerEvent<HTMLElement>, mode: Corner | 'move') => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { mode, x: event.clientX, y: event.clientY, rect }
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    const image = imageRef.current
    if (!drag.current || !image) return
    const box = image.getBoundingClientRect()
    const dx = (event.clientX - drag.current.x) / box.width
    const dy = (event.clientY - drag.current.y) / box.height
    setRect(moved(drag.current.rect, drag.current.mode, dx, dy, k))
  }

  const end = () => {
    drag.current = null
  }

  // 자유형에서 사진 전체 그대로면 원본을 보낸다 (고정형은 늘 틀로 자른다)
  const isFull = !aspect && rect.x === 0 && rect.y === 0 && rect.w === 1 && rect.h === 1

  const onLoad = () => {
    setStatus('ready')
    const image = imageRef.current
    if (!aspect || !image?.naturalWidth || !image.naturalHeight) return
    const next = rectRatio(aspect, image.naturalWidth / image.naturalHeight)
    setK(next)
    setRect(fitted(next))
  }

  const confirm = async () => {
    const image = imageRef.current
    if (status !== 'ready' || isFull || !image) return onConfirm(file)
    setWorking(true)
    try {
      onConfirm(await cropFile(image, rect, file.name))
    } catch {
      // 자르지 못하면 원본으로 보낸다
      onConfirm(file)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] text-[#6B7068]">
        {status === 'unsupported' ? '이 사진은 미리 볼 수 없어서 그대로 보낼게요' : hint}
      </span>
      {status !== 'unsupported' && (
        <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-[22px] bg-ink p-5">
          <div className="relative touch-none select-none">
            <img
              ref={imageRef}
              src={src}
              alt="자를 사진"
              draggable={false}
              onLoad={onLoad}
              onError={() => setStatus('unsupported')}
              className="block max-h-[48vh] max-w-full"
            />
            {status === 'ready' && (
              <div
                onPointerDown={(event) => start(event, 'move')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(20,28,22,0.55)]"
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.w * 100}%`,
                  height: `${rect.h * 100}%`,
                }}
              >
                {CORNERS.map(({ corner, className }) => (
                  <span
                    key={corner}
                    aria-hidden
                    onPointerDown={(event) => start(event, corner)}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                    className={cn('absolute flex size-7 items-center justify-center', className)}
                  >
                    <span className="size-4 rounded-full border-2 border-brand bg-white" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" className="h-[54px]" disabled={working} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button className="h-[54px]" disabled={working || status === 'loading'} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
