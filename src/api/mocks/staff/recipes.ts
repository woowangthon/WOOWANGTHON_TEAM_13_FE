// 가짜 데이터: 레시피 — BE 연결 전까지 사용

export type RecipeCategory = '커피' | '라떼' | '에이드' | '스무디' | '티' | '디저트'

export interface Recipe {
  id: string
  storeId: string
  name: string
  category: RecipeCategory
  temp: 'ICE' | 'HOT' | 'DESSERT'
  size: string
  ingredients: [name: string, amount: string][]
  steps: string[]
  memo?: string
  isNew?: boolean
  /** 메뉴 사진 주소 (없으면 훅이 메뉴 이름으로 시연 사진을 찾는다) */
  imageUrl?: string | null
}

export const recipeCategories: Record<string, RecipeCategory[]> = {
  dalbit: ['커피', '라떼', '에이드', '스무디', '티', '디저트'],
  afternoon: ['커피', '라떼', '에이드', '티'],
}

/** 레시피 탭을 처음 열 때 보이는 카테고리 */
export const defaultRecipeCategory: Record<string, RecipeCategory> = {
  dalbit: '라떼',
  afternoon: '커피',
}

type Row = Omit<Recipe, 'storeId'>
const D = (r: Row): Recipe => ({ ...r, storeId: 'dalbit' })
const A = (r: Row): Recipe => ({ ...r, storeId: 'afternoon' })

export const recipes: Recipe[] = [
  D({
    id: 'ame',
    name: '아메리카노',
    category: '커피',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['에스프레소', '2샷 (40ml)'],
      ['정수', '250ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['컵에 얼음을 가득 담아요', '정수 250ml를 부어요', '샷 2개를 위에 올려요'],
    memo: 'HOT은 얼음 대신 뜨거운 물 300ml',
  }),
  D({
    id: 'cold',
    name: '콜드브루',
    category: '커피',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['콜드브루 원액', '80ml'],
      ['정수', '200ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['얼음 → 정수 → 원액 순서', '가볍게 저어요'],
    memo: '원액은 냉장고 2번 칸',
  }),
  D({
    id: 'esp',
    name: '에스프레소',
    category: '커피',
    temp: 'HOT',
    size: '데미타스',
    ingredients: [
      ['원두', '18g'],
      ['추출', '30ml · 25초'],
    ],
    steps: ['데미타스 잔을 데워요', '25초 안팎으로 추출해요'],
  }),
  D({
    id: 'ein',
    name: '아인슈페너',
    category: '커피',
    temp: 'ICE',
    size: '12oz',
    ingredients: [
      ['에스프레소', '2샷'],
      ['정수', '120ml'],
      ['얼음', '반 컵'],
      ['크림', '2스쿱'],
    ],
    steps: ['얼음 → 정수 → 샷', '크림을 천천히 올려요', '시나몬 살짝'],
    memo: '크림은 당일 만든 것만',
  }),
  D({
    id: 'latte',
    name: '카페라떼',
    category: '라떼',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['에스프레소', '2샷'],
      ['우유', '220ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['얼음 → 우유 → 샷 순서', '층이 보이게 천천히 부어요'],
  }),
  D({
    id: 'vani',
    name: '바닐라라떼',
    category: '라떼',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['바닐라 시럽', '2펌프'],
      ['에스프레소', '2샷'],
      ['우유', '200ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['시럽을 먼저 넣어요', '얼음 → 우유 → 샷'],
  }),
  D({
    id: 'stl',
    name: '딸기라떼',
    category: '라떼',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['딸기청', '3스푼'],
      ['우유', '200ml'],
      ['얼음', '반 컵'],
    ],
    steps: ['딸기청 3스푼을 바닥에', '얼음 반 컵', '우유를 천천히 부어 층을 만들어요'],
    memo: '딸기청은 매일 아침 확인',
    isNew: true,
  }),
  D({
    id: 'mat',
    name: '말차라떼',
    category: '라떼',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['말차 파우더', '2스푼'],
      ['뜨거운 물', '30ml'],
      ['우유', '200ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['파우더를 물에 먼저 개요', '얼음 → 우유 → 말차'],
  }),
  D({
    id: 'sta',
    name: '딸기 에이드',
    category: '에이드',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['딸기 베이스', '2펌프'],
      ['탄산수', '200ml'],
      ['얼음', '300ml 컵'],
    ],
    steps: ['베이스 2펌프', '얼음을 채워요', '탄산수를 천천히 부어요'],
    memo: '탄산수는 냉장고 맨 아래',
  }),
  D({
    id: 'lem',
    name: '레몬 에이드',
    category: '에이드',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['레몬청', '3스푼'],
      ['탄산수', '200ml'],
      ['얼음', '컵 가득'],
      ['레몬 슬라이스', '1장'],
    ],
    steps: ['청 → 얼음 → 탄산수', '레몬 슬라이스로 마무리'],
  }),
  D({
    id: 'gra',
    name: '자몽 에이드',
    category: '에이드',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['자몽청', '3스푼'],
      ['탄산수', '200ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['청 → 얼음 → 탄산수'],
  }),
  D({
    id: 'sts',
    name: '딸기 스무디',
    category: '스무디',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['냉동 딸기', '150g'],
      ['우유', '120ml'],
      ['요거트 파우더', '1스푼'],
      ['얼음', '1컵'],
    ],
    steps: ['블렌더에 모두 넣어요', '2번 버튼 40초'],
  }),
  D({
    id: 'man',
    name: '망고 스무디',
    category: '스무디',
    temp: 'ICE',
    size: '16oz',
    ingredients: [
      ['냉동 망고', '150g'],
      ['우유', '120ml'],
      ['얼음', '1컵'],
    ],
    steps: ['블렌더 2번 버튼 40초'],
  }),
  D({
    id: 'earl',
    name: '얼그레이',
    category: '티',
    temp: 'HOT',
    size: '12oz',
    ingredients: [
      ['얼그레이 티백', '1개'],
      ['뜨거운 물', '300ml'],
    ],
    steps: ['물 먼저, 티백은 나중에', '3분 뒤 티백 빼서 드려요'],
  }),
  D({
    id: 'cham',
    name: '캐모마일',
    category: '티',
    temp: 'HOT',
    size: '12oz',
    ingredients: [
      ['캐모마일 티백', '1개'],
      ['뜨거운 물', '300ml'],
    ],
    steps: ['물 → 티백', '4분 우려요'],
  }),
  D({
    id: 'yuja',
    name: '유자차',
    category: '티',
    temp: 'HOT',
    size: '12oz',
    ingredients: [
      ['유자청', '3스푼'],
      ['뜨거운 물', '280ml'],
    ],
    steps: ['청 → 물', '잘 저어서 드려요'],
  }),
  D({
    id: 'crof',
    name: '크로플',
    category: '디저트',
    temp: 'DESSERT',
    size: '1개',
    ingredients: [
      ['생지', '1개'],
      ['와플기', '3분'],
      ['슈가파우더', '살짝'],
    ],
    steps: ['와플기 예열 확인', '3분 굽고 슈가파우더'],
  }),
  D({
    id: 'basq',
    name: '바스크 치즈케이크',
    category: '디저트',
    temp: 'DESSERT',
    size: '1조각',
    ingredients: [
      ['케이크', '1조각'],
      ['포크', '1개'],
    ],
    steps: ['쇼케이스 2단에서 꺼내요', '접시에 담아 드려요'],
  }),
  A({
    id: 'a_ame',
    name: '아메리카노',
    category: '커피',
    temp: 'ICE',
    size: '20oz',
    ingredients: [
      ['에스프레소', '3샷'],
      ['정수', '300ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['얼음 → 정수 → 샷'],
    memo: '이 매장은 기본 3샷이에요',
  }),
  A({
    id: 'a_dirty',
    name: '더티 커피',
    category: '커피',
    temp: 'HOT',
    size: '8oz',
    ingredients: [
      ['리스트레토', '2샷'],
      ['차가운 우유', '120ml'],
    ],
    steps: ['우유를 먼저 잔에', '샷을 위에 바로 내려요'],
  }),
  A({
    id: 'a_latte',
    name: '카페라떼',
    category: '라떼',
    temp: 'ICE',
    size: '20oz',
    ingredients: [
      ['에스프레소', '2샷'],
      ['우유', '280ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['얼음 → 우유 → 샷'],
  }),
  A({
    id: 'a_bs',
    name: '흑당 라떼',
    category: '라떼',
    temp: 'ICE',
    size: '20oz',
    ingredients: [
      ['흑당 시럽', '3펌프'],
      ['우유', '250ml'],
      ['에스프레소', '2샷'],
      ['얼음', '컵 가득'],
    ],
    steps: ['컵 벽에 시럽을 둘러요', '얼음 → 우유 → 샷'],
    isNew: true,
  }),
  A({
    id: 'a_lem',
    name: '레몬 에이드',
    category: '에이드',
    temp: 'ICE',
    size: '20oz',
    ingredients: [
      ['레몬청', '4스푼'],
      ['탄산수', '250ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['청 → 얼음 → 탄산수'],
  }),
  A({
    id: 'a_earl',
    name: '밀크티',
    category: '티',
    temp: 'ICE',
    size: '20oz',
    ingredients: [
      ['밀크티 베이스', '80ml'],
      ['우유', '200ml'],
      ['얼음', '컵 가득'],
    ],
    steps: ['베이스 → 얼음 → 우유'],
  }),
]

export function storeRecipes(storeId: string) {
  return recipes.filter((recipe) => recipe.storeId === storeId)
}
