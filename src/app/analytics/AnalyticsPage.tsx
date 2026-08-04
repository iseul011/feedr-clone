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

// 자동화 실험 비교 — 완전 자율(auto) vs AI+승인(approve)
// 색은 검증된 2색 고정 배정: 자율=인디고(브랜드), 승인=앰버 (validate_palette 통과)
const EXP_COLORS = { auto: '#3B5BDB', approve: '#D97706' } as const
const MODE_LABELS = { auto: '완전 자율', approve: 'AI+승인' } as const

interface ExperimentSide {
  mode: 'auto' | 'approve'
  channelName: string
  publishedCount: number
  views: number
  viewsPerPost: number
}

function CompareBar({ side, max }: { side: ExperimentSide; max: number }) {
  const pct = max > 0 ? Math.max((side.viewsPerPost / max) * 100, side.viewsPerPost > 0 ? 2 : 0) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span
        style={{ width: '8px', height: '8px', borderRadius: '50%', background: EXP_COLORS[side.mode], flexShrink: 0 }}
      />
      <span style={{ fontSize: '13px', fontWeight: 600, width: '72px', flexShrink: 0 }}>
        {MODE_LABELS[side.mode]}
      </span>
      <div
        style={{ flex: 1, height: '14px', background: 'var(--color-bg-gray)', borderRadius: '4px', overflow: 'hidden' }}
        title={`${side.channelName} · 글 ${side.publishedCount}개 · 누적 ${side.views.toLocaleString()} 조회`}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: EXP_COLORS[side.mode],
            borderRadius: '4px',
          }}
        />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, width: '90px', textAlign: 'right', flexShrink: 0 }}>
        {Math.round(side.viewsPerPost).toLocaleString()}{' '}
        <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>조회/글</span>
      </span>
    </div>
  )
}

function ExperimentCompare({ sides }: { sides: ExperimentSide[] }) {
  const auto = sides.find((s) => s.mode === 'auto')
  const approve = sides.find((s) => s.mode === 'approve')
  if (!auto || !approve) return null

  const max = Math.max(auto.viewsPerPost, approve.viewsPerPost)
  const bothHaveData = auto.viewsPerPost > 0 && approve.viewsPerPost > 0
  const winner = auto.viewsPerPost >= approve.viewsPerPost ? auto : approve
  const loser = winner === auto ? approve : auto
  const ratio = bothHaveData ? winner.viewsPerPost / loser.viewsPerPost : 0
  const ratioText = ratio >= 10 ? `${Math.round(ratio)}` : ratio.toFixed(1)

  return (
    <div style={{ ...card, marginBottom: '16px' }}>
      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>
        자동화 실험 — 완전 자율 vs AI+승인
      </div>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '2px' }}>
            효과 크기
          </div>
          {bothHaveData ? (
            <>
              <div style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1.1 }}>
                {ratioText}
                <span style={{ fontSize: '22px', color: 'var(--color-muted)' }}>×</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: '4px 0 0' }}>
                {MODE_LABELS[winner.mode]} 계정이 {MODE_LABELS[loser.mode]} 계정보다
                <br />글당 이만큼 더 읽혔습니다.
              </p>
            </>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', margin: '8px 0 0' }}>
              양쪽 모두 조회 데이터가 쌓이면
              <br />
              효과 크기가 계산됩니다.
            </p>
          )}
        </div>
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <CompareBar side={auto} max={max} />
          <CompareBar side={approve} max={max} />
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '14px 0 0' }}>
        글당 평균 조회수 기준 (완전 자율 {auto.publishedCount}개 · AI+승인 {approve.publishedCount}개
        발행). 표본이 작아 아직 우연일 수 있습니다.
      </p>
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
  const [sides, setSides] = useState<ExperimentSide[]>([])
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
      supabase.from('autopilot_settings').select('channel_id, mode'),
      supabase.from('post_targets').select('channel_id').eq('status', 'published'),
    ]).then(([ch, snap, st, pub]) => {
      const channelList = (ch.data as Channel[]) ?? []
      const snapList = (snap.data as AnalyticsSnapshot[]) ?? []
      setChannels(channelList)
      setSnapshots(snapList)

      // 실험 비교: 오토파일럿이 설정된 채널을 모드별로 집계 (모드당 첫 채널)
      const settings = (st.data as { channel_id: string; mode: 'auto' | 'approve' }[]) ?? []
      const published = (pub.data as { channel_id: string }[]) ?? []
      const built: ExperimentSide[] = []
      for (const mode of ['auto', 'approve'] as const) {
        const setting = settings.find((s) => s.mode === mode)
        const channel = setting && channelList.find((c) => c.id === setting.channel_id)
        if (!channel) continue
        const mySnaps = snapList.filter((s) => s.channel_id === channel.id)
        const latest = mySnaps[mySnaps.length - 1]
        const views = Number(latest?.metrics?.views ?? 0)
        const count = published.filter((p) => p.channel_id === channel.id).length
        built.push({
          mode,
          channelName: channel.display_name,
          publishedCount: count,
          views,
          viewsPerPost: count > 0 ? views / count : 0,
        })
      }
      setSides(built)
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

      <ExperimentCompare sides={sides} />

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
