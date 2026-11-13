import { ArrowRight, BookOpen, Check, ChevronRight, Coffee, Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { OwnerStore } from '@/pages/owner/api/types'
import { StorePhotoSheet } from '@/pages/owner/home/components/StorePhotoSheet'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'
import { Button } from '@/ui/Button'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 매장 등록 완료 (11/14 나현). 휴대폰 · 태블릿은 예전 그대로(사진 카드 + 처음 할 일 칩 + 시작하기),
// 데스크톱(lg 1024px 이상)은 두 칸: 왼쪽 680px 매장 사진(없으면 연한 초록 + 점 무늬 · 사진 올리기 안내) + 오른쪽 다음 할 일 카드 3장
// 사진 바꾸기 · 올리기는 홈 매장 카드와 같은 StorePhotoSheet (자르기 포함) — 저장하면 onStoreChange 로 바로 새 사진을 보여 준다

const SIZE_LABEL: Record<OwnerStore['size'], string> = { under5: '5인 미만', over5: '5인 이상' }

/** 처음 할 일 (docs/03 S1: 매뉴얼 → 레시피 → 알바생 초대) */
const NEXT = [
  {
    to: '/owner/manuals',
    icon: BookOpen,
    label: '매뉴얼 등록',
    desc: '오픈 · 마감 · 청소 순서를 올려요',
  },
  {
    to: '/owner/recipes',
    icon: Coffee,
    label: '레시피 등록',
    desc: '음료별 레시피를 올리면 AI 사수가 답해요',
  },
  {
    to: '/owner/members/new',
    icon: UserPlus,
    label: '알바생 초대',
    desc: '초대코드를 보내면 바로 합류해요',
  },
]

/** "충북 청주시 서원구 …" → 앞 세 마디 (시 · 구까지) */
const regionOf = (address: string) => address.split(/\s+/).slice(0, 3).join(' ')

export function StoreCreateDone({
  store,
  onStart,
  onStoreChange,
}: {
  store: OwnerStore
  onStart: () => void
  /** 사진을 올려 매장이 바뀌었을 때 */
  onStoreChange: (store: OwnerStore) => void
}) {
  // 매장 색 (알바 화면과 같은 shared/storeTheme)
  const theme = STORE_THEME[themeOf(store.theme, 0)]
  const [editingPhoto, setEditingPhoto] = useState(false)
  const hasPhoto = !!store.photoUrl
  return (
    <div className="owner-wide">
      <div className="lg:hidden">
        {/* 바탕은 사장님 홈과 같은 흰 기둥 (tone white) */}
        <AuthFrame tone="white" className="gap-[22px]">
          <section
            className="flex min-h-[360px] flex-1 flex-col justify-between rounded-[32px] bg-cover bg-center texture p-6 text-white"
            style={{
              backgroundColor: theme.color,
              // 매장 사진을 넣었으면 그라데이션 없이 사진 그대로 (글씨는 아래 어두운 판 위에)
              backgroundImage: store.photoUrl ? `url(${store.photoUrl})` : undefined,
            }}
          >
            <span
              className="flex size-14 items-center justify-center rounded-full bg-white"
              style={{ color: theme.color }}
            >
              <Check className="size-[30px]" />
            </span>
            <div
              className={cn(
                'flex flex-col gap-[18px]',
                store.photoUrl && 'rounded-[24px] bg-black/35 p-4 backdrop-blur-md',
              )}
            >
              <div className="flex flex-col gap-2.5">
                <p className="m-0 text-[13px] opacity-75">사장님</p>
                <h1 className="m-0 text-[26px] leading-[1.22] font-extrabold tracking-[-0.035em] break-keep">
                  {store.name}
                  <br />
                  등록 완료
                </h1>
              </div>
              <nav aria-label="처음 할 일" className="flex flex-wrap gap-2">
                {NEXT.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={label}
                    to={to}
                    replace
                    className="flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-2 text-[13px] font-medium text-white backdrop-blur-[8px]"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </section>
          <Button variant="ink" className="h-14 text-base" onClick={onStart}>
            시작하기
            <ArrowRight className="size-5" />
          </Button>
        </AuthFrame>
      </div>

      {/* 데스크톱 */}
      <div className="hidden min-h-[860px] bg-white lg:grid lg:min-h-dvh lg:grid-cols-[680px_1fr]">
        <section
          className="relative overflow-hidden"
          style={
            hasPhoto
              ? undefined
              : {
                  backgroundColor: 'var(--brand-soft)',
                  // 연한 점 무늬 (지름 3px · 26px 간격)
                  backgroundImage:
                    'radial-gradient(circle, color-mix(in srgb, var(--brand) 22%, transparent) 1.5px, transparent 1.6px)',
                  backgroundSize: '26px 26px',
                }
          }
        >
          {hasPhoto ? (
            <>
              <img
                src={store.photoUrl!}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              {/* 사진 위 흰 글자가 읽히게 아래에서 위로 어둡게 (docs/06 사진 위 어둡게 예외) */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(0deg,rgba(26,22,14,0.88)_0%,rgba(26,22,14,0.55)_32%,transparent_62%)]"
              />
              <button
                type="button"
                onClick={() => setEditingPhoto(true)}
                className="absolute top-8 right-8 h-10 rounded-full bg-card/95 px-4 text-[13px] font-bold text-foreground"
              >
                사진 바꾸기
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditingPhoto(true)}
              className="absolute top-11 right-14 left-14 flex flex-col gap-1 rounded-[20px] border-2 border-dashed border-faint bg-transparent p-5 text-left text-foreground"
            >
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Plus aria-hidden="true" className="size-4" />
                매장 사진을 올리면 이 자리에 보여요
              </span>
              <span className="text-[13px] font-medium text-muted-foreground">
                사장님 홈에서 언제든 추가할 수 있어요
              </span>
            </button>
          )}
          <div
            className={cn(
              'absolute right-14 bottom-[52px] left-14 flex flex-col items-start gap-3',
              hasPhoto ? 'text-white' : 'text-foreground',
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold',
                hasPhoto ? 'bg-accent text-accent-foreground' : 'bg-white text-accent-foreground',
              )}
            >
              <Check aria-hidden="true" className="size-4" />
              등록 완료
            </span>
            <h1 className="m-0 text-[40px] leading-[1.1] font-extrabold tracking-[-0.03em] break-keep">
              {store.name}
            </h1>
            <p className={cn('m-0 text-base', hasPhoto && 'text-white/90')}>
              {[regionOf(store.address), SIZE_LABEL[store.size]].filter(Boolean).join(' · ')}
            </p>
          </div>
        </section>

        <section className="flex flex-col px-[72px] py-12">
          <img src="/logo-crewbean.png" alt="crewBean" className="h-10 w-auto self-end" />
          <div className="my-auto flex w-full max-w-[560px] flex-col gap-7 self-center py-8">
            <div className="flex flex-col gap-2.5">
              <h2 className="m-0 text-[26px] leading-[1.3] font-extrabold tracking-[-0.03em]">
                이제 매장을
                <br />
                채워볼까요?
              </h2>
              <p className="m-0 text-[15px] text-muted-foreground">
                매뉴얼이 많을수록 AI 사수가 정확하게 답해요.
              </p>
            </div>
            <nav aria-label="처음 할 일" className="flex flex-col gap-3.5">
              {NEXT.map(({ to, icon: Icon, label, desc }, i) => (
                <Link
                  key={label}
                  to={to}
                  replace
                  className="flex items-center gap-4 rounded-[22px] bg-card px-5 py-[18px] text-foreground transition-colors hover:bg-brand-soft"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-extrabold text-white tabular-nums"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-base font-bold">
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                      {label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{desc}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-subtle" />
                </Link>
              ))}
            </nav>
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="ink"
                className="h-[60px] w-full text-base font-extrabold"
                onClick={onStart}
              >
                시작하기
                <ArrowRight className="size-5" />
              </Button>
              <button
                type="button"
                onClick={onStart}
                className="p-1 text-[15px] font-medium text-muted-foreground underline underline-offset-4"
              >
                나중에 할게요
              </button>
            </div>
          </div>
        </section>
        <Toaster bottom={32} />
      </div>

      {editingPhoto && (
        <StorePhotoSheet
          storeId={store.storeId}
          onClose={() => setEditingPhoto(false)}
          onSaved={onStoreChange}
        />
      )}
    </div>
  )
}
