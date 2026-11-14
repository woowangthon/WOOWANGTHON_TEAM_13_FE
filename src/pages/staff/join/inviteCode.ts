// 초대코드 형식: 영어 대문자 · 숫자 6자리

export const CODE_LENGTH = 6

/** 대문자로 바꾸고 영어 · 숫자만 남긴 뒤 6자리까지 (- · 빈칸 · 한글은 버린다 — 자르기는 정리한 다음) */
export function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)
}
