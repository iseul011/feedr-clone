import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { callFn } from '../../lib/api'
import { IMPLEMENTED_PROVIDERS, PROVIDER_LABELS } from '../../lib/types'
import type { Channel, ProviderId } from '../../lib/types'
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

const badge = (color: string, bg: string) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
  color,
  background: bg,
})

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
  color: 'var(--color-muted)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  fontWeight: 600,
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [connecting, setConnecting] = useState<ProviderId | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('channels')
      .select('id,provider,provider_account_id,display_name,avatar_url,status,color,created_at')
    setChannels((data as Channel[]) ?? [])
  }

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) {
      setBanner({
        kind: 'ok',
        text: `${PROVIDER_LABELS[connected as ProviderId] ?? connected} 채널이 연결되었어요`,
      })
    } else if (error) {
      setBanner({ kind: 'error', text: `연결에 실패했어요: ${error}` })
    }
    if (connected || error) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const connect = async (provider: ProviderId) => {
    setConnecting(provider)
    try {
      const { authUrl } = await callFn<{ authUrl: string }>('oauth-start', { provider })
      window.location.href = authUrl
    } catch (e) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
      setConnecting(null)
    }
  }

  const disconnect = async (channel: Channel) => {
    if (!confirm(`${channel.display_name} 연결을 해제할까요? 예약된 발행도 함께 취소됩니다.`)) return
    await supabase.from('channels').delete().eq('id', channel.id)
    load()
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800 }}>채널</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>발행할 SNS 계정을 연결하세요</p>

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
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((provider) => {
            const mine = channels.filter((c) => c.provider === provider)
            const implemented = IMPLEMENTED_PROVIDERS.includes(provider)

            return (
              <div key={provider} style={{ ...card, opacity: implemented || mine.length ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SnsIcon name={provider} size={22} />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {PROVIDER_LABELS[provider]}
                  </span>
                  {!implemented && (
                    <span style={{ ...badge('var(--color-muted)', 'var(--color-bg-gray)'), marginLeft: 'auto' }}>
                      연동 예정
                    </span>
                  )}
                </div>

                {mine.map((channel) => (
                  <div key={channel.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {channel.avatar_url ? (
                      <img
                        src={channel.avatar_url}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      />
                    ) : (
                      <SnsIcon name={channel.provider} size={20} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {channel.display_name}
                      </div>
                      {channel.status === 'connected' ? (
                        <span style={badge('#16A34A', '#F0FDF4')}>연결됨</span>
                      ) : (
                        <span style={badge('#DC2626', '#FEF2F2')}>재연동 필요</span>
                      )}
                    </div>
                  </div>
                ))}

                {mine.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {mine.some((c) => c.status !== 'connected') && (
                      <button style={primaryBtn} onClick={() => connect(provider)}>
                        다시 연결
                      </button>
                    )}
                    <button style={ghostBtn} onClick={() => disconnect(mine[0])}>
                      연결 해제
                    </button>
                  </div>
                ) : implemented ? (
                  <button
                    style={{ ...primaryBtn, opacity: connecting === provider ? 0.6 : 1 }}
                    disabled={connecting !== null}
                    onClick={() => connect(provider)}
                  >
                    {connecting === provider ? '연결 중…' : '연결하기'}
                  </button>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    곧 지원할 예정이에요.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
