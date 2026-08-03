import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { callFn } from '../../lib/api'
import type { AutopilotRun, AutopilotSettings, Channel } from '../../lib/types'
import SnsIcon from '../../marketing/SnsIcon'

const card = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
}

const input = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: '14px',
  width: '100%',
}

const label = { fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }

const primaryBtn = {
  padding: '9px 16px',
  background: 'var(--color-primary)',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  fontWeight: 700,
}

const ghostBtn = {
  padding: '9px 16px',
  background: 'var(--color-bg-gray)',
  color: 'var(--color-text)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  fontWeight: 600,
}

const RUN_BADGE: Record<AutopilotRun['status'], { fg: string; bg: string; label: string }> = {
  running: { fg: '#D97706', bg: '#FFFBEB', label: '실행 중' },
  succeeded: { fg: '#16A34A', bg: '#F0FDF4', label: '성공' },
  failed: { fg: '#DC2626', bg: '#FEF2F2', label: '실패' },
}

type Editable = Pick<
  AutopilotSettings,
  'enabled' | 'mode' | 'brand_name' | 'persona' | 'max_posts_per_run'
>

const DEFAULTS: Editable = {
  enabled: false,
  mode: 'approve',
  brand_name: '',
  persona: '',
  max_posts_per_run: 2,
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AutopilotPage() {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [forms, setForms] = useState<Record<string, Editable>>({})
  const [runs, setRuns] = useState<AutopilotRun[]>([])
  const [busy, setBusy] = useState<string | null>(null) // channel_id 실행/저장 중
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const loadRuns = async () => {
    const { data } = await supabase
      .from('autopilot_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20)
    setRuns((data as AutopilotRun[]) ?? [])
  }

  useEffect(() => {
    ;(async () => {
      const [{ data: ch }, { data: st }] = await Promise.all([
        supabase
          .from('channels')
          .select('id,provider,provider_account_id,display_name,avatar_url,status,color,created_at')
          .eq('status', 'connected'),
        supabase.from('autopilot_settings').select('*'),
      ])
      const settings = (st as AutopilotSettings[]) ?? []
      const next: Record<string, Editable> = {}
      for (const c of (ch as Channel[]) ?? []) {
        const s = settings.find((x) => x.channel_id === c.id)
        next[c.id] = s
          ? {
              enabled: s.enabled,
              mode: s.mode,
              brand_name: s.brand_name,
              persona: s.persona,
              max_posts_per_run: s.max_posts_per_run,
            }
          : { ...DEFAULTS }
      }
      setForms(next)
      setChannels((ch as Channel[]) ?? [])
      loadRuns()
    })()
  }, [])

  const patch = (channelId: string, p: Partial<Editable>) =>
    setForms((f) => ({ ...f, [channelId]: { ...f[channelId], ...p } }))

  const save = async (channelId: string) => {
    setBusy(channelId)
    setBanner(null)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('autopilot_settings')
      .upsert({ channel_id: channelId, user_id: userData.user!.id, ...forms[channelId] })
    setBusy(null)
    setBanner(
      error
        ? { kind: 'error', text: `저장 실패: ${error.message}` }
        : { kind: 'ok', text: '설정을 저장했어요' },
    )
  }

  const runNow = async (channelId: string) => {
    setBusy(channelId)
    setBanner(null)
    try {
      await save(channelId) // 화면의 설정 그대로 실행되도록 먼저 저장
      setBusy(channelId)
      await callFn('autopilot-runner', undefined, { channel_id: channelId })
      setBanner({ kind: 'ok', text: '실행이 끝났어요. 아래 실행 기록을 확인하세요.' })
    } catch (e) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(null)
      loadRuns()
    }
  }

  const channelName = (id: string) => channels?.find((c) => c.id === id)?.display_name ?? '(삭제된 채널)'

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800 }}>오토파일럿</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
        지표를 보고 스스로 글을 만들어 예약하는 성장 에이전트예요. 채널별로 켜고 끌 수 있어요.
      </p>

      {banner && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 600,
            color: banner.kind === 'ok' ? '#16A34A' : '#DC2626',
            background: banner.kind === 'ok' ? '#F0FDF4' : '#FEF2F2',
          }}
        >
          {banner.text}
        </div>
      )}

      {!channels ? (
        <p style={{ color: 'var(--color-muted)' }}>불러오는 중…</p>
      ) : channels.length === 0 ? (
        <div style={{ ...card, alignItems: 'center', padding: '48px 20px' }}>
          <p style={{ color: 'var(--color-muted)' }}>먼저 채널을 연결해야 오토파일럿을 쓸 수 있어요.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
          {channels.map((c) => {
            const f = forms[c.id] ?? DEFAULTS
            return (
              <div key={c.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SnsIcon name={c.provider} size={20} />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{c.display_name}</span>
                  <label
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      onChange={(e) => patch(c.id, { enabled: e.target.checked })}
                    />
                    {f.enabled ? '켜짐' : '꺼짐'}
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={label}>운영 모드</div>
                    <select
                      style={{ ...input, background: '#fff' }}
                      value={f.mode}
                      onChange={(e) => patch(c.id, { mode: e.target.value as 'approve' | 'auto' })}
                    >
                      <option value="approve">승인 필요 — 초안을 만들면 대기열에서 승인</option>
                      <option value="auto">완전 자율 — 예약하면 그대로 발행</option>
                    </select>
                  </div>
                  <div>
                    <div style={label}>실행당 최대 생성 글 수</div>
                    <input
                      style={input}
                      type="number"
                      min={1}
                      max={5}
                      value={f.max_posts_per_run}
                      onChange={(e) =>
                        patch(c.id, {
                          max_posts_per_run: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <div style={label}>브랜드 이름</div>
                  <input
                    style={input}
                    value={f.brand_name}
                    placeholder="예: 이슬 베이커리"
                    onChange={(e) => patch(c.id, { brand_name: e.target.value })}
                  />
                </div>

                <div>
                  <div style={label}>페르소나 / 톤</div>
                  <textarea
                    style={{ ...input, minHeight: '72px', resize: 'vertical' as const, fontFamily: 'inherit' }}
                    value={f.persona}
                    placeholder="예: 동네 빵집 사장님. 담백하고 다정한 반말체, 과장 없는 일상 기록 톤."
                    onChange={(e) => patch(c.id, { persona: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...ghostBtn, opacity: busy === c.id ? 0.6 : 1 }}
                    disabled={busy !== null}
                    onClick={() => save(c.id)}
                  >
                    저장
                  </button>
                  <button
                    style={{ ...primaryBtn, opacity: busy === c.id ? 0.6 : 1 }}
                    disabled={busy !== null}
                    onClick={() => runNow(c.id)}
                  >
                    {busy === c.id ? '실행 중… (1분쯤 걸려요)' : '지금 실행'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {runs.length > 0 && (
        <>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
            실행 기록 <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>{runs.length}</span>
          </h2>
          <div style={{ ...card, padding: '4px 20px', gap: 0 }}>
            {runs.map((run, i) => {
              const b = RUN_BADGE[run.status]
              return (
                <div
                  key={run.id}
                  style={{ padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{channelName(run.channel_id)}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{fmt(run.started_at)}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: b.fg,
                        background: b.bg,
                        padding: '3px 10px',
                        borderRadius: '999px',
                      }}
                    >
                      {b.label}
                    </span>
                  </div>
                  {run.report && (
                    <p style={{ fontSize: '13px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{run.report}</p>
                  )}
                  {run.error && (
                    <p style={{ fontSize: '13px', marginTop: '8px', color: '#DC2626' }}>{run.error}</p>
                  )}
                  {run.actions.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}>
                        도구 호출 {run.actions.length}건
                      </summary>
                      <ol style={{ margin: '8px 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {run.actions.map((a, j) => (
                          <li key={j} style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                            <code style={{ color: 'var(--color-text)', fontWeight: 600 }}>{a.tool}</code>
                            {' — '}
                            {a.result.length > 160 ? `${a.result.slice(0, 160)}…` : a.result}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
