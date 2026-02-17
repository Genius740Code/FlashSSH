// Wails runtime shim - real runtime is injected by Wails
export function EventsOn(event, cb) {
  if (window?.runtime?.EventsOn) return window.runtime.EventsOn(event, cb)
  // Dev mock: expose a hook so mock can fire events
  if (!window.__eventListeners) window.__eventListeners = {}
  if (!window.__eventListeners[event]) window.__eventListeners[event] = []
  window.__eventListeners[event].push(cb)
  return () => {
    window.__eventListeners[event] = window.__eventListeners[event].filter(f => f !== cb)
  }
}

export function EventsEmit(event, data) {
  if (window?.runtime?.EventsEmit) return window.runtime.EventsEmit(event, data)
  const listeners = window.__eventListeners?.[event] || []
  listeners.forEach(cb => cb(data))
}

export function EventsOff(event) {
  if (window?.runtime?.EventsOff) return window.runtime.EventsOff(event)
  if (window.__eventListeners) delete window.__eventListeners[event]
}
