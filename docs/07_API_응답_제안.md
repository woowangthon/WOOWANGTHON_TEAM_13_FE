# 07. P0 API 응답 제안 (FE → BE)

FE가 지금 쓰는 **가짜 데이터(`src/api/mocks/staff/`) 모양을 기준으로** P0 API의 요청 · 응답을 제안해요.
이 모양으로 와 주면 FE는 가짜 데이터를 API로 **거의 그대로 바꿔 끼울 수 있어요.** 바꾸고 싶은 곳은 이 문서에 댓글이나 PR로 알려 주세요.

- 받는 사람: 은교(auth · 사용자 · 매장 · 초대코드), 연서(레시피 · 매뉴얼 · AI 채팅 · 인수인계)
- 경로 옆 **(경로 제안)** 은 FE가 임시로 붙인 경로예요. BE API 표의 경로로 바꿔 주시면 FE가 맞출게요

## 목차
| # | API | 담당 | 가짜 데이터 |
| --- | --- | --- | --- |
| 1 | `POST /auth/bootstrap` | 은교 | `lib/auth.ts` `fetchMe` |
| 2 | `GET /users/me` | 은교 | `mocks/staff/me.ts` |
| 3 | `GET /users/me/stores` | 은교 | `mocks/staff/stores.ts` |
| 4 | `POST /invitations/verify` | 은교 | `mocks/staff/join.ts` `verifyInviteCode` |
| 5 | `POST /memberships/join` | 은교 | `mocks/staff/join.ts` `joinStore` |
| 6 | 레시피 목록 · 상세 | 연서 | `mocks/staff/recipes.ts` |
| 7 | 매뉴얼 목록 · 상세 | 연서 | `mocks/staff/manuals.ts` |
| 8 | AI 채팅방 생성 · 메시지 전송 | 연서 | `mocks/staff/chat.ts` |
| 9 | 인수인계 목록 · 등록 · AI 초안 · 확인 | 연서 | `mocks/staff/handovers.ts` |

---

## 0. 공통 약속

| 항목 | 제안 |
| --- | --- |
| 인증 | 모든 요청에 `Authorization: Bearer <Supabase access_token>` (`docs/05`) |
| 필드 이름 | **camelCase** (`storeId`, `createdAt`). FastAPI면 Pydantic `alias_generator=to_camel` + `populate_by_name=True` 로 바꿀 수 있어요 |
| ID | 문자열 (UUID 등). FE는 숫자로 계산하지 않아요 |
| 날짜 · 시간 | ISO 8601 + 시간대: `"2026-11-20T14:50:00+09:00"`, 날짜만: `"2026-11-20"`. 화면 표시(11/20(금) · 14:50)는 FE가 `lib/format.ts`로 해요 |
| 목록 | 배열을 바로 주지 않고 객체로 감싸요 (`{ "recipes": [...] }`) → 나중에 필드를 더해도 FE가 안 깨져요 |
| 없는 값 | 필드를 빼지 말고 `null` |
| 성공 | `200` (조회 · 수정), `201` (생성) |

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
| 403 | `FORBIDDEN` | 소속되지 않은 매장 데이터를 요청 |
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

## 1. `POST /auth/bootstrap`
Supabase 로그인 직후 한 번 불러요. 사용자가 없으면 만들고, 있으면 그대로 돌려줘요.

요청: 본문 없음 (토큰만)

응답 `200` (이미 있음) · `201` (새로 만듦)
```json
{
  "isNewUser": true,
  "user": {
    "userId": "usr_8f2c",
    "nickname": "지은",
    "provider": "kakao",
    "stores": []
  }
}
```
- `user`는 [2. `GET /users/me`](#2-get-usersme)와 같은 모양이에요
- `nickname`: 카카오는 닉네임, 구글은 이름 (`docs/05`: 카카오는 닉네임만)

---

## 2. `GET /users/me`
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
| `provider` | `"kakao"` · `"google"` (역할 선택 화면 상단 표시) |
| `stores[].role` | `"owner"` · `"staff"`. 한 사람이 매장마다 다른 역할일 수 있어요 |

> FE 타입: `src/lib/authStore.ts`의 `Me` — 이 모양으로 확정되면 그대로 써요.

---

## 3. `GET /users/me/stores`
알바 화면 상단 **매장 전환**(n잡) · 홈에 쓰는 매장 정보.

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
| `staffName` | 사장님이 알바생 추가 때 적은 이름 (사장님 매장이면 `null`) |
| `photoUrl` | 매장 사진. 없으면 `null` → FE가 매장 색으로 채워요 |
| `theme` | 매장 색 · 아이콘 묶음 키: `"moon"`(초록) · `"sunset"`(갈색). 색 값(#2A4536 등)은 FE 디자인 토큰에서 정해요. BE에 저장할 곳이 없으면 `null`이어도 돼요 (FE가 순서대로 배정) |

> 가짜 데이터의 `shift` · `week` · `weekHours`(근무) 는 P1 스케줄 API, `chips`(자주 묻는 질문)는 [8-1 채팅방 생성](#8-1-ai-채팅방-생성-경로-제안)의 `suggestions`로 옮겼어요.

---

## 4. `POST /invitations/verify`
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

---

## 5. `POST /memberships/join`
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
  "role": "staff",
  "staffName": "지은",
  "joinedAt": "2026-11-20T09:12:00+09:00"
}
```

에러: [4번](#4-post-invitationsverify)과 같은 코드 (`INVITE_INVALID` · `INVITE_ALREADY_JOINED` · `INVITE_REVOKED` · `INVITE_LOCKED`)

---

## 6. 레시피

### 6-1. 레시피 목록 (경로 제안: `GET /stores/{storeId}/recipes`)
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

### 6-2. 레시피 상세 (경로 제안: `GET /stores/{storeId}/recipes/{recipeId}`)
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

## 7. 매뉴얼

### 7-1. 매뉴얼 목록 (경로 제안: `GET /stores/{storeId}/manuals`)
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

### 7-2. 매뉴얼 상세 (경로 제안: `GET /stores/{storeId}/manuals/{manualId}`)
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

## 8. AI 사수 채팅
**지금 매장의 매뉴얼 · 레시피만 근거로** 답하고, 근거가 없으면 지어내지 않아요 (`docs/01`, `docs/03` A3). n잡이어도 다른 매장 자료는 절대 섞지 않아요.

### 8-0. 메시지 모양 (공통)
```json
{
  "messageId": "msg_102",
  "sender": "ai",
  "text": "3스푼 · 우유 200ml · 얼음 반 컵",
  "answerType": "answered",
  "sources": [{ "kind": "recipe", "id": "rcp_stl", "title": "딸기라떼" }],
  "canAskOwner": false,
  "createdAt": "2026-11-20T11:20:05+09:00"
}
```
| 필드 | 뜻 |
| --- | --- |
| `sender` | `"staff"`(알바생 질문) · `"ai"` · `"owner"`(👔 사장님 답변) · `"system"`("사장님께 전달했어요" 같은 안내) |
| `answerType` | AI 답변일 때만: `"answered"` 근거 있음 · `"not_found"` 근거 없음 · `"out_of_scope"` 매장 업무와 무관. 다른 sender는 `null` |
| `sources` | 출처 ([0-2](#0-2-출처source-모양)). **`answered`면 1개 이상 필수**, 아니면 `[]`. FE는 첫 번째를 카드로 보여 줘요 |
| `canAskOwner` | `not_found`일 때 `true` → FE가 [사장님께 물어보기] 버튼 |

`answerType`별 예시 문장 (FE 가짜 데이터 기준)
| answerType | text |
| --- | --- |
| `answered` | "딸기라떼는 딸기청 3스푼, 우유 200ml, 얼음 반 컵이에요." |
| `not_found` | "매뉴얼에서 찾지 못했어요. 제가 지어내지 않을게요." |
| `out_of_scope` | "매장 업무 질문에만 답할 수 있어요." |

### 8-1. AI 채팅방 생성 (경로 제안: `POST /stores/{storeId}/chat/rooms`)
채팅 탭에 들어올 때 불러요. 이미 방이 있으면 그 방을 돌려줘도 돼요 (매장당 1개).

요청: 본문 없음

응답 `201` (새로 만듦) · `200` (기존 방)
```json
{
  "roomId": "room_dalbit_jieun",
  "storeId": "str_dalbit",
  "suggestions": ["화장실 비번", "마감 순서", "환불", "손님이 우산 빌려 달래"],
  "messages": [
    {
      "messageId": "msg_001",
      "sender": "ai",
      "text": "무엇이 궁금하세요?",
      "answerType": null,
      "sources": [],
      "canAskOwner": false,
      "createdAt": "2026-11-20T11:19:00+09:00"
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `suggestions` | 입력창 위 **자주 묻는 질문 칩** (매장마다 다름). 없으면 `[]` |
| `messages` | 지난 대화 (오래된 것 → 최신). 새 방이면 인사 1개 |

### 8-2. 메시지 전송 (경로 제안: `POST /chat/rooms/{roomId}/messages`)
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
    "createdAt": "2026-11-20T11:20:00+09:00"
  },
  "answer": {
    "messageId": "msg_102",
    "sender": "ai",
    "text": "딸기라떼는 딸기청 3스푼, 우유 200ml, 얼음 반 컵이에요. 딸기청은 매일 아침 확인.",
    "answerType": "answered",
    "sources": [{ "kind": "recipe", "id": "rcp_stl", "title": "딸기라떼" }],
    "canAskOwner": false,
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
  "createdAt": "2026-11-20T19:40:03+09:00"
}
```

에러
| HTTP | code | 언제 |
| --- | --- | --- |
| 422 | `VALIDATION_ERROR` | 빈 질문 · 너무 긴 질문 |
| 503 | `AI_UNAVAILABLE` | AI 응답 실패 · 시간 초과 → FE는 "답변을 받지 못했어요. 다시 시도해 주세요" |

> FE는 답변을 기다리는 동안 "입력 중(···)" 말풍선을 보여 줘요. 응답이 10초 넘게 걸리면 알려 주세요 (스트리밍 여부 논의).
> [사장님께 물어보기] · 사장님 답변 · "매뉴얼에 추가할까요?"는 P1(S5)이라 이 문서에서는 뺐어요. 그때 `sender: "owner"` · `"system"` 메시지가 같은 모양으로 `messages`에 들어오면 돼요.

---

## 9. 인수인계
텍스트로 남기면 **AI가 태그별로 정리**하고, 다음 근무자가 홈에서 항목을 체크해요 (`docs/03` A4).

### 9-0. 인수인계 모양 (공통)
```json
{
  "handoverId": "hnd_1120a",
  "author": { "userId": "usr_minsu", "name": "민수" },
  "createdAt": "2026-11-20T14:50:00+09:00",
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
| `noIssue` | [특이사항 없음]으로 남긴 경우 `true` (`summary` `""`, `items` `[]`) |
| `summary` | AI 3줄 요약 (홈 "AI 요약" 카드) |
| `items[].tag` | `"credit"`(💳 외상) · `"stock"`(📦 재고) · `"etc"`(🔧 기타). 화면 글자는 FE가 바꿔요 |
| `items[].checked` | 처리 여부. **매장 공용** (한 사람이 체크하면 모두에게 체크됨) |

> 가짜 데이터는 `from: "민수 · 14:50"` 한 줄, 태그는 `"외상"` 같은 한국어인데, API는 위처럼 나눠 받는 쪽을 제안해요.

### 9-1. 인수인계 목록 (경로 제안: `GET /stores/{storeId}/handovers?date=2026-11-20`)
홈의 주간 달력에서 날짜를 고르면 그날 인수인계를 보여 줘요.

응답 `200`
```json
{
  "date": "2026-11-20",
  "handovers": [
    {
      "handoverId": "hnd_1120a",
      "author": { "userId": "usr_minsu", "name": "민수" },
      "createdAt": "2026-11-20T14:50:00+09:00",
      "noIssue": false,
      "summary": "꽃집 외상 오늘 계산 · 딸기청 1병 남음",
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
- 항목 하나하나는 [9-0](#9-0-인수인계-모양-공통) 모양 그대로예요
- `handovers`: 최신 순. 아무도 안 남겼으면 `[]` (FE: "기록 없음")
- `date` 없으면 오늘

### 9-2. AI 초안 (경로 제안: `POST /stores/{storeId}/handovers/draft`)
[AI로 정리하기] — **저장하지 않고** 정리 결과만 돌려줘요. 알바생이 확인 · 수정한 뒤 9-3으로 저장해요.

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

### 9-3. 인수인계 등록 (경로 제안: `POST /stores/{storeId}/handovers`)
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

응답 `201` — 저장된 인수인계 ([9-0](#9-0-인수인계-모양-공통) 모양, `itemId` · `checked: false` 포함)

### 9-4. 인수인계 확인 (경로 제안: `PATCH /handovers/{handoverId}/items/{itemId}`)
홈에서 항목을 누르면 체크 · 다시 누르면 해제.

요청
```json
{ "checked": true }
```

응답 `200` — 바뀐 항목
```json
{
  "itemId": "itm_1",
  "tag": "credit",
  "text": "꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산",
  "checked": true,
  "checkedBy": { "userId": "usr_jieun", "name": "지은" },
  "checkedAt": "2026-11-20T18:06:00+09:00"
}
```
- 에러: `404 NOT_FOUND`, `403 FORBIDDEN`, `409 HANDOVER_PAST` (지난 날짜 인수인계는 체크 불가로 할 경우)

---

## 10. BE에 확인하고 싶은 것
1. 필드 이름 **camelCase**로 줄 수 있나요? (snake_case면 FE가 변환 계층을 추가해야 해요)
2. 에러 모양 `{ code, message, detail }` 괜찮나요?
3. `INVITE_ALREADY_JOINED`에 매장 ID · 이름(`detail`)을 넣어 줄 수 있나요? ([○○로 가기] 버튼에 필요)
4. 매장 색 · 아이콘(`theme`)을 매장에 저장할 수 있나요? 어려우면 FE가 정해요
5. 레시피 목록에 재료까지 넣어도 괜찮나요? (재료 검색을 FE에서 하려고)
6. 인수인계는 하루에 여러 개 남길 수 있나요? (FE는 여러 개를 받을 수 있게 `handovers` 배열로 제안)
7. 인수인계 체크는 매장 공용이 맞나요? (한 명이 체크하면 모두에게 체크)
8. AI 답변이 몇 초 걸리나요? 길면 스트리밍 여부 논의
9. Swagger(`/openapi.json`) 주소가 생기면 공유해 주세요 → FE가 `npm run api`로 타입 · 훅을 자동 생성해요 (`docs/05`)
