import { Link } from 'react-router-dom'
import { CalendarDays, ChartNoAxesColumn, Clock, Megaphone, Users, Zap, type LucideIcon } from 'lucide-react'
import SnsIcon, { type SnsIconName } from './SnsIcon'

const CHANNELS: { name: string; icon: SnsIconName; highlight?: boolean }[] = [
  { name: 'Instagram', icon: 'instagram' },
  { name: 'Facebook', icon: 'facebook' },
  { name: 'X', icon: 'x' },
  { name: 'TikTok', icon: 'tiktok' },
  { name: 'LinkedIn', icon: 'linkedin' },
  { name: 'YouTube Shorts', icon: 'youtube' },
  { name: 'Threads', icon: 'threads' },
]

const CORE_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: CalendarDays,
    title: '예약 발행',
    desc: '원하는 날짜와 시간에 맞춰 자동으로 올려드려요. 한 번 설정하면 끝입니다.',
  },
  {
    icon: ChartNoAxesColumn,
    title: '채널별 분석',
    desc: '어떤 채널에서 반응이 좋은지 한 화면에서 바로 확인할 수 있어요.',
  },
  {
    icon: Zap,
    title: 'AI 어시스턴트',
    desc: '콘텐츠 아이디어 제안부터 채널별 리퍼포징까지 AI가 도와줘요.',
  },
]

const AUDIENCES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Clock, title: '1인 크리에이터', desc: '혼자서 여러 채널을 운영해도 버거롭지 않아요.' },
  { icon: Megaphone, title: '소상공인', desc: '가게 SNS, 더 이상 직접 올리지 않아도 됩니다.' },
  { icon: Users, title: '마케터 · 에이전시', desc: '여러 브랜드 채널을 한 곳에서 효율적으로 관리하세요.' },
]

const STATS = [
  { value: '7+', label: '연동 채널' },
  { value: '2,400+', label: '베타 대기 중' },
  { value: '73%', label: '평균 시간 절약' },
]

export default function Landing() {
  return (
    <div>
      <section
        style={{
          background: 'linear-gradient(150deg, #EEF2FF 0%, #fff 55%)',
          padding: 'clamp(72px, 10vw, 120px) 24px clamp(64px, 8vw, 96px)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#3B5BDB',
              background: '#EEF2FF',
              padding: '5px 16px',
              borderRadius: '999px',
              marginBottom: '28px',
              border: '1px solid #C5D0FC',
            }}
          >
            인스타 · 틱톡 · 쇼츠 동시 발행
          </div>
          <h1
            style={{
              fontSize: 'clamp(36px, 7vw, 58px)',
              fontWeight: 800,
              lineHeight: 1.18,
              letterSpacing: '-1.5px',
              color: '#111827',
              marginBottom: '20px',
            }}
          >
            SNS 발행,
            <br />
            이제 한 곳에서
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.5vw, 19px)',
              color: '#6B7280',
              lineHeight: 1.75,
              marginBottom: '40px',
            }}
          >
            인스타, 틱톡, 유튜브 쇼츠까지 —
            <br />
            한 번에 예약하고 자동으로 올려드려요
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/pricing"
              style={{
                display: 'inline-block',
                background: '#3B5BDB',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                padding: '14px 32px',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(59,91,219,0.35)',
              }}
            >
              무료로 시작하기
            </Link>
            <Link
              to="/features"
              style={{
                display: 'inline-block',
                background: '#fff',
                color: '#111827',
                fontSize: '16px',
                fontWeight: 600,
                padding: '14px 32px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
              }}
            >
              서비스 둘러보기
            </Link>
          </div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#9CA3AF' }}>
            신용카드 없이 무료로 시작 · 언제든 업그레이드
          </p>
        </div>
      </section>
      <section style={{ padding: '40px 24px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            textAlign: 'center',
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: 800,
                  color: '#3B5BDB',
                  letterSpacing: '-1px',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: '64px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '13px',
              color: '#9CA3AF',
              marginBottom: '28px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            지원 채널
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {CHANNELS.map((channel) => (
              <div
                key={channel.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '999px',
                  border: channel.highlight ? '2px solid #3B5BDB' : '1px solid #E5E7EB',
                  background: channel.highlight ? '#EEF2FF' : '#fff',
                  fontSize: '14px',
                  fontWeight: channel.highlight ? 700 : 500,
                  color: channel.highlight ? '#3B5BDB' : '#374151',
                }}
              >
                <SnsIcon name={channel.icon} size={16} />
                <span>{channel.name}</span>
                {channel.highlight && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#3B5BDB',
                      color: '#fff',
                      padding: '1px 7px',
                      borderRadius: '4px',
                    }}
                  >
                    한국 특화
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '80px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 800,
              marginBottom: '8px',
              letterSpacing: '-0.5px',
            }}
          >
            핵심 기능 3가지
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '48px', fontSize: '16px' }}>
            복잡한 건 없어요. 딱 필요한 것만 있습니다.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {CORE_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    padding: '32px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#EEF2FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <Icon size={22} color="#3B5BDB" strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{feature.title}</h3>
                  <p style={{ fontSize: '15px', color: '#6B7280', lineHeight: 1.75 }}>{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 800,
              marginBottom: '8px',
              letterSpacing: '-0.5px',
            }}
          >
            누구에게 맞나요?
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '48px', fontSize: '16px' }}>
            규모에 상관없이, SNS를 운영하는 모든 분께 맞습니다.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {AUDIENCES.map((audience) => {
              const Icon = audience.icon
              return (
                <div
                  key={audience.title}
                  style={{
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    padding: '32px',
                    background: '#F9FAFB',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <Icon size={20} color="#374151" strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{audience.title}</h3>
                  <p style={{ fontSize: '15px', color: '#6B7280', lineHeight: 1.75 }}>{audience.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section style={{ padding: '64px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#3B5BDB',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              feedr 블로그
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.3px' }}>
              SNS 운영 인사이트, 매주 업데이트
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.7 }}>
              크리에이터·마케터를 위한 콘텐츠 전략과 자동화 활용법을 정리해 드려요.
            </p>
          </div>
          <a
            href="/blog"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#fff',
              color: '#3B5BDB',
              border: '1.5px solid #3B5BDB',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            블로그 보러가기 →
          </a>
        </div>
      </section>
      <section
        style={{
          padding: 'clamp(64px, 8vw, 96px) 24px',
          background: '#3B5BDB',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}
        >
          지금 바로 시작해보세요
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '17px', marginBottom: '32px' }}>
          신용카드 없이 무료로 시작할 수 있어요.
        </p>
        <Link
          to="/pricing"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#3B5BDB',
            fontSize: '16px',
            fontWeight: 700,
            padding: '14px 36px',
            borderRadius: '12px',
          }}
        >
          무료로 시작하기
        </Link>
      </section>
    </div>
  )
}
