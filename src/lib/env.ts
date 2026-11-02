// .env 값을 한곳에서 읽는다. 다른 파일은 import.meta.env 대신 이 객체를 쓴다.
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  kakaoJsKey: import.meta.env.VITE_KAKAO_JS_KEY ?? '',
  skipAuth: import.meta.env.VITE_SKIP_AUTH === 'true',
}
