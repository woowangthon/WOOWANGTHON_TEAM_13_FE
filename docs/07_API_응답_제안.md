# 07. P0 API 응답 제안 (FE → BE)

FE가 지금 쓰는 **가짜 데이터(`src/api/mocks/staff/`) 모양을 기준으로** P0 API의 요청 · 응답을 제안해요.
이 모양으로 와 주면 FE는 가짜 데이터를 API로 **거의 그대로 바꿔 끼울 수 있어요.** 바꾸고 싶은 곳은 이 문서에 댓글이나 PR로 알려 주세요.

- 받는 사람: 은교(사용자 · 매장 · 초대코드 · 급여 설정), 연서(레시피 · 매뉴얼 · AI 채팅 · 인수인계 · 급여)
- 경로는 **BE API 표 기준**이에요. 표에 없어서 FE가 임시로 붙인 경로 · 쿼리만 **(제안)** 으로 표시했어요
- 로그인 · OAuth 콜백 · 토큰 재발급 · 로그아웃은 Supabase가 해서 BE API가 필요 없어요 (`docs/05`)

## 목차
| # | API | 우선 | 담당 | 가짜 데이터 |
| --- | --- | --- | --- | --- |
| 1 | `GET /users/me` · `PATCH /users/me` · `GET /users/me/stores` | P0 | 은교 | `mocks/staff/api/users.ts` · `stores.ts` |
| 2 | `POST /invitations/verify` · `POST /memberships/join` | P0 | 은교 | `mocks/staff/join.ts` |
| 3 | 레시피 목록 · 상세 | P0 | 연서 | `mocks/staff/recipes.ts` |
| 4 | 매뉴얼 목록 · 상세 | P0 | 연서 | `mocks/staff/manuals.ts` |
| 5 | AI 채팅방 생성 · 목록, 메시지 전송 · 내역, 사장님께 물어보기 | P0 (사장님 답변 → 매뉴얼 추가는 P1) | 연서 | `mocks/staff/chat.ts` |
| 6 | 인수인계 AI 초안 · 목록 · 등록 · 상세 · 수정 · 삭제 · 확인 | P0 (확인은 [질문 3](#9-be에-확인하고-싶은-것)) | 연서 | `mocks/staff/handovers.ts` |
| 7 | 내 스케줄 · 근무 가능 시간 조회 · 등록 · 수정 · 삭제 | P1 | 은교 | `mocks/staff/schedule.ts` |
| 8 | 예상 급여 · 시급 설정 | P1 | 연서 · 은교 | `mocks/staff/payroll.ts` |

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

> FastAPI 기본 에러 `{"detail": ...}`도 FE가 읽어요 (11/6, `src/lib/apiClient.ts` `normalizeErrorBody`): `code`는 HTTP 상태로 공통 코드(아래 표)를 정하고, `detail`이 영어 문장이면 화면에는 FE 문구를 보여 줘요. 422 배열은 `VALIDATION_ERROR`로 읽어요. 그래서 **FE가 `code`로 분기해야 하는 곳만** 위 모양으로 주면 돼요 (질문 15).

공통 에러 코드

| HTTP | code | 언제 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 만료 → FE가 `/login`으로 보내요 |
| 403 | `FORBIDDEN` | 소속되지 않은 매장 데이터 · 권한 없는 수정 |
| 404 | `NOT_FOUND` | 레시피 · 매뉴얼 등이 없음 (삭제됨) |
| 422 | `VALIDATION_ERROR` | 입력값 오류. `detail`에 필드별 이유 |
| 500 | `INTERNAL_ERROR` | 서버 오류 → FE는 "다시 시도" 토스트 |
| 503 | `DATABASE_BUSY` | DB 연결이 꽉 참 (11/11 연서). FE는 **조회만** 1초 · 2초 · 4초 간격으로 3번 다시 시도하고, 끝내 실패하면 "지금 사용하는 사람이 많아요. 잠시 뒤 다시 시도해 주세요" (저장 · 전송은 중복 위험이 있어 재시도 안 함) |

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

> 처음 로그인한 사용자를 어디서 만드는지는 [질문 1](#9-be에-확인하고-싶은-것)에 적었어요. `GET /users/me`에서 없으면 자동으로 만들어 줘도 FE는 괜찮아요.

### 1-1. `GET /users/me` ✅ 확정 (11/4, 은교)
로그인 사용자 + 소속 매장 · 역할. FE는 `stores`가 비어 있으면 `/role`, 있으면 역할 홈(`/staff`, `/owner`)으로 보내요.

응답 `200`
```json
{
  "userId": "usr_8f2c",
  "nickname": "지은",
  "email": null,
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
| `email` | 이메일. 카카오는 이메일을 받지 않아서 `null` |
| `provider` | `"kakao"` · `"google"` (역할 선택 화면 상단 표시) |
| `stores[].role` | `"owner"` · `"staff"`. 한 사람이 매장마다 다른 역할일 수 있어요 |

> FE 타입: `src/lib/authStore.ts`의 `Me` — 확정된 이 모양으로 맞췄어요.

### 1-2. `PATCH /users/me`
마이페이지에서 이름(닉네임) 바꾸기.

요청
```json
{ "nickname": "박지은" }
```

응답 `200` — [1-1](#1-1-get-usersme--확정-114-은교)과 같은 모양
```json
{
  "userId": "usr_8f2c",
  "nickname": "박지은",
  "email": null,
  "provider": "kakao",
  "stores": [{ "storeId": "str_dalbit", "storeName": "달빛 카페", "role": "staff" }]
}
```
- 에러: `422 VALIDATION_ERROR` (빈 이름 · 너무 긴 이름)
- ✅ 11/9 BE 실제: 위와 같아요 (이름 1~50자, 앞뒤 공백은 지움). FE는 저장 뒤 `GET /users/me`를 다시 불러 상단 동그라미 · 역할 선택 인사에 반영해요
- 회원 탈퇴 `DELETE /users/me` → `204`. BE는 이름 · 이메일을 지우고 로그인 ID는 남겨서, **같은 계정으로 다시 로그인하면 `GET /users/me`가 `403 {"detail": "Withdrawn user account"}`** → FE는 로그아웃하고 "탈퇴한 계정이에요"를 보여 줘요 (그 계정은 다시 못 써요)
- 알바가 매장에서 나가는 API는 없어요 (`DELETE /stores/{id}/members/{memberId}`는 사장님 전용) → 마이페이지 매장 삭제는 진짜 API일 때 숨겨요 (기획 대기)

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
| `ownerName` | 사장님 이름 (화면: "박 사장님 · 지은 님 자리") · 🙏 요청 중 (11/4). BE는 이름(닉네임)만 줘요 ("류민지") → FE가 "사장님"을 붙여요 (`lib/format.ts` `formatOwner`) |
| `memberId` | 이 매장에서의 내 구성원 ID (시급 설정 등 사장님 기능에서 쓰는 ID) · 🙏 요청 중 (11/4) |
| `staffName` | 사장님이 알바생 추가 때 적은 이름 (사장님 매장이면 `null`) · 🙏 요청 중 (11/4) |
| `photoUrl` | 매장 사진. 없으면 `null` → FE가 매장 색으로 채워요 · 🙏 요청 중 (11/4) |
| `theme` | 매장 색 · 아이콘 묶음 키: `"moon"`(초록) · `"sunset"`(갈색). 색 값(#2A4536 등)은 FE 디자인 토큰에서 정해요. 저장할 곳이 없으면 `null`이어도 돼요 (FE가 내 매장 순서대로 초록 → 갈색 … 정해요). 매장 목록 한 줄 "주 3회 마감 · 박 사장님"의 "주 3회 마감"은 FE가 [7-1](#7-1-get-storesstoreidschedulesme-내-스케줄) 근무 목록에서 계산해요 |

> **11/7 BE 실제 응답**: 감싸지 않은 배열 `[{ "storeId", "storeName", "role" }]` (1-1의 `stores`와 같은 3칸). FE는 `src/lib/api/users.ts` `toMyStoreList`로 위 모양에 맞추고 없는 칸은 빈 값으로 둬요 → 알바 화면의 사장님 이름 · 내 이름 · 매장 사진 · 주소가 비어 보여요 (질문 16).
>
> ✅ **11/9 BE #25(은교)로 위 모양 그대로 들어왔어요**: `{ stores: [{ storeId, name, kind(null 가능), address, ownerName, role, memberId(사장님 매장이면 null), staffName, photoUrl, theme(null), joinedAt }] }`. FE `toMyStoreList`는 이 모양을 그대로 써요

> 가짜 데이터의 `shift` · `week` · `weekHours`(근무)는 [7. 근무](#7-근무-p1), `chips`(자주 묻는 질문)는 [5-1 채팅방](#5-1-ai-채팅방-생성--목록)의 `suggestions`로 옮겼어요.

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
    "photoUrl": "https://…/stores/dalbit.jpg",
    "theme": "moon"
  }
}
```

에러
| HTTP | code | message (예) | detail |
| --- | --- | --- | --- |
| 404 | `INVITE_INVALID` | 유효하지 않은 코드예요 | `{ "remainingAttempts": 3 }` (선택) |
| 409 | `INVITE_ALREADY_JOINED` | 이미 들어간 매장이에요 | `{ "storeId": "str_dalbit", "storeName": "달빛 카페" }` ← **필수** ([○○로 가기] 버튼) |
| 410 | `INVITE_REVOKED` | 사장님이 삭제했거나 이미 사용한 코드예요 | `null` |
| 422 | (FastAPI 검증) | 형식 오류: 코드에 0 · O · 1 · I 가 있음 (BE 코드 형식 `A-H J-N P-Z 2-9`) | 필드별 이유 — FE는 "유효하지 않은 코드"로 보여 줘요 |
| 429 | `INVITE_LOCKED` | 5번 틀려서 10분 동안 입력할 수 없어요 | `{ "lockedUntil": "2026-11-20T15:00:00+09:00" }` |

> `store.theme`이 있으면 입장 완료 화면을 그 매장 색으로 칠해요. 없으면(`null`) FE가 내 매장 순서대로 정해요.

> 틀린 횟수 세기 · 10분 잠금은 BE에서 해 주세요 (docs/03 A1). FE는 `INVITE_LOCKED`를 받으면 입력을 막고, `remainingAttempts`가 오면 "○번 더 틀리면 10분 동안 잠겨요"를 보여 줘요.

> ✅ 11/7 BE 실제 코드와 같아요. 다른 점: `ownerName`은 이름만("류민지", FE가 "사장님"을 붙임), `theme`은 항상 `null`.

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

> **11/9 BE 실제 응답과 비교**: 모양은 같아요. 다른 점 — `temp` · `size`는 `null`일 수 있고(FE가 빈 배지를 숨김), `defaultCategory`는 항상 `null`(첫 카테고리), 카테고리 순서는 레시피 등록 순서, 메뉴 사진 칸(`imageUrl`)은 아직 없어요 → FE가 메뉴 이름으로 시연 사진을 채워요 (`lib/api/recipes.ts` `withPhoto`, 질문 17).

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

> 11/9 BE 실제: 질문 1~1000자, AI를 못 쓰면(Gemini 키 없음 · 실패) `503`이고 질문도 저장하지 않아요 → FE는 채팅 안에 보낸 질문(흐리게) + "AI 답변을 지금 못 받아요" + [다시 시도]를 보여 줘요
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

> ✅ 11/9 BE 실제: `?before=<messageId>&limit=1~100`(기본 50) → `before` 메시지보다 앞(만든 시각 기준)의 최근 `limit`개를 **오래된 순**으로 + `hasMore`. FE는 처음에 최근 50개, 채팅 맨 위로 올리면(또는 [이전 대화 더 보기]) 가장 오래된 메시지를 `before`로 다음 50개를 불러요. `hasMore: false`면 더 안 불러요. 개발 중 확인용: `localStorage['chat-page-size']`(예: 5)로 한 번에 불러오는 개수를 줄일 수 있어요 (npm run dev에서만)
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

> ✅ 11/9 BE main에 들어갔어요 (연서). 본문 없이 `201 { ownerQuestionId, status, question, createdAt, systemMessage }`. 메시지의 `canAskOwner`는 `not_found`이고 아직 안 물어봤을 때 `true`, `ownerQuestion`은 `{ ownerQuestionId, status: "asked" | "answered" }`. 사장님이 답하면 채팅에 `sender: "owner"` 메시지가 생겨요. 에러: `409 OWNER_QUESTION_ALREADY_SENT` · `422 OWNER_QUESTION_NOT_ALLOWED` (FE는 내역을 다시 불러와 맞추고 문장만 알려요). FE는 답을 기다리는 동안만 5초마다 내역을 다시 불러요. 답변의 `addToManual: true`는 11/11 BE #32로 들어왔어요: `{ answer, addToManual, manualTitle?, manualBody?, manualCategoryId? }` — 제목 · 본문을 비우면 BE가 질문 · 답으로 채우고, 카테고리를 안 주면 "물건 위치"(없으면 만들어요). 응답에 `manualId`. FE는 답변 시트의 [매뉴얼에도 추가] 체크박스(처음엔 꺼짐)로 제목 · 본문을 보내요
> **BE 표에 없는 API예요.** [질문 6](#9-be에-확인하고-싶은-것)에 적었어요. 경로는 BE가 정해 주세요.

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
- 11/9 BE 실제: AI를 못 쓰면(Gemini 키 없음 · 실패) `503 {"detail": "AI service is unavailable"}`. FE는 폼 안에 "AI 정리를 지금 못 해요" + [다시 시도] · [직접 정리하기](줄 · 문장으로 나눠 항목을 만들고 고친 뒤 저장)를 보여 줘요. 저장 한도: 줄글 2000자 · 요약 1000자 · 항목 50개 · 항목 500자

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
> BE 표에는 **"확인 완료" · P2**로 되어 있는데, FE 홈은 **항목별 체크가 P0**예요 (docs/03 A4 "처리하면 ☑"). [질문 3](#9-be에-확인하고-싶은-것)에 적었어요.

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

> FE 체크 동작 (`useConfirmHandoverItem`): 누르면 바로 바뀌고, 응답(노트 전체)에서는 **누른 항목 하나만** 반영해요 — 같은 노트의 다른 항목을 연달아 누를 때 먼저 온 응답이 아직 처리 안 된 항목을 되돌리지 않게. 같은 항목을 빠르게 여러 번 누르면 마지막 요청 결과만, 실패하면 그 항목만 서버가 마지막으로 확인해 준 상태로 되돌려요.

### 6-8. `GET /stores/{storeId}/handover-summary?date=YYYY-MM-DD` (하루 AI 요약, BE #41)

그날 인수인계 전체를 AI 가 2~4문장으로 요약해요. 저장하지 않고, 같은 내용이면 BE 메모리 캐시로 돌려줘서 자주 불러도 AI 호출은 늘지 않아요.

```json
{ "date": "2026-11-20", "summary": "꽃집 외상 한 잔은 오늘 계산하고, 딸기청과 원두가 한 개씩 남아 주문이 필요해요.", "noteCount": 2 }
```

| 필드 | 설명 |
| --- | --- |
| `summary` | 2~4문장. 그날 인수인계가 없으면 `null` |
| `noteCount` | 그날 노트 수 (특이사항 없음 포함). 없으면 `0` |

- AI 를 못 쓰면 `503 { code: "AI_UNAVAILABLE" }`
- FE (알바 홈 · `useHandoverDaySummary`): 요약 카드 본문에 쓰고, **불러오는 중 · 실패 · `null` 이면 노트 summary 를 한 줄씩 모은 글**(`dayHandoverSummary`)을 보여 줘요. 실패해도 에러 토스트 없음(`meta.silent`), `AI_UNAVAILABLE` 은 재시도 안 함. `noteCount` 가 화면의 노트 수와 다르면(다른 사람이 막 남김) 노트 요약을 보여 주고 다시 불러요. 인수인계를 저장하면 같이 새로 부르고, 체크 · 해제로는 안 불러요

## 7. 근무 (P1)
근무 가능 시간 입력 · 내 근무표 (docs/03 A5). 담당: 은교

### 7-0. `GET /stores/{storeId}/schedule-calendar?startDate=&endDate=` (공유 근무 달력) ✅ BE #31 (11/10, 은교)
11/10 회의: 알바 근무표는 **알바생 모두가 같이 보는 전체 스케줄**이에요. 구성원 누구나 부를 수 있고, 기간은 시작일부터 **최대 63일**이에요 (넘으면 `422 INVALID_CALENDAR_PERIOD`).

응답 `200`
```json
{
  "startDate": "2026-11-01",
  "endDate": "2026-12-05",
  "shifts": [
    {
      "assignmentId": "…",
      "templateId": "…",
      "date": "2026-11-20",
      "name": "마감",
      "start": "18:00",
      "end": "23:00",
      "role": "",
      "assignee": { "userId": "…", "memberId": "…", "name": "지은", "role": "staff" },
      "substituted": false
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `assignmentId` | 요일마다 반복되는 고정 근무 배정 ID → **`assignmentId` + `date`** 가 한 칸. 하루 조정한 근무는 `null` (대타 요청 불가) |
| `dailyShiftId` · `manuallyAdjusted` | BE #38: 하루 조정한 근무는 `dailyShiftId` 있음 · `manuallyAdjusted: true`, 고정 근무는 `null` · `false`. FE 는 `dailyShiftId ?? assignmentId` + `date` 로 칸을 구분해요 |
| `name` · `role` | 근무 이름(오픈 · 마감) · 역할 메모(없으면 `""`) |
| `assignee` | 그날 일하는 사람. 사장님이면 `role: "owner"`, 퇴사한 사람은 `memberId: null` · `name: "퇴사한 직원"` |
| `substituted` | 그날만 대타로 바뀐 칸 |

FE (`src/lib/api/schedule.ts`):
- `useScheduleCalendar(storeId, start, end)`: 근무표 탭 월 달력 (그 달을 덮는 6주, 최대 42일)
- `useMySchedule(storeId)`: 이번 주(월~일) 달력에서 **`assignee.userId === GET /users/me 의 userId`** 만 골라 홈 오늘 근무 · 이번 주 · 매장 목록 한 줄 · 급여 화면에 써요. 함께 일하는 사람 = 같은 날 시간이 겹치는 다른 사람

### 7-6. 대타 ✅ BE #31 (11/10 회의: 날짜 선택 → 사람 지정 → 그 사람이 수락하면 이름 변경)
구성원 누구나 써요. FE 스위치는 `schedule`을 같이 써요 (`src/lib/api/substitute.ts`).

| API | 요청 · 응답 |
| --- | --- |
| `GET /stores/{storeId}/schedule-workers` | `{ workers: [{ userId, memberId, name, role }] }` — 대타로 고를 사람 (나 · 사장님 포함, FE가 나를 빼요). 사장님은 `memberId: null` |
| `POST /stores/{storeId}/substitute-requests` | `{ assignmentId, date, targetUserId }` → `201` 요청 1개 |
| `GET /stores/{storeId}/substitute-requests?box=received\|sent&status=` | `{ requests: [{ requestId, status, date, assignmentId, shiftName, start, end, requester, target, isRead, createdAt, respondedAt }] }`. `status`: `PENDING` · `ACCEPTED` · `REJECTED` · `CANCELLED`. **받은 목록을 부르면 읽음 처리** |
| `POST …/substitute-requests/{requestId}/accept` · `/reject` | 요청 1개. 수락하면 그날 그 근무가 받은 사람 이름으로 바뀌어요 (`schedule-calendar`의 `substituted: true`) |

에러 (`{code, message}`) → FE 토스트
| code | FE 문장 |
| --- | --- |
| `PAST_SHIFT` (422) | 이미 지난 근무라 대타를 요청할 수 없어요 |
| `NOT_ASSIGNEE` (403) | 내 근무에만 대타를 요청할 수 있어요 |
| `SUBSTITUTE_REQUEST_CONFLICT` (409) | 이미 진행 중이거나 처리된 대타 요청이에요 |
| `SUBSTITUTE_TIME_CONFLICT` (409) | 그 시간에 이미 근무가 있어서 맡을 수 없어요 |
| `INVALID_SUBSTITUTE` (422) | 이 사람에게는 대타를 맡길 수 없어요 |
| `NOT_SUBSTITUTE_TARGET` (403) | 나에게 온 요청만 수락하거나 거절할 수 있어요 |
| `SHIFT_NOT_FOUND` · `SUBSTITUTE_REQUEST_NOT_FOUND` (404) | 그날 근무를 · 대타 요청을 찾지 못했어요 |

FE 화면: 근무표 날짜 목록의 내 근무(오늘 이후) [대타 요청] → 시트에서 사람 고르기 / 진행 중이면 "○○님에게 대타 요청 중" · 근무표 맨 위 받은 요청 카드 [거절] [수락] · 근무표 아래 보낸 요청 상태 · 홈 한 줄 배너. 요청 · 응답 뒤 근무 달력 · 내 근무 · 대타 목록 · 예상 급여를 다시 불러요. 대타 알림은 연서님 알림 API 후(챕터 D)

> ⛔ 아래 7-1(`/schedules/me`) · 7-2 ~ 7-5(`/availabilities`)는 **BE #31에서 없어졌어요**. 기록용으로 남겨 둬요. FE는 진짜 모드에서 근무 가능 시간 화면으로 들어가는 곳을 숨겨요 (`availabilityEnabled`)

### 7-1. ~~`GET /stores/{storeId}/schedules/me`~~ (내 스케줄 — BE #31에서 없어짐)
홈 주간 달력 · 오늘 근무 카드 · 근무표에 써요. 주간 달력의 "근무 있는 날", 오늘 근무 카드, 매장 목록 한 줄("주 3회 마감" · "주말 오후")은 FE가 `shifts`에서 만들어요.

응답 `200`
```json
{
  "today": "2026-11-20",
  "weekStart": "2026-11-16",
  "weekHours": 10,
  "weeklyAllowanceHours": 15,
  "weekNote": "오늘 마감 후 15시간 · 주휴수당 대상",
  "shifts": [
    {
      "shiftId": "shf_1116",
      "date": "2026-11-16",
      "start": "18:00",
      "end": "23:00",
      "role": "마감",
      "crew": ["도윤"]
    },
    {
      "shiftId": "shf_1120",
      "date": "2026-11-20",
      "start": "18:00",
      "end": "23:00",
      "role": "마감",
      "crew": ["도윤", "민수"]
    }
  ]
}
```
| 필드 | 뜻 |
| --- | --- |
| `today` | 서버 기준 오늘 (기기 시간대가 달라도 같은 날로 보이게) |
| `weekStart` | 이번 주 월요일 |
| `weekHours` · `weeklyAllowanceHours` | 이번 주 근무 시간 / 주휴수당 기준(15시간) → 근무표 동그라미 그래프 |
| `weekNote` | 이번 주 한 줄 설명 (규칙으로 만들어 주세요) |
| `shifts` | 확정된 내 근무, 날짜 순. `crew`는 함께 일하는 사람(나 빼고). FE가 근무표에 "마감 · 지은 · 도윤"으로 보여 줘요 |

> 11/9 BE PR #24(은교, 아직 main 아님) 확인: 위 모양과 같아요. 다른 점 — `today` · `weekStart`(월요일)는 한국 날짜, **사장님이 공개(published)한 근무만**, 이번 주 월요일부터 앞으로의 근무만 와요. `role`은 안 정하면 `""` → FE가 "근무"로 보여 줘요. `crew`에 퇴사한 사람은 "퇴사한 직원". 사장님 계정이면 `403 FORBIDDEN`. FE는 main에 합쳐지기 전(404)엔 빈 근무표로 보여 줘요

### 7-2. ~~`GET /stores/{storeId}/availabilities/me`~~ (내 근무 가능 시간 — BE #31에서 없어짐)
응답 `200`
```json
{
  "availabilityId": "avl_31",
  "month": "2026-12",
  "deadline": "2026-11-25",
  "days": [
    { "date": "2026-12-15", "status": "unavailable" },
    { "date": "2026-12-16", "status": "unavailable" }
  ],
  "memo": "15~19일 기말고사 · 주 3회 마감 희망",
  "submittedAt": "2026-11-20T21:10:00+09:00"
}
```
| 필드 | 뜻 |
| --- | --- |
| `availabilityId` | 낸 근무 가능 시간 ID (수정 · 삭제할 때). **아직 안 냈으면 `null`** |
| `month` · `deadline` | 가능 시간을 받는 달 · 마감일 (근무표의 "12월 가능 시간 제출 · 11/25(수) 마감"). 안 냈어도 주세요 |
| `days` | `"available"` 가능 · `"unavailable"` 불가. 안 칠한 날은 빼요. 안 냈으면 `[]` |
| `submittedAt` | 낸 시각, 안 냈으면 `null` (근무표: "제출 완료 · 확정 대기") |

> ✅ 11/9 BE main 실제 응답과 같아요 (은교). 받는 달: 그달 25일까지는 다음 달, 지나면 다다음 달. 등록은 `{ month, days, memo }`, 수정(PATCH)은 `{ days, memo }` (통째로). 에러: `409 AVAILABILITY_EXISTS`(이미 냄) · `409 AVAILABILITY_CLOSED`(마감) · `403 FORBIDDEN`(알바생만) · `422`(달이 다른 날짜). 메모 최대 500자 · 날짜 31개. FE는 409면 서버 내용을 다시 불러오고 문장만 알려요. 스위치 이름은 `availability` (내 근무표 `schedule`과 따로)

### 7-3. `POST /stores/{storeId}/availabilities` (등록)
처음 낼 때 (`availabilityId`가 `null`일 때). 요청
```json
{
  "month": "2026-12",
  "days": [{ "date": "2026-12-15", "status": "unavailable" }],
  "memo": "15~19일 기말고사 · 주 3회 마감 희망"
}
```
응답 `201` — [7-2](#7-2-get-storesstoreidavailabilitiesme-내-근무-가능-시간) 모양. 에러: `409 AVAILABILITY_EXISTS` (이미 냄 → 수정으로), `409 AVAILABILITY_CLOSED` (마감 지남), `422 VALIDATION_ERROR`

### 7-4. `PATCH /stores/{storeId}/availabilities/{availabilityId}` (수정)
다시 낼 때. 요청
```json
{
  "days": [{ "date": "2026-12-15", "status": "available" }],
  "memo": "15일은 가능해요"
}
```
응답 `200` — [7-2](#7-2-get-storesstoreidavailabilitiesme-내-근무-가능-시간) 모양. 에러: `404 NOT_FOUND`, `409 AVAILABILITY_CLOSED`

### 7-5. `DELETE /stores/{storeId}/availabilities/{availabilityId}` (삭제)
응답 `204`. 에러: `404 NOT_FOUND`. 지금 FE 화면에는 삭제 버튼이 없어요

---

## 8. 급여 (P1)
계산은 **규칙(코드)으로**, AI는 쉬운 설명만 해요 (`docs/01`). 금액은 화면에 항상 "참고용"으로 보여 줘요.

### 8-1. `GET /stores/{storeId}/payroll/estimates/me` (내 예상 급여)
이번 달 예상 급여. 담당: 연서

응답 `200`
```json
{
  "storeId": "str_dalbit",
  "month": "2026-11",
  "hourlyWage": 10320,
  "payday": 10,
  "taxType": "3.3",
  "weeklyAllowanceEnabled": true,
  "workDays": [
    { "date": "2026-11-02", "start": "18:00", "end": "23:00", "hours": 5, "status": "worked" },
    { "date": "2026-11-20", "start": "18:00", "end": "23:00", "hours": 5, "status": "worked" },
    { "date": "2026-11-23", "start": "18:00", "end": "23:00", "hours": 5, "status": "planned" }
  ],
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
| `hourlyWage` · `payday` · `taxType` · `weeklyAllowanceEnabled` | 이 계산에 쓴 급여 설정. 알바 화면 급여 설정(`/staff/stores/:storeId`)도 이 값을 보여 줘요 ([질문 4](#9-be에-확인하고-싶은-것)) |
| `payday` | 급여일 1~31 (11/11 BE fde9cca: 29 · 30도 받음). 그 달에 없는 날(2월 30일 등)이면 FE는 그 달 말일로 입금일을 계산해요. 사장님이 안 정하면 `null` |
| `workDays` | 이번 달 근무한 날(`worked`) · 예정(`planned`) — 급여 달력과 날짜별 "18:00 – 23:00 · 5시간" |
| `taxType` | `"none"` 공제 없음 · `"3.3"` 3.3% · `"ins"` 4대보험 |
| `weeks` | 주별 근거 (docs/03 A6). 주휴수당은 주 15시간 이상인 주만 |
| `aiNote` | AI 쉬운 설명 (계산에는 안 씀) |
| `isEstimate` | 확정 근무가 남아 있으면 `true` → FE가 "참고용 · 예상" 표시 |

> 숫자는 FE 가짜 데이터(`calcPay`)와 같은 규칙이에요: 기본급 = 시간 × 시급, 공제 = (기본급 + 주휴수당) × 공제율 (10원 단위 반올림). 공휴일 가산은 없어요 (docs/03 S7).

> 11/9 BE PR #28(연서, 아직 main 아님) 확인: 위 모양과 같아요. `?month=YYYY-MM`(빼면 한국 시간 이번 달), **사장님이 공개한 스케줄 기준**이라 `isEstimate`는 항상 `true`, `aiNote`는 지금 `null`(FE는 설명 카드를 숨김), `payday`는 사장님이 안 정하면 `null`(FE는 "○월 예상 급여 · 급여일 미정"), 근무 시각 `"HH:MM"`, `hours`는 소수 둘째 자리, 근무가 끝난 시각이 지나면 `worked` 아니면 `planned`. 구성원이 아닌 사장님이 부르면 `403`. FE는 ‹ › 로 달을 넘기며 `?month=`를 보내요

> 11/11 BE #31(은교) 이후: 같은 주소 · 같은 모양이고 **고정 근무표(공유 근무 달력) 기준**으로 계산해요. `workDays: [{ date, start, end, hours, status: "worked" | "planned" }]` (`app/schemas/payroll.py`). FE 예상 급여 달력은 날짜 밑에 `workDays`를 "18–23" 블록으로(일한 날 진하게 · 예정 연하게), 아래에 회색 근무 시간 목록을 보여 줘요. 가짜 서버도 가짜 근무표에서 내 근무만 골라 계산해서 근무표 탭과 같은 날이 보여요

### 8-2. `PUT /stores/{storeId}/members/{memberId}/hourly-wage` (시급 설정 — 사장님 기능)
사장님 화면(나현)에서 써요. 알바 화면은 보기만 해요 ([질문 4](#9-be에-확인하고-싶은-것)).

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

## 10. 알림 (BE `feature_notifications`, 연서 — 11/11 아직 main 아님 · DB 마이그레이션 20)
FE 스위치: `notifications` (`src/lib/api/notifications.ts`). 알바 · 사장님 같이 쓸 수 있게 `storeId`만 받아요.

### 10-1. `GET /stores/{storeId}/notifications` — 최근 14일 · 내 역할 것만
```json
{
  "banner": {
    "workDate": "2026-11-20", "startTime": "18:00", "endTime": "23:00", "startsAt": "2026-11-20T18:00:00+09:00",
    "uncheckedCount": 3,
    "items": [{ "noteId": "…", "itemId": "…", "tag": "credit", "text": "꽃집 외상 1잔", "authorName": "민수", "workDate": "2026-11-20" }]
  },
  "notifications": [
    { "notificationId": "…", "type": "SUBSTITUTE_REQUESTED", "title": "대타 요청이 왔어요", "body": "도윤님이 … 근무 대타를 부탁했어요",
      "createdAt": "…", "isRead": false, "target": { "kind": "substitute_request", "id": "…" } }
  ],
  "unreadCount": 2
}
```
| 필드 | 뜻 |
| --- | --- |
| `banner` | 출근 30분 전 ~ 근무 끝까지만 (없으면 `null`). 체크 안 된 인수인계 항목 (AI 요약 없음) |
| `type` | 알바: `SUBSTITUTE_REQUESTED` · `SUBSTITUTE_ACCEPTED`(요청한 사람에게) · `OWNER_ANSWERED` / 사장님: `HANDOVER_CREATED` · `OWNER_QUESTION_ASKED` |
| `target.kind` | `substitute_request` · `assistant_chat` · `handover` · `owner_question` |
| `OWNER_ANSWERED` 의 `target.id` | 채팅방 ID (11/11 연서 확정). 알바 채팅은 매장마다 방 1개라 FE는 `/staff/chat`으로 가서 메시지를 새로 불러오고 마지막 사장님 답변 위치로 스크롤해요 |

### 10-2. `POST /stores/{storeId}/notifications/read` → `204`
지금까지 알림 전부 읽음.

FE (민지 결정, 11/11): 알림 화면을 열면 전부 읽음 · 출근 30분 전 요약은 앱 안 홈 배너(푸시 X) · 화면에 들어올 때 + 1분마다 다시 부름 · 알바 헤더 종에 `unreadCount` 뱃지 · 누르면 대타 → 근무표, 사장님 답변 → AI 사수 채팅, 그 외 → 홈. 홈의 받은 대타 배너는 **알림 API 기준**(안 읽은 `SUBSTITUTE_REQUESTED`)이라 홈을 열기만 해서는 대타 요청이 읽음 처리되지 않아요 (받은 대타 목록 GET은 BE가 읽음 처리하므로 근무표에서만 불러요). 알림 API가 404면(아직 main 아님) 알림 없음으로 보여요

## 9. BE에 확인하고 싶은 것

**API 표를 보고 생긴 질문**
1. **`POST /auth/bootstrap`이 표에 없어요.** 처음 로그인 시 사용자 생성은 어디서 하나요? (`GET /users/me`에서 없으면 자동 생성도 OK)
2. OAuth URL · 콜백 · 토큰 재발급 · 로그아웃(`/auth/...`)은 **Supabase가 해서 BE에서 안 만들어도 돼요**
3. **인수인계 확인 완료가 P2인데, FE 홈은 항목별 체크가 P0예요.** 항목별 체크를 P0로 할 수 있을까요? ([6-7](#6-7-post-storesstoreidhandover-notesnoteidconfirmations-확인) 제안 모양)
4. ✅ **사장님이 정함, 알바는 보기 전용** (11/9 BE #27 · #28 확인) 시급은 사장님(`PUT …/members/{memberId}/hourly-wage`), 급여일은 사장님 매장 설정(`PATCH /stores/{id}` `payday`), 공제 방식을 바꾸는 API는 없음, 주휴수당은 항상 켜짐 → 알바 화면 `/staff/stores/:storeId`는 값만 보여 줘요 (11/9 FE 반영). 원래 질문: **시급을 사장님이 정하면**, 알바 화면의 '매장별 시급 입력'(`/staff/stores/:storeId`)은 **보기 전용**으로 바꿀게요. 맞나요? (급여일 · 공제 방식도 사장님이 정하나요?)
5. **초대 코드 목록 조회가 P2인데**, 사장님 직원 · 코드 화면이 P0라 **P0로 부탁해요**
6. ✅ (11/9 BE main에 들어감, [5-3](#5-3-사장님께-물어보기)) **사장님께 물어보기 API가 표에 없어요.** 질문 보내기는 P0라 필요해요 ([5-3](#5-3-사장님께-물어보기) 제안 모양). 사장님 답변 · 매뉴얼 추가(P1) API도 사장님 화면과 함께 정해 주세요

**응답 모양 질문**
7. 필드 이름 **camelCase**로 줄 수 있나요? (snake_case면 FE가 변환 계층을 추가해야 해요)
8. 에러 모양 `{ code, message, detail }` 괜찮나요?
9. `INVITE_ALREADY_JOINED`에 매장 ID · 이름(`detail`)을 넣어 줄 수 있나요? ([○○로 가기] 버튼에 필요)
10. 레시피 목록에 재료까지 넣어도 괜찮나요? (재료 검색을 FE에서 하려고)
11. 인수인계는 하루에 여러 개 남길 수 있나요? (FE는 여러 개를 받을 수 있게 `notes` 배열로 제안)
12. 인수인계 체크는 매장 공용이 맞나요? (한 명이 체크하면 모두에게 체크)
13. AI 답변이 몇 초 걸리나요? 길면 스트리밍 여부 논의
14. Swagger(`/openapi.json`) 주소가 생기면 공유해 주세요 → FE가 `npm run api`로 타입 · 훅을 자동 생성해요 (`docs/05`)
15. **에러 코드는 초대코드만 꼭 필요해요**: `INVITE_INVALID` · `INVITE_ALREADY_JOINED`(detail에 매장 ID · 이름) · `INVITE_LOCKED`. 나머지 API는 FastAPI 기본 `{detail}`이어도 FE가 읽어요. (11/6 BE main 확인: 이미 이 모양이에요 — 그대로 유지해 주세요)
16. ✅ (11/9 BE #25로 들어옴) **`GET /users/me/stores`에 매장 정보를 더 넣어 주세요** ([1-3](#1-3-get-usersmestores)): 지금은 `storeId · storeName · role`뿐이고, 알바는 `GET /stores/{id}`(사장님 전용)도 못 불러요. 알바 화면에 `ownerName` · `staffName` · `address` · `photoUrl`(+ `memberId` · `joinedAt`)이 필요해요
17. **레시피 응답(목록 · 상세)에 메뉴 사진 `imageUrl`(없으면 `null`)을 넣어 주세요.** 사장님이 사진을 올리면(레시피 등록 multipart `images`) 그 주소를 주면 돼요. 지금은 FE가 메뉴 이름으로 시연 사진을 찾아요
    - 11/11 연서와 정함 (BE `feature_recipe_images`): 등록 multipart `recipe`(JSON 문자열) · `image`(메뉴 사진) · `recipeImage`(레시피 사진, FE는 당분간 안 씀). 수정은 글 PATCH(JSON) 그대로 + 사진만 `PUT` · `DELETE /stores/{storeId}/recipes/{recipeId}/images/{slot}` (`slot` = `menu` · `recipe`, PUT 파일 칸 `image`, DELETE는 204). FE는 새 파일이면 PUT · `null`이면 DELETE · `undefined`면 안 불러요. 응답 `imageUrl` · `recipeImageUrl`(6시간짜리 주소라 저장하지 않고 조회할 때마다 받아 써요). JPEG · PNG · WebP, 10MB 이하 — 넘으면 `413 IMAGE_TOO_LARGE`, 다른 형식이면 `415 UNSUPPORTED_IMAGE_TYPE`

