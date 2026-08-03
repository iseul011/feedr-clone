import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const styles = {
  page: {
    minHeight: 'calc(100vh - 65px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg-gray)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '40px 32px',
  },
  h1: {
    fontSize: '24px',
    fontWeight: 800,
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  sub: {
    color: 'var(--color-muted)',
    fontSize: '14px',
    textAlign: 'center' as const,
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    marginTop: '16px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '15px',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  button: {
    width: '100%',
    marginTop: '24px',
    padding: '12px',
    background: 'var(--color-primary)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '15px',
    fontWeight: 700,
  },
  error: {
    marginTop: '16px',
    color: '#DC2626',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  switch: {
    marginTop: '20px',
    fontSize: '14px',
    color: 'var(--color-muted)',
    textAlign: 'center' as const,
  },
}

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message,
      )
      return
    }
    if (isSignup && !data.session) {
      setNotice('확인 이메일을 보냈어요. 메일함에서 인증 후 로그인해주세요.')
      return
    }
    navigate('/app')
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={submit}>
        <h1 style={styles.h1}>{isSignup ? '무료로 시작하기' : '로그인'}</h1>
        <p style={styles.sub}>
          {isSignup ? '신용카드 없이 3개 채널 무료' : 'Feedr에 다시 오신 걸 환영해요'}
        </p>
        {isSignup && (
          <>
            <label style={styles.label}>이름</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </>
        )}
        <label style={styles.label}>이메일</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label style={styles.label}>비밀번호</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <div style={styles.error}>{error}</div>}
        {notice && <div style={{ ...styles.error, color: 'var(--color-primary)' }}>{notice}</div>}
        <button style={styles.button} disabled={busy}>
          {busy ? '잠시만요…' : isSignup ? '가입하기' : '로그인'}
        </button>
        <div style={styles.switch}>
          {isSignup ? (
            <>이미 계정이 있나요? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>로그인</Link></>
          ) : (
            <>계정이 없나요? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>무료로 시작하기</Link></>
          )}
        </div>
      </form>
    </div>
  )
}
