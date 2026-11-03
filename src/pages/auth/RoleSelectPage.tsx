import { ChevronRight } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { signOut } from '@/lib/auth'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'

// 역할 선택: 사장님은 매장 만들기, 알바생은 초대코드 입장으로
const CHOICES: { role: StoreRole; emoji: string; title: string; desc: string; to: string }[] = [
  {
    role: 'owner',
    emoji: '☕',
    title: '매장을 운영해요',
    desc: '매장을 만들고 알바생을 초대해요',
    to: '/owner/store/new',
  },
  {
    role: 'staff',
    emoji: '🙋',
    title: '매장에서 일해요',
    desc: '사장님께 받은 초대코드로 들어가요',
    to: '/staff/join',
  },
]

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const setPendingRole = useAuthStore((state) => state.setPendingRole)

  if (!env.skipAuth) {
    if (!isReady) return <Spinner className="min-h-dvh items-center" />
    if (!isLoggedIn) return <Navigate to="/login" replace />
  }

  const choose = (role: StoreRole, to: string) => {
    setPendingRole(role)
    navigate(to)
  }

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthFrame className="justify-between gap-8">
      <section className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col gap-1.5 px-1">
          {me && (
            <p className="m-0 text-[15px] font-semibold text-subtle">{me.nickname} 님, 반가워요</p>
          )}
          <h1 className="m-0 text-[26px] leading-tight font-extrabold">어떻게 시작할까요?</h1>
        </div>

        <div className="flex flex-col gap-3">
          {CHOICES.map((choice) => (
            <button
              key={choice.role}
              type="button"
              onClick={() => choose(choice.role, choice.to)}
              className="flex items-center gap-4 rounded-[24px] bg-card p-5 text-left shadow-soft transition-transform active:scale-[0.98]"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-brand-soft text-[28px]">
                {choice.emoji}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <strong className="text-[17px] font-extrabold">{choice.title}</strong>
                <span className="text-sm text-subtle">{choice.desc}</span>
              </span>
              <ChevronRight className="size-5 text-faint" />
            </button>
          ))}
        </div>
      </section>

      <Button variant="ghost" size="md" className="self-center" onClick={logout}>
        다른 계정으로 로그인
      </Button>
    </AuthFrame>
  )
}
