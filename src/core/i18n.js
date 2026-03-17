export class I18n {
  constructor() {
    this._strings = {}
    this._locale = 'en'
    this._callbacks = []
  }

  get locale() { return this._locale }

  async load(locale) {
    this._locale = locale
    const base = import.meta.env.BASE_URL || '/'
    const resp = await fetch(`${base}locales/${locale}.json`)
    this._strings = await resp.json()
  }

  async switchLocale(locale) {
    if (locale === this._locale) return
    await this.load(locale)
    this._callbacks.forEach(cb => cb(locale))
  }

  onChange(callback) {
    this._callbacks.push(callback)
    return () => {
      this._callbacks = this._callbacks.filter(cb => cb !== callback)
    }
  }

  t(key, params = {}) {
    const parts = key.split('.')
    let val = this._strings
    for (const p of parts) val = val?.[p]
    if (typeof val !== 'string') return `[${key}]`
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`)
  }
}
