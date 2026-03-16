// src/core/narrator.js
export class Narrator {
  constructor(container, i18n) {
    this._container = container
    this._i18n = i18n
    this._textEl = null
    this._choicesEl = null
    this._skipResolve = null
    this._typing = false
    this._init()
  }

  _init() {
    this._container.innerHTML = ''
    this._container.classList.add('narrator')

    this._textEl = document.createElement('div')
    this._textEl.classList.add('narrator-text')
    this._container.appendChild(this._textEl)

    this._choicesEl = document.createElement('div')
    this._choicesEl.classList.add('narrator-choices')
    this._container.appendChild(this._choicesEl)

    this._container.addEventListener('click', (e) => {
      // Only skip on text area click, not on buttons
      if (e.target.classList.contains('narrator-btn')) return
      if (this._typing && this._skipResolve) this._skipResolve()
    })
  }

  async say(key, params = {}) {
    const text = this._i18n.t(key, params)
    this._choicesEl.innerHTML = ''
    this._container.classList.add('visible')

    if (window.__reducedMotion) {
      this._textEl.innerHTML = text
      return
    }

    this._typing = true
    this._textEl.innerHTML = ''

    await new Promise((resolve) => {
      this._skipResolve = () => {
        this._textEl.innerHTML = text
        this._typing = false
        this._skipResolve = null
        resolve()
      }

      let i = 0
      const chars = text.split('')
      const type = () => {
        if (!this._typing) return
        if (i < chars.length) {
          this._textEl.innerHTML += chars[i]
          i++
          setTimeout(type, 30)
        } else {
          this._typing = false
          this._skipResolve = null
          resolve()
        }
      }
      type()
    })
  }

  async ask(textKey, choices, params = {}) {
    await this.say(textKey, params)

    return new Promise((resolve) => {
      this._choicesEl.innerHTML = ''
      for (const choice of choices) {
        const btn = document.createElement('button')
        btn.classList.add('narrator-btn')
        btn.textContent = this._i18n.t(choice.key)
        btn.addEventListener('click', () => {
          this._choicesEl.innerHTML = ''
          if (choice.action) choice.action()
          resolve(choice.key)
        })
        this._choicesEl.appendChild(btn)
      }
    })
  }

  clear() {
    this._textEl.innerHTML = ''
    this._choicesEl.innerHTML = ''
    this._container.classList.remove('visible')
    this._typing = false
  }

  show() { this._container.classList.add('visible') }
  hide() { this._container.classList.remove('visible') }
}
