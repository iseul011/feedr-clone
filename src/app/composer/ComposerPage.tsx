import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Channel } from '../../lib/types'
import SnsIcon from '../../marketing/SnsIcon'

const card = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
}

const label = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600 as const,
  marginBottom: '6px',
}

const input = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '15px',
  fontFamily: 'var(--font)',
  outline: 'none',
}

function localDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ComposerPage() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scheduledAt, setScheduledAt] = useState(() =>
    localDatetimeValue(new Date(Date.now() + 60 * 60 * 1000)),
  )
  const [bulk, setBulk] = useState(false)
  const [repeatCount, setRepeatCount] = useState(4)
  const [interval, setInterval] = useState<'day' | 'week'>('week')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('channels')
      .select('*')
      .eq('status', 'connected')
      .then(({ data }) => setChannels((data as Channel[]) ?? []))
  }, [])

  if (channels === null) return null
  if (channels.length === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ color: 'var(--color-muted)', marginBottom: '16px' }}>
          아직 연결된 채널이 없어요.
        </p>
        <Link
          to="/app/channels"
          style={{ color: 'var(--color-primary)', fontWeight: 700 }}
        >
          먼저 채널을 연결하세요 →
        </Link>
      </div>
    )
  }

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const submit = async () => {
    setError('')
    const file = fileRef.current?.files?.[0]
    if (selected.size === 0) return setError('발행할 채널을 하나 이상 선택해주세요.')
    if (!title.trim() && !body.trim()) return setError('제목 또는 본문을 입력해주세요.')
    const first = new Date(scheduledAt)
    if (!(first.getTime() > Date.now())) return setError('예약 시각은 미래여야 해요.')
    const hasYoutube = channels.some(
      (c) => selected.has(c.id) && c.provider === 'youtube',
    )
    if (hasYoutube && !file?.type.startsWith('video')) {
      return setError('YouTube 발행에는 영상이 필요해요.')
    }

    setBusy(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user!.id

      let mediaPath: string | null = null
      let mediaType: 'video' | 'image' | null = null
      if (file) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('media').upload(path, file)
        if (upErr) throw new Error(`업로드 실패: ${upErr.message}`)
        mediaPath = path
        mediaType = file.type.startsWith('video') ? 'video' : 'image'
      }

      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          title: title.trim(),
          body: body.trim(),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          media_path: mediaPath,
          media_type: mediaType,
        })
        .select('id')
        .single()
      if (postErr) throw new Error(postErr.message)

      const occurrences = bulk ? repeatCount : 1
      const stepMs = interval === 'day' ? 86400_000 : 7 * 86400_000
      const targets = []
      for (const channelId of selected) {
        for (let i = 0; i < occurrences; i++) {
          targets.push({
            post_id: post.id,
            channel_id: channelId,
            scheduled_at: new Date(first.getTime() + i * stepMs).toISOString(),
            status: 'queued',
          })
        }
      }
      const { error: targetErr } = await supabase.from('post_targets').insert(targets)
      if (targetErr) throw new Error(targetErr.message)

      navigate('/app/queue')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>새 포스트</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
        한 번 작성해서 여러 채널에 예약 발행하세요
      </p>

      <div style={card}>
        <label style={label}>제목</label>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label style={{ ...label, marginTop: '16px' }}>본문</label>
        <textarea
          style={{ ...input, resize: 'vertical' }}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label style={{ ...label, marginTop: '16px' }}>태그 (쉼표로 구분)</label>
        <input
          style={input}
          placeholder="브이로그, 일상"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <label style={{ ...label, marginTop: '16px' }}>미디어 (선택)</label>
        <input ref={fileRef} type="file" accept="video/*,image/*" style={{ fontSize: '14px' }} />
      </div>

      <div style={card}>
        <label style={label}>발행할 채널</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {channels.map((c) => {
            const active = selected.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: active ? 'var(--color-primary-light)' : '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <SnsIcon name={c.provider} size={15} />
                {c.display_name}
              </button>
            )
          })}
        </div>
      </div>

      <div style={card}>
        <label style={label}>예약 시각</label>
        <input
          style={{ ...input, width: 'auto' }}
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" checked={bulk} onChange={(e) => setBulk(e.target.checked)} />
          반복 예약 (한 달 치를 한 번에)
        </label>
        {bulk && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
            <input
              style={{ ...input, width: '80px' }}
              type="number"
              min={2}
              max={30}
              value={repeatCount}
              onChange={(e) => setRepeatCount(Number(e.target.value))}
            />
            <span style={{ fontSize: '14px' }}>회,</span>
            <select
              style={{ ...input, width: 'auto' }}
              value={interval}
              onChange={(e) => setInterval(e.target.value as 'day' | 'week')}
            >
              <option value="day">매일</option>
              <option value="week">매주</option>
            </select>
            <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>간격으로 예약</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: '#DC2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>
      )}
      <button
        onClick={submit}
        disabled={busy}
        style={{
          padding: '12px 28px',
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          fontSize: '15px',
          fontWeight: 700,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? '예약 중…' : '예약하기'}
      </button>
    </div>
  )
}
