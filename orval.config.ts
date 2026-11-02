import { defineConfig } from 'orval'

// BE(FastAPI) Swagger 문서로 API 함수와 타입을 자동 생성한다.
// 실행: npm run api  (BE 서버 주소가 다르면 OPENAPI_URL 환경 변수로 바꾼다)
export default defineConfig({
  api: {
    input: {
      target: process.env.OPENAPI_URL ?? 'http://localhost:8000/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: 'src/lib/apiClient.ts',
          name: 'apiFetch',
        },
      },
    },
  },
})
