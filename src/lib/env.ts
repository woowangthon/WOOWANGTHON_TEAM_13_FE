// .env 값을 한곳에서 읽는다. 다른 파일은 import.meta.env 대신 이 객체를 쓴다.
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  kakaoJsKey: import.meta.env.VITE_KAKAO_JS_KEY ?? '',
  skipAuth: import.meta.env.VITE_SKIP_AUTH === 'true',
  /** 진짜 API 로 부를 기능 (VITE_REAL_API=users,invitations · all). 나머지는 가짜 서버 */
  realApi: new Set(
    String(import.meta.env.VITE_REAL_API ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  ),
}
