import { useState, useEffect } from 'react'
import { GetSettings, SaveSettings, GetServerSettings, SaveServerSettings } from '../wailsjs/go/main/App.js'

export default function Settings({ hosts, onClose, onSettingsChange }) {
  const [settings, setSettings] = useState({
    defaultTerminalType: 'terminal',
    serverSettings: {},
    autoCopyCatOutput: true
  })
  const [activeTab, setActiveTab] = useState('global')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await GetSettings()
        setSettings(s)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
  }, [])

  const saveGlobalSettings = async () => {
    try {
      await SaveSettings(settings)
      onSettingsChange?.()
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  const toggleAutoCopyCat = () => {
    setSettings(prev => ({ ...prev, autoCopyCatOutput: !prev.autoCopyCatOutput }))
  }

  const saveServerSettings = async (hostId, serverSettings) => {
    try {
      await SaveServerSettings(hostId, serverSettings)
      setSettings(prev => ({
        ...prev,
        serverSettings: {
          ...prev.serverSettings,
          [hostId]: serverSettings
        }
      }))
      onSettingsChange?.()
    } catch (e) {
      console.error('Failed to save server settings:', e)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        width: '95%',
        maxWidth: 900,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)'
            }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Settings</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 8,
              borderRadius: 8,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: '100%' }}>
            
            {/* Global Settings */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: '20px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6'
                }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Global Settings</h3>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                  Default Terminal Type
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 12,
                  background: 'var(--surface)',
                  padding: 4,
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: settings.defaultTerminalType === 'terminal' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    border: settings.defaultTerminalType === 'terminal' ? '1px solid #22c55e' : '1px solid transparent'
                  }}>
                    <input
                      type="radio"
                      name="defaultTerminal"
                      value="terminal"
                      checked={settings.defaultTerminalType === 'terminal'}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultTerminalType: e.target.value }))}
                      style={{ margin: 0 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 16,
                        height: 12,
                        background: '#0f0f11',
                        borderRadius: 2,
                        border: '1px solid #22c55e',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          width: 8,
                          height: 1,
                          background: '#22c55e'
                        }} />
                      </div>
                      <span style={{ fontSize: 14 }}>Terminal</span>
                    </div>
                  </label>
                  
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: settings.defaultTerminalType === 'cmd' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                    border: settings.defaultTerminalType === 'cmd' ? '1px solid #666' : '1px solid transparent'
                  }}>
                    <input
                      type="radio"
                      name="defaultTerminal"
                      value="cmd"
                      checked={settings.defaultTerminalType === 'cmd'}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultTerminalType: e.target.value }))}
                      style={{ margin: 0 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 16,
                        height: 12,
                        background: '#000',
                        borderRadius: 2,
                        border: '1px solid #666',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          width: 6,
                          height: 1,
                          background: '#fff'
                        }} />
                      </div>
                      <span style={{ fontSize: 14 }}>Command Prompt</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  cursor: 'pointer', 
                  padding: '12px', 
                  borderRadius: 6, 
                  background: settings.autoCopyCatOutput ? 'rgba(34, 197, 94, 0.1)' : 'transparent', 
                  border: settings.autoCopyCatOutput ? '1px solid #22c55e' : '1px solid var(--border)', 
                  transition: 'all 0.2s ease' 
                }}>
                  <input
                    type="checkbox"
                    checked={settings.autoCopyCatOutput}
                    onChange={toggleAutoCopyCat}
                    style={{ margin: 0, marginRight: 8 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 16,
                      height: 12,
                      background: 'var(--surface)',
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 10 }}>📋</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Auto-copy cat output</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Automatically copy file content to clipboard</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <button
                onClick={saveGlobalSettings}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Save Global Settings
              </button>
            </div>

            {/* Server Settings */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#f59e0b'
                }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Server Settings</h3>
              </div>
              
              <div style={{ flex: 1, overflow: 'auto', maxHeight: '400px' }}>
                {hosts.map(host => {
                  const serverSettings = settings.serverSettings[host.id] || { terminalType: settings.defaultTerminalType }
                  return (
                    <div key={host.id} style={{
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginBottom: 12,
                      background: 'var(--surface)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: host.color || '#22c55e',
                          boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2)'
                        }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{host.name}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{host.host}</div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: 8,
                        background: 'var(--bg)',
                        padding: 4,
                        borderRadius: 6
                      }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: serverSettings.terminalType === 'terminal' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                          border: serverSettings.terminalType === 'terminal' ? '1px solid #22c55e' : '1px solid transparent'
                        }}>
                          <input
                            type="radio"
                            name={`terminal-${host.id}`}
                            value="terminal"
                            checked={serverSettings.terminalType === 'terminal'}
                            onChange={(e) => saveServerSettings(host.id, { ...serverSettings, terminalType: e.target.value })}
                            style={{ margin: 0 }}
                          />
                          <span style={{ fontSize: 13 }}>Terminal</span>
                        </label>
                        
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: serverSettings.terminalType === 'cmd' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                          border: serverSettings.terminalType === 'cmd' ? '1px solid #666' : '1px solid transparent'
                        }}>
                          <input
                            type="radio"
                            name={`terminal-${host.id}`}
                            value="cmd"
                            checked={serverSettings.terminalType === 'cmd'}
                            onChange={(e) => saveServerSettings(host.id, { ...serverSettings, terminalType: e.target.value })}
                            style={{ margin: 0 }}
                          />
                          <span style={{ fontSize: 13 }}>CMD</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
                
                {hosts.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--muted)',
                    fontSize: 14
                  }}>
                    <div style={{ marginBottom: 12 }}>📡</div>
                    <div>No servers configured yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Add servers to set their terminal preferences</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
