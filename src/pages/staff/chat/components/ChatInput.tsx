import { ArrowUp } from 'lucide-react'
import { CHAT_TEXT_MAX } from '@/lib/api/assistantChat'
import { LengthHint } from '@/shared/LengthHint'
import { Chip } from '@/ui/Chip'
import { IconButton } from '@/ui/IconButton'

// 채팅 부품: 입력창 · 자주 묻는 질문 칩 (하단 탭 바로 위에 고정: 탭 바닥 띄움 max(12px, 홈 바) + 탭 높이 58px)
// 흰 바탕 위 크림색(bg-card) 칩 · 입력칸은 옅은 테두리(line 60%)로 구분 (docs/08 4). 입력칸 56px · 보내기 42px
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (text: string) => void
  chips: string[]
}

export function ChatInput({ value, onChange, onSend, chips }: ChatInputProps) {
  return (
    <div className="fixed bottom-[calc(max(12px,env(safe-area-inset-bottom))+58px)] left-1/2 z-[15] flex w-full max-w-[460px] -translate-x-1/2 flex-col gap-2 bg-linear-to-b from-white/0 to-white to-32% px-4 pt-3 pb-1.5">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {chips.map((chip) => (
          <Chip key={chip} className="border border-line/60" onClick={() => onSend(chip)}>
            {chip}
          </Chip>
        ))}
      </div>
      <LengthHint length={value.length} max={CHAT_TEXT_MAX} className="px-4" />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSend(value)
        }}
        className="flex h-14 items-center gap-2 rounded-full border border-line/60 bg-card pr-2 pl-5 focus-within:border-line"
      >
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="궁금한 걸 적어 주세요"
          aria-label="궁금한 걸 적어 주세요"
          maxLength={CHAT_TEXT_MAX}
          // 16px 이상이어야 아이폰이 입력할 때 화면을 확대하지 않는다
          className="min-w-0 flex-1 border-none bg-transparent text-base placeholder:text-subtle"
        />
        <IconButton type="submit" aria-label="보내기" variant="brand" disabled={!value.trim()}>
          <ArrowUp />
        </IconButton>
      </form>
    </div>
  )
}
