import { storeManuals } from '@/api/mocks/staff/manuals'
import { storeRecipes } from '@/api/mocks/staff/recipes'

// 가짜 데이터: AI 사수 채팅 — BE 연결 전까지 사용. 답변은 매장 매뉴얼 · 레시피에서만 찾는다.

export type ChatSource = { kind: 'recipe' | 'manual'; id: string; label: string }

export type ChatMessage =
  | { who: 'me'; text: string }
  | { who: 'ai'; text: string; source?: ChatSource; askOwner?: boolean; asked?: boolean }
  | { who: 'owner'; text: string }
  | { who: 'system'; text: string }
  | { who: 'typing' }

export const initialChats: Record<string, ChatMessage[]> = {
  dalbit: [
    { who: 'ai', text: '무엇이 궁금하세요?' },
    { who: 'me', text: '딸기라떼 딸기청 몇 스푼이야?' },
    {
      who: 'ai',
      text: '3스푼 · 우유 200ml · 얼음 반 컵',
      source: { kind: 'recipe', id: 'stl', label: '레시피 › 딸기라떼' },
    },
  ],
  afternoon: [{ who: 'ai', text: '무엇이 궁금하세요?' }],
}

export const NOT_FOUND_TEXT = '매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요.'
export const OWNER_ANSWER = '창고 우산 빌려드리고 연락처 받아 둬. 다음에 오실 때 돌려받으면 돼요.'

/** 마지막 글자에 받침이 있나 (숫자 · 영어는 읽는 소리 기준: 200ml → 엘, 3 → 삼). 끝의 (괄호)는 빼고 본다: 2샷 (40ml) → 샷 */
function hasBatchim(word: string) {
  const last = word.replace(/\s*\([^)]*\)\s*$/, '').trim().at(-1) ?? ''
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  if (/[013678]/.test(last)) return true // 영 일 삼 육 칠 팔
  return /[lmnr]/i.test(last)
}

/** 받침에 맞는 조사: "흑임자 라떼는" · "딸기청은" */
const topic = (word: string) => `${word}${hasBatchim(word) ? '은' : '는'}`
/** 받침에 맞는 끝말: "3스푼이에요" · "반 컵이에요" · "1개예요" */
const isIt = (word: string) => `${word}${hasBatchim(word) ? '이에요' : '예요'}`

export function mockAnswer(storeId: string, question: string, umbrellaAdded: boolean): ChatMessage {
  const t = question.replace(/\s/g, '')

  if (/날씨|점심|노래|연애/.test(t)) {
    return { who: 'ai', text: '매장 업무 질문에만 답할 수 있어요.' }
  }

  const recipes = storeRecipes(storeId)
  const recipe = recipes.find(
    (r) => t.includes(r.name.replace(/\s/g, '')) || (r.id === 'stl' && /딸기청/.test(t)),
  )
  if (recipe) {
    const parts = recipe.ingredients.map(([name, amount]) => `${name} ${amount}`).join(', ')
    return {
      who: 'ai',
      text: `${topic(recipe.name)} ${isIt(parts)}.${recipe.memo ? ` ${recipe.memo}.` : ''}`,
      source: { kind: 'recipe', id: recipe.id, label: `레시피 › ${recipe.name}` },
    }
  }

  const manual = storeManuals(storeId, umbrellaAdded).find((m) =>
    m.keywords.some((k) => t.includes(k.replace(/\s/g, ''))),
  )
  if (manual) {
    return {
      who: 'ai',
      text: manual.answer,
      source: { kind: 'manual', id: manual.id, label: `매뉴얼 › ${manual.title}` },
    }
  }

  if (/샷/.test(t) && recipes[0]) {
    const first = recipes[0]
    return {
      who: 'ai',
      text: `${topic(first.name)} ${isIt(first.ingredients[0][1])}.`,
      source: { kind: 'recipe', id: first.id, label: `레시피 › ${first.name}` },
    }
  }

  return { who: 'ai', text: NOT_FOUND_TEXT, askOwner: true }
}
