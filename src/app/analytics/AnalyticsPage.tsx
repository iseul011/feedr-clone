import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { aiAssist } from '../../lib/api'
import type { AnalyticsSnapshot, Channel } from '../../lib/types'
import { PROVIDER_LABELS } from '../../lib/types'
import SnsIcon from '../../marketing/SnsIcon'

const card = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  padding: '24px',
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 단일 시리즈 스파크라인 — 식별은 카드의 채널명 텍스트가, 색은 채널 고유색이 담당
function Sparkline({ points, color }: { points: AnalyticsSnapshot[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 280
  const H = 60
  const PAD = 6
  const values = points.map((p) => p.followers)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) =>
    PAD + (points.length === 1 ? (W - 2 * PAD) / 2 : (i * (W - 2 * PAD)) / (points.length - 1))
  const y = (v: number) => H - PAD - ((v - min) * (H - 2 * PAD)) / span
  const poly = points.map((p, i) => `${x(i)},${y(p.followers)}`).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '60px', display: 'block' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          let nearest = 0
          for (let i = 1; i < points.length; i++) {
            if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i
          }
          setHover(nearest)
        }}
        onMouseLeave={() => setHover(null)}
      >
        <polyline points={poly} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (
          <circle
            cx={x(hover)}
            cy={y(points[hover].followers)}
            r={4}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
        )}
      </svg>
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: `${(x(hover) / W) * 100}%`,
            transform: 'translateX(-50%)',
            background: 'var(--color-text)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {fmtDate(points[hover].captured_at)} · {points[hover].followers.toLocaleString()}
        </div>
      )}
    </div>
  )
}

function ChannelCard({ channel, points }: { channel: Channel; points: AnalyticsSnapshot[] }) {
  const latest = points[points.length - 1]
  const first = points[0]
  const delta = latest && first ? latest.followers - first.followers : 0
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <SnsIcon name={channel.provider} size={18} />
        <span style={{ fontWeight: 700, fontSize: '15px' }}>{channel.display_name}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
          {PROVIDER_LABELS[channel.provider]}
        </span>
      </div>
      {points.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          아직 수집된 데이터가 없어요. 매일 자동으로 수집됩니다.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800 }}>
              {latest.followers.toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>팔로워</span>
            {points.length > 1 && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: delta >= 0 ? '#16A34A' : '#DC2626',
                }}
              >
                {delta >= 0 ? '+' : ''}
                {delta.toLocaleString()} ({fmtDate(first.captured_at)}~)
              </span>
            )}
          </div>
          <Sparkline points={points} color={channel.color} />
          <details style={{ marginTop: '10px' }}>
            <summary style={{ fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer' }}>
              표로 보기
            </summary>
            <table style={{ fontSize: '13px', marginTop: '8px', borderCollapse: 'collapse' }}>
              <tbody>
                {points.slice(-7).map((p) => (
                  <tr key={p.captured_at}>
                    <td style={{ padding: '2px 16px 2px 0', color: 'var(--color-muted)' }}>
                      {fmtDate(p.captured_at)}
                    </td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>
                      {p.followers.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([])
  const [advice, setAdvice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
    Promise.all([
      supabase.from('channels').select('*').eq('status', 'connected'),
      supabase
        .from('analytics_snapshots')
        .select('channel_id, captured_at, followers, metrics')
        .gte('captured_at', since)
        .order('captured_at', { ascending: true }),
    ]).then(([ch, snap]) => {
      setChannels((ch.data as Channel[]) ?? [])
      setSnapshots((snap.data as AnalyticsSnapshot[]) ?? [])
    })
  }, [])

  const askBestTime = async () => {
    setBusy(true)
    setError('')
    try {
      const { data: published } = await supabase
        .from('post_targets')
        .select('published_at, channels(provider)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20)
      const lines = (channels ?? []).map((c) => {
        const pts = snapshots.filter((s) => s.channel_id === c.id).slice(-14)
        const trend = pts.map((p) => `${p.captured_at}:${p.followers}`).join(', ')
        return `- ${PROVIDER_LABELS[c.provider]} "${c.display_name}" 팔로워 추이: ${trend || '데이터 없음'}`
      })
      const history = (published ?? [])
        .map((t) => t.published_at)
        .filter(Boolean)
        .join(', ')
      const { text } = await aiAssist(
        'best_time',
        `채널별 데이터:\n${lines.join('\n')}\n\n최근 발행 시각: ${history || '없음'}`,
      )
      setAdvice(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (channels === null) return null

  return (
    <div style={{ maxWidth: '920px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>분석</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
        채널별 팔로워 추이와 AI 발행 시간 추천
      </p>

      {channels.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ color: 'var(--color-muted)' }}>연결된 채널이 없어요.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {channels.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              points={snapshots.filter((s) => s.channel_id === c.id)}
            />
          ))}
        </div>
      )}

      {channels.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={17} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>최적 발행 시간</span>
          </div>
          {advice ? (
            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{advice}</p>
          ) : (
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '12px' }}>
              내 채널 데이터를 바탕으로 언제 올리면 좋을지 AI가 추천해드려요.
            </p>
          )}
          {error && (
            <p style={{ color: '#DC2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          )}
          {!advice && (
            <button
              onClick={askBestTime}
              disabled={busy}
              style={{
                padding: '10px 20px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: 700,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? '분석 중…' : '추천 받기'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
