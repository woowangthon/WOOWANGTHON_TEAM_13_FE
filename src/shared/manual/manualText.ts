// 공용: 매뉴얼 글 다루기 (카드 미리보기 · 비밀번호 찾기) — 담당: 민지

/** 내용에서 "비밀번호 ○○○"를 찾는다 (와이파이 · 화장실). "비밀번호 없음"이면 null */
export function findPassword(body: string) {
  const value = body.match(/비밀번호\s*[:：]?\s*([^\s·,]+)/)?.[1]
  return value && value !== '없음' ? value : null
}

/** "1) " · "1. " · "- " 같은 앞 번호 · 글머리표 */
const LEADING_MARK = /^\s*(?:\d+[).]|[-•·*])\s*/
/** 한 줄 안에 이어 쓴 다음 번호 (" 2) " · " 3. ") */
const NEXT_NUMBER = /\s+\d+[).]\s+/

/**
 * 카드 미리보기: 번호를 빼고 첫 줄(첫 단계)만. 단계가 여러 개면 "외 N단계"
 * 예) "1) 불·음악 켜기 2) 머신 예열 15분 3) 우유 확인" → "불·음악 켜기 외 2단계"
 */
export function manualPreview(body: string) {
  const { lines, numbered } = manualLines(body)
  const first = lines[0] ?? ''
  return numbered && lines.length > 1 ? `${first} 외 ${lines.length - 1}단계` : first
}

/**
 * 내용을 줄(단계)로 나눈다. 번호 · 글머리표는 뺀다. numbered: 번호 · 글머리표로 시작하는 글인지
 * 예) "1) 불·음악 켜기 2) 머신 예열 15분" → { lines: ['불·음악 켜기', '머신 예열 15분'], numbered: true }
 */
export function manualLines(body: string) {
  const lines = body
    .split(/\n+/)
    .flatMap((line) => (LEADING_MARK.test(line) ? line.split(NEXT_NUMBER) : [line]))
    .map((line) => line.replace(LEADING_MARK, '').trim())
    .filter(Boolean)
  return { lines, numbered: LEADING_MARK.test(body) }
}
