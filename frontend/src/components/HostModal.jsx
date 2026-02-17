import { useState, useEffect, useRef } from 'react'

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#ef4444']
const inp = { padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, fontSize:14, color:'var(--text)', width:'100%' }
const lbl = { fontSize:12, color:'var(--muted)', marginBottom:5, fontWeight:500, display:'block' }

export default function HostModal({ mode, host, onSave, onClose, existingTags }) {
  const [f, setF] = useState({ name:'', host:'', port:22, user:'', password:'', identityFile:'', description:'', tags:[], color:COLORS[0] })
  const [showPw, setShowPw] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errs, setErrs] = useState({})
  const ref = useRef(null)

  useEffect(() => {
    if (mode === 'edit' && host) setF({
      name:host.name||'', host:host.host||'', port:host.port||22,
      user:host.user||'', password:host.password||'', identityFile:host.identityFile||'',
      description:host.description||'', tags:host.tags||[], color:host.color||COLORS[0],
    })
    setTimeout(() => ref.current?.focus(), 60)
  }, [mode, host])

  const set = (k, v) => { setF(p => ({...p,[k]:v})); setErrs(p => ({...p,[k]:null})) }

  const submit = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'Required'
    if (!f.host.trim()) e.host = 'Required'
    if (!f.port || f.port < 1 || f.port > 65535) e.port = '1–65535'
    if (Object.keys(e).length) { setErrs(e); return }
    onSave({...f, port: Number(f.port)})
  }

  const addTag = t => { t = t.trim().toLowerCase(); if (t && !f.tags.includes(t)) set('tags', [...f.tags, t]); setTagInput('') }

  const preview = (() => {
    let c = 'ssh'
    if (f.port && Number(f.port) !== 22) c += ` -p ${f.port}`
    if (f.identityFile && !f.password) c += ` -i ${f.identityFile}`
    const tgt = [f.user, f.host].filter(Boolean).join('@')
    if (tgt) c += ` ${tgt}`
    if (f.password) c += '  \x1b[90m# password auth\x1b[0m'
    return c
  })()

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,zIndex:100 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.6)',animation:'fadeUp 0.15s ease' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:700,fontSize:16 }}>{mode==='add' ? 'New host' : 'Edit host'}</span>
          <button onClick={onClose} style={{ color:'var(--muted)',fontSize:20,lineHeight:1,padding:'0 4px' }}>×</button>
        </div>

        <div style={{ padding:20,display:'flex',flexDirection:'column',gap:16 }}>

          {/* Color picker */}
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:12,color:'var(--muted)',fontWeight:500 }}>Color</span>
            <div style={{ display:'flex',gap:8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color',c)}
                  style={{ width:18,height:18,borderRadius:4,background:c,
                    outline: f.color===c ? `2px solid ${c}` : 'none', outlineOffset:2,
                    transition:'transform var(--t)', transform: f.color===c ? 'scale(1.2)' : 'scale(1)' }}/>
              ))}
            </div>
          </div>

          {/* Name + Description */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={lbl}>Name *</label>
              <input ref={ref} value={f.name} onChange={e=>set('name',e.target.value)} placeholder="My Server"
                style={{...inp,borderColor:errs.name?'#ef4444':'var(--border)'}} onKeyDown={e=>e.key==='Enter'&&submit()}/>
              {errs.name && <div style={{fontSize:12,color:'#ef4444',marginTop:3}}>{errs.name}</div>}
            </div>
            <div>
              <label style={lbl}>Description</label>
              <input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Optional note" style={inp}/>
            </div>
          </div>

          {/* Host + Port */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 90px',gap:12 }}>
            <div>
              <label style={lbl}>Hostname / IP *</label>
              <input value={f.host} onChange={e=>set('host',e.target.value)} placeholder="192.168.1.1 or server.com"
                style={{...inp,borderColor:errs.host?'#ef4444':'var(--border)'}} spellCheck={false}/>
              {errs.host && <div style={{fontSize:12,color:'#ef4444',marginTop:3}}>{errs.host}</div>}
            </div>
            <div>
              <label style={lbl}>Port</label>
              <input value={f.port} onChange={e=>set('port',e.target.value)} type="number" min="1" max="65535"
                style={{...inp,borderColor:errs.port?'#ef4444':'var(--border)'}}/>
            </div>
          </div>

          {/* Username + Password */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={lbl}>Username</label>
              <input value={f.user} onChange={e=>set('user',e.target.value)} placeholder="root" spellCheck={false} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Password <span style={{opacity:.5,fontWeight:400}}>(or leave blank for key)</span></label>
              <div style={{ position:'relative' }}>
                <input value={f.password} onChange={e=>set('password',e.target.value)}
                  type={showPw?'text':'password'} placeholder="••••••••"
                  style={{...inp,paddingRight:52}}/>
                <button onClick={() => setShowPw(s=>!s)}
                  style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--muted)',padding:'2px 6px',borderRadius:4,border:'1px solid var(--border)',background:'var(--surface)' }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {/* Identity file - only show if no password */}
          {!f.password && (
            <div>
              <label style={lbl}>Identity File <span style={{opacity:.5,fontWeight:400}}>(optional, auto-detects ~/.ssh/id_rsa)</span></label>
              <input value={f.identityFile} onChange={e=>set('identityFile',e.target.value)}
                placeholder="~/.ssh/id_rsa" spellCheck={false} style={inp}/>
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={lbl}>Tags</label>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6,padding:'7px 10px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,minHeight:42,alignItems:'center' }}>
              {f.tags.map(t => (
                <span key={t} style={{ display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:4,background:'var(--surface)',border:'1px solid var(--border)',fontSize:13,color:'var(--muted)' }}>
                  {t}
                  <button onClick={()=>set('tags',f.tags.filter(x=>x!==t))} style={{color:'var(--subtle)',fontSize:14,lineHeight:1}}>×</button>
                </span>
              ))}
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                placeholder={f.tags.length ? '' : 'production, dev…'}
                style={{ flex:1,minWidth:80,fontSize:13 }}
                onKeyDown={e => {
                  if (e.key==='Enter'||e.key===',') { e.preventDefault(); addTag(tagInput) }
                  if (e.key==='Backspace'&&!tagInput&&f.tags.length) set('tags',f.tags.slice(0,-1))
                }}/>
            </div>
          </div>

          {/* SSH preview */}
          {(f.host || f.user) && (
            <div style={{ padding:'9px 12px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,fontFamily:'monospace',fontSize:12,color:'var(--muted)',lineHeight:1.5 }}>
              <span style={{color:'#22c55e',marginRight:6}}>$</span>{preview}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'14px 20px',borderTop:'1px solid var(--border)' }}>
          <button onClick={onClose}
            style={{ padding:'8px 18px',borderRadius:6,fontSize:14,border:'1px solid var(--border)',color:'var(--muted)' }}>
            Cancel
          </button>
          <button onClick={submit}
            style={{ padding:'8px 20px',borderRadius:6,fontSize:14,fontWeight:600,background:f.color||'#22c55e',color:'#000' }}>
            {mode==='add' ? 'Add host' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
