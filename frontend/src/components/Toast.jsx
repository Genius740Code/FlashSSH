export default function Toast({ msg, type }) {
  const c = type === 'error' ? '#ef4444' : '#22c55e'
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      padding:'10px 18px', borderRadius:8, fontSize:13, whiteSpace:'nowrap',
      background:'var(--surface)', border:`1px solid ${c}40`, color:'var(--text)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'fadeUp 0.18s ease', zIndex:999,
    }}>
      <span style={{ color:c, marginRight:8 }}>{type==='error' ? '✕' : '✓'}</span>{msg}
    </div>
  )
}
