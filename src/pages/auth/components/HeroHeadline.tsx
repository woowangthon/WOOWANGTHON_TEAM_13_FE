// 데스크톱 왼쪽 패널 큰 문구 (로그인 · 역할 선택 같이): 슬로건 세 줄
// as: 화면 제목(h1)이 따로 있는 화면은 'p' 로 (역할 선택의 "어떻게 사용하세요?")
export function HeroHeadline({ as: Tag = 'h1' }: { as?: 'h1' | 'p' }) {
  return (
    <Tag
      aria-label="혼자 막막했던 근무를 함께하는 크루로, crewBean"
      className="m-0 text-[42px] leading-[1.25] font-extrabold tracking-[-1.5px] break-keep text-[#373d20]"
    >
      혼자 막막했던 근무를 <br />
      함께하는 크루로, <br />
      crewBean
    </Tag>
  )
}
