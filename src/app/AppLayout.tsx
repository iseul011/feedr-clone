import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Calendar, ChartColumn, LayoutList, PenSquare, Radio, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/app/composer', label: '새 포스트', icon: PenSquare },
  { to: '/app/queue', label: '대기열', icon: LayoutList },
  { to: '/app/calendar', label: '캘린더', icon: Calendar },
  { to: '/app/analytics', label: '분석', icon: ChartColumn },
  { to: '/app/channels', label: '채널', icon: Radio },
]

export default function AppLayout() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)' }}>
      <aside
        style={{
          width: '220px',
          borderRight: '1px solid var(--color-border)',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
              background: isActive ? 'var(--color-primary-light)' : 'transparent',
            })}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
        <button
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-muted)',
            background: 'transparent',
          }}
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/')
          }}
        >
          <LogOut size={17} />
          로그아웃
        </button>
      </aside>
      <div style={{ flex: 1, padding: '32px', minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  )
}
