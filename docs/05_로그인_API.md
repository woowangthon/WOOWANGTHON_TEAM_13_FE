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

### 진짜 API / 가짜 서버 스위치 (`VITE_REAL_API`)
BE API가 기능별로 하나씩 나오니, **기능마다** 진짜 API와 가짜 서버를 골라 쓴다.

| `.env` | 동작 |
| --- | --- |
| `VITE_REAL_API=` (비움, 기본) | 모두 가짜 서버 (`src/api/mocks/staff/api/`) |
| `VITE_REAL_API=users,invitations` | 적은 기능만 진짜 API, 나머지는 가짜 서버 |
| `VITE_REAL_API=all` | 모두 진짜 API |

- 기능 이름 = `src/lib/api/`의 훅 파일 이름: `users`(내 정보 · 내 매장) · `invitations`(초대코드) · `recipes` · `manuals` · `assistantChat`(AI 채팅) · `handover`(인수인계) · `schedule`(내 근무표) · `availability`(근무 가능 시간) · `payroll`(급여) · 사장님 화면: `stores`(매장 만들기 · 수정) · `members`(직원 목록 · 시급)
- 진짜 API는 `apiFetch`로 **docs/07 경로**를 부른다 (`VITE_API_URL`(`…/api/v1`) + 경로, Supabase 토큰 자동). 고르는 곳: `src/lib/api/source.ts` `isRealApi`
- BE 서버가 꺼져 있는데 켜면 "서버에 연결하지 못했어요" 토스트가 뜬다 (API 공통 처리)
- `.env`를 바꾸면 개발 서버를 다시 켠다 (`npm run dev`). 개발 중에는 콘솔에 진짜 API 목록이 찍히고, 이름을 잘못 적으면 경고가 뜬다
- 예상 급여(`payroll`)는 BE PR #28(`GET /payroll/estimates/me?month=`)에 맞춰 뒀다 (main에 합쳐지면 켜기). 급여 설정은 사장님이 정하고 알바 화면은 보기 전용 (docs/07 질문 4). 근무 가능 시간은 `availability`로 따로 켠다
- 내 근무표(`schedule`)는 BE PR #24에 맞춰 뒀다. main에 합쳐지기 전에 켜도 404면 빈 근무표("아직 확정된 근무가 없어요")로 보여서 깨지지 않는다
- 주의: `users`를 켜면 로그인 후 `GET /users/me`도 진짜로 부른다 → BE에 사용자가 있어야 `/role` · 알바 화면으로 들어갈 수 있다

## 환경 변수 (`.env.example` 참고)
| 이름 | 뜻 |
| --- | --- |
| `VITE_API_URL` | BE API 주소 — `/api/v1`까지 적는다 (예: `http://localhost:8000/api/v1`). BE는 모든 경로가 `/api/v1` 아래 |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 로그인 |
| `VITE_KAKAO_JS_KEY` | 카카오 JavaScript 키 (카톡 공유) |
| `VITE_SKIP_AUTH` | `true`면 로그인 없이 모든 화면 확인 (로컬 개발용) |
| `VITE_REAL_API` | 진짜 API로 부를 기능 (쉼표 구분 · `all`). 비우면 모두 가짜 서버 — 위 "진짜 API / 가짜 서버 스위치" |

## BE에 요청한 것
- CORS에 `http://localhost:5173` (배포 후 Vercel 주소도) 추가
- Swagger(`/docs`, `/openapi.json`) 주소 공유
