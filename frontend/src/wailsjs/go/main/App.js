let hosts = [
  { id:'1', name:'Production', host:'prod.example.com', port:22, user:'ubuntu', password:'', identityFile:'', tags:['prod'], color:'#22c55e', lastUsed:new Date(Date.now()-3600000).toISOString(), useCount:14, description:'Web server' },
  { id:'2', name:'Staging', host:'staging.example.com', port:22, user:'ubuntu', password:'mypass', identityFile:'', tags:['staging'], color:'#f59e0b', lastUsed:new Date(Date.now()-86400000*2).toISOString(), useCount:6, description:'' },
  { id:'3', name:'Database', host:'192.168.1.10', port:22, user:'root', password:'', identityFile:'~/.ssh/db_key', tags:['prod','db'], color:'#3b82f6', lastUsed:new Date(0).toISOString(), useCount:3, description:'Postgres primary' },
]
let nid = 10

function fire(event, data) {
  const ls = window.__eventListeners?.[event] || []
  ls.forEach(cb => cb(data))
}

const mock = {
  GetHosts: async () => [...hosts].sort((a,b) => new Date(b.lastUsed) - new Date(a.lastUsed)),
  AddHost: async (h) => { hosts.push({...h, id:String(nid++), port:h.port||22, lastUsed:new Date(0).toISOString(), useCount:0, tags:h.tags||[]}) },
  UpdateHost: async (h) => { const i = hosts.findIndex(x => x.id===h.id); if (i>=0) hosts[i]=h },
  DeleteHost: async (id) => { hosts = hosts.filter(h => h.id!==id) },
  ConnectSSH: async (id) => {
    const h = hosts.find(x => x.id===id)
    fire('terminal:data', {id, data:`\x1b[90m  Connecting to ${h?.user||'root'}@${h?.host||id}…\x1b[0m\r\n`})
    await new Promise(r => setTimeout(r, 800))
    fire('terminal:data', {id, data:`\x1b[90m  Auth: ${h?.password ? 'password' : 'key'}\x1b[0m\r\n`})
    await new Promise(r => setTimeout(r, 400))
    fire('terminal:connected', {id})
    fire('terminal:data', {id, data:`\x1b[32mConnected to ${h?.name||id}\x1b[0m\r\n\r\nWelcome to Ubuntu 22.04 LTS\r\n\r\n\x1b[32mubuntu@${h?.host||'server'}\x1b[0m:\x1b[34m~\x1b[0m$ `})
    if (h) { h.lastUsed = new Date().toISOString(); h.useCount++ }
  },
  DisconnectSSH: async (id) => { setTimeout(() => fire('terminal:closed', {id}), 50) },
  IsConnected: async () => false,
  SendInput: async (id, input) => {
    if (input === '\r' || input === '\n') {
      fire('terminal:data', {id, data:`\r\n\x1b[32mubuntu@server\x1b[0m:\x1b[34m~\x1b[0m$ `})
    } else {
      fire('terminal:data', {id, data: input})
    }
  },
  ResizeTerminal: async () => {},
  GetAllTags: async () => { const s = new Set(); hosts.forEach(h => (h.tags||[]).forEach(t => s.add(t))); return [...s].sort() },
  ImportFromSSHConfig: async () => 0,
}

function call(name, ...args) {
  if (window?.go?.main?.App?.[name]) return window.go.main.App[name](...args)
  return mock[name](...args)
}

export const GetHosts            = (...a) => call('GetHosts', ...a)
export const AddHost             = (...a) => call('AddHost', ...a)
export const UpdateHost          = (...a) => call('UpdateHost', ...a)
export const DeleteHost          = (...a) => call('DeleteHost', ...a)
export const ConnectSSH          = (...a) => call('ConnectSSH', ...a)
export const DisconnectSSH       = (...a) => call('DisconnectSSH', ...a)
export const IsConnected         = (...a) => call('IsConnected', ...a)
export const SendInput           = (...a) => call('SendInput', ...a)
export const ResizeTerminal      = (...a) => call('ResizeTerminal', ...a)
export const GetAllTags          = (...a) => call('GetAllTags', ...a)
export const ImportFromSSHConfig = (...a) => call('ImportFromSSHConfig', ...a)
