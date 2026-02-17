import { useEffect, useRef, useCallback, useState } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime.js'
import { GetSettings } from '../wailsjs/go/main/App.js'

export default function Command({ session, sessions, onDisconnect, onSendInput, onResize }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const resizeTimeoutRef = useRef(null)
  const lastResizeRef = useRef({ cols: 0, rows: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [autoCopyCat, setAutoCopyCat] = useState(true)
  const [lastCommand, setLastCommand] = useState('')
  const outputBufferRef = useRef('')

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await GetSettings()
        setAutoCopyCat(settings.autoCopyCatOutput !== false)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
  }, [])

  // Copy to clipboard function
  const copyToClipboard = useCallback((text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err)
      })
    }
  }, [])

  // Process terminal data for cat command detection
  const processTerminalData = useCallback((data) => {
    if (!autoCopyCat) {
      return data
    }

    // Add data to buffer
    outputBufferRef.current += data
    
    // Check if last command was a cat command
    const trimmedCommand = lastCommand.trim()
    if (trimmedCommand.startsWith('cat ') && !trimmedCommand.includes('>>') && !trimmedCommand.includes('>')) {
      // Look for end of file content (when prompt reappears)
      const lines = outputBufferRef.current.split('\n')
      
      // Find the content between cat command and next prompt
      const catIndex = lines.findIndex(line => line.includes(trimmedCommand))
      if (catIndex !== -1) {
        // Extract content after cat command (skip the command line itself)
        const contentLines = lines.slice(catIndex + 1)
        const promptIndex = contentLines.findIndex(line => 
          line.includes('$') || line.includes('#') || line.includes('>')
        )
        
        if (promptIndex > 0) {
          // Extract the file content
          const fileContent = contentLines.slice(0, promptIndex).join('\n').trim()
          if (fileContent && fileContent.length > 0) {
            copyToClipboard(fileContent)
            // Show brief notification
            if (termRef.current) {
              termRef.current.write('\r\n[Clipboard copied]\r\n')
            }
          }
        }
      }
    }
    
    return data
  }, [autoCopyCat, lastCommand, copyToClipboard])

  // Track commands
  const handleData = useCallback((data) => {
    // Track commands (look for command patterns)
    const lines = data.split('\n')
    lines.forEach(line => {
      if (line.includes('$') || line.includes('#') || line.includes('>')) {
        const match = line.match(/[$#>]\s*(.+)/)
        if (match) {
          setLastCommand(match[1].trim())
        }
      }
    })
    
    return processTerminalData(data)
  }, [processTerminalData])

  // Debounced resize handler
  const handleResize = useCallback(() => {
    setIsResizing(true)
    
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      if (fitRef.current && termRef.current && containerRef.current) {
        try {
          // Force terminal to render properly before fitting
          termRef.current.scrollToBottom()
          termRef.current.focus()
          
          const oldCols = termRef.current.cols
          const oldRows = termRef.current.rows
          
          fitRef.current.fit()
          
          const newCols = termRef.current.cols
          const newRows = termRef.current.rows
          
          // Ensure terminal has valid dimensions
          if (newCols > 0 && newRows > 0) {
            // Only notify SSH server if dimensions actually changed
            if (newCols !== oldCols || newRows !== oldRows) {
              lastResizeRef.current = { cols: newCols, rows: newRows }
              onResize(session.hostId, newCols, newRows)
            }
            
            // Refresh terminal display
            termRef.current.refresh(0, termRef.current.rows - 1)
          }
        } catch (error) {
          console.warn('Command resize error:', error)
          // Retry once after a short delay
          setTimeout(() => {
            if (fitRef.current && termRef.current) {
              try { 
                termRef.current.scrollToBottom()
                fitRef.current.fit() 
              } catch (_) {}
            }
          }, 100)
        } finally {
          setIsResizing(false)
        }
      } else {
        setIsResizing(false)
      }
    }, 100) // Reduced debounce for better responsiveness
  }, [session.hostId, onResize])

  // Improved terminal fit with retry mechanism
  const fitTerminal = useCallback((retryCount = 0) => {
    if (!fitRef.current || !containerRef.current || !termRef.current) return
    
    try {
      fitRef.current.fit()
      const cols = termRef.current.cols
      const rows = termRef.current.rows
      
      if (cols > 0 && rows > 0) {
        lastResizeRef.current = { cols, rows }
        onResize(session.hostId, cols, rows)
        
        // Ensure terminal is properly focused and scrolled
        setTimeout(() => {
          if (termRef.current) {
            termRef.current.focus()
            termRef.current.scrollToBottom()
            termRef.current.refresh(0, rows - 1)
          }
        }, 50)
      }
    } catch (error) {
      if (retryCount < 3) {
        setTimeout(() => fitTerminal(retryCount + 1), 100 * (retryCount + 1))
      } else {
        console.warn('Command fit failed after retries:', error)
      }
    }
  }, [session.hostId, onResize])

  useEffect(() => {
    if (!containerRef.current) return
    
    // Clear any existing terminal content
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    
    let term, fitAddon, offData, offClosed

    const init = async () => {
      const { Terminal: XTerm } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      await import('@xterm/xterm/css/xterm.css')

      term = new XTerm({
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          cursorAccent: '#000000',
          selectionBackground: 'rgba(255,255,255,0.3)',
          black: '#000000',    red: '#ff0000',    green: '#00ff00',   yellow: '#ffff00',
          blue: '#0000ff',     magenta: '#ff00ff', cyan: '#00ffff',   white: '#ffffff',
          brightBlack: '#808080', brightRed: '#ff8080', brightGreen: '#80ff80',
          brightYellow: '#ffff80', brightBlue: '#8080ff', brightMagenta: '#ff80ff',
          brightCyan: '#80ffff', brightWhite: '#ffffff',
        },
        fontFamily: "'Consolas', 'Courier New', monospace",
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        cursorWidth: 1,
        scrollback: 500,
        allowTransparency: false,
        convertEol: false,
        screenReaderMode: false,
        cols: 80,
        rows: 24,
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      
      termRef.current = term
      fitRef.current = fitAddon

      // Initial fit with multiple attempts
      setTimeout(() => fitTerminal(), 100)
      setTimeout(() => fitTerminal(), 300)
      setTimeout(() => fitTerminal(), 1000)

      term.onData(data => onSendInput(session.hostId, data))
      term.onResize(({ cols, rows }) => {
        lastResizeRef.current = { cols, rows }
        onResize(session.hostId, cols, rows)
      })

      // Ensure terminal gets focus when clicked
      term.textarea?.addEventListener('focus', () => {
        termRef.current?.focus()
      })

      // Initial focus after a short delay
      setTimeout(() => {
        if (termRef.current) {
          termRef.current.focus()
          termRef.current.scrollToBottom()
        }
      }, 200)

      offData = EventsOn('terminal:data', ({ id, data }) => {
        if (id === session.hostId && term) {
          const processedData = handleData(data)
          term.write(processedData)
        }
      })
      offClosed = EventsOn('terminal:closed', ({ id }) => {
        if (id === session.hostId && term) {
          term.write('\r\nConnection closed. Press any key to exit.\r\n')
        }
      })
    }

    init().catch(console.error)

    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    // Also observe window resize for better responsiveness
    const handleWindowResize = () => handleResize()
    window.addEventListener('resize', handleWindowResize)

    return () => {
      offData?.(); offClosed?.()
      ro.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      if (term) {
        term.dispose()
      }
      // Clear refs to prevent memory leaks
      termRef.current = null
      fitRef.current = null
    }
  }, [session.hostId, handleResize, fitTerminal])

  const status = sessions[session.hostId]

  const statusLabel = status === 'connected' ? 'Connected'
    : status === 'connecting' ? 'Connecting…'
    : status === 'error' ? 'Error'
    : 'Closed'

  const statusColor = status === 'connected' ? '#00ff00'
    : status === 'connecting' ? '#ffff00'
    : status === 'error' ? '#ff0000'
    : '#808080'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid #808080', background: '#1a1a1a', flexShrink: 0,
      }}>
        <div style={{ width: 9, height: 9, borderRadius: 3, background: session.color || '#00ff00' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{session.hostName}</span>

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          background: `${statusColor}20`,
          border: `1px solid ${statusColor}80`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: statusColor,
            animation: status === 'connecting' ? 'pulse 1.2s ease infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: statusColor }}>{statusLabel}</span>
        </div>

        {/* Resize indicator */}
        {isResizing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 12,
            background: 'rgba(0,255,0,0.1)',
            border: '1px solid rgba(0,255,0,0.3)',
          }}>
            <div style={{
              width: 4, height: 4, borderRadius: '50%', background: '#00ff00',
              animation: 'pulse 1s ease infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#00ff00' }}>
              {lastResizeRef.current.cols}×{lastResizeRef.current.rows}
            </span>
          </div>
        )}

        <button
          onClick={() => onDisconnect(session.hostId)}
          style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 6,
            fontSize: 12, fontWeight: 500,
            border: '1px solid #808080', color: '#ffffff',
            background: 'transparent',
            transition: 'var(--t)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff0000'; e.currentTarget.style.borderColor = '#ff0000' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#808080' }}>
          Disconnect
        </button>
      </div>

      {/* Terminal body */}
      <div 
        ref={containerRef} 
        onClick={() => {
          if (termRef.current) {
            termRef.current.focus()
          }
        }}
        style={{ 
          flex: 1, 
          overflow: 'hidden', 
          padding: '4px',
          minHeight: 0, // Ensure proper flex shrinking
          width: '100%', // Ensure full width
          position: 'relative', // Ensure proper positioning
          cursor: 'text' // Show text cursor
        }} 
      />
    </div>
  )
}
