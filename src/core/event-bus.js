export class EventBus {
  constructor() {
    this._listeners = new Map()
  }

  on(event, handler, owner = null) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add({ handler, owner })
    return () => this.off(event, handler)
  }

  off(event, handler) {
    const set = this._listeners.get(event)
    if (!set) return
    for (const entry of set) {
      if (entry.handler === handler) { set.delete(entry); break }
    }
  }

  offAll(owner) {
    for (const [, set] of this._listeners) {
      for (const entry of set) {
        if (entry.owner === owner) set.delete(entry)
      }
    }
  }

  emit(event, data) {
    const set = this._listeners.get(event)
    if (!set) return
    for (const { handler } of set) handler(data)
  }

  once(event, handler, owner = null) {
    const wrapped = (data) => { this.off(event, wrapped); handler(data) }
    this.on(event, wrapped, owner)
  }
}
