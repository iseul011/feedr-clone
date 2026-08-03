import { useEffect, useState } from 'react'

export default function PaymentSuccess() {
  const [isPopup, setIsPopup] = useState(false)

  useEffect(() => {
    setIsPopup(window.opener != null && window.opener !== window)
  }, [])

  function closeWindow() {
    if (window.opener) {
      try {
        window.opener.location.href = '/'
      } catch {
        // opener from another origin — ignore
      }
    }
    window.close()
  }

  return (
    <section style={{ padding: '80px 24px 60px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.5px' }}>결제가 완료되었습니다</h1>
      <p style={{ fontSize: '15px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '32px' }}>
        Feedr Pro 구독이 활성화되었습니다.<br />결제 영수증은 입력하신 휴대폰 번호로 발송됩니다.
      </p>
      {isPopup ? (
        <button
          onClick={closeWindow}
          style={{ padding: '13px 32px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          창 닫기
        </button>
      ) : (
        <a
          href="/"
          style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
        >
          홈으로 이동
        </a>
      )}
    </section>
  )
}
