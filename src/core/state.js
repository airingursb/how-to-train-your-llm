export class StateManager {
  constructor(key = 'httyll-progress') {
    this._key = key
    this._data = this._load()
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || this._default() }
    catch { return this._default() }
  }

  _default() {
    return { completed: [], current: null, checkpoints: {}, settings: {} }
  }

  _save() {
    try { localStorage.setItem(this._key, JSON.stringify(this._data)) }
    catch { /* localStorage full or unavailable */ }
  }

  completeChapter(id) {
    if (!this._data.completed.includes(id)) this._data.completed.push(id)
    this._save()
  }

  isCompleted(id) { return this._data.completed.includes(id) }
  getCompletedChapters() { return [...this._data.completed] }

  saveCheckpoint(chapterId, sceneIndex, data = {}) {
    this._data.current = chapterId
    this._data.checkpoints[chapterId] = { scene: sceneIndex, data }
    this._save()
  }

  getCheckpoint(chapterId) { return this._data.checkpoints[chapterId] || null }

  clearCheckpoint(chapterId) {
    delete this._data.checkpoints[chapterId]
    if (this._data.current === chapterId) this._data.current = null
    this._save()
  }

  getSetting(key) { return this._data.settings[key] }

  setSetting(key, value) {
    this._data.settings[key] = value
    this._save()
  }

  reset() { this._data = this._default(); this._save() }
}
