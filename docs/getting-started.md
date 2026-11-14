# 실행 방법

> 배포 사이트에서 써 보는 방법과 로컬에서 실행하는 방법이에요.

## 실행 방법

### 배포 사이트에서 보기

1. **https://woowangthon-team-13-fe.vercel.app** 접속 (휴대폰 권장 · 알바생 화면은 PC에서도 가운데 휴대폰 화면, 사장님 화면은 PC용 넓은 화면 지원)
2. 카카오 또는 구글로 로그인 → 역할 선택(사장님 / 알바생)
3. **알바생**: 사장님께 받은 초대코드 6자리로 매장 입장 / **사장님**: 매장 등록(사업자등록번호 확인) 후 직원 초대
4. (선택) 휴대폰 브라우저 메뉴의 **홈 화면에 추가** → 앱처럼 실행 · 마이페이지에서 앱 알림 켜기

> 심사용 데모 매장 초대코드 · 테스트 방법은 최종 제출 폼에 함께 적었어요.

### 로컬에서 실행

```bash
npm install
cp .env.example .env   # 값은 팀에서 공유받아 채웁니다 (비밀키는 커밋 금지)
npm run dev            # http://localhost:5173 (로그인 리다이렉트 때문에 5173 포트)
```

**둘러보기 모드 (로그인 · BE 없이)** — `.env`에서 `VITE_SKIP_AUTH=true`, `VITE_REAL_API=`(비움) → 시연 데이터로 모든 화면을 볼 수 있어요.

**진짜 BE 연결 모드** — BE를 켜고 `.env`를 맞춥니다.

| 변수                                                  | 뜻                                                      |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `VITE_API_URL`                                        | BE 주소 (`http://localhost:8000/api/v1` 또는 배포 주소) |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 로그인 (공개용 키만)                           |
| `VITE_KAKAO_JS_KEY`                                   | 카카오톡 공유                                           |
| `VITE_VAPID_PUBLIC_KEY`                               | Web Push 공개키 (BE의 `VAPID_PUBLIC_KEY`와 같은 값)     |
| `VITE_SKIP_AUTH`                                      | `true`면 로그인 없이 화면 보기 (개발용)                 |
| `VITE_REAL_API`                                       | 진짜 API로 부를 기능 (`all` 또는 기능 이름 쉼표 구분)   |

| 명령어           | 설명                                                   |
| ---------------- | ------------------------------------------------------ |
| `npm run dev`    | 개발 서버                                              |
| `npm run build`  | 타입 검사 + 배포용 빌드                                |
| `npm run lint`   | ESLint                                                 |
| `npm run format` | Prettier                                               |
| `npm run api`    | BE Swagger로 API 함수 자동 생성 (`src/api/generated/`) |

---

[← README로 돌아가기](../README.md)
