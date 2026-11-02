# WOOWANGTHON_TEAM_13_FE

2026 AI 우왕톤 13팀 F4의 프론트엔드 저장소입니다.

개인 카페 신입 알바생이 매뉴얼을 쉽게 익히고, 근무 중 질문에 답을 받는 **AI 사수**의 웹 앱(PWA)입니다.

## 시작하기

```bash
npm install
cp .env.example .env   # 값은 디스코드 DM으로 공유받아 채웁니다
npm run dev            # http://localhost:5173
```

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 검사 + 배포용 빌드 |
| `npm run lint` | 코드 검사 (ESLint) |
| `npm run format` | 코드 모양 정리 (Prettier) |
| `npm run api` | BE Swagger로 API 함수 자동 생성 (`src/api/generated/`) |

## 기술 스택

React 19 · Vite · TypeScript · React Router · TanStack Query · Zustand · Supabase JS(카카오·구글 로그인) · Kakao JS SDK · PWA · Tailwind CSS · shadcn/ui · ESLint/Prettier · orval · Vercel

## 프로젝트 구조

```text
WOOWANGTHON_TEAM_13_FE/
├── CLAUDE.md              # 작업 규칙 (AI · 사람 모두 작업 전에 읽기)
├── docs/                  # 서비스 개요 · 우선순위 · 시나리오 · 화면/주소 · 로그인/API · 디자인 규칙
├── public/                # 아이콘 등 정적 파일
└── src/
    ├── main.tsx           # 앱 진입점
    ├── index.css          # 전역 스타일
    ├── app/               # App · providers · router · guards
    ├── lib/               # env · auth(Supabase) · authStore · storeStore · apiClient · kakao · format
    ├── api/
    │   ├── generated/     # orval 자동 생성 (직접 수정 금지)
    │   └── mocks/         # BE 연결 전 가짜 데이터 (staff / owner)
    ├── ui/                # 디자인 시스템 공용 부품
    ├── shared/            # 사장 · 알바 화면이 같이 쓰는 보기용 부품 (recipe · manual · handover · store)
    └── pages/
        ├── auth/          # 로그인 · 로그인 처리 · 역할 선택
        ├── staff/         # 알바생 화면 (/staff/...)
        └── owner/         # 사장님 화면 (/owner/...)
```

## 역할 분담

| 담당 | 범위 | 폴더 |
| --- | --- | --- |
| 민지 (`@ryu-min-ji`) | 공통 뼈대 · 알바생 화면 (채팅 · 매뉴얼·레시피 조회 · 인수인계) | `app/` `lib/` `shared/` `pages/auth/` `pages/staff/` |
| 나현 (`@nahyun2`) | 디자인 시스템 · 사장님 화면 | `ui/` `index.css` `public/` `pages/owner/` |

- 남의 폴더는 수정하지 않고 가져다 쓰기(import)만 합니다. 폴더 주인은 `.github/CODEOWNERS`에 있습니다.
- 자세한 규칙은 [`CLAUDE.md`](./CLAUDE.md)와 [`docs/`](./docs)를 확인해 주세요.

## 브랜치 전략

- `main`: 배포용 · `dev`: 합치는 곳 · `feat/staff-chat`, `feat/owner-recipe`: 기능 브랜치
- 작업 전 `git pull origin dev` → 기능 브랜치에서 작업 → `dev`로 PR → 서로 리뷰 후 merge

## 커밋 규칙

커밋 메시지는 다음 형식을 사용합니다.

```text
<type>: <변경 내용>
```

| Type | 설명 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 포맷팅, 세미콜론 누락 등 코드 동작에 영향을 주지 않는 변경 |
| `refactor` | 기능 변경이 없는 코드 리팩터링 |
| `test` | 누락된 테스트 추가 또는 기존 테스트 수정 |
| `chore` | 라이브러리 추가 등 빌드 프로세스 또는 보조 도구 변경 |
| `perf` | 성능 향상 관련 변경 |
| `build` | 빌드 관련 파일 변경 |

예시:

```text
feat: 사용자 회원가입 API 추가
fix: 일정 조회 시 시간대 변환 오류 수정
docs: API 실행 방법 추가
test: health check API 테스트 추가
chore: FastAPI 의존성 추가
```

### 작성 원칙

- 커밋 타입은 소문자로 작성합니다.
- 타입 뒤에 콜론과 공백을 넣습니다.
- 변경 내용을 짧고 명확하게 작성합니다.
- 하나의 커밋에는 하나의 논리적인 변경만 포함합니다.
