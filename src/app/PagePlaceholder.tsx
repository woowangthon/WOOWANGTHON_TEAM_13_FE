// 아직 만들지 않은 화면에 임시로 보여 주는 안내. 화면을 개발하면 이 컴포넌트를 지운다.
export function PagePlaceholder({ title, owner }: { title: string; owner: '민지' | '나현' }) {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{title}</h1>
      <p style={{ margin: 0, color: '#6b7280' }}>준비 중인 화면이에요 · 담당 {owner}</p>
    </main>
  )
}
