import { BellOff, BellRing, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  type PushStatus,
} from '@/lib/pushNotifications'
import { SectionHeader } from '@/shared/SectionHeader'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

const COPY: Record<Exclude<PushStatus, 'loading'>, { title: string; description: string }> = {
  unsupported: {
    title: '이 기기에서는 알림을 켤 수 없어요',
    description: '아이폰은 Safari에서 홈 화면에 추가한 crewBean 앱으로 다시 열어 주세요.',
  },
  denied: {
    title: '알림이 차단되어 있어요',
    description: '휴대폰 설정에서 crewBean 알림을 허용한 뒤 다시 확인해 주세요.',
  },
  ready: {
    title: '앱 알림 받기',
    description: '알바생 질문과 사장님 답변을 앱을 닫아도 바로 알려드려요.',
  },
  subscribed: {
    title: '앱 알림을 받고 있어요',
    description: '질문과 답변이 오면 휴대폰 알림으로 알려드려요.',
  },
}

export function PushNotificationSetting() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    void getPushStatus()
      .then(setStatus)
      .catch(() => setStatus('unsupported'))
  }, [])

  const toggle = async () => {
    setPending(true)
    try {
      if (status === 'subscribed') {
        await disablePushNotifications()
        setStatus('ready')
        toast('앱 알림을 껐어요')
      } else {
        await enablePushNotifications()
        setStatus('subscribed')
        toast('앱 알림을 켰어요')
      }
    } catch (error) {
      const denied = error instanceof Error && error.message === 'PUSH_PERMISSION_DENIED'
      setStatus(denied ? 'denied' : await getPushStatus().catch((): PushStatus => 'unsupported'))
      toast.error(denied ? '알림 권한을 허용해 주세요' : '알림 설정을 저장하지 못했어요')
    } finally {
      setPending(false)
    }
  }

  if (status === 'loading') return null
  const copy = COPY[status]
  const enabled = status === 'subscribed'
  const actionable = status === 'ready' || enabled

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="앱 알림" />
      <div className="flex items-center gap-3.5 rounded-[22px] border border-line/60 bg-card px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          {enabled ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-[1.4] font-bold">{copy.title}</span>
          <span className="text-[13px] leading-normal font-medium text-muted-foreground break-keep">
            {copy.description}
          </span>
        </span>
        {actionable && (
          <Button
            size="sm"
            variant={enabled ? 'soft' : 'brand'}
            disabled={pending}
            onClick={toggle}
          >
            {pending ? (
              <LoaderCircle aria-label="저장 중" className="size-4 animate-spin" />
            ) : enabled ? (
              '끄기'
            ) : (
              '켜기'
            )}
          </Button>
        )}
      </div>
    </section>
  )
}
