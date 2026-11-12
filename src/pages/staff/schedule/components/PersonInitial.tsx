import type { PersonColor } from '@/pages/staff/schedule/personColor'

/** 이름 첫 글자 동그라미 (사장님 직원 목록 카드의 PersonAvatar 와 같은 모양, 색은 사람별 파스텔) */
export function PersonInitial({
  name,
  color,
  size = 40,
}: {
  name: string
  color: PersonColor
  size?: number
}) {
  const [bg, fg] = color
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: bg,
        color: fg,
      }}
    >
      {name.trim().slice(0, 1)}
    </span>
  )
}
