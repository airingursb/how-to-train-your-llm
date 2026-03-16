export class I18n {
  constructor() {
    this._strings = {}
    this._locale = 'en'
  }

  get locale() { return this._locale }

  async load(locale) {
    this._locale = locale
    const resp = await fetch(`/src/locales/${locale}.json`)
    this._strings = await resp.json()
  }

  t(key, params = {}) {
    const parts = key.split('.')
    let val = this._strings
    for (const p of parts) val = val?.[p]
    if (typeof val !== 'string') return `[${key}]`
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`)
  }
}
