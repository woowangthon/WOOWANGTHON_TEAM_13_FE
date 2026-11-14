import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coffee,
  House,
  MessageCircleQuestion,
  Plus,
  Store,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { RecipeSummary } from '@/lib/api/types'
import { PersonAvatar } from '@/pages/owner/components/PersonAvatar'
import { GuideDesktop } from '@/pages/owner/guide/GuideDesktop'
import { markOwnerGuideSeen } from '@/pages/owner/guide/ownerGuideSeen'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useWide } from '@/pages/owner/useWide'
import { GuideSlides, type GuideSlide } from '@/shared/guide/GuideSlides'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Tabs } from '@/ui/Tabs'
import { cn } from '@/ui/utils'

// 사장님 앱 사용법: 하단 탭 5칸(홈 · 매장 정보 · ＋ 추가 · 직원 · 근무)을 한 장씩 (공용 틀 shared/guide/GuideSlides, 알바 버전과 같은 모양).
// 오는 길: 사장님 홈 첫 진입(안 봤으면 · 매장 등록 직후 포함) → 끝나면 사장님 홈 / 마이페이지 "앱 사용법" → 끝나면 마이페이지 (state.returnTo)
// 그림은 실제 화면을 가짜 데이터로 작게 줄여 그린다 (조작은 안 됨)

type Tab = 'home' | 'info' | 'add' | 'members' | 'work'

const noop = () => {}

/**
 * 실제 화면을 작게: 휴대폰 화면 모양 + 아래 하단 탭 줄 (그 장의 탭만 강조) — 알바 버전(StaffGuidePage)과 같은 크기.
 * 사장님 화면처럼 흰 바탕, header 면 위에 사장님 헤더(왼쪽 매장 · 가운데 crewBean · 오른쪽 종 · 프로필) (11/14)
 */
function Phone({ tab, header, children }: { tab: Tab; header?: boolean; children: ReactNode }) {
  return (
    // 화면이 낮으면(예: 360×640) 그림 칸만큼 줄어들고, 넘치는 아래는 흐리게 사라진다
    <div className="flex max-h-full w-[248px] flex-col overflow-hidden rounded-[30px] border-[5px] border-card bg-white shadow-float">
      <div className="relative h-[300px] min-h-0 shrink overflow-hidden px-2.5 pt-2.5">
        {/* 실제 크기로 그린 뒤 줄인다 (zoom 은 줄인 크기대로 자리를 잡는다) */}
        <div className="flex flex-col gap-2.5" style={{ zoom: 0.7 } as CSSProperties}>
          {header && <MiniHeader />}
          {children}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent" />
      </div>
      <MiniTabBar active={tab} />
    </div>
  )
}

const TABS: { key: Tab; label: string; icon: typeof House }[] = [
  { key: 'home', label: '홈', icon: House },
  { key: 'info', label: '매장 정보', icon: Store },
  { key: 'add', label: '추가', icon: Plus },
  { key: 'members', label: '직원', icon: Users },
  { key: 'work', label: '근무', icon: CalendarDays },
]

/** 사장님 하단 탭(OwnerLayout 의 BottomNav)과 같은 모양을 작게 */
function MiniTabBar({ active }: { active: Tab }) {
  return (
    <div className="grid grid-cols-5 items-center border-t border-line/60 bg-card px-1.5 py-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const on = key === active
        if (key === 'add') {
          return (
            <span key={key} className="flex justify-center">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full bg-brand text-white transition-transform',
                  on && 'scale-115 ring-[3px] ring-brand-soft',
                )}
              >
                <Icon className="size-[18px]" strokeWidth={2.4} />
              </span>
            </span>
          )
        }
        return (
          <span
            key={key}
            className={cn(
              'flex flex-col items-center gap-[3px] transition-transform',
              on ? 'scale-115 text-brand' : 'text-subtle',
            )}
          >
            <Icon className="size-[17px]" strokeWidth={on ? 2.5 : 1.8} />
            <span
              className={cn('text-[9px] whitespace-nowrap', on ? 'font-extrabold' : 'font-medium')}
            >
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** 사장님 헤더(OwnerLayout)를 작게: 왼쪽 매장 · 가운데 로고 · 오른쪽 종 · 프로필 (알바 그림 MiniHeader 와 같은 크기) */
function MiniHeader() {
  return (
    <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <span className="flex h-10 max-w-full min-w-0 items-center gap-0.5 justify-self-start rounded-full border border-line/60 bg-card pr-2.5 pl-3.5 text-[15px] font-bold whitespace-nowrap">
        <span className="min-w-0 truncate">달빛 카페</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </span>
      <img src="/logo-crewbean.png" alt="" width={528} height={120} className="h-6 w-auto" />
      <span className="flex items-center gap-2 justify-self-end">
        <span className="flex size-10 items-center justify-center rounded-full bg-card">
          <Bell aria-hidden="true" className="size-5" />
        </span>
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-base font-extrabold text-background">
          박
        </span>
      </span>
    </span>
  )
}

/** 화면 제목줄 (매장 이름 + 큰 제목 + 오른쪽 버튼) */
function TitleRow({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-2.5 px-1">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">달빛 카페</span>
        <span className="text-[28px] font-extrabold tracking-[-0.03em]">{title}</span>
      </div>
      {right}
    </div>
  )
}

// ── 그림 ──

function HomePicture() {
  return (
    <Phone tab="home" header>
      <span className="px-1 text-[26px] leading-[1.3] font-extrabold tracking-[-0.03em]">
        안녕하세요,
        <br />박 사장님
      </span>
      {/* 확인 필요: AI 사수가 못 찾아서 알바생이 넘긴 질문 (OwnerHomePage QuestionCard 와 같은 모양) */}
      <div className="flex flex-col gap-2.5 rounded-[30px] border-[1.5px] border-brand bg-card p-5">
        <span className="flex size-[42px] items-center justify-center rounded-full bg-brand text-white">
          <MessageCircleQuestion className="size-[22px]" />
        </span>
        <span className="mt-1 text-lg font-extrabold">지은 님의 질문</span>
        <span className="text-sm leading-[1.55] break-keep text-muted-foreground">
          “손님이 우산 빌려 달래요”라는 질문이 왔어요
        </span>
        <span className="flex items-center justify-between gap-2.5">
          <span className="text-xs text-muted-foreground">지은 · 14:20</span>
          <span className="flex h-10 items-center gap-0.5 rounded-full bg-brand pr-3 pl-4 text-sm font-bold text-white">
            답하기
            <ChevronRight className="size-[18px]" />
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-2 rounded-[30px] bg-brand-soft p-5">
        <span className="flex size-[42px] items-center justify-center rounded-full bg-white text-brand">
          <Wallet className="size-[22px]" />
        </span>
        <span className="mt-1 text-lg font-extrabold">11월 인건비</span>
        <span className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">2,043,360원</span>
      </div>
    </Phone>
  )
}

const recipe = (recipeId: string, name: string, category: string, photo: string) =>
  ({
    recipeId,
    name,
    category,
    temp: 'ICE',
    size: null,
    // 목록 카드의 "재료 3가지"
    ingredients: [
      { name: '샷', amount: '2' },
      { name: '우유', amount: '200ml' },
      { name: '얼음', amount: '가득' },
    ],
    imageUrl: `/images/menu/${photo}.webp`,
    isNew: false,
    updatedAt: '',
  }) satisfies RecipeSummary

function InfoPicture() {
  return (
    <Phone tab="info" header>
      <TitleRow
        title="매장 정보"
        right={
          <Tabs
            options={[
              { value: 'recipe', label: '레시피' },
              { value: 'manual', label: '매뉴얼' },
            ]}
            value="recipe"
            onChange={noop}
          />
        }
      />
      <CategoryTabs
        categories={[
          { name: '커피', count: 6 },
          { name: '라떼', count: 5 },
          { name: '에이드', count: 3 },
          { name: '티', count: 4 },
        ]}
        value="라떼"
        onChange={noop}
      />
      <RecipeGrid
        recipes={[
          recipe('1', '카페라떼', '라떼', 'cafe-latte'),
          recipe('2', '바닐라라떼', '라떼', 'vanilla-latte'),
          recipe('3', '딸기라떼', '라떼', 'strawberry-latte'),
          recipe('4', '말차라떼', '라떼', 'matcha-latte'),
        ]}
        getHref={() => '#'}
      />
    </Phone>
  )
}

/** ＋ 버튼을 누르면 뜨는 추가 시트 (AddMenuSheet 와 같은 칸) */
const ADD_ITEMS = [
  { label: '레시피', icon: Coffee, primary: true },
  { label: '사진으로 레시피', icon: Camera },
  { label: '매뉴얼', icon: BookOpen },
  { label: '알바생 초대', icon: UserPlus },
  { label: '인수인계 남기기', icon: ClipboardList, wide: true },
]

function AddPicture() {
  return (
    <Phone tab="add">
      <span className="px-1 text-[22px] font-extrabold tracking-[-0.02em]">추가</span>
      <div className="grid grid-cols-2 gap-2.5">
        {ADD_ITEMS.map(({ label, icon: Icon, primary, wide }) => (
          <span
            key={label}
            className={cn(
              'flex min-h-[112px] flex-col justify-between gap-3 rounded-[24px] p-4',
              primary ? 'bg-brand text-white' : 'bg-white text-foreground',
              // 사진으로 레시피: 이 장에서 가장 하고 싶은 말이라 매장 색 테두리
              label === '사진으로 레시피' && 'ring-[3px] ring-brand',
              wide && 'col-span-2 min-h-0 flex-row items-center justify-start',
            )}
          >
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-brand',
                primary ? 'bg-white' : 'bg-brand-soft',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-[15px] font-extrabold">{label}</span>
          </span>
        ))}
      </div>
    </Phone>
  )
}

const MEMBERS = [
  { name: '지은', shift: '월 · 수 · 금 마감', wage: '10,320원', active: true },
  { name: '민수', shift: '평일 오픈', wage: '10,500원', active: true },
  { name: '서연', shift: '주말 미들', wage: '10,320원', active: false },
]

function MembersPicture() {
  return (
    <Phone tab="members" header>
      <TitleRow
        title="직원 3명"
        right={
          <Button variant="ink" size="sm" className="h-10 pr-3.5 pl-2.5">
            <UserPlus className="size-[18px]" />
            초대
          </Button>
        }
      />
      {MEMBERS.map((m, i) => (
        <div
          key={m.name}
          className="flex items-center gap-3.5 rounded-[22px] bg-card px-4 py-3.5 border border-line/60"
        >
          <PersonAvatar
            name={m.name}
            index={i}
            size={48}
            dot={m.active ? '#ADC178' : 'var(--new)'}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-base font-bold">{m.name}</span>
            <span className="truncate text-[13px] text-muted-foreground">
              {m.shift} · {m.wage}
            </span>
          </span>
          <Badge
            size="md"
            variant={m.active ? 'soft' : 'warm'}
            className={m.active ? '' : 'bg-warm text-warm-foreground'}
          >
            {m.active ? '사용 중' : '초대됨'}
          </Badge>
        </div>
      ))}
    </Phone>
  )
}

/** 근무 달력 한 주 (WorkCalendar 와 같은 모양) */
const WEEK = [
  {
    d: 16,
    shifts: [
      ['9', '민수'],
      ['18', '지은'],
    ],
  },
  {
    d: 17,
    shifts: [
      ['9', '민수'],
      ['15', '사장', 'me'],
    ],
  },
  {
    d: 18,
    shifts: [
      ['9', '민수'],
      ['18', '지은'],
    ],
  },
  {
    d: 19,
    shifts: [
      ['9', '민수'],
      ['15', '사장', 'me'],
    ],
  },
  {
    d: 20,
    shifts: [
      ['9', '서연'],
      ['18', '지은'],
    ],
  },
  {
    d: 21,
    shifts: [
      ['13', '서연'],
      ['18', '도윤'],
    ],
  },
  {
    d: 22,
    shifts: [
      ['13', '서연'],
      ['18', '민수'],
    ],
  },
] as const

const PAY = [
  { name: '지은', hours: '66시간', tax: '3.3%', net: '681,120원' },
  { name: '민수', hours: '88시간', tax: '4대보험', net: '894,310원' },
]

function WorkPicture() {
  return (
    <Phone tab="work" header>
      {/* 받은 대타 요청 (ReceivedRequests) */}
      <div className="flex items-center gap-3 rounded-[22px] bg-brand texture px-4 py-3.5 text-white">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand">
          <ArrowLeftRight className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">지은 님 대타 요청</span>
          <span className="text-[13px] tabular-nums opacity-80">11/20(금) 18:00 – 23:00</span>
        </span>
        <Button variant="white" size="sm">
          수락
        </Button>
      </div>
      <section className="flex flex-col gap-2 rounded-[24px] bg-card px-2 pt-3 pb-2.5 border border-line/60">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
          {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {WEEK.map(({ d, shifts }) => (
            <span
              key={d}
              className={cn(
                'flex min-w-0 flex-col gap-[3px] px-[2px] pt-1 pb-1.5',
                d === 20 && 'rounded-[10px] bg-background',
              )}
            >
              <span
                className={cn(
                  'flex size-[22px] items-center justify-center self-center rounded-full text-xs tabular-nums',
                  d === 20 ? 'bg-brand font-bold text-white' : 'font-semibold',
                )}
              >
                {d}
              </span>
              {shifts.map(([hour, name, me]) => (
                <span
                  key={hour + name}
                  className={cn(
                    'flex flex-wrap gap-x-[3px] rounded-[5px] px-[2px] py-px text-[10px] leading-[1.3] font-semibold',
                    me ? 'bg-brand text-white' : 'bg-brand-soft text-foreground',
                  )}
                >
                  <span className="tabular-nums">{hour}</span>
                  <span>{name}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>
      {/* 직원별 급여 (OwnerPayrollPage 줄: 공제 종류 · 실수령) */}
      <div className="flex flex-col rounded-[20px] bg-card px-4 py-1.5 border border-line/60">
        {PAY.map((p, i) => (
          <div
            key={p.name}
            className={cn('flex items-center gap-3 py-2.5', i > 0 && 'border-t border-line/60')}
          >
            <PersonAvatar name={p.name} index={i} size={36} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-bold">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.hours} · {p.tax}
              </span>
            </span>
            <span className="text-base font-extrabold tabular-nums">{p.net}</span>
          </div>
        ))}
      </div>
    </Phone>
  )
}

const SLIDES: GuideSlide[] = [
  {
    tab: '홈',
    title: '알바생 질문은 홈에서 답해요',
    body: 'AI 사수가 모르면 사장님께 물어봐요. 답하면 매뉴얼에도 넣을 수 있어요',
    visual: <HomePicture />,
  },
  {
    tab: '매장 정보',
    title: '레시피 · 매뉴얼을 올려 두세요',
    body: '알바생은 레시피를 보고, AI 사수는 이 내용으로만 답해요',
    visual: <InfoPicture />,
  },
  {
    tab: '＋ 추가',
    title: '레시피 종이는 사진 한 장이면 돼요',
    body: 'AI가 읽어서 초안을 만들어요. 매뉴얼 · 초대 · 인수인계도 여기서',
    visual: <AddPicture />,
  },
  {
    tab: '직원',
    title: '알바생은 초대 코드로 들어와요',
    body: '카톡으로 코드를 보내고, 시급 · 급여 공제를 정해요',
    visual: <MembersPicture />,
  },
  {
    tab: '근무',
    title: '근무표 · 대타 · 급여를 한 곳에서',
    body: '대타를 수락하고, 직원별 급여를 확인해요',
    visual: <WorkPicture />,
  },
]

export default function OwnerGuidePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { store } = useOwnerStore()
  // 마이페이지에서 오면 마이페이지로, 그 밖(홈 첫 진입 · 매장 등록 직후)은 사장님 홈으로
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/owner'
  const brand = { '--brand': store.color, '--brand-soft': store.soft } as CSSProperties
  const wide = useWide()

  const done = () => {
    markOwnerGuideSeen()
    navigate(returnTo, { replace: true })
  }

  // 데스크톱은 두 칸 카드(GuideDesktop), 휴대폰 · 태블릿은 공용 카드 넘기기(GuideSlides) — 그림 · 문구는 같다
  if (wide) {
    return (
      <div className="owner-wide" style={brand}>
        <GuideDesktop slides={SLIDES} onDone={done} />
      </div>
    )
  }
  return (
    <div className="owner-wide min-h-dvh bg-canvas" style={brand}>
      <div className="mx-auto w-full max-w-[460px]">
        <GuideSlides tone="white" slides={SLIDES} onDone={done} />
      </div>
    </div>
  )
}
