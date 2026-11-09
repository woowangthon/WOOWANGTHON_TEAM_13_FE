import { ArrowUp } from 'lucide-react'
import { CHAT_TEXT_MAX } from '@/lib/api/assistantChat'
import { LengthHint } from '@/shared/LengthHint'
import { Chip } from '@/ui/Chip'
import { IconButton } from '@/ui/IconButton'

// 채팅 부품: 입력창 · 자주 묻는 질문 칩 (하단 탭 위에 고정)
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (text: string) => void
  chips: string[]
}

export function ChatInput({ value, onChange, onSend, chips }: ChatInputProps) {
  return (
    <div className="fixed bottom-[92px] left-1/2 z-[15] flex w-full max-w-[460px] -translate-x-1/2 flex-col gap-2 bg-[linear-gradient(rgba(241,236,227,0),#F1ECE3_32%)] px-4 pt-3 pb-1.5">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {chips.map((chip) => (
          <Chip key={chip} onClick={() => onSend(chip)}>
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
        className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-1.5 pl-5 shadow-[0_4px_18px_rgba(40,46,36,0.08)]"
      >
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="질문 입력"
          aria-label="질문 입력"
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
