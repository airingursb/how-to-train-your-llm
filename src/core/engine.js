import { Application } from 'pixi.js'

export class Engine {
  constructor(container) {
    this._container = container
    this._app = null
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  async init() {
    this._app = new Application()
    await this._app.init({
      resizeTo: this._container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    this._container.appendChild(this._app.canvas)
  }

  get app() { return this._app }
  get stage() { return this._app.stage }
  get ticker() { return this._app.ticker }
  get canvas() { return this._app.canvas }
  get reducedMotion() { return this._reducedMotion }
  get width() { return this._app.screen.width }
  get height() { return this._app.screen.height }

  resize() { this._app.resize() }
  pause() { this._app.ticker.stop() }
  resume() { this._app.ticker.start() }

  destroy() {
    this._app.destroy(true, { children: true })
  }
}
