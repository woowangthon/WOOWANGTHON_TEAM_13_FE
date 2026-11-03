# 07. P0 API 응답 제안 (FE → BE)

FE가 지금 쓰는 **가짜 데이터(`src/api/mocks/staff/`) 모양을 기준으로** P0 API의 요청 · 응답을 제안해요.
이 모양으로 와 주면 FE는 가짜 데이터를 API로 **거의 그대로 바꿔 끼울 수 있어요.** 바꾸고 싶은 곳은 이 문서에 댓글이나 PR로 알려 주세요.

- 받는 사람: 은교(사용자 · 매장 · 초대코드 · 급여 설정), 연서(레시피 · 매뉴얼 · AI 채팅 · 인수인계 · 급여)
- 경로는 **BE API 표 기준**이에요. 표에 없어서 FE가 임시로 붙인 경로 · 쿼리만 **(제안)** 으로 표시했어요
- 로그인 · OAuth 콜백 · 토큰 재발급 · 로그아웃은 Supabase가 해서 BE API가 필요 없어요 (`docs/05`)

## 목차
| # | API | 우선 | 담당 | 가짜 데이터 |
| --- | --- | --- | --- | --- |
| 1 | `GET /users/me` · `PATCH /users/me` · `GET /users/me/stores` | P0 | 은교 | `mocks/staff/me.ts` · `stores.ts` |
| 2 | `POST /invitations/verify` · `POST /memberships/join` | P0 | 은교 | `mocks/staff/join.ts` |
| 3 | 레시피 목록 · 상세 | P0 | 연서 | `mocks/staff/recipes.ts` |
| 4 | 매뉴얼 목록 · 상세 | P0 | 연서 | `mocks/staff/manuals.ts` |
| 5 | AI 채팅방 생성 · 목록, 메시지 전송 · 내역, 사장님께 물어보기 | P0 (사장님 답변 → 매뉴얼 추가는 P1) | 연서 | `mocks/staff/chat.ts` |
| 6 | 인수인계 AI 초안 · 목록 · 등록 · 상세 · 수정 · 삭제 · 확인 | P0 (확인은 [질문 3](#8-be에-확인하고-싶은-것)) | 연서 | `mocks/staff/handovers.ts` |
| 7 | 예상 급여 · 시급 설정 | P1 | 연서 · 은교 | `mocks/staff/payroll.ts` |

---

## 0. 공통 약속

| 항목 | 제안 |
| --- | --- |
| 인증 | 모든 요청에 `Authorization: Bearer <Supabase access_token>` (`docs/05`) |
| 필드 이름 | **camelCase** (`storeId`, `createdAt`). FastAPI면 Pydantic `alias_generator=to_camel` + `populate_by_name=True` 로 바꿀 수 있어요 |
| ID | 문자열 (UUID 등). FE는 숫자로 계산하지 않아요 |
| 날짜 · 시간 | ISO 8601 + 시간대: `"2026-11-20T14:50:00+09:00"`, 날짜만: `"2026-11-20"`. 화면 표시(11/20(금) · 14:50)는 FE가 `lib/format.ts`로 해요 |
| 금액 | 원 단위 정수 (`681120`). "681,120원" 표시는 FE가 해요 |
| 목록 | 배열을 바로 주지 않고 객체로 감싸요 (`{ "recipes": [...] }`) → 나중에 필드를 더해도 FE가 안 깨져요 |
| 없는 값 | 필드를 빼지 말고 `null` |
| 성공 | `200` (조회 · 수정), `201` (생성), `204` (삭제, 본문 없음) |

### 0-1. 에러 응답 모양
모든 에러는 HTTP 상태 코드 + 아래 모양으로 주세요. FE는 `code`로 분기하고, `message`는 그대로 토스트에 보여 줄 수 있어요 ("~해요" 말투).

```json
{
  "code": "INVITE_INVALID",
  "message": "유효하지 않은 코드예요",
  "detail": null
}
```

| 필드 | 뜻 |
| --- | --- |
| `code` | 대문자 영어 상수. FE 분기용 |
| `message` | 사용자에게 보여 줄 한국어 문장 |
| `detail` | 추가 정보 (없으면 `null`). 예: 잠금 해제 시각, 이미 들어간 매장 |

> FastAPI 기본 에러는 `{"detail": ...}` 모양이라, 예외 핸들러로 위 모양에 맞춰 주세요. 입력값 검증 실패(422)도 `VALIDATION_ERROR`로 감싸 주면 좋아요.

공통 에러 코드

| HTTP | code | 언제 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 만료 → FE가 `/login`으로 보내요 |
| 403 | `FORBIDDEN` | 소속되지 않은 매장 데이터 · 권한 없는 수정 |
| 404 | `NOT_FOUND` | 레시피 · 매뉴얼 등이 없음 (삭제됨) |
| 422 | `VALIDATION_ERROR` | 입력값 오류. `detail`에 필드별 이유 |
| 500 | `INTERNAL_ERROR` | 서버 오류 → FE는 "다시 시도" 토스트 |

API별 에러 코드는 각 API 아래에 적었어요.

### 0-2. 출처(source) 모양
AI 답변의 **출처 카드**(`📄 출처: 레시피 › 딸기라떼`)에 쓰는 모양이에요. 채팅 답변에 배열로 들어가요.

```json
{
  "kind": "recipe",
  "id": "rcp_stl",
  "title": "딸기라떼"
}
```

| 필드 | 뜻 |
| --- | --- |
| `kind` | `"recipe"` 또는 `"manual"` |
| `id` | 레시피 · 매뉴얼 ID. FE는 카드를 누르면 `/staff/recipes/:id` · `/staff/manuals/:id`로 이동해요 |
| `title` | 레시피 이름 · 매뉴얼 제목. FE가 `"레시피 › " + title`로 표시해요 |

> 가짜 데이터는 `label: "레시피 › 딸기라떼"`를 통째로 갖고 있는데, 화면 문구는 FE가 만들도록 `title`만 받는 쪽을 제안해요.

---

## 1. 사용자

> 처음 로그인한 사용자를 어디서 만드는지는 [질문 1](#8-be에-확인하고-싶은-것)에 적었어요. `GET /users/me`에서 없으면 자동으로 만들어 줘도 FE는 괜찮아요.

### 1-1. `GET /users/me`
로그인 사용자 + 소속 매장 · 역할. FE는 `stores`가 비어 있으면 `/role`, 있으면 역할 홈(`/staff`, `/owner`)으로 보내요.

응답 `200`
```json
{
  "userId": "usr_8f2c",
  "nickname": "지은",
  "provider": "kakao",
  "stores": [
    { "storeId": "str_dalbit", "storeName": "달빛 카페", "role": "staff" },
    { "storeId": "str_afternoon", "storeName": "오후의 커피", "role": "staff" }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `nickname` | 카카오는 닉네임, 구글은 이름 (`docs/05`: 카카오는 닉네임만) |
| `provider` | `"kakao"` · `"google"` (역할 선택 화면 상단 표시) |
| `stores[].role` | `"owner"` · `"staff"`. 한 사람이 매장마다 다른 역할일 수 있어요 |

> FE 타입: `src/lib/authStore.ts`의 `Me` — 이 모양으로 확정되면 그대로 써요.

### 1-2. `PATCH /users/me`
마이페이지에서 이름(닉네임) 바꾸기.

요청
```json
{ "nickname": "박지은" }
```

응답 `200` — [1-1](#1-1-get-usersme)과 같은 모양
```json
{
  "userId": "usr_8f2c",
  "nickname": "박지은",
  "provider": "kakao",
  "stores": [{ "storeId": "str_dalbit", "storeName": "달빛 카페", "role": "staff" }]
}
```
- 에러: `422 VALIDATION_ERROR` (빈 이름 · 너무 긴 이름)

### 1-3. `GET /users/me/stores`
알바 화면 상단 **매장 전환**(n잡) · 홈 · 마이페이지에 쓰는 매장 정보.

응답 `200`
```json
{
  "stores": [
    {
      "storeId": "str_dalbit",
      "name": "달빛 카페",
      "kind": "카페",
      "address": "서울 마포구 와우산로21길 8",
      "ownerName": "박 사장님",
      "role": "staff",
      "memberId": "mbr_31",
      "staffName": "지은",
      "photoUrl": "https://…/stores/dalbit.jpg",
      "theme": "moon",
      "joinedAt": "2026-11-03T22:40:00+09:00"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `memberId` | 이 매장에서의 내 구성원 ID (시급 설정 등 사장님 기능에서 쓰는 ID) |
| `staffName` | 사장님이 알바생 추가 때 적은 이름 (사장님 매장이면 `null`) |
| `photoUrl` | 매장 사진. 없으면 `null` → FE가 매장 색으로 채워요 |
| `theme` | 매장 색 · 아이콘 묶음 키: `"moon"`(초록) · `"sunset"`(갈색). 색 값(#2A4536 등)은 FE 디자인 토큰에서 정해요. 저장할 곳이 없으면 `null`이어도 돼요 (FE가 순서대로 배정) |

> 가짜 데이터의 `shift` · `week` · `weekHours`(근무)는 P1 스케줄 API, `chips`(자주 묻는 질문)는 [5-1 채팅방](#5-1-ai-채팅방-생성--목록)의 `suggestions`로 옮겼어요.

---

## 2. 초대코드

### 2-1. `POST /invitations/verify`
초대코드 확인. **입장은 하지 않고** 어느 매장 · 누구 자리인지만 알려 줘요 (화면: 매장 카드 "박 사장님 · 지은 님 자리").

요청
```json
{ "code": "K7P2QX" }
```
- FE가 대문자 · 영어/숫자 6자리로 맞춰서 보내요

응답 `200`
```json
{
  "code": "K7P2QX",
  "staffName": "지은",
  "store": {
    "storeId": "str_dalbit",
    "name": "달빛 카페",
    "ownerName": "박 사장님",
    "photoUrl": "https://…/stores/dalbit.jpg"
  }
}
```

에러
| HTTP | code | message (예) | detail |
| --- | --- | --- | --- |
| 404 | `INVITE_INVALID` | 유효하지 않은 코드예요 | `{ "remainingAttempts": 3 }` (선택) |
| 409 | `INVITE_ALREADY_JOINED` | 이미 들어간 매장이에요 | `{ "storeId": "str_dalbit", "storeName": "달빛 카페" }` ← **필수** ([○○로 가기] 버튼) |
| 410 | `INVITE_REVOKED` | 사장님이 삭제한 코드예요 | `null` |
| 429 | `INVITE_LOCKED` | 5번 틀려서 10분 동안 입력할 수 없어요 | `{ "lockedUntil": "2026-11-20T15:00:00+09:00" }` |

> 틀린 횟수 세기 · 10분 잠금은 BE에서 해 주세요 (docs/03 A1). FE는 `INVITE_LOCKED`를 받으면 입력을 막는 자리만 있어요.

### 2-2. `POST /memberships/join`
초대코드로 매장 입장. 성공하면 FE는 `GET /users/me`를 다시 불러요.

요청
```json
{ "code": "K7P2QX" }
```

응답 `201`
```json
{
  "storeId": "str_dalbit",
  "storeName": "달빛 카페",
  "memberId": "mbr_31",
  "role": "staff",
  "staffName": "지은",
  "joinedAt": "2026-11-20T09:12:00+09:00"
}
```

에러: [2-1](#2-1-post-invitationsverify)과 같은 코드 (`INVITE_INVALID` · `INVITE_ALREADY_JOINED` · `INVITE_REVOKED` · `INVITE_LOCKED`)

---

## 3. 레시피

### 3-1. `GET /stores/{storeId}/recipes`
포스기처럼 **카테고리 탭 → 메뉴 격자**. 매장당 메뉴가 수십 개라 한 번에 다 받고, 검색(메뉴 · 재료 이름)은 FE에서 해요.

응답 `200`
```json
{
  "categories": [
    { "name": "커피", "count": 2 },
    { "name": "라떼", "count": 4 },
    { "name": "에이드", "count": 2 },
    { "name": "스무디", "count": 1 },
    { "name": "티", "count": 2 },
    { "name": "디저트", "count": 1 }
  ],
  "defaultCategory": "라떼",
  "recipes": [
    {
      "recipeId": "rcp_stl",
      "name": "딸기라떼",
      "category": "라떼",
      "temp": "ICE",
      "size": "16oz",
      "ingredients": [
        { "name": "딸기청", "amount": "3스푼" },
        { "name": "우유", "amount": "200ml" },
        { "name": "얼음", "amount": "반 컵" }
      ],
      "isNew": true,
      "updatedAt": "2026-11-20T09:30:00+09:00"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `categories` | 사장님이 정한 순서대로 (탭 순서) |
| `defaultCategory` | 레시피 탭을 처음 열 때 고를 카테고리. 없으면 `null` → 첫 카테고리 |
| `temp` | `"ICE"` · `"HOT"` · `"DESSERT"` |
| `ingredients` | 목록에도 넣어 주세요 → 재료 검색 · "재료 N가지" 표시 |
| `isNew` | 최근 등록 · 수정 (기준은 BE가 정해 주세요, 예: 3일 이내) |

> 가짜 데이터는 재료를 `["딸기청", "3스푼"]` 배열로 갖고 있는데, API는 `{ name, amount }` 객체를 제안해요.

### 3-2. `GET /stores/{storeId}/recipes/{recipeId}`
응답 `200` — 목록 항목 + 순서 · 메모
```json
{
  "recipeId": "rcp_stl",
  "name": "딸기라떼",
  "category": "라떼",
  "temp": "ICE",
  "size": "16oz",
  "ingredients": [
    { "name": "딸기청", "amount": "3스푼" },
    { "name": "우유", "amount": "200ml" },
    { "name": "얼음", "amount": "반 컵" }
  ],
  "steps": ["딸기청 3스푼을 바닥에", "얼음 반 컵", "우유를 천천히 부어 층을 만들어요"],
  "memo": "딸기청은 매일 아침 확인",
  "isNew": true,
  "updatedAt": "2026-11-20T09:30:00+09:00"
}
```
- `memo` 없으면 `null`
- 에러: `404 NOT_FOUND` (삭제된 레시피 → FE는 목록으로 돌아가요), `403 FORBIDDEN`

---

## 4. 매뉴얼

### 4-1. `GET /stores/{storeId}/manuals`
바둑판 카드. 새 카드는 NEW.

응답 `200`
```json
{
  "manuals": [
    {
      "manualId": "man_umb",
      "icon": "umbrella",
      "title": "우산 대여",
      "body": "창고 우산을 빌려드리고 연락처를 받아 둬요.",
      "isNew": true,
      "updatedAt": "2026-11-20T19:43:00+09:00"
    },
    {
      "manualId": "man_wifi",
      "icon": "wifi",
      "title": "와이파이",
      "body": "dalbit_5G · 비밀번호 moon2026",
      "isNew": false,
      "updatedAt": "2026-11-15T10:00:00+09:00"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `icon` | 템플릿 키: `wifi` · `restroom` · `open` · `close` · `delivery` · `refund` · `milk` · `umbrella` · 직접 추가는 `null` (FE가 메모 아이콘) |
| `body` | 카드는 두 줄만 보여 주지만 전체를 줘도 돼요 (FE가 자름) |
| 순서 | 최신 수정 순 (새 매뉴얼이 맨 앞) |

> 가짜 데이터의 `keywords` · `answer`는 FE가 AI 답변을 흉내 내려고 넣은 값이라 API에는 필요 없어요.

### 4-2. `GET /stores/{storeId}/manuals/{manualId}`
응답 `200` — 목록 항목과 같은 모양 (`body` 전체)
```json
{
  "manualId": "man_open",
  "icon": "open",
  "title": "오픈 순서",
  "body": "1) 불·음악 켜기 2) 머신 예열 15분 3) 우유·청 유통기한 확인 4) 쇼케이스 채우기",
  "isNew": false,
  "updatedAt": "2026-11-15T10:00:00+09:00"
}
```
- 에러: `404 NOT_FOUND`, `403 FORBIDDEN`

---

## 5. AI 사수 채팅
**지금 매장의 매뉴얼 · 레시피만 근거로** 답하고, 근거가 없으면 지어내지 않고 **사장님께 넘겨요** (`CLAUDE.md`, `docs/01`, `docs/03` A3). n잡이어도 다른 매장 자료는 절대 섞지 않아요.

| 기능 | 우선 |
| --- | --- |
| 방 생성 · 목록, 메시지 전송 · 내역, 출처 | P0 |
| 근거 없을 때 [사장님께 물어보기] → **질문 보내기** | **P0** |
| 사장님 답변이 채팅에 도착 · "매뉴얼에 추가할까요?" → 매뉴얼 추가 | P1 (docs/03 S5) |

### 5-0. 메시지 모양 (공통)
```json
{
  "messageId": "msg_102",
  "sender": "ai",
  "text": "3스푼 · 우유 200ml · 얼음 반 컵",
  "answerType": "answered",
  "sources": [{ "kind": "recipe", "id": "rcp_stl", "title": "딸기라떼" }],
  "canAskOwner": false,
  "ownerQuestion": null,
  "createdAt": "2026-11-20T11:20:05+09:00"
}
```
| 필드 | 뜻 |
| --- | --- |
| `sender` | `"staff"`(알바생 질문) · `"ai"` · `"owner"`(👔 사장님 답변, P1) · `"system"`("사장님께 전달했어요" 같은 안내) |
| `answerType` | AI 답변일 때만: `"answered"` 근거 있음 · `"not_found"` 근거 없음 · `"out_of_scope"` 매장 업무와 무관. 다른 sender는 `null` |
| `sources` | 출처 ([0-2](#0-2-출처source-모양)). **`answered`면 1개 이상 필수**, 아니면 `[]`. FE는 첫 번째를 카드로 보여 줘요 |
| `canAskOwner` | `not_found`이고 아직 안 물어봤을 때 `true` → FE가 [사장님께 물어보기] 버튼 |
| `ownerQuestion` | 이 답변으로 사장님께 물어봤으면 `{ "ownerQuestionId": "oq_7", "status": "asked" }` (`"asked"` 전달됨 · `"answered"` 사장님이 답함), 아니면 `null` |

`answerType`별 예시 문장 (FE 가짜 데이터 기준)
| answerType | text |
| --- | --- |
| `answered` | "딸기라떼는 딸기청 3스푼, 우유 200ml, 얼음 반 컵이에요." |
| `not_found` | "매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요." |
| `out_of_scope` | "매장 업무 질문에만 답할 수 있어요." |

### 5-1. AI 채팅방 생성 · 목록
FE는 채팅 탭에 들어오면 **목록을 먼저 불러서**, 방이 있으면 가장 최근 방을 열고 없으면 새로 만들어요 (화면은 매장당 방 1개처럼 보여요).

#### `GET /stores/{storeId}/assistant-chats` (방 목록)
응답 `200`
```json
{
  "suggestions": ["화장실 비번", "마감 순서", "환불", "손님이 우산 빌려 달래"],
  "chats": [
    {
      "chatId": "cht_dalbit_jieun",
      "storeId": "str_dalbit",
      "createdAt": "2026-11-20T11:19:00+09:00",
      "lastMessageAt": "2026-11-20T19:43:10+09:00",
      "lastMessageText": "매뉴얼에 추가했어요"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `suggestions` | 입력창 위 **자주 묻는 질문 칩** (매장마다 다름). 없으면 `[]` |
| `chats` | 내 방 목록 (최근 대화 순). 없으면 `[]` |

#### `POST /stores/{storeId}/assistant-chats` (방 생성)
요청: 본문 없음

응답 `201`
```json
{
  "chatId": "cht_dalbit_jieun",
  "storeId": "str_dalbit",
  "createdAt": "2026-11-20T11:19:00+09:00",
  "lastMessageAt": "2026-11-20T11:19:00+09:00",
  "lastMessageText": "무엇이 궁금하세요?",
  "suggestions": ["화장실 비번", "마감 순서", "환불", "손님이 우산 빌려 달래"],
  "messages": [
    {
      "messageId": "msg_001",
      "sender": "ai",
      "text": "무엇이 궁금하세요?",
      "answerType": null,
      "sources": [],
      "canAskOwner": false,
      "ownerQuestion": null,
      "createdAt": "2026-11-20T11:19:00+09:00"
    }
  ]
}
```
- `messages`: 새 방이면 인사 1개 (없어도 돼요, FE가 인사를 그려요)

### 5-2. 메시지 전송 · 내역

#### `POST /stores/{storeId}/assistant-chats/{chatId}/messages` (전송 · 답변)
요청
```json
{ "text": "딸기라떼 딸기청 몇 스푼이야?" }
```

응답 `201` — 저장된 질문 + AI 답변을 같이
```json
{
  "question": {
    "messageId": "msg_101",
    "sender": "staff",
    "text": "딸기라떼 딸기청 몇 스푼이야?",
    "answerType": null,
    "sources": [],
    "canAskOwner": false,
    "ownerQuestion": null,
    "createdAt": "2026-11-20T11:20:00+09:00"
  },
  "answer": {
    "messageId": "msg_102",
    "sender": "ai",
    "text": "딸기라떼는 딸기청 3스푼, 우유 200ml, 얼음 반 컵이에요. 딸기청은 매일 아침 확인.",
    "answerType": "answered",
    "sources": [{ "kind": "recipe", "id": "rcp_stl", "title": "딸기라떼" }],
    "canAskOwner": false,
    "ownerQuestion": null,
    "createdAt": "2026-11-20T11:20:03+09:00"
  }
}
```

근거가 없을 때 `answer`
```json
{
  "messageId": "msg_104",
  "sender": "ai",
  "text": "매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요.",
  "answerType": "not_found",
  "sources": [],
  "canAskOwner": true,
  "ownerQuestion": null,
  "createdAt": "2026-11-20T19:40:03+09:00"
}
```

에러
| HTTP | code | 언제 |
| --- | --- | --- |
| 422 | `VALIDATION_ERROR` | 빈 질문 · 너무 긴 질문 |
| 503 | `AI_UNAVAILABLE` | AI 응답 실패 · 시간 초과 → FE는 "답변을 받지 못했어요. 다시 시도해 주세요" |

> FE는 답변을 기다리는 동안 "입력 중(···)" 말풍선을 보여 줘요. 응답이 10초 넘게 걸리면 알려 주세요 (스트리밍 여부 논의).

#### `GET /stores/{storeId}/assistant-chats/{chatId}/messages` (내역)
채팅 탭에 다시 들어오거나 새로고침했을 때.

쿼리 (제안): `?before=msg_101&limit=50` — `before` 메시지보다 이전 것을 `limit`개. 없으면 최신 50개

응답 `200`
```json
{
  "chatId": "cht_dalbit_jieun",
  "hasMore": false,
  "messages": [
    {
      "messageId": "msg_104",
      "sender": "ai",
      "text": "매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요.",
      "answerType": "not_found",
      "sources": [],
      "canAskOwner": false,
      "ownerQuestion": { "ownerQuestionId": "oq_7", "status": "answered" },
      "createdAt": "2026-11-20T19:40:03+09:00"
    },
    {
      "messageId": "msg_105",
      "sender": "system",
      "text": "사장님께 전달했어요",
      "answerType": null,
      "sources": [],
      "canAskOwner": false,
      "ownerQuestion": null,
      "createdAt": "2026-11-20T19:40:20+09:00"
    },
    {
      "messageId": "msg_106",
      "sender": "owner",
      "text": "창고 우산 빌려드리고 연락처 받아 둬. 다음에 오실 때 돌려받으면 돼요.",
      "answerType": null,
      "sources": [],
      "canAskOwner": false,
      "ownerQuestion": null,
      "createdAt": "2026-11-20T19:43:00+09:00"
    }
  ]
}
```
- `messages`: 오래된 것 → 최신 순
- `owner` 메시지(사장님 답변)는 P1이에요. P0에서는 `staff` · `ai` · `system`만 와도 돼요

### 5-3. 사장님께 물어보기
#### 질문 보내기 — P0 (제안: `POST /stores/{storeId}/assistant-chats/{chatId}/messages/{messageId}/owner-questions`)
> **BE 표에 없는 API예요.** [질문 6](#8-be에-확인하고-싶은-것)에 적었어요. 경로는 BE가 정해 주세요.

`not_found` 답변의 [사장님께 물어보기]를 누르면 불러요. `messageId`는 그 AI 답변 ID예요. 원래 질문은 BE가 그 답변 바로 앞 `staff` 메시지에서 찾아요.

요청: 본문 없음

응답 `201`
```json
{
  "ownerQuestionId": "oq_7",
  "status": "asked",
  "question": "손님이 우산 빌려 달래",
  "createdAt": "2026-11-20T19:40:20+09:00",
  "systemMessage": {
    "messageId": "msg_105",
    "sender": "system",
    "text": "사장님께 전달했어요",
    "answerType": null,
    "sources": [],
    "canAskOwner": false,
    "ownerQuestion": null,
    "createdAt": "2026-11-20T19:40:20+09:00"
  }
}
```
- FE는 버튼을 "전달됨"으로 바꾸고 `systemMessage`를 채팅에 붙여요
- 사장님 화면에는 🔴 배지로 보여요 (docs/03 S5, 사장님 화면 API는 따로)

에러
| HTTP | code | 언제 |
| --- | --- | --- |
| 409 | `OWNER_QUESTION_ALREADY_SENT` | 이미 물어본 답변 |
| 422 | `OWNER_QUESTION_NOT_ALLOWED` | `not_found`가 아닌 답변 |

#### 사장님 답변 → 매뉴얼 추가 — P1
- 사장님이 답하면 알바생 채팅 내역([5-2 내역](#get-storesstoreidassistant-chatschatidmessages-내역))에 `sender: "owner"` 메시지가 들어오고, 그 답변의 `ownerQuestion.status`가 `"answered"`로 바뀌어요
- 사장님이 "매뉴얼에 추가"하면 매뉴얼이 생기고(`isNew: true`), 채팅에 `system` "매뉴얼에 추가했어요" 메시지가 들어와요. 다음 같은 질문부터 AI가 그 매뉴얼을 출처로 답해요
- 사장님 쪽 답변 · 매뉴얼 추가 API는 사장님 화면(나현)과 함께 정해요

---

## 6. 인수인계
텍스트로 남기면 **AI가 태그별로 정리**하고, 다음 근무자가 홈에서 항목을 체크해요 (`docs/03` A4).

### 6-0. 인수인계 노트 모양 (공통)
```json
{
  "noteId": "hnd_1120a",
  "author": { "userId": "usr_minsu", "name": "민수" },
  "createdAt": "2026-11-20T14:50:00+09:00",
  "updatedAt": "2026-11-20T14:50:00+09:00",
  "rawText": "꽃집 사장님 아아 1잔 외상, 오늘 계산하신대요. 딸기청 1병 남았어요. 제빙기 소리 이상해서 사장님께 말씀드림",
  "noIssue": false,
  "summary": "꽃집 외상 오늘 계산 · 딸기청 1병 남음",
  "items": [
    {
      "itemId": "itm_1",
      "tag": "credit",
      "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산",
      "checked": false,
      "checkedBy": null,
      "checkedAt": null
    },
    {
      "itemId": "itm_2",
      "tag": "stock",
      "text": "딸기청 1병 남음",
      "checked": true,
      "checkedBy": { "userId": "usr_jieun", "name": "지은" },
      "checkedAt": "2026-11-20T18:05:00+09:00"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `author` | 작성자. FE가 "민수 · 14:50"으로 표시 |
| `rawText` | 처음 쓴 글 (수정 화면에 다시 보여 줌) |
| `noIssue` | [특이사항 없음]으로 남긴 경우 `true` (`summary` `""`, `items` `[]`) |
| `summary` | AI 3줄 요약 (홈 "AI 요약" 카드) |
| `items[].tag` | `"credit"`(💳 외상) · `"stock"`(📦 재고) · `"etc"`(🔧 기타). 화면 글자는 FE가 바꿔요 |
| `items[].checked` | 처리 여부. **매장 공용** (한 사람이 체크하면 모두에게 체크됨). 확인 API는 [6-7](#6-7-post-storesstoreidhandover-notesnoteidconfirmations-확인) |

> 가짜 데이터는 `from: "민수 · 14:50"` 한 줄, 태그는 `"외상"` 같은 한국어인데, API는 위처럼 나눠 받는 쪽을 제안해요.

### 6-1. `POST /stores/{storeId}/handover-drafts` (AI 초안)
[AI로 정리하기] — **저장하지 않고** 정리 결과만 돌려줘요. 알바생이 확인 · 수정한 뒤 [6-3](#6-3-post-storesstoreidhandover-notes-등록)으로 저장해요.

요청
```json
{ "text": "꽃집 사장님 아아 1잔 외상, 오늘 계산하신대요. 딸기청 1병 남았어요. 제빙기 소리 이상해서 사장님께 말씀드림" }
```

응답 `200`
```json
{
  "summary": "꽃집 외상 오늘 계산 · 딸기청 1병 남음",
  "items": [
    { "tag": "credit", "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산" },
    { "tag": "stock", "text": "딸기청 1병 남음" },
    { "tag": "etc", "text": "제빙기 소음 · 사장님께 전달됨" }
  ]
}
```
- 에러: `422 VALIDATION_ERROR` (빈 글), `503 AI_UNAVAILABLE`

### 6-2. `GET /stores/{storeId}/handover-notes` (목록)
홈의 주간 달력에서 날짜를 고르면 그날 인수인계를 보여 줘요.

쿼리 (제안): `?date=2026-11-20` — 없으면 오늘

응답 `200`
```json
{
  "date": "2026-11-20",
  "notes": [
    {
      "noteId": "hnd_1120a",
      "author": { "userId": "usr_minsu", "name": "민수" },
      "createdAt": "2026-11-20T14:50:00+09:00",
      "updatedAt": "2026-11-20T14:50:00+09:00",
      "rawText": "딸기청 1병 남았어요",
      "noIssue": false,
      "summary": "딸기청 1병 남음",
      "items": [
        {
          "itemId": "itm_2",
          "tag": "stock",
          "text": "딸기청 1병 남음",
          "checked": false,
          "checkedBy": null,
          "checkedAt": null
        }
      ]
    }
  ]
}
```
- 노트 하나하나는 [6-0](#6-0-인수인계-노트-모양-공통) 모양 그대로예요
- `notes`: 최신 순. 아무도 안 남겼으면 `[]` (FE: "기록 없음")

### 6-3. `POST /stores/{storeId}/handover-notes` (등록)
요청 — AI 정리 결과(수정했을 수 있음) 저장
```json
{
  "rawText": "꽃집 사장님 아아 1잔 외상, 오늘 계산하신대요. 딸기청 1병 남았어요. 제빙기 소리 이상해서 사장님께 말씀드림",
  "noIssue": false,
  "summary": "꽃집 외상 오늘 계산 · 딸기청 1병 남음",
  "items": [
    { "tag": "credit", "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산" },
    { "tag": "stock", "text": "딸기청 1병 남음" },
    { "tag": "etc", "text": "제빙기 소음 · 사장님께 전달됨" }
  ]
}
```
[특이사항 없음]
```json
{ "rawText": "", "noIssue": true, "summary": "", "items": [] }
```

응답 `201` — 저장된 노트 ([6-0](#6-0-인수인계-노트-모양-공통) 모양, `itemId` · `checked: false` 포함)

### 6-4. `GET /stores/{storeId}/handover-notes/{noteId}` (상세)
응답 `200` — [6-0](#6-0-인수인계-노트-모양-공통) 모양. 에러: `404 NOT_FOUND`

### 6-5. `PATCH /stores/{storeId}/handover-notes/{noteId}` (수정)
작성자가 고치기. 보낸 필드만 바꿔요.

요청
```json
{
  "summary": "꽃집 외상 오늘 계산 · 딸기청 1병 남음",
  "items": [
    { "itemId": "itm_1", "tag": "credit", "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산" },
    { "itemId": null, "tag": "etc", "text": "빨대 1박스 입고" }
  ]
}
```
- `items`는 통째로 바꿔요. 기존 항목은 `itemId`를 그대로 보내서 체크 상태를 지키고, 새 항목은 `itemId: null`

응답 `200` — 바뀐 노트. 에러: `403 FORBIDDEN` (작성자 · 사장님이 아님), `404 NOT_FOUND`

### 6-6. `DELETE /stores/{storeId}/handover-notes/{noteId}` (삭제)
응답 `204`. 에러: `403 FORBIDDEN`, `404 NOT_FOUND`

### 6-7. `POST /stores/{storeId}/handover-notes/{noteId}/confirmations` (확인)
> BE 표에는 **"확인 완료" · P2**로 되어 있는데, FE 홈은 **항목별 체크가 P0**예요 (docs/03 A4 "처리하면 ☑"). [질문 3](#8-be에-확인하고-싶은-것)에 적었어요.

FE 제안: 이 API로 **항목 하나씩** 체크 · 해제할 수 있게 해 주세요.

요청
```json
{ "itemId": "itm_1", "checked": true }
```
- `itemId: null`이면 노트 전체 확인 완료 (BE 표의 원래 의미)

응답 `200` — 바뀐 노트 ([6-0](#6-0-인수인계-노트-모양-공통) 모양)
```json
{
  "noteId": "hnd_1120a",
  "author": { "userId": "usr_minsu", "name": "민수" },
  "createdAt": "2026-11-20T14:50:00+09:00",
  "updatedAt": "2026-11-20T18:06:00+09:00",
  "rawText": "꽃집 사장님 아아 1잔 외상, 오늘 계산하신대요.",
  "noIssue": false,
  "summary": "꽃집 외상 오늘 계산",
  "items": [
    {
      "itemId": "itm_1",
      "tag": "credit",
      "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산",
      "checked": true,
      "checkedBy": { "userId": "usr_jieun", "name": "지은" },
      "checkedAt": "2026-11-20T18:06:00+09:00"
    }
  ]
}
```
- 에러: `404 NOT_FOUND`, `403 FORBIDDEN`, `409 HANDOVER_PAST` (지난 날짜 노트는 체크 불가로 할 경우)

---

## 7. 급여 (P1)
계산은 **규칙(코드)으로**, AI는 쉬운 설명만 해요 (`docs/01`). 금액은 화면에 항상 "참고용"으로 보여 줘요.

### 7-1. `GET /stores/{storeId}/payroll/estimates/me` (내 예상 급여)
쿼리 (제안): `?month=2026-11` — 없으면 이번 달

응답 `200`
```json
{
  "storeId": "str_dalbit",
  "month": "2026-11",
  "hourlyWage": 10320,
  "payday": 10,
  "taxType": "3.3",
  "weeklyAllowanceEnabled": true,
  "workedDates": ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-11", "2026-11-13", "2026-11-16", "2026-11-18", "2026-11-20"],
  "plannedDates": ["2026-11-23", "2026-11-25", "2026-11-27", "2026-11-30"],
  "hours": 57,
  "basePay": 588240,
  "weeklyAllowance": 92880,
  "grossPay": 681120,
  "deduction": 22480,
  "netPay": 658640,
  "weeks": [
    { "weekStart": "2026-11-02", "hours": 12, "weeklyAllowanceEligible": false, "weeklyAllowance": 0 },
    { "weekStart": "2026-11-09", "hours": 15, "weeklyAllowanceEligible": true, "weeklyAllowance": 30960 },
    { "weekStart": "2026-11-16", "hours": 15, "weeklyAllowanceEligible": true, "weeklyAllowance": 30960 },
    { "weekStart": "2026-11-23", "hours": 15, "weeklyAllowanceEligible": true, "weeklyAllowance": 30960 }
  ],
  "aiNote": "11/2 주는 15시간 미만이라 주휴수당이 빠져요. 나머지 3주는 주당 30,960원이에요.",
  "isEstimate": true
}
```
| 필드 | 뜻 |
| --- | --- |
| `payday` | 급여일 1~28, 말일은 `31` |
| `taxType` | `"none"` 공제 없음 · `"3.3"` 3.3% · `"ins"` 4대보험 |
| `weeks` | 주별 근거 (docs/03 A6). 주휴수당은 주 15시간 이상인 주만 |
| `aiNote` | AI 쉬운 설명 (계산에는 안 씀) |
| `isEstimate` | 확정 근무가 남아 있으면 `true` → FE가 "참고용 · 예상" 표시 |

> 숫자는 FE 가짜 데이터(`calcPay`)와 같은 규칙이에요: 기본급 = 시간 × 시급, 공제 = (기본급 + 주휴수당) × 공제율 (10원 단위 반올림). 공휴일 가산은 없어요 (docs/03 S7).

### 7-2. `PUT /stores/{storeId}/members/{memberId}/hourly-wage` (시급 설정 — 사장님 기능)
사장님 화면(나현)에서 써요. 알바 화면은 보기만 해요 ([질문 4](#8-be에-확인하고-싶은-것)).

요청
```json
{ "hourlyWage": 10320 }
```

응답 `200`
```json
{ "memberId": "mbr_31", "hourlyWage": 10320, "updatedAt": "2026-11-20T10:00:00+09:00" }
```
- 에러: `422 WAGE_BELOW_MINIMUM` "최저시급 10,320원보다 낮아요" (docs/03 S4), `403 FORBIDDEN` (사장님이 아님)

---

## 8. BE에 확인하고 싶은 것

**API 표를 보고 생긴 질문**
1. **`POST /auth/bootstrap`이 표에 없어요.** 처음 로그인 시 사용자 생성은 어디서 하나요? (`GET /users/me`에서 없으면 자동 생성도 OK)
2. OAuth URL · 콜백 · 토큰 재발급 · 로그아웃(`/auth/...`)은 **Supabase가 해서 BE에서 안 만들어도 돼요**
3. **인수인계 확인 완료가 P2인데, FE 홈은 항목별 체크가 P0예요.** 항목별 체크를 P0로 할 수 있을까요? ([6-7](#6-7-post-storesstoreidhandover-notesnoteidconfirmations-확인) 제안 모양)
4. **시급을 사장님이 정하면**, 알바 화면의 '매장별 시급 입력'(`/staff/stores/:storeId`)은 **보기 전용**으로 바꿀게요. 맞나요? (급여일 · 공제 방식도 사장님이 정하나요?)
5. **초대 코드 목록 조회가 P2인데**, 사장님 직원 · 코드 화면이 P0라 **P0로 부탁해요**
6. **사장님께 물어보기 API가 표에 없어요.** 질문 보내기는 P0라 필요해요 ([5-3](#5-3-사장님께-물어보기) 제안 모양). 사장님 답변 · 매뉴얼 추가(P1) API도 사장님 화면과 함께 정해 주세요

**응답 모양 질문**
7. 필드 이름 **camelCase**로 줄 수 있나요? (snake_case면 FE가 변환 계층을 추가해야 해요)
8. 에러 모양 `{ code, message, detail }` 괜찮나요?
9. `INVITE_ALREADY_JOINED`에 매장 ID · 이름(`detail`)을 넣어 줄 수 있나요? ([○○로 가기] 버튼에 필요)
10. 매장 색 · 아이콘(`theme`)을 매장에 저장할 수 있나요? 어려우면 FE가 정해요
11. 레시피 목록에 재료까지 넣어도 괜찮나요? (재료 검색을 FE에서 하려고)
12. 인수인계는 하루에 여러 개 남길 수 있나요? (FE는 여러 개를 받을 수 있게 `notes` 배열로 제안)
13. 인수인계 체크는 매장 공용이 맞나요? (한 명이 체크하면 모두에게 체크)
14. AI 답변이 몇 초 걸리나요? 길면 스트리밍 여부 논의
15. Swagger(`/openapi.json`) 주소가 생기면 공유해 주세요 → FE가 `npm run api`로 타입 · 훅을 자동 생성해요 (`docs/05`)
