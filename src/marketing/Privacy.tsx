import { useEffect, type CSSProperties } from 'react'

const page: CSSProperties = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '64px 24px',
  color: 'var(--color-text)',
}
const h1: CSSProperties = { fontSize: '32px', fontWeight: 800, marginBottom: '8px' }
const date: CSSProperties = { fontSize: '13px', color: 'var(--color-muted)', marginBottom: '40px' }
const h2: CSSProperties = { fontSize: '20px', fontWeight: 700, margin: '32px 0 12px' }
const p: CSSProperties = { fontSize: '15px', lineHeight: 1.7, color: 'var(--color-text)', margin: '0 0 12px' }
const ul: CSSProperties = { fontSize: '15px', lineHeight: 1.7, paddingLeft: '20px', margin: '0 0 12px' }
const link: CSSProperties = { color: 'var(--color-primary)' }

export default function Privacy() {
  useEffect(() => {
    document.title = '개인정보처리방침 · Feedr'
  }, [])
  return (
    <div style={page}>
      <h1 style={h1}>개인정보처리방침</h1>
      <div style={date}>시행일: 2026년 5월 21일</div>
      <p style={p}>
        Feedr(이하 “회사”)는 SNS 콘텐츠 예약·발행 서비스(이하 “서비스”)를 제공하며, 이용자의 개인정보를 보호하기
        위해 본 개인정보처리방침을 둡니다.
      </p>
      <h2 style={h2}>1. 수집하는 정보</h2>
      <ul style={ul}>
        <li>계정 정보: 이메일, 이름, 비밀번호(복호화 불가능한 해시로만 저장)</li>
        <li>연결된 채널 정보: YouTube 채널 ID·채널명, Threads 사용자 ID 등 연결 대상 플랫폼이 제공하는 식별 정보</li>
        <li>인증 토큰: 플랫폼 OAuth access/refresh 토큰(AES-256-GCM으로 암호화하여 저장)</li>
        <li>콘텐츠/예약 정보: 업로드·예약하는 게시물의 제목·설명·태그·일정 등 메타데이터</li>
        <li>이용 로그: 서비스 이용 과정에서 생성되는 접속·발행 기록</li>
      </ul>
      <h2 style={h2}>2. 이용 목적</h2>
      <p style={p}>
        수집한 정보는 (1) 연결된 채널로의 콘텐츠 예약·발행, (2) 채널 연결 상태 관리, (3) 서비스 제공·운영·개선,
        (4) 문의 응대 목적에만 사용합니다.
      </p>
      <h2 style={h2}>3. YouTube API 서비스 관련 고지</h2>
      <p style={p}>
        서비스는 YouTube API Services를 사용합니다. 서비스를 이용함으로써 이용자는{' '}
        <a style={link} href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          YouTube 이용약관
        </a>
        에 동의하게 되며, 회사의 데이터 처리에는{' '}
        <a style={link} href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google 개인정보처리방침
        </a>
        이 함께 적용됩니다.
      </p>
      <ul style={ul}>
        <li>
          회사는 YouTube API로 취득한 데이터를 본 방침 제2조에 명시한 기능 제공 목적에만 사용하며(제한적 사용,
          Limited Use), 광고 목적으로 사용하거나 제3자에게 판매하지 않습니다.
        </li>
        <li>
          이용자는{' '}
          <a style={link} href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google 보안 설정(myaccount.google.com/permissions)
          </a>
          에서 언제든지 서비스의 접근 권한을 철회할 수 있습니다.
        </li>
        <li>연결 해제 또는 권한 철회 시, 회사가 보관 중인 해당 YouTube 인증 토큰은 지체 없이 삭제됩니다.</li>
      </ul>
      <h2 style={h2}>4. Threads(Meta) 관련 고지</h2>
      <p style={p}>
        Threads 연결 시 회사는 Meta 플랫폼 약관 및 개발자 정책을 준수하며, Threads로부터 받은 데이터 역시 본 방침
        제2조의 기능 제공 목적에만 사용합니다.
      </p>
      <h2 style={h2}>5. 보관 및 파기</h2>
      <p style={p}>
        인증 토큰은 채널 연결이 유지되는 동안 암호화 상태로 보관하며, 연결 해제·권한 철회·회원 탈퇴 시 관련
        개인정보 및 토큰을 지체 없이 파기합니다(법령상 보관 의무가 있는 경우 해당 기간 동안 분리 보관).
      </p>
      <h2 style={h2}>6. 제3자 제공</h2>
      <p style={p}>
        회사는 이용자가 발행을 요청한 콘텐츠를 해당 대상 플랫폼(YouTube, Threads 등)으로 전송하는 것 외에는
        개인정보를 제3자에게 제공·판매하지 않습니다.
      </p>
      <h2 style={h2}>7. 보안</h2>
      <p style={p}>
        모든 OAuth 토큰은 AES-256-GCM으로 암호화하여 저장하며, 비밀번호는 복호화 불가능한 해시로만 보관합니다.
      </p>
      <h2 style={h2}>8. 문의</h2>
      <p style={p}>
        개인정보 관련 문의:{' '}
        <a style={link} href="mailto:contact@2ndlifeclass.com">
          contact@2ndlifeclass.com
        </a>
      </p>
    </div>
  )
}
