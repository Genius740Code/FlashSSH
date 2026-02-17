import { useState, useEffect, useCallback, useRef } from 'react'
import { GetHosts, AddHost, UpdateHost, DeleteHost, ConnectSSH, DisconnectSSH, SendInput, ResizeTerminal, GetAllTags, ImportFromSSHConfig, GetSettings } from './wailsjs/go/main/App.js'
import { EventsOn } from './wailsjs/runtime/runtime.js'
import HostGrid from './components/HostGrid.jsx'
import Terminal from './components/Terminal.jsx'
import Command from './components/Command.jsx'
import HostModal from './components/HostModal.jsx'
import Toast from './components/Toast.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [hosts, setHosts] = useState([])
  const [tags, setTags] = useState([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [serverTerminalTypes, setServerTerminalTypes] = useState({})
  // status: 'connecting' | 'connected' | 'error'
  const [sessions, setSessions] = useState({})
  const searchRef = useRef(null)

  const getTerminalType = useCallback((hostId) => {
    // First check if we have server-specific setting
    if (serverTerminalTypes[hostId]) {
      return serverTerminalTypes[hostId]
    }
    
    // Fallback to default - this shouldn't happen but ensures we always return something
    return 'terminal'
  }, [serverTerminalTypes])

  const refreshTerminalTypes = useCallback(async () => {
    const settings = await GetSettings()
    const types = {}
    hosts.forEach(host => {
      if (settings.serverSettings && settings.serverSettings[host.id]) {
        types[host.id] = settings.serverSettings[host.id].terminalType || settings.defaultTerminalType || 'terminal'
      } else {
        types[host.id] = settings.defaultTerminalType || 'terminal'
      }
    })
    
    console.log('Refreshing terminal types:', { settings, types })
    setServerTerminalTypes(types)
    
    // Force re-render of active session if terminal type changed
    if (activeSession) {
      const newType = types[activeSession.hostId]
      const currentType = serverTerminalTypes[activeSession.hostId]
      console.log('Active session terminal type change:', { hostId: activeSession.hostId, newType, currentType })
      if (newType !== currentType) {
        // Force a re-render by updating the session
        setActiveSession(prev => ({ ...prev }))
        console.log('Forced re-render for terminal type change')
      }
    }
  }, [hosts, activeSession, serverTerminalTypes])

  const refresh = useCallback(async () => {
    try {
      const [h, t] = await Promise.all([GetHosts(), GetAllTags()])
      setHosts(h ?? [])
      setTags(t ?? [])
      
      // Load terminal types for all hosts
      const settings = await GetSettings()
      const types = {}
      h.forEach(host => {
        if (settings.serverSettings && settings.serverSettings[host.id]) {
          types[host.id] = settings.serverSettings[host.id].terminalType || settings.defaultTerminalType || 'terminal'
        } else {
          types[host.id] = settings.defaultTerminalType || 'terminal'
        }
      })
      setServerTerminalTypes(types)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const offs = [
      EventsOn('terminal:connected', ({ id }) => {
        setSessions(s => ({ ...s, [id]: 'connected' }))
      }),
      EventsOn('terminal:closed', ({ id }) => {
        setSessions(s => { const n = { ...s }; delete n[id]; return n })
        setActiveSession(a => a?.hostId === id ? null : a)
        refresh()
      }),
      EventsOn('terminal:error', ({ id, msg }) => {
        setSessions(s => { const n = { ...s }; delete n[id]; return n })
        setActiveSession(a => a?.hostId === id ? null : a)
        // Keep terminal open so user can read the error — don't close it
      }),
    ]
    return () => offs.forEach(off => off?.())
  }, [refresh])

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setModal({ mode: 'add' }) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && !activeSession) setModal(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeSession])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 3000)
  }

  const handleConnect = async (host) => {
    // Open terminal pane immediately, set connecting state
    setSessions(s => ({ ...s, [host.id]: 'connecting' }))
    setActiveSession({ hostId: host.id, hostName: host.name, color: host.color })
    try {
      await ConnectSSH(host.id)
      // 'connected' status set via terminal:connected event
    } catch (e) {
      // Error already shown in terminal — just mark as failed
      setSessions(s => ({ ...s, [host.id]: 'error' }))
      // Leave terminal open so user can read the error
    }
  }

  const handleDisconnect = async (hostId) => {
    try { await DisconnectSSH(hostId) } catch (_) {}
    setSessions(s => { const n = { ...s }; delete n[hostId]; return n })
    setActiveSession(null)
    refresh()
  }

  const handleSave = async (data) => {
    try {
      if (modal?.mode === 'edit') {
        await UpdateHost({ ...modal.host, ...data })
        showToast('Saved')
      } else {
        await AddHost(data)
        showToast('Host added')
      }
      setModal(null)
      refresh()
    } catch (e) {
      showToast(String(e), 'error')
    }
  }

  const handleDelete = async (host) => {
    try {
      await DeleteHost(host.id)
      if (activeSession?.hostId === host.id) setActiveSession(null)
      setSessions(s => { const n = { ...s }; delete n[host.id]; return n })
      refresh()
    } catch (e) {
      showToast(String(e), 'error')
    }
  }

  const handleImport = async () => {
    try {
      const n = await ImportFromSSHConfig()
      showToast(n > 0 ? `Imported ${n} host${n !== 1 ? 's' : ''}` : 'No new hosts found')
      if (n > 0) refresh()
    } catch (e) {
      showToast(String(e), 'error')
    }
  }

  const filtered = hosts.filter(h => {
    const q = search.toLowerCase()
    const ok = !q || [h.name, h.host, h.user, h.description, ...(h.tags || [])]
      .some(v => v?.toLowerCase().includes(q))
    return ok && (!filterTag || (h.tags || []).includes(filterTag))
  })

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* Left: host list */}
      <div style={{
        width: activeSession ? 320 : '100%',
        minWidth: activeSession ? 280 : undefined,
        display: 'flex', flexDirection: 'column',
        borderRight: activeSession ? '1px solid var(--border)' : 'none',
        transition: 'width 0.2s ease',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 6.5l5 3-5 3" stroke="#22c55e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.5 12H16" stroke="#22c55e" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {!activeSession && <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>FlashSSH</span>}

          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="5.5" cy="5.5" r="4" stroke="var(--muted)" strokeWidth="1.4" />
              <path d="M9 9l2.5 2.5" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%', padding: '7px 10px 7px 28px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 13, color: 'var(--text)',
              }} />
          </div>

          {!activeSession && (
            <>
              <button onClick={handleImport}
                style={{ padding: '7px 12px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Import
              </button>
              <button onClick={() => setShowSettings(true)}
                style={{ padding: '7px 12px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Settings
              </button>
              <button onClick={() => setModal({ mode: 'add' })}
                style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: '#22c55e', color: '#000', whiteSpace: 'nowrap' }}>
                + New
              </button>
            </>
          )}
          {activeSession && (
            <button onClick={() => setShowSettings(true)}
              style={{ padding: '7px 12px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              Settings
            </button>
          )}
        </div>

        {/* Tag filters */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {tags.map(t => (
              <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)}
                style={{
                  padding: '3px 10px', borderRadius: 5, fontSize: 12,
                  border: `1px solid ${filterTag === t ? '#22c55e' : 'var(--border)'}`,
                  color: filterTag === t ? '#22c55e' : 'var(--muted)',
                  background: filterTag === t ? 'rgba(34,197,94,0.08)' : 'transparent',
                }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Host grid/list */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <HostGrid
            hosts={filtered} loading={loading} sessions={sessions}
            activeId={activeSession?.hostId}
            compact={!!activeSession}
            onConnect={handleConnect}
            onEdit={h => setModal({ mode: 'edit', host: h })}
            onDelete={handleDelete}
            onAdd={() => setModal({ mode: 'add' })}
            hasSearch={!!search || !!filterTag}
          />
        </div>
      </div>

      {/* Right: terminal */}
      {activeSession && (() => {
        const terminalType = getTerminalType(activeSession.hostId)
        console.log('Rendering terminal for host:', activeSession.hostId, 'type:', terminalType)
        
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {terminalType === 'cmd' ? (
              <Command
                key={`cmd-${activeSession.hostId}`}
                session={activeSession}
                sessions={sessions}
                onDisconnect={handleDisconnect}
                onSendInput={SendInput}
                onResize={ResizeTerminal}
              />
            ) : (
              <Terminal
                key={`term-${activeSession.hostId}`}
                session={activeSession}
                sessions={sessions}
                onDisconnect={handleDisconnect}
                onSendInput={SendInput}
                onResize={ResizeTerminal}
              />
            )}
          </div>
        )
      })()}

      {modal && (
        <HostModal mode={modal.mode} host={modal.host}
          onSave={handleSave} onClose={() => setModal(null)} existingTags={tags} />
      )}

      {showSettings && (
        <Settings 
          hosts={hosts} 
          onClose={() => setShowSettings(false)} 
          onSettingsChange={refreshTerminalTypes}
        />
      )}

      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} />}
    </div>
  )
}
