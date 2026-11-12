// 레시피 단계별 코치마크(RecipeGuide)의 단계 데이터 · 본 기록 — 단계를 늘리려면 RECIPE_GUIDE_STEPS 에 추가
// 본 기록은 이 브라우저(localStorage)에만. 계정 단위 저장은 BE 에 칸이 생기면 (users/me 설정 등)

export interface GuideStep {
  /** 강조할 요소의 data-guide 값 */
  target: string
  /** 단계 이름 (예: 사진으로 추가) */
  label: string
  title: string
  body: string
  /** 말풍선 자리 (화면 밖으로 나가면 반대편으로 뒤집는다) */
  placement: 'top' | 'bottom'
}

export const RECIPE_GUIDE_STEPS: GuideStep[] = [
  {
    target: 'camera',
    label: '사진으로 추가',
    title: '종이 레시피를 찍어보세요',
    body: 'AI가 메뉴·재료를 채워 줘요. 여러 메뉴도 한 번에 넣을 수 있어요.',
    placement: 'bottom',
  },
  {
    target: 'add',
    label: '직접 추가',
    title: '템플릿으로 빠르게',
    body: '아메리카노·라떼 같은 템플릿을 고르거나 재료와 순서를 직접 써요.',
    placement: 'top',
  },
]

const SEEN_KEY = 'recipeGuideSeen_v1'
/** 저장소를 못 쓰는 브라우저에서도 이번 접속 동안은 다시 안 뜨게 */
let seenInMemory = false

export function hasSeenRecipeGuide() {
  if (seenInMemory) return true
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markRecipeGuideSeen() {
  seenInMemory = true
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // 저장 실패해도 이번에는 닫는다
  }
}
