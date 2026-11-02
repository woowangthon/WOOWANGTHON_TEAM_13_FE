import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>페이지를 찾을 수 없어요</h1>
      <Link to="/">처음으로 돌아가기</Link>
    </main>
  )
}
