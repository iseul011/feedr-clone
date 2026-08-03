import { Link } from 'react-router-dom'
import { CalendarDays, ChartNoAxesColumn, Check, LayoutGrid, Send, Zap } from 'lucide-react'
import SnsIcon, { type SnsIconName } from './SnsIcon'

function SchedulePreview() {
  const rows: { icon: SnsIconName; name: string; time: string; status: string; statusColor: string; statusBg: string }[] = [
    { icon: 'instagram', name: 'Instagram', time: '오늘 오후 7:00', status: '예약됨', statusColor: '#E4405F', statusBg: '#FFF0F5' },
    { icon: 'youtube', name: 'YouTube Shorts', time: '오늘 오후 7:00', status: '예약됨', statusColor: '#FF0000', statusBg: '#FFF0F0' },
    { icon: 'tiktok', name: 'TikTok', time: '내일 오전 9:00', status: '대기 중', statusColor: '#6B7280', statusBg: '#F3F4F6' },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>발행 예약</span>
        <span style={{ fontSize: '12px', color: '#3B5BDB', fontWeight: 600, background: '#EEF2FF', padding: '3px 8px', borderRadius: '6px' }}>3개 예약됨</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <SnsIcon name={t.icon} size={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{t.time}</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: t.statusColor, background: t.statusBg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{t.status}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Check size={14} color="#3B5BDB" strokeWidth={2.5} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#3B5BDB' }}>동시 발행 설정 완료</span>
      </div>
    </div>
  )
}

function CalendarPreview() {
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const marks: Record<number, SnsIconName> = { 2: 'instagram', 5: 'threads', 7: 'linkedin', 9: 'instagram', 12: 'youtube', 14: 'tiktok', 16: 'tiktok', 19: 'instagram', 21: 'facebook' }
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>2026년 4월</span>
        <span style={{ fontSize: '12px', color: '#3B5BDB', fontWeight: 600 }}>9개 예약</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', paddingBottom: '6px' }}>{d}</div>
        ))}
        {Array.from({ length: 21 }, (_, i) => i + 1).map(n => (
          <div key={n} style={{ aspectRatio: '1', borderRadius: '8px', background: marks[n] ? '#F5F7FF' : '#F9FAFB', border: marks[n] ? '1px solid #E0E4F8' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {marks[n] ? <SnsIcon name={marks[n]} size={11} /> : <span style={{ fontSize: '10px', color: '#D1D5DB' }}>{n}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsPreview() {
  const rows: { icon: SnsIconName; name: string; reach: string; change: string; up: boolean }[] = [
    { icon: 'tiktok', name: 'TikTok', reach: '14.2K', change: '+12%', up: true },
    { icon: 'instagram', name: 'Instagram', reach: '8.7K', change: '+5%', up: true },
    { icon: 'threads', name: 'Threads', reach: '6.1K', change: '+18%', up: true },
    { icon: 'linkedin', name: 'LinkedIn', reach: '3.4K', change: '-2%', up: false },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>이번 달 도달</span>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>2026년 4월</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
            <SnsIcon name={t.icon} size={15} />
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t.name}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{t.reach}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: t.up ? '#10B981' : '#EF4444', background: t.up ? '#ECFDF5' : '#FEF2F2', padding: '2px 7px', borderRadius: '6px' }}>{t.change}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiPreview() {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="#3B5BDB" strokeWidth={2} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Feedr AI</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#10B981', fontWeight: 600, background: '#ECFDF5', padding: '2px 7px', borderRadius: '6px' }}>온라인</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={{ background: '#3B5BDB', color: '#fff', fontSize: '13px', padding: '9px 13px', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', lineHeight: 1.5 }}>
          이 틱톡 스크립트를 인스타 캡션으로 바꿔줘
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <Zap size={12} color="#3B5BDB" strokeWidth={2} />
        </div>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '13px', padding: '9px 13px', borderRadius: '2px 12px 12px 12px', lineHeight: 1.6, color: '#374151' }}>
          ✨ 인스타 캡션으로 변환했어요:<br />
          <span style={{ color: '#6B7280', fontSize: '12px' }}>"매일 아침 루틴을 바꿨더니 생산성이 달라졌어요 🌿 여러분의 아침은 어떤가요?"</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(['instagram', 'tiktok', 'youtube', 'threads'] as SnsIconName[]).map(e => (
          <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: e === 'instagram' ? '#EEF2FF' : '#F9FAFB', border: e === 'instagram' ? '1px solid #C5D0FC' : '1px solid #E5E7EB', fontSize: '12px', color: e === 'instagram' ? '#3B5BDB' : '#6B7280' }}>
            <SnsIcon name={e} size={12} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>{e === 'youtube' ? 'YouTube' : e.charAt(0).toUpperCase() + e.slice(1)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 10px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
        <span style={{ flex: 1, fontSize: '12px', color: '#9CA3AF' }}>채널별로 다시 수정해줘…</span>
        <Send size={14} color="#3B5BDB" strokeWidth={2} />
      </div>
    </div>
  )
}

const featureBlocks = [
  {
    icon: CalendarDays,
    title: '예약 발행',
    subtitle: '한 번 설정하면 알아서 올라가요',
    desc: '원하는 날짜와 시간을 설정하면 Feedr가 자동으로 발행합니다. 인스타그램, 틱톡, 유튜브 쇼츠 등 7개 채널에 동시에 올릴 수 있어요.',
    points: ['7개 채널 동시 발행', '플랫폼별 최적 시간 자동 추천', '벌크 예약으로 한 달 치 한 번에'],
    Preview: SchedulePreview,
  },
  {
    icon: LayoutGrid,
    title: '콘텐츠 캘린더',
    subtitle: '월간 발행 일정을 한눈에',
    desc: '캘린더 뷰에서 전체 발행 일정을 확인하고 드래그로 쉽게 조정할 수 있어요. 무엇이 언제 올라가는지 한눈에 파악하세요.',
    points: ['월간/주간 캘린더 뷰', '드래그앤드롭으로 일정 조정', '채널별 색상 구분'],
    Preview: CalendarPreview,
  },
  {
    icon: ChartNoAxesColumn,
    title: '채널별 분석',
    subtitle: '어떤 콘텐츠가 잘 되는지 바로 확인',
    desc: '채널별 인게이지먼트, 팔로워 증감, 최고 성과 게시물을 한 화면에서 확인하세요. 데이터 기반으로 더 나은 콘텐츠를 만들 수 있어요.',
    points: ['채널별 성과 대시보드', '최고 성과 게시물 분석', '최적 발행 시간 리포트'],
    Preview: AnalyticsPreview,
  },
  {
    icon: Zap,
    title: 'AI 어시스턴트',
    subtitle: '콘텐츠 아이디어가 막힐 때',
    desc: 'AI가 게시물 아이디어를 제안하고, 기존 콘텐츠를 다른 채널에 맞게 리퍼포징해드려요. 무료 플랜부터 사용 가능합니다.',
    points: ['게시물 아이디어 자동 생성', '채널별 콘텐츠 리퍼포징', '무료 플랜부터 제공'],
    Preview: AiPreview,
  },
]

export default function Features() {
  return (
    <div>
      <section style={{ padding: 'clamp(64px, 8vw, 96px) 24px clamp(48px, 6vw, 72px)', background: 'linear-gradient(150deg, #EEF2FF 0%, #fff 55%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.2 }}>
            꼭 필요한 기능만,<br />군더더기 없이
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: '#6B7280', lineHeight: 1.75 }}>
            복잡한 기능으로 가득 찬 툴은 그만. Feedr는 실제로 쓰는 기능만 담았습니다.
          </p>
        </div>
      </section>
      {featureBlocks.map((f, i) => {
        const Icon = f.icon
        const Preview = f.Preview
        return (
          <section key={f.title} style={{ padding: 'clamp(64px, 8vw, 96px) 24px', background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center' }}>
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Icon size={24} color="#3B5BDB" strokeWidth={2} />
                </div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#3B5BDB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{f.subtitle}</p>
                <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.5px', lineHeight: 1.25 }}>{f.title}</h2>
                <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.8, marginBottom: '24px' }}>{f.desc}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none' }}>
                  {f.points.map(p => (
                    <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 500 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={12} color="#3B5BDB" strokeWidth={2.5} />
                      </div>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ order: i % 2 === 0 ? 1 : 0, background: '#F3F5FF', borderRadius: '20px', padding: '28px', border: '1px solid #E0E4F8' }}>
                <Preview />
              </div>
            </div>
          </section>
        )
      })}
      <section style={{ padding: 'clamp(64px, 8vw, 96px) 24px', background: '#3B5BDB', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, color: '#fff', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          지금 바로 무료로 시작하세요
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '32px', fontSize: '17px' }}>신용카드 없이 3개 채널 무료</p>
        <Link to="/pricing" style={{ display: 'inline-block', background: '#fff', color: '#3B5BDB', fontWeight: 700, fontSize: '16px', padding: '14px 36px', borderRadius: '12px' }}>
          요금제 보기
        </Link>
      </section>
    </div>
  )
}
