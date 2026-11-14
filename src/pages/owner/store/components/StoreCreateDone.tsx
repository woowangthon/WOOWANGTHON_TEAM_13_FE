import { ArrowRight, BookOpen, Check, Coffee, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { OwnerStore } from '@/pages/owner/api/types'
import { StorePhotoSheet } from '@/pages/owner/home/components/StorePhotoSheet'
import {
  OnboardingDoneDesktop,
  type NextStep,
} from '@/pages/owner/store/components/OnboardingDoneDesktop'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { NO_PHOTO_BACKGROUND } from '@/pages/owner/store/noPhotoBackground'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/utils'

// 매장 등록 완료 (11/14 나현). 휴대폰 · 태블릿은 예전 그대로(사진 카드 + 처음 할 일 칩 + 시작하기),
// 데스크톱(lg 1024px 이상)은 두 칸: 왼쪽 680px 매장 사진(없으면 연한 초록 + 점 무늬 · 사진 올리기 안내) + 오른쪽 다음 할 일 카드 3장
// 사진 바꾸기 · 올리기는 홈 매장 카드와 같은 StorePhotoSheet (자르기 포함) — 저장하면 onStoreChange 로 바로 새 사진을 보여 준다

const SIZE_LABEL: Record<OwnerStore['size'], string> = { under5: '5인 미만', over5: '5인 이상' }

/** 처음 할 일 (docs/03 S1: 매뉴얼 → 레시피 → 알바생 초대) */
const NEXT: NextStep[] = [
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
          {/* 사진이 있으면 사진 + 아래 어두운 판, 없으면 데스크톱과 같은 연한 매장 색 + 점 무늬 · 진한 글자 (11/14) */}
          <section
            className={cn(
              'flex min-h-[360px] flex-1 flex-col justify-between rounded-[32px] bg-cover bg-center p-6',
              hasPhoto ? 'text-white' : 'text-foreground',
            )}
            style={
              hasPhoto
                ? { backgroundColor: theme.color, backgroundImage: `url(${store.photoUrl})` }
                : NO_PHOTO_BACKGROUND
            }
          >
            <span
              className={cn(
                'flex size-14 items-center justify-center rounded-full',
                hasPhoto ? 'bg-white' : 'bg-brand text-white',
              )}
              style={hasPhoto ? { color: theme.color } : undefined}
            >
              <Check className="size-[30px]" />
            </span>
            <div
              className={cn(
                'flex flex-col gap-[18px]',
                hasPhoto && 'rounded-[24px] bg-black/35 p-4 backdrop-blur-md',
              )}
            >
              <div className="flex flex-col gap-2.5">
                <p
                  className={cn(
                    'm-0 text-[13px]',
                    hasPhoto ? 'opacity-75' : 'font-medium text-muted-foreground',
                  )}
                >
                  사장님
                </p>
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
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium',
                      hasPhoto
                        ? 'bg-white/16 text-white backdrop-blur-[8px]'
                        : 'bg-white text-foreground',
                    )}
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

      {/* 데스크톱 (알바생 입장 완료와 같은 두 칸 부품) */}
      <OnboardingDoneDesktop
        photoUrl={store.photoUrl}
        badge="등록 완료"
        title={store.name}
        meta={[regionOf(store.address), SIZE_LABEL[store.size]].filter(Boolean).join(' · ')}
        onEditPhoto={() => setEditingPhoto(true)}
        heading={
          <>
            이제 매장을
            <br />
            채워볼까요?
          </>
        }
        description="매뉴얼이 많을수록 AI 사수가 정확하게 답해요."
        steps={NEXT}
        onStart={onStart}
        laterLabel="나중에 할게요"
      />

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
