import { useEffect, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Post, PostTarget, ProviderId } from '../../lib/types'
import { STATUS_LABELS } from '../../lib/types'

type Row = PostTarget & {
  posts: Post
  channels: { id: string; provider: ProviderId; display_name: string; color: string }
}

const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

function chipTitle(row: Row): string {
  return row.posts.title || row.posts.body.slice(0, 20) || '(내용 없음)'
}

export default function CalendarPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selected, setSelected] = useState<Row | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('post_targets')
      .select('*, posts(*), channels(id,provider,display_name,color)')
      .order('scheduled_at', { ascending: true })
    setRows((data as Row[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const days =
    view === 'month'
      ? eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor)),
          end: endOfWeek(endOfMonth(cursor)),
        })
      : eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })

  const move = (dir: 1 | -1) =>
    setCursor(view === 'month' ? addMonths(cursor, dir) : addWeeks(cursor, dir))

  const drop = async (day: Date) => {
    if (!dragId) return
    const row = rows.find((r) => r.id === dragId)
    setDragId(null)
    if (!row) return
    const old = new Date(row.scheduled_at)
    const next = addDays(day, 0)
    next.setHours(old.getHours(), old.getMinutes(), 0, 0)
    const iso = next.toISOString()
    // 낙관적 갱신
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, scheduled_at: iso } : r)))
    await supabase.from('post_targets').update({ scheduled_at: iso }).eq('id', row.id)
  }

  const cancel = async (id: string) => {
    await supabase.from('post_targets').update({ status: 'canceled' }).eq('id', id)
    setSelected(null)
    load()
  }

  const navBtn = {
    padding: '6px 12px',
    background: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginRight: '8px' }}>캘린더</h1>
        <button style={navBtn} onClick={() => move(-1)}>‹ 이전</button>
        <span style={{ fontSize: '16px', fontWeight: 700, minWidth: '110px', textAlign: 'center' }}>
          {format(cursor, 'yyyy년 M월')}
        </span>
        <button style={navBtn} onClick={() => move(1)}>다음 ›</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['month', 'week'] as const).map((v) => (
            <button
              key={v}
              style={{
                ...navBtn,
                background: view === v ? 'var(--color-primary)' : '#fff',
                color: view === v ? '#fff' : 'var(--color-text)',
                borderColor: view === v ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              onClick={() => setView(v)}
            >
              {v === 'month' ? '월' : '주'}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--color-border)',
          gap: '1px',
        }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            style={{
              background: 'var(--color-bg-gray)',
              padding: '8px',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-muted)',
            }}
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const today = isSameDay(day, new Date())
          const muted = view === 'month' && !isSameMonth(day, cursor)
          const dayRows = rows.filter(
            (r) => r.status !== 'canceled' && isSameDay(new Date(r.scheduled_at), day),
          )
          return (
            <div
              key={day.toISOString()}
              style={{
                background: '#fff',
                minHeight: view === 'month' ? '110px' : '320px',
                padding: '6px',
                opacity: muted ? 0.45 : 1,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(day)}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: today ? '2px solid var(--color-primary)' : 'none',
                  color: today ? 'var(--color-primary)' : 'var(--color-text)',
                  marginBottom: '4px',
                }}
              >
                {format(day, 'd')}
              </div>
              {dayRows.map((row) => (
                <div
                  key={row.id}
                  draggable={row.status === 'queued'}
                  onDragStart={() => setDragId(row.id)}
                  onClick={() => setSelected(row)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 6px',
                    marginBottom: '3px',
                    borderRadius: '6px',
                    background: 'var(--color-bg-gray)',
                    fontSize: '12px',
                    cursor: row.status === 'queued' ? 'grab' : 'pointer',
                    opacity: row.status === 'queued' ? 1 : 0.7,
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: row.channels.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chipTitle(row)}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {selected && (
        <div
          style={{
            marginTop: '16px',
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: selected.channels.color }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{chipTitle(selected)}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {selected.channels.display_name} · {format(new Date(selected.scheduled_at), 'M월 d일 HH:mm')} ·{' '}
              {STATUS_LABELS[selected.status]}
            </div>
          </div>
          {selected.status === 'queued' && (
            <button
              style={{ fontSize: '13px', color: '#DC2626', background: 'none', fontWeight: 600 }}
              onClick={() => cancel(selected.id)}
            >
              취소
            </button>
          )}
          <button
            style={{ fontSize: '13px', color: 'var(--color-muted)', background: 'none' }}
            onClick={() => setSelected(null)}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}
