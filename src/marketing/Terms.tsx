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

export default function Terms() {
  useEffect(() => {
    document.title = '이용약관 · Feedr'
  }, [])
  return (
    <div style={page}>
      <h1 style={h1}>이용약관</h1>
      <div style={date}>시행일: 2026년 5월 21일</div>
      <h2 style={h2}>1. 목적</h2>
      <p style={p}>
        본 약관은 Feedr(이하 “회사”)가 제공하는 SNS 콘텐츠 예약·발행 서비스(이하 “서비스”)의 이용과 관련하여
        회사와 이용자 간의 권리·의무 및 책임사항을 규정합니다.
      </p>
      <h2 style={h2}>2. 계정</h2>
      <ul style={ul}>
        <li>이용자는 정확한 정보로 계정을 생성하고, 계정 인증정보를 안전하게 관리할 책임이 있습니다.</li>
        <li>타인의 계정·채널을 무단으로 연결하거나 사용해서는 안 됩니다.</li>
      </ul>
      <h2 style={h2}>3. 연결 채널과 발행 책임</h2>
      <ul style={ul}>
        <li>이용자는 본인이 권한을 가진 채널만 연결해야 합니다.</li>
        <li>서비스를 통해 발행되는 모든 콘텐츠의 적법성·저작권·정확성에 대한 책임은 이용자에게 있습니다.</li>
        <li>
          이용자는 연결 대상 플랫폼(YouTube, Threads 등)의 약관 및 커뮤니티 정책을 준수해야 합니다. 특히{' '}
          <a style={link} href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
            YouTube 이용약관
          </a>
          을 위반하는 용도로 서비스를 사용할 수 없습니다.
        </li>
      </ul>
      <h2 style={h2}>4. 금지 행위</h2>
      <ul style={ul}>
        <li>스팸·자동화 정책 위반, 타인의 권리 침해, 불법 콘텐츠 발행</li>
        <li>서비스의 정상적 운영을 방해하거나 비정상적인 방법으로 접근하는 행위</li>
      </ul>
      <h2 style={h2}>5. 서비스의 변경 및 중단</h2>
      <p style={p}>
        회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 중요한 변경은
        사전에 공지합니다.
      </p>
      <h2 style={h2}>6. 면책</h2>
      <p style={p}>
        회사는 천재지변, 연결 대상 플랫폼(YouTube·Threads 등)의 정책·API 변경 또는 장애, 이용자의 귀책사유로 인해
        발생한 손해에 대해 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.
      </p>
      <h2 style={h2}>7. 준거법 및 분쟁해결</h2>
      <p style={p}>본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은 관할 법원에 제소합니다.</p>
      <h2 style={h2}>8. 문의</h2>
      <p style={p}>
        문의:{' '}
        <a style={link} href="mailto:contact@2ndlifeclass.com">
          contact@2ndlifeclass.com
        </a>
      </p>
    </div>
  )
}
