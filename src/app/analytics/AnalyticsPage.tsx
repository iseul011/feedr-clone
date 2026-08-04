import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { aiAssist } from '../../lib/api'
import type { AnalyticsSnapshot, Channel, PostInsight } from '../../lib/types'
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
  likes: number
  likesPerPost: number
  followerDelta: number
  engagementRate: number // (좋아요+답글+리포스트+인용) / 조회 × 100
}

// post_insights 조인 행 (게시물 성과 테이블·비교 집계용)
type InsightRow = PostInsight & {
  post_targets: { published_at: string | null; posts: { title: string; body: string } | null } | null
}

// 타깃별 최신 스냅샷만 남긴다 (captured_at 내림차순 입력 전제)
function latestPerTarget(rows: InsightRow[]): InsightRow[] {
  const seen = new Set<string>()
  const out: InsightRow[] = []
  for (const r of rows) {
    if (seen.has(r.target_id)) continue
    seen.add(r.target_id)
    out.push(r)
  }
  return out
}

// 비교할 지표 3종 — 각 그룹이 독립 스케일(단위가 달라 축을 공유하지 않는다)
const METRICS: {
  key: string
  label: string
  unit: string
  value: (s: ExperimentSide) => number
  fmt: (v: number) => string
}[] = [
  {
    key: 'views',
    label: '글당 평균 조회수',
    unit: '조회/글',
    value: (s) => s.viewsPerPost,
    fmt: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: 'likes',
    label: '글당 평균 좋아요',
    unit: '좋아요/글',
    value: (s) => s.likesPerPost,
    fmt: (v) => (v >= 10 ? Math.round(v).toLocaleString() : v.toFixed(1)),
  },
  {
    key: 'engagement',
    label: '참여율 (좋아요+답글+리포스트+인용 ÷ 조회)',
    unit: '%',
    value: (s) => s.engagementRate,
    fmt: (v) => v.toFixed(1),
  },
  {
    key: 'followers',
    label: '팔로워 증가 (수집 기간)',
    unit: '명',
    value: (s) => s.followerDelta,
    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}`,
  },
]

function CompareBar({
  side,
  value,
  max,
  unit,
  fmt,
}: {
  side: ExperimentSide
  value: number
  max: number
  unit: string
  fmt: (v: number) => string
}) {
  const safe = Math.max(value, 0) // 음수(팔로워 감소)는 막대 0, 수치로만 표시
  const pct = max > 0 ? Math.max((safe / max) * 100, safe > 0 ? 2 : 0) : 0
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
        title={`${side.channelName} · 글 ${side.publishedCount}개 발행`}
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
      <span style={{ fontSize: '13px', fontWeight: 700, width: '104px', textAlign: 'right', flexShrink: 0 }}>
        {fmt(value)} <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>{unit}</span>
      </span>
    </div>
  )
}

function ratioBadge(a: number, b: number): string | null {
  if (a <= 0 || b <= 0) return null
  const r = Math.max(a, b) / Math.min(a, b)
  return r >= 10 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`
}

function ExperimentCompare({ sides }: { sides: ExperimentSide[] }) {
  const auto = sides.find((s) => s.mode === 'auto')
  const approve = sides.find((s) => s.mode === 'approve')
  if (!auto || !approve) return null

  // 히어로 숫자는 대표 지표(글당 조회수) 기준
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
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {METRICS.map((m) => {
            const av = m.value(auto)
            const pv = m.value(approve)
            const max = Math.max(av, pv, 0)
            const badge = ratioBadge(av, pv)
            return (
              <div key={m.key}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)' }}>
                    {m.label}
                  </span>
                  {badge && (
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      {badge} <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>차이</span>
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <CompareBar side={auto} value={av} max={max} unit={m.unit} fmt={m.fmt} />
                  <CompareBar side={approve} value={pv} max={max} unit={m.unit} fmt={m.fmt} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '14px 0 0' }}>
        완전 자율 {auto.publishedCount}개 · AI+승인 {approve.publishedCount}개 발행 기준. 팔로워
        증가는 수집 기간(최근 30일 내) 첫 스냅샷 대비입니다. 표본이 작아 아직 우연일 수 있습니다.
      </p>
    </div>
  )
}

// 일별 조회수 미니 바차트 — 최근 14일, 호버 시 날짜·수치 툴팁
function DailyViewsBars({ series, color }: { series: Record<string, number>; color: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const days = Object.keys(series).sort().slice(-14)
  if (days.length === 0) return null
  const max = Math.max(...days.map((d) => series[d]), 1)
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '6px' }}>
        일별 조회수 (최근 {days.length}일)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '56px', position: 'relative' }}>
        {days.map((d, i) => (
          <div
            key={d}
            style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              style={{
                width: '100%',
                height: `${Math.max((series[d] / max) * 100, series[d] > 0 ? 4 : 1)}%`,
                background: color,
                opacity: hover === null || hover === i ? 1 : 0.45,
                borderRadius: '3px 3px 0 0',
              }}
            />
            {hover === i && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--color-text)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {fmtDate(d)} · {series[d].toLocaleString()} 조회
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 채널 누적 참여 칩 — 값이 있는 지표만 렌더
function MetricChips({ metrics }: { metrics: AnalyticsSnapshot['metrics'] }) {
  const items: [string, number | undefined][] = [
    ['30일 조회', metrics.views],
    ['누적 좋아요', metrics.likes],
    ['누적 답글', metrics.replies],
    ['누적 리포스트', metrics.reposts],
    ['누적 인용', metrics.quotes],
  ]
  const present = items.filter(([, v]) => typeof v === 'number')
  if (present.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: '10px' }}>
      {present.map(([label, v]) => (
        <span key={label} style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          {label} <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>{(v as number).toLocaleString()}</strong>
        </span>
      ))}
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
          {latest.metrics.views_series && (
            <DailyViewsBars series={latest.metrics.views_series} color={channel.color} />
          )}
          <MetricChips metrics={latest.metrics} />
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

// 게시물별 성과 — 조회수 상위 10개
function TopPosts({ rows, channels }: { rows: InsightRow[]; channels: Channel[] }) {
  if (rows.length === 0) return null
  const top = [...rows].sort((a, b) => b.views - a.views).slice(0, 10)
  const th = {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--color-muted)',
    textAlign: 'right' as const,
    padding: '6px 0 6px 14px',
    whiteSpace: 'nowrap' as const,
  }
  const td = { fontSize: '13px', textAlign: 'right' as const, padding: '7px 0 7px 14px' }
  return (
    <div style={{ ...card, marginBottom: '16px', overflowX: 'auto' }}>
      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>게시물 성과 TOP 10</div>
      <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '10px' }}>
        리포스트·인용이 높을수록 팔로워 밖으로 퍼진 글입니다. (Threads API는 팔로워/비팔로워 열람
        구분과 프로필 방문 수는 제공하지 않아요)
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ ...th, textAlign: 'left', paddingLeft: 0 }}>글</th>
            <th style={{ ...th, textAlign: 'left' }}>발행일</th>
            <th style={th}>조회</th>
            <th style={th}>좋아요</th>
            <th style={th}>답글</th>
            <th style={th}>리포스트</th>
            <th style={th}>인용</th>
            <th style={th}>공유</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => {
            const ch = channels.find((c) => c.id === r.channel_id)
            const title =
              r.post_targets?.posts?.title || r.post_targets?.posts?.body?.slice(0, 40) || '(내용 없음)'
            return (
              <tr key={r.target_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ ...td, textAlign: 'left', paddingLeft: 0, maxWidth: '260px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: ch?.color ?? 'var(--color-muted)',
                        flexShrink: 0,
                      }}
                      title={ch?.display_name}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'left', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                  {r.post_targets?.published_at ? fmtDate(r.post_targets.published_at) : '—'}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>{r.views.toLocaleString()}</td>
                <td style={td}>{r.likes.toLocaleString()}</td>
                <td style={td}>{r.replies.toLocaleString()}</td>
                <td style={td}>{r.reposts.toLocaleString()}</td>
                <td style={td}>{r.quotes.toLocaleString()}</td>
                <td style={td}>{r.shares.toLocaleString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsPage() {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([])
  const [sides, setSides] = useState<ExperimentSide[]>([])
  const [insights, setInsights] = useState<InsightRow[]>([])
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
      supabase
        .from('post_insights')
        .select('*, post_targets(published_at, posts(title, body))')
        .order('captured_at', { ascending: false }),
    ]).then(([ch, snap, st, pub, ins]) => {
      const channelList = (ch.data as Channel[]) ?? []
      const snapList = (snap.data as AnalyticsSnapshot[]) ?? []
      const insightList = latestPerTarget((ins.data as InsightRow[]) ?? [])
      setChannels(channelList)
      setSnapshots(snapList)
      setInsights(insightList)

      // 실험 비교: 오토파일럿이 설정된 채널을 모드별로 집계 (모드당 첫 채널)
      // 조회·좋아요·참여율은 게시물 인사이트 합계 기준 (채널 지표보다 정확)
      const settings = (st.data as { channel_id: string; mode: 'auto' | 'approve' }[]) ?? []
      const published = (pub.data as { channel_id: string }[]) ?? []
      const built: ExperimentSide[] = []
      for (const mode of ['auto', 'approve'] as const) {
        const setting = settings.find((s) => s.mode === mode)
        const channel = setting && channelList.find((c) => c.id === setting.channel_id)
        if (!channel) continue
        const mySnaps = snapList.filter((s) => s.channel_id === channel.id)
        const latest = mySnaps[mySnaps.length - 1]
        const first = mySnaps[0]
        const myInsights = insightList.filter((r) => r.channel_id === channel.id)
        const sum = (f: (r: InsightRow) => number) => myInsights.reduce((a, r) => a + f(r), 0)
        const views = sum((r) => r.views)
        const likes = sum((r) => r.likes)
        const engagement = likes + sum((r) => r.replies + r.reposts + r.quotes)
        const count = published.filter((p) => p.channel_id === channel.id).length
        built.push({
          mode,
          channelName: channel.display_name,
          publishedCount: count,
          views,
          viewsPerPost: count > 0 ? views / count : 0,
          likes,
          likesPerPost: count > 0 ? likes / count : 0,
          followerDelta: latest && first ? latest.followers - first.followers : 0,
          engagementRate: views > 0 ? (engagement / views) * 100 : 0,
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

      <TopPosts rows={insights} channels={channels} />

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
