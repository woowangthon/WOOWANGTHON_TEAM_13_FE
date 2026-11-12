# CLAUDE.md — crewBean FE 작업 규칙

이 파일은 AI(Claude 등)가 이 레포에서 작업하기 전에 **반드시** 읽는 규칙이다. 사람도 똑같이 지킨다.
더 자세한 내용은 `docs/` 폴더를 먼저 확인한다. 규칙을 바꿔야 하면 코드를 고치기 전에 **멈추고 사용자에게 물어본다.**

## 프로젝트 한 줄
**crewBean** — 개인 카페 **신입 알바생**이 매뉴얼을 쉽게 익히고, 근무 중 질문에 답을 받는 웹 앱 (2026 AI 우왕톤 13팀 F4).
그 안의 AI 채팅 기능 이름이 **AI 사수**다: 알바생은 매장 매뉴얼·레시피를 근거로 답하는 **AI 사수 채팅**에 묻고, 근거가 없으면 AI는 지어내지 않고 사장님께 넘긴다.
- 서비스 이름은 `crewBean`(c 소문자 · B 대문자), 하단 탭 · 채팅 화면의 기능 이름은 그대로 "AI 사수"

- 일정: **P0 + P1 → 11/10까지**, 11/15 18:00 제출, 11/21 본선
- BE: FastAPI + PostgreSQL (`woowangthon/WOOWANGTHON_TEAM_13_BE`) · 로그인은 Supabase Auth
- FE 두 명: **민지**(GitHub `ryu-min-ji`), **나현**(GitHub `nahyun2`)

## ⚠️ 가장 중요한 규칙: 폴더 주인
작업을 시작하기 전에 **지금 누구의 작업인지** 확인하고, **그 사람 폴더만** 수정한다.

| 주인 | 폴더 · 파일 |
| --- | --- |
| 🟠 민지 | `src/app/`, `src/lib/`, `src/shared/`, `src/pages/auth/`, `src/pages/staff/`, `src/api/mocks/staff/`, 설정 파일(`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `orval.config.ts`, `.env.example`, `index.html`) |
| 🟣 나현 | `src/ui/`, `src/index.css`, `tailwind` · `shadcn` 설정(`components.json`), `public/`, `src/pages/owner/`, `src/api/mocks/owner/` |
| 🤖 자동 | `src/api/generated/` — `npm run api`로만 만든다. **절대 직접 수정하지 않는다** |

- **남의 폴더는 수정 금지. 가져다 쓰기(import)는 OK.**
  - 예: 사장 화면(나현)은 `src/shared/recipe/RecipeGrid`(민지)를 import해서 쓴다
- 남의 폴더 · 파일을 고쳐야 하면 **코드를 고치지 말고 멈춘 뒤**, 사용자에게 **"○○(폴더 주인)에게 먼저 물어봐 주세요"**라고 말한다. 무엇을 · 왜 고쳐야 하는지 한두 줄로 같이 알려 준다
  - 주인이 OK했다고 사용자가 말해 주기 전에는 고치지 않는다. OK를 받아 고친 PR은 **주인의 승인을 받은 뒤** merge한다
  - `src/ui/`에 새 부품 필요 → 나현에게 요청 / `src/shared/`에 필요 → 민지에게 요청
  - 급하면 **내 폴더 안에 임시 부품**을 만들고, 나중에 주인 폴더로 옮긴다
- **새 라이브러리 설치 금지.** 꼭 필요하면 멈추고 물어본다 (`package.json` 충돌 방지)
- **파일 · 화면 · 주소를 추가 · 삭제 · 이름 변경하면 `docs/04_화면_파일_주소.md`도 같은 PR에서 고친다.** 규칙 · 탭 구성처럼 문서에 적힌 내용이 바뀌면 그 문서(`CLAUDE.md`, `docs/`)도 같이 고친다
- 화면 주소는 **각자 `routes.tsx`에만** 추가한다. `src/app/router.tsx`는 수정하지 않는다
  - 알바 `/staff/...` → `src/pages/staff/routes.tsx` / 사장 `/owner/...` → `src/pages/owner/routes.tsx` / 공통 `/login` `/auth/callback` `/role` → `src/pages/auth/routes.tsx`

## 기술 스택
React 19 · Vite · TypeScript · React Router(`react-router`) · TanStack Query · Zustand · Supabase JS(로그인) · Kakao JS SDK(카톡 공유) · PWA · ESLint/Prettier · orval(API 자동 생성) · Vercel
- 스타일: Tailwind CSS + shadcn/ui + lucide-react (나현이 `src/ui/` 세팅 때 설치 · 설정)
- import는 `@/` 경로를 쓴다: `import { env } from '@/lib/env'`

## 코드 규칙
- 화면 파일: `○○Page.tsx` (default export) / 부품: `PascalCase.tsx` (named export) / 함수 · 변수: `camelCase`
- 서버 호출은 `src/api/generated/`(자동 생성) 또는 `src/lib/apiClient.ts`의 `apiFetch`만 쓴다. `fetch`를 화면에서 직접 쓰지 않는다
- 로그인 관련 코드는 `src/lib/auth.ts`에만 둔다
- 현재 매장은 `useStoreStore`(`src/lib/storeStore.ts`), 로그인 사용자는 `useAuthStore`(`src/lib/authStore.ts`)
- 날짜 · 금액은 `src/lib/format.ts`로만 표시한다 (11/20(금) · 18:00 · 681,120원)
- BE가 준비되기 전에는 `src/api/mocks/<내 폴더>/`의 가짜 데이터로 개발한다. 시연 매장 "달빛 카페", 알바생 "지은 · 민수"
- 비밀 값(.env)은 커밋하지 않는다. `.env.example`에는 이름만

## 화면 · UX 규칙 (`docs/06_디자인_UX_규칙.md`)
- 알바 화면: 모바일 기준(폭 360~430px), 하단 탭 5칸(홈 · 레시피 · ＋ 인수인계 · AI 사수 · 근무, 아이콘 아래 글자) / 사장 화면: 모바일 우선 + 데스크톱(1024px 이상)은 왼쪽 메뉴 + 대시보드 (docs/06)
- 화면 상태 4가지: 로딩 `Spinner` · 데이터 없음 `EmptyState` · 에러 `Toast`(빨강 + 다시 시도) · 성공 `Toast`
- 문구는 "~해요" 존댓말 ("저장했어요", "다시 확인해 주세요"), 버튼은 짧게 (저장 / 취소 / 삭제 / 다음)
- AI 답변에는 항상 **출처**를 보여 주고, 근거가 없으면 "찾지 못했어요" + 사장님께 물어보기

## Git 규칙
- 브랜치: `main`(배포) ← `dev`(합치는 곳) ← `feat/staff-chat`, `feat/owner-recipe` 같은 기능 브랜치
- 작업 전 `git pull origin dev`, PR은 **`dev`로**, 화면 PR엔 스크린샷 1장
- `dev`는 승인 없이 PR 올린 사람이 바로 merge할 수 있다 (내 폴더만 바꾼 PR). **남의 폴더를 바꾼 PR은 주인 승인 후** merge. `main`은 승인 1명 필요
- 커밋: `<type>: <변경 내용>` — `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `build`
  - 예: `feat: 채팅 출처 카드 추가` / 하나의 커밋에는 하나의 논리적인 변경만, **작게 자주** 커밋
- `main` · `dev`에 직접 push하지 않는다

## 작업 전 체크
1. 이번 작업이 누구 파트인지 확인했나? → 그 사람 폴더만
2. `docs/02_기능_우선순위.md`의 P0부터 하고 있나?
3. `docs/04_화면_파일_주소.md`의 파일 이름 · 주소와 같은가?
4. 끝나면 `npm run lint` · `npm run build`가 통과하나?
5. 파일 · 주소를 바꿨다면 `docs/04`도 고쳤나?
