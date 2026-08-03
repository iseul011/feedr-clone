import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Post, PostTarget, ProviderId } from '../../lib/types'
import SnsIcon from '../../marketing/SnsIcon'

type Row = PostTarget & {
  posts: Post
  channels: { id: string; provider: ProviderId; display_name: string; color: string }
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function fmt(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${hh}:${mm}`
}

const BADGE: Record<string, { fg: string; bg: string; label: string }> = {
  queued: { fg: '#3B5BDB', bg: '#EEF2FF', label: '예약됨' },
  publishing: { fg: '#D97706', bg: '#FFFBEB', label: '발행 중' },
  published: { fg: '#16A34A', bg: '#F0FDF4', label: '발행 완료' },
  failed: { fg: '#DC2626', bg: '#FEF2F2', label: '실패' },
}

const card = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  padding: '4px 20px',
}

function title(row: Row): string {
  return row.posts.title || row.posts.body.slice(0, 40) || '(내용 없음)'
}

export default function QueuePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('post_targets')
      .select('*, posts(*), channels(id,provider,display_name,color)')
      .order('scheduled_at', { ascending: true })
    setRows((data as Row[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const cancel = async (id: string) => {
    await supabase.from('post_targets').update({ status: 'canceled' }).eq('id', id)
    load()
  }

  const retry = async (id: string) => {
    await supabase
      .from('post_targets')
      .update({ status: 'queued', attempt_count: 0, next_attempt_at: null, error_message: null })
      .eq('id', id)
    load()
  }

  const sections: { heading: string; items: Row[] }[] = [
    { heading: '예약됨', items: rows.filter((r) => r.status === 'queued' || r.status === 'publishing') },
    { heading: '발행 완료', items: rows.filter((r) => r.status === 'published') },
    { heading: '실패', items: rows.filter((r) => r.status === 'failed') },
  ]

  if (loading) return null

  const empty = sections.every((s) => s.items.length === 0)

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800 }}>대기열</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '28px' }}>
        예약된 발행을 한눈에 확인하세요
      </p>

      {empty && (
        <div style={{ ...card, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-muted)', marginBottom: '16px' }}>
            아직 예약된 포스트가 없어요
          </p>
          <Link
            to="/app/composer"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            첫 포스트 만들기
          </Link>
        </div>
      )}

      {sections.map(
        ({ heading, items }) =>
          items.length > 0 && (
            <div key={heading} style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
                {heading} <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>{items.length}</span>
              </h2>
              <div style={card}>
                {items.map((row, i) => {
                  const badge = BADGE[row.status]
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 0',
                        borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                      }}
                    >
                      <SnsIcon name={row.channels.provider} size={18} />
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: row.channels.color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {title(row)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          {row.channels.display_name} · {fmt(row.scheduled_at)}
                        </div>
                        {row.status === 'failed' && row.error_message && (
                          <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '2px' }}>
                            {row.error_message}
                          </div>
                        )}
                      </div>
                      {badge && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: badge.fg,
                            background: badge.bg,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      )}
                      {row.provider_url && (
                        <a
                          href={row.provider_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, flexShrink: 0 }}
                        >
                          보기 →
                        </a>
                      )}
                      {row.status === 'queued' && (
                        <button
                          style={{ fontSize: '13px', color: 'var(--color-muted)', background: 'none', flexShrink: 0 }}
                          onClick={() => cancel(row.id)}
                        >
                          취소
                        </button>
                      )}
                      {row.status === 'failed' && (
                        <button
                          style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, background: 'none', flexShrink: 0 }}
                          onClick={() => retry(row.id)}
                        >
                          재시도
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ),
      )}
    </div>
  )
}
