# 05. 로그인 · API

## 로그인 방식 (11/2 은교 결정)
**Supabase Auth(카카오 · 구글) + FastAPI 토큰 검증 + PostgreSQL 사용자 저장**

1. FE: [카카오로 시작하기] → `signIn('kakao')` (`src/lib/auth.ts`) → Supabase가 로그인 처리
2. FE: 로그인 성공 → `/auth/callback` → Supabase `access_token` 보관
3. FE → BE: 모든 요청에 `Authorization: Bearer <access_token>` (`src/lib/apiClient.ts`가 자동으로 붙임)
4. BE: 토큰 확인 → PostgreSQL에서 사용자 찾기 (없으면 생성)
5. FE: `GET /me` → 매장이 없으면 `/role` / 있으면 역할에 맞는 홈(`/staff`, `/owner`)

| 담당 | 할 일 |
| --- | --- |
| 은교 (BE) | Supabase 프로젝트 · 카카오 · 구글 로그인 설정 · 토큰 확인 · `GET /me` |
| 민지 (FE) | `lib/auth.ts` · `lib/apiClient.ts` · 로그인 · 콜백 · 역할 선택 화면 |

### 주의
- 카카오는 **닉네임만** → Supabase 카카오 설정에서 "이메일 없는 사용자 허용" 켜기
- 카카오 · 구글 콘솔에는 Supabase 콜백 주소, Supabase에는 FE 주소(`http://localhost:5173`, Vercel 주소) 등록
- FE에는 **Project URL · publishable key(sb_publishable_…)만**. service_role · secret 키는 절대 넣지 않는다. 키는 디스코드 DM으로만 공유

### 남은 일
- [x] Supabase Project URL · publishable key 공유 (은교 → 민지, 11/3) → `.env`에 넣기
- [ ] `GET /me` 응답 형태 확정 (닉네임 · 소속 매장 · 매장별 역할) → `src/lib/authStore.ts`의 `Me` 타입 맞추기

## API 사용
- BE가 Swagger를 띄우면 `npm run api` → `src/api/generated/`에 API 함수 · 타입 · TanStack Query 훅이 자동 생성된다
  - 주소가 기본값(`http://localhost:8000/openapi.json`)과 다르면 `OPENAPI_URL=<주소> npm run api`
  - 생성된 파일은 **직접 수정하지 않는다**. BE가 바뀌면 다시 생성
- 자동 생성 전이나 BE가 없을 때는 `src/api/mocks/<내 폴더>/`의 가짜 데이터로 화면을 만든다
- 화면에서 `fetch`를 직접 쓰지 않는다. 필요하면 `apiFetch`(`src/lib/apiClient.ts`)

## 환경 변수 (`.env.example` 참고)
| 이름 | 뜻 |
| --- | --- |
| `VITE_API_URL` | BE 서버 주소 |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 로그인 |
| `VITE_KAKAO_JS_KEY` | 카카오 JavaScript 키 (카톡 공유) |
| `VITE_SKIP_AUTH` | `true`면 로그인 없이 모든 화면 확인 (로컬 개발용) |

## BE에 요청한 것
- CORS에 `http://localhost:5173` (배포 후 Vercel 주소도) 추가
- Swagger(`/docs`, `/openapi.json`) 주소 공유
