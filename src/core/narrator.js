// src/core/narrator.js
export class Narrator {
  constructor(container, i18n) {
    this._container = container
    this._i18n = i18n
    this._textEl = null
    this._sizerEl = null
    this._visibleEl = null
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

    // Sizer: invisible full text to reserve layout height
    this._sizerEl = document.createElement('span')
    this._sizerEl.classList.add('narrator-text-sizer')
    this._textEl.appendChild(this._sizerEl)

    // Visible: positioned over sizer, shows typewriter text
    this._visibleEl = document.createElement('span')
    this._visibleEl.classList.add('narrator-text-visible')
    this._textEl.appendChild(this._visibleEl)

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

    // Cancel any in-progress typing
    if (this._typing && this._skipResolve) {
      this._skipResolve()
    }

    // Set full text in sizer to reserve height
    this._sizerEl.innerHTML = text

    if (window.__reducedMotion) {
      this._visibleEl.innerHTML = text
      return
    }

    this._typing = true
    this._visibleEl.innerHTML = ''
    this._gen = (this._gen || 0) + 1
    const gen = this._gen

    await new Promise((resolve) => {
      this._skipResolve = () => {
        this._visibleEl.innerHTML = text
        this._typing = false
        this._skipResolve = null
        resolve()
      }

      let i = 0
      const chars = text.split('')
      const type = () => {
        if (gen !== this._gen) return // superseded by newer say()
        if (!this._typing) return
        if (i < chars.length) {
          this._visibleEl.innerHTML += chars[i]
          i++
          setTimeout(type, 50)
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
    this._sizerEl.innerHTML = ''
    this._visibleEl.innerHTML = ''
    this._choicesEl.innerHTML = ''
    this._container.classList.remove('visible')
    this._typing = false
  }

  show() { this._container.classList.add('visible') }
  hide() { this._container.classList.remove('visible') }
}
