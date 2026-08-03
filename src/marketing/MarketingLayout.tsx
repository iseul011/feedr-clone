import { useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const Logo = () => (
  <svg width="90" height="28" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#3B5BDB" />
    <path d="M7 8h10M7 14h7M7 20h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="19" cy="20" r="3" fill="#fff" opacity="0.9" />
    <text
      x="34"
      y="20"
      fontFamily="'Pretendard', -apple-system, sans-serif"
      fontSize="17"
      fontWeight="800"
      fill="#111827"
      letterSpacing="-0.5"
    >
      feedr
    </text>
  </svg>
)

export function Header() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const linkStyle = (active: boolean): CSSProperties => ({
    fontSize: '14px',
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: '8px',
    color: active ? '#3B5BDB' : '#6B7280',
    background: active ? '#EEF2FF' : 'transparent',
    transition: 'all 0.15s',
  })
  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E5E7EB',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="desktop-menu">
          <Link to="/" style={linkStyle(pathname === '/')}>
            홈
          </Link>
          <Link to="/features" style={linkStyle(pathname === '/features')}>
            서비스
          </Link>
          <Link to="/pricing" style={linkStyle(pathname === '/pricing')}>
            가격
          </Link>
          <a href="/blog" style={linkStyle(false)}>
            블로그
          </a>
          <Link to="/login" style={{ ...linkStyle(pathname === '/login'), marginLeft: '8px' }}>
            로그인
          </Link>
          <Link
            to="/pricing"
            style={{
              marginLeft: '8px',
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#3B5BDB',
              color: '#fff',
            }}
          >
            무료로 시작하기
          </Link>
        </div>
        <button
          onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', padding: '4px' }}
          className="mobile-menu-btn"
          aria-label="메뉴"
        >
          {open ? <X size={24} color="#111827" /> : <Menu size={24} color="#111827" />}
        </button>
      </nav>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            padding: '16px 24px 24px',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
          className="mobile-drawer"
        >
          <Link
            to="/"
            style={{ ...linkStyle(pathname === '/'), padding: '12px 14px', display: 'block' }}
            onClick={() => setOpen(false)}
          >
            홈
          </Link>
          <Link
            to="/features"
            style={{ ...linkStyle(pathname === '/features'), padding: '12px 14px', display: 'block' }}
            onClick={() => setOpen(false)}
          >
            서비스
          </Link>
          <Link
            to="/pricing"
            style={{ ...linkStyle(pathname === '/pricing'), padding: '12px 14px', display: 'block' }}
            onClick={() => setOpen(false)}
          >
            가격
          </Link>
          <a
            href="/blog"
            style={{ ...linkStyle(false), padding: '12px 14px', display: 'block' }}
            onClick={() => setOpen(false)}
          >
            블로그
          </a>
          <Link
            to="/login"
            style={{ ...linkStyle(pathname === '/login'), padding: '12px 14px', display: 'block' }}
            onClick={() => setOpen(false)}
          >
            로그인
          </Link>
          <Link
            to="/pricing"
            style={{
              marginTop: '8px',
              fontSize: '15px',
              fontWeight: 700,
              padding: '13px 18px',
              borderRadius: '10px',
              background: '#3B5BDB',
              color: '#fff',
              textAlign: 'center',
              display: 'block',
            }}
            onClick={() => setOpen(false)}
          >
            무료로 시작하기
          </Link>
        </div>
      )}
    </>
  )
}

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: '40px 24px',
        background: 'var(--color-bg-gray)',
      }}
    >
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '32px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="28" height="28" rx="7" fill="#3B5BDB" />
              <path d="M7 8h10M7 14h7M7 20h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <circle cx="19" cy="20" r="3" fill="#fff" opacity="0.9" />
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>feedr</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', maxWidth: '240px' }}>
            SNS 발행, 이제 한 곳에서.
            <br />
            인스타, 틱톡, 유튜브 쇼츠까지.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              제품
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/features" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                서비스 소개
              </Link>
              <Link to="/pricing" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                가격
              </Link>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              리소스
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="/blog" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                블로그
              </a>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              법적 고지
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/privacy" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                개인정보처리방침
              </Link>
              <Link to="/terms" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          maxWidth: '1080px',
          margin: '32px auto 0',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-muted)',
        }}
      >
        © 2026 Feedr. All rights reserved.
      </div>
    </footer>
  )
}
