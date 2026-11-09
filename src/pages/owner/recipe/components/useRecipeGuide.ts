import { useState } from 'react'

// 매장 정보 › 레시피 첫 안내를 볼지 (RecipeGuide). 본 기록은 이 브라우저에만 남긴다

const SEEN_KEY = 'owner-recipe-guide-seen'

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/** 안내를 볼지 · 닫기. 안내가 떠 있는 동안 화면이 두 버튼을 강조한다 */
export function useRecipeGuide() {
  const [seen, setSeen] = useState(readSeen)
  const dismiss = () => {
    setSeen(true)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // 저장을 못 해도 이번에는 닫는다
    }
  }
  return { show: !seen, dismiss }
}

/** 안내 중일 때 실제 버튼에 붙이는 강조 테두리 */
export const GUIDE_HIGHLIGHT = 'ring-[3px] ring-[#E8C66A] ring-offset-2 animate-pulse'
