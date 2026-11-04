// 직원마다 순서대로 쓰는 연한 색 4가지 [바탕, 글자] (디자인 사장님 v3)
export const AVATAR_COLORS: [string, string][] = [
  ['#E3E8DC', '#2A4536'],
  ['#F5E6D6', '#8A5630'],
  ['#EDE3E6', '#7A4A5E'],
  ['#E2E7EC', '#3C5468'],
]

export function avatarColors(index: number): [string, string] {
  return AVATAR_COLORS[((index % 4) + 4) % 4]
}
