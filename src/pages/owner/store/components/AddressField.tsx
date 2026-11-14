import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/ui/BottomSheet'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 매장 주소: 직접 쓰지 않고 카카오(다음) 우편번호 검색에서 고른 도로명 주소만 넣는다 + 상세 주소(층 · 호)
// 검색 창은 npm 이 아니라 공개 스크립트(키 없음)를 처음 열 때 한 번 불러온다 (lib/kakao 의 SDK 와 같은 방식)

// t1.daumcdn.net 은 2026-11-30 에 끝나서 카카오 주소로 (우편번호 서비스 공지)
const POSTCODE_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

interface PostcodeResult {
  roadAddress: string
  jibunAddress: string
  buildingName: string
}

interface PostcodeApi {
  Postcode: new (options: {
    oncomplete: (data: PostcodeResult) => void
    width: string
    height: string
  }) => { embed: (element: HTMLElement) => void }
}

declare global {
  interface Window {
    daum?: PostcodeApi
  }
}

let loading: Promise<PostcodeApi> | null = null

function loadPostcode(): Promise<PostcodeApi> {
  if (window.daum?.Postcode) return Promise.resolve(window.daum)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = POSTCODE_URL
    script.async = true
    script.onload = () => (window.daum ? resolve(window.daum) : reject(new Error('postcode')))
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('postcode'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function AddressField({
  address,
  onAddressChange,
  detail,
  onDetailChange,
}: {
  /** 검색에서 고른 도로명 주소 (없으면 '') */
  address: string
  onAddressChange: (address: string) => void
  detail: string
  onDetailChange: (detail: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-card px-[18px] py-3.5 border border-line/60 lg:px-[22px] lg:py-4">
      <span className="text-xs font-bold text-muted-foreground">매장 주소</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-2 p-0 text-left"
      >
        {address ? (
          <>
            <MapPin className="size-[18px] shrink-0 text-brand" />
            <span className="min-w-0 flex-1 text-[16px] font-bold break-keep lg:text-[19px]">
              {address}
            </span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">바꾸기</span>
          </>
        ) : (
          <>
            <Search className="size-[18px] shrink-0 text-faint" />
            <span className="text-[16px] font-bold text-faint lg:text-[19px]">주소 검색</span>
          </>
        )}
      </button>
      {address && (
        <input
          value={detail}
          onChange={(event) => onDetailChange(event.target.value)}
          placeholder="상세 주소 (선택) 예) 2층"
          aria-label="상세 주소"
          maxLength={60}
          className="h-11 min-w-0 rounded-xl border-none bg-background px-3 text-[15px] placeholder:text-faint"
        />
      )}
      {open && (
        <PostcodeSheet
          onClose={() => setOpen(false)}
          onPick={(picked) => {
            onAddressChange(picked)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/** 우편번호 검색 창을 시트 안에 띄운다 (새 창 대신 embed — 폰 · PWA 에서도 같은 화면) */
function PostcodeSheet({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (address: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    loadPostcode()
      .then((daum) => {
        if (!alive || !box.current) return
        new daum.Postcode({
          // 도로명 주소를 쓰고, 없으면(드묾) 지번 주소. 건물 이름이 있으면 뒤에 붙인다
          oncomplete: (data) => {
            const base = data.roadAddress || data.jibunAddress
            onPick(data.buildingName ? `${base} (${data.buildingName})` : base)
          },
          width: '100%',
          height: '100%',
        }).embed(box.current)
        setReady(true)
      })
      .catch(() => {
        if (!alive) return
        toast.error('주소 검색을 불러오지 못했어요. 인터넷 연결을 확인해 주세요')
        onClose()
      })
    return () => {
      alive = false
    }
    // 시트를 열 때 한 번만 띄운다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BottomSheet open onClose={onClose} label="주소 검색" closeButton>
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">주소 검색</h2>
        <div className="relative h-[440px] overflow-hidden rounded-[18px] bg-white">
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          )}
          <div ref={box} className="size-full" />
        </div>
      </div>
    </BottomSheet>
  )
}
