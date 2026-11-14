// 가짜 데이터: 공유 근무 달력 — BE 연결 전까지 사용 (API 모양은 api/schedule.ts)

/** 근무하는 사람. userId 'me' 는 로그인한 사람(시연: 지은)으로 바뀐다 */
export interface MockWorker {
  userId: string
  name: string
  role: 'owner' | 'staff'
}

/** 요일마다 반복되는 근무 (요일 0=일 … 6=토) */
export interface MockWeeklyShift {
  id: string
  name: string
  start: string
  end: string
  role: string
  dows: number[]
  worker: string
}

/** 그날만 다른 사람으로 바뀐 칸 (대타) — "근무 id|날짜" → 바뀐 사람 */
export type MockSubstitutes = Record<string, string>

export interface MockStoreSchedule {
  workers: MockWorker[]
  weekly: MockWeeklyShift[]
  substitutes: MockSubstitutes
}

export const storeSchedules: Record<string, MockStoreSchedule> = {
  dalbit: {
    workers: [
      { userId: 'me', name: '지은', role: 'staff' },
      { userId: 'usr_minsu', name: '민수', role: 'staff' },
      { userId: 'usr_seoyeon', name: '서연', role: 'staff' },
      { userId: 'usr_doyun', name: '도윤', role: 'staff' },
      { userId: 'usr_owner_park', name: '박 사장님', role: 'owner' },
    ],
    weekly: [
      {
        id: 'asg_open_minsu',
        name: '오픈',
        start: '09:00',
        end: '13:30',
        role: '',
        dows: [1, 2, 3, 4],
        worker: 'usr_minsu',
      },
      {
        id: 'asg_open_seoyeon',
        name: '오픈',
        start: '09:00',
        end: '13:30',
        role: '',
        dows: [5],
        worker: 'usr_seoyeon',
      },
      {
        id: 'asg_mid_seoyeon',
        name: '미들',
        start: '13:00',
        end: '18:00',
        role: '',
        dows: [0, 6],
        worker: 'usr_seoyeon',
      },
      {
        id: 'asg_mid_owner',
        name: '미들',
        start: '15:00',
        end: '18:00',
        role: '사장님',
        dows: [2, 4],
        worker: 'usr_owner_park',
      },
      {
        id: 'asg_close_me',
        name: '마감',
        start: '18:00',
        end: '23:00',
        role: '',
        dows: [1, 3, 5],
        worker: 'me',
      },
      {
        id: 'asg_close_doyun',
        name: '마감',
        start: '18:00',
        end: '23:00',
        role: '',
        dows: [2, 4, 6],
        worker: 'usr_doyun',
      },
      {
        id: 'asg_close_minsu',
        name: '마감',
        start: '18:00',
        end: '23:00',
        role: '',
        dows: [0],
        worker: 'usr_minsu',
      },
      {
        id: 'asg_help_minsu',
        name: '마감 보조',
        start: '17:00',
        end: '22:00',
        role: '주말 손님 많음',
        dows: [5],
        worker: 'usr_minsu',
      },
    ],
    substitutes: {
      // 11/19(목) 도윤 마감 → 지은이 대신 · 11/25(수) 지은 마감 → 민수가 대신
      'asg_close_doyun|2026-11-19': 'me',
      'asg_close_me|2026-11-25': 'usr_minsu',
    },
  },
  afternoon: {
    workers: [
      { userId: 'me', name: '지은', role: 'staff' },
      { userId: 'usr_harin', name: '하린', role: 'staff' },
      { userId: 'usr_owner_choi', name: '최 사장님', role: 'owner' },
    ],
    weekly: [
      {
        id: 'asg_am_harin',
        name: '오전',
        start: '08:00',
        end: '12:00',
        role: '',
        dows: [1, 2, 3, 4, 5],
        worker: 'usr_harin',
      },
      {
        id: 'asg_pm_owner',
        name: '오후',
        start: '12:00',
        end: '18:00',
        role: '',
        dows: [1, 2, 4, 5],
        worker: 'usr_owner_choi',
      },
      {
        id: 'asg_pm_harin',
        name: '오후',
        start: '12:00',
        end: '18:00',
        role: '',
        dows: [3],
        worker: 'usr_harin',
      },
      {
        id: 'asg_pm_me',
        name: '오후',
        start: '12:00',
        end: '18:00',
        role: '',
        dows: [0, 6],
        worker: 'me',
      },
    ],
    substitutes: {},
  },
}
