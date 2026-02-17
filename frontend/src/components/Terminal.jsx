import { useEffect, useRef } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime.js'

export default function Terminal({ session, sessions, onDisconnect, onSendInput, onResize }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    let term, fitAddon, offData, offClosed

    const init = async () => {
      const { Terminal: XTerm } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      await import('@xterm/xterm/css/xterm.css')

      term = new XTerm({
        theme: {
          background: '#0f0f11',
          foreground: '#e8e8ea',
          cursor: '#22c55e',
          cursorAccent: '#0f0f11',
          selectionBackground: 'rgba(255,255,255,0.12)',
          black: '#1a1a1e',    red: '#f87171',    green: '#4ade80',   yellow: '#fbbf24',
          blue: '#60a5fa',     magenta: '#c084fc', cyan: '#22d3ee',   white: '#e8e8ea',
          brightBlack: '#444455', brightRed: '#ef4444', brightGreen: '#22c55e',
          brightYellow: '#f59e0b', brightBlue: '#3b82f6', brightMagenta: '#a855f7',
          brightCyan: '#06b6d4', brightWhite: '#ffffff',
        },
        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
        fontSize: 14,
        lineHeight: 1.45,
        cursorBlink: true,
        cursorStyle: 'bar',
        cursorWidth: 2,
        scrollback: 10000,
        allowTransparency: false,
        convertEol: false,
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      setTimeout(() => fitAddon.fit(), 50)

      termRef.current = term
      fitRef.current = fitAddon

      term.onData(data => onSendInput(session.hostId, data))
      term.onResize(({ cols, rows }) => onResize(session.hostId, cols, rows))

      offData = EventsOn('terminal:data', ({ id, data }) => {
        if (id === session.hostId && term) term.write(data)
      })
      offClosed = EventsOn('terminal:closed', ({ id }) => {
        if (id === session.hostId && term) {
          term.write('\r\n\x1b[90m─────────────────────────────\x1b[0m\r\n')
          term.write('\x1b[90mSession ended. Close this panel or reconnect.\x1b[0m\r\n')
        }
      })
    }

    init().catch(console.error)

    const ro = new ResizeObserver(() => {
      if (fitRef.current) {
        try { fitRef.current.fit() } catch (_) {}
      }
    })
    ro.observe(containerRef.current)

    return () => {
      offData?.(); offClosed?.()
      ro.disconnect()
      term?.dispose()
    }
  }, [session.hostId])

  const status = sessions[session.hostId]

  const statusLabel = status === 'connected' ? 'Connected'
    : status === 'connecting' ? 'Connecting…'
    : status === 'error' ? 'Error'
    : 'Closed'

  const statusColor = status === 'connected' ? '#22c55e'
    : status === 'connecting' ? '#f59e0b'
    : status === 'error' ? '#ef4444'
    : 'var(--muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f11' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ width: 9, height: 9, borderRadius: 3, background: session.color || '#22c55e' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{session.hostName}</span>

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          background: `${statusColor}15`,
          border: `1px solid ${statusColor}35`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: statusColor,
            animation: status === 'connecting' ? 'pulse 1.2s ease infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: statusColor }}>{statusLabel}</span>
        </div>

        <button
          onClick={() => onDisconnect(session.hostId)}
          style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 6,
            fontSize: 12, fontWeight: 500,
            border: '1px solid var(--border)', color: 'var(--muted)',
            transition: 'var(--t)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef444455' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          Disconnect
        </button>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: '8px 4px 4px 8px' }} />
    </div>
  )
}
