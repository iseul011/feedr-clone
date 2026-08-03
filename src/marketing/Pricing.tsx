import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Plan = {
  id: string
  name: string
  price: string
  priceSub?: string
  sub: string
  features: string[]
  cta: string
  highlight: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '무료',
    sub: '영구 무료, 카드 불필요',
    features: ['3개 채널 연결', '채널당 10포스트 예약', 'AI 어시스턴트 기본', '기본 분석', '커뮤니티 인박스'],
    cta: '무료로 시작하기',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '5,900원',
    priceSub: '채널당 / 월',
    sub: '연간 결제 시 2개월 무료',
    features: ['무제한 채널 연결', '무제한 예약 발행', 'AI 어시스턴트 고급', '고급 분석 대시보드', '해시태그 관리', '첫 번째 댓글 예약', '커뮤니티 인박스'],
    cta: 'Pro 시작하기',
    highlight: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: '10,900원',
    priceSub: '채널당 / 월',
    sub: '연간 결제 시 2개월 무료',
    features: ['Pro 모든 기능 포함', '무제한 팀원 추가', '콘텐츠 승인 워크플로우', '권한 레벨 관리', '브랜디드 리포트', '우선 고객 지원'],
    cta: 'Team 시작하기',
    highlight: false,
  },
]

function formatPhone(v: string) {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

export default function Pricing() {
  const [betaPlan, setBetaPlan] = useState<Plan | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const navigate = useNavigate()

  function onCta(plan: Plan) {
    if (plan.id === 'pro') {
      setPhone('')
      setPhoneError('')
      setPayOpen(true)
      return
    }
    setBetaPlan(plan)
  }

  // ponytail: PayApp 실연동 제거 — UI만, 결제 연동 시 원본의 window.PayApp rebill 플로우 복원
  function onPay() {
    const digits = phone.replace(/[^0-9]/g, '')
    if (!/^01[0-9]{8,9}$/.test(digits)) {
      setPhoneError('올바른 휴대폰 번호를 입력해주세요')
      return
    }
    setPayOpen(false)
    navigate('/payment/success?plan=pro')
  }

  return (
    <div>
      <section style={{ padding: '80px 24px 48px', textAlign: 'center', background: 'linear-gradient(135deg, #EEF2FF 0%, #fff 60%)' }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>심플한 요금제</h1>
        <p style={{ fontSize: '17px', color: 'var(--color-muted)' }}>필요한 만큼만 쓰세요. 언제든 변경 가능합니다.</p>
      </section>
      <section style={{ padding: '48px 24px 80px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                borderRadius: 'var(--radius)',
                border: plan.highlight ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                padding: '32px',
                background: plan.highlight ? 'var(--color-primary-light)' : '#fff',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary)', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                  가장 인기
                </div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{plan.name}</h3>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>{plan.price}</span>
                {plan.priceSub && <span style={{ fontSize: '14px', color: 'var(--color-muted)', marginLeft: '4px' }}>{plan.priceSub}</span>}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '24px' }}>{plan.sub}</p>
              <button
                onClick={() => onCta(plan)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: plan.highlight ? 'var(--color-primary)' : '#fff',
                  color: plan.highlight ? '#fff' : 'var(--color-primary)',
                  border: plan.highlight ? 'none' : '2px solid var(--color-primary)',
                  marginBottom: '24px',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => ((e.target as HTMLButtonElement).style.opacity = '0.85')}
                onMouseLeave={e => ((e.target as HTMLButtonElement).style.opacity = '1')}
              >
                {plan.cta}
              </button>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', fontSize: '14px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: '600px', margin: '64px auto 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.8 }}>
            연간 결제 시 2개월 무료 혜택이 적용됩니다.<br />
            채널 수 기준으로 과금되며, 팀원 수는 Team 플랜에서 무제한입니다.<br />
            언제든지 플랜을 변경하거나 취소할 수 있습니다.
          </p>
        </div>
      </section>

      {payOpen && (
        <div
          onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '36px 32px 28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.4px' }}>결제 진행을 위한 정보 입력</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              결제 알림과 영수증을 받으실 휴대폰 번호를 입력해주세요.
            </p>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>휴대폰 번호</label>
            <input
              type="tel"
              autoFocus
              value={phone}
              onChange={e => {
                setPhone(formatPhone(e.target.value))
                if (phoneError) setPhoneError('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') onPay()
              }}
              placeholder="010-1234-5678"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-sm)',
                border: phoneError ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: phoneError ? '6px' : '20px',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => {
                if (!phoneError) e.target.style.borderColor = 'var(--color-primary)'
              }}
              onBlur={e => {
                if (!phoneError) e.target.style.borderColor = 'var(--color-border)'
              }}
            />
            {phoneError && <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '20px' }}>{phoneError}</p>}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light)', fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong>Feedr Pro</strong> · 월 <strong>5,900원</strong> (채널당)<br />
              <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>매월 자동 결제 · 언제든 해지 가능</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPayOpen(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', background: '#fff', color: 'var(--color-text)', fontSize: '14px', fontWeight: 600, border: '1.5px solid var(--color-border)' }}
              >
                취소
              </button>
              <button
                onClick={onPay}
                style={{ flex: 2, padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none' }}
              >
                결제창으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {betaPlan && (
        <div
          onClick={() => setBetaPlan(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '40px', maxWidth: '440px', width: '100%', textAlign: 'center' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>곧 오픈합니다!</h2>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '8px' }}>
              <strong style={{ color: 'var(--color-text)' }}>Feedr {betaPlan.name}</strong> 플랜에 관심 가져주셔서 감사합니다.
            </p>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '32px' }}>
              현재 베타 준비 중입니다.<br />오픈 시 가장 먼저 알려드릴게요.
            </p>
            <button
              onClick={() => setBetaPlan(null)}
              style={{ width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: 700 }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
