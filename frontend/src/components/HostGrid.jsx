function timeAgo(d) {
  if (!d) return null
  const t = new Date(d)
  if (t.getTime() === 0) return null
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function StatusDot({ status }) {
  const c = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#f59e0b' : status === 'error' ? '#ef4444' : null
  if (!c) return null
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', background: c,
      boxShadow: `0 0 6px ${c}80`,
      animation: status === 'connecting' ? 'pulse 1.2s ease infinite' : 'none',
    }} />
  )
}

function CompactRow({ host, session, isActive, onConnect, onEdit }) {
  return (
    <div
      onClick={() => onConnect(host)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderBottom: '1px solid var(--border)', cursor: 'pointer',
        background: isActive ? 'var(--surface2)' : 'transparent',
        transition: 'background var(--t)',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--surface2)' : 'transparent' }}
    >
      <div style={{ width: 8, height: 8, borderRadius: 2, background: host.color || '#22c55e', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{host.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[host.user, host.host].filter(Boolean).join('@')}{host.port !== 22 ? `:${host.port}` : ''}
        </div>
      </div>
      <StatusDot status={session} />
    </div>
  )
}

function HostCard({ host, session, isActive, onConnect, onEdit, onDelete }) {
  const target = [host.user, host.host].filter(Boolean).join('@')
  const port = host.port && host.port !== 22 ? `:${host.port}` : ''
  const ago = timeAgo(host.lastUsed)
  const authHint = host.password ? '🔑 password' : host.identityFile ? `🔑 ${host.identityFile.split('/').pop()}` : '🔑 default key'

  const btnLabel = session === 'connecting' ? 'Connecting…' : session === 'connected' ? 'Open' : session === 'error' ? 'Retry' : 'Connect'
  const btnBg = session === 'connected' ? 'rgba(34,197,94,0.12)' : session === 'error' ? 'rgba(239,68,68,0.12)' : (host.color || '#22c55e')
  const btnColor = session === 'connected' ? '#22c55e' : session === 'error' ? '#ef4444' : '#000'
  const btnBorder = (session === 'connected' || session === 'error') ? `1px solid ${btnBg}` : 'none'

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isActive ? (host.color || '#22c55e') + '55' : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color var(--t), transform var(--t), box-shadow var(--t)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isActive ? (host.color || '#22c55e') + '99' : 'var(--subtle)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isActive ? (host.color || '#22c55e') + '55' : 'var(--border)'
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Color bar */}
      <div style={{ height: 3, background: host.color || '#22c55e' }} />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{host.name}</span>
              <StatusDot status={session} />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {target}{port}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <Btn onClick={() => onEdit(host)}>Edit</Btn>
            <Btn onClick={() => onDelete(host)} danger>✕</Btn>
          </div>
        </div>

        {/* Description */}
        {host.description && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{host.description}</div>
        )}

        {/* Tags */}
        {host.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {host.tags.map(t => (
              <span key={t} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)',
              }}>{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            {ago ? <div>Last: {ago}</div> : <div style={{ opacity: 0.5 }}>Never used</div>}
            <div style={{ opacity: 0.6 }}>{authHint}</div>
          </div>
          <button
            onClick={() => onConnect(host)}
            disabled={session === 'connecting'}
            style={{
              padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              background: btnBg, color: btnColor, border: btnBorder,
              transition: 'opacity var(--t)',
              opacity: session === 'connecting' ? 0.6 : 1,
            }}>
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Btn({ onClick, children, danger }) {
  return (
    <button onClick={onClick}
      style={{ padding: '4px 9px', borderRadius: 5, fontSize: 12, border: '1px solid var(--border)', color: 'var(--muted)', transition: 'var(--t)' }}
      onMouseEnter={e => { e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text)'; e.currentTarget.style.borderColor = danger ? '#ef4444' : 'var(--subtle)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      {children}
    </button>
  )
}

export default function HostGrid({ hosts, loading, sessions, activeId, compact, onConnect, onEdit, onDelete, onAdd, hasSearch }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 14 }}>
      Loading…
    </div>
  )

  if (hosts.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, color: 'var(--muted)', padding: 32 }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
      <div style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
        {hasSearch ? 'No hosts match your search' : 'No hosts yet'}
      </div>
      {!hasSearch && (
        <button onClick={onAdd}
          style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: '#22c55e', color: '#000' }}>
          Add your first host
        </button>
      )}
    </div>
  )

  if (compact) return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {hosts.map(h => (
        <CompactRow key={h.id} host={h} session={sessions[h.id]} isActive={activeId === h.id}
          onConnect={onConnect} onEdit={onEdit} />
      ))}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {hosts.map(h => (
          <HostCard key={h.id} host={h} session={sessions[h.id]} isActive={activeId === h.id}
            onConnect={onConnect} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}
