// 초대코드 형식: 영어 대문자 · 숫자 6자리

export const CODE_LENGTH = 6

/** 대문자로 바꾸고 영어 · 숫자만 6자리까지 */
export function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)
}
