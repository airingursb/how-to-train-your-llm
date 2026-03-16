// src/core/audio.js
import { Howl, Howler } from 'howler'

export class AudioManager {
  constructor() {
    this._sounds = new Map()
    this._volume = 0.8
    this._muted = false
  }

  async load(manifest) {
    const promises = Object.entries(manifest).map(([key, url]) => {
      return new Promise((resolve, reject) => {
        const sound = new Howl({
          src: [url],
          volume: this._volume,
          onload: resolve,
          onloaderror: (_, err) => reject(new Error(`Failed to load ${key}: ${err}`)),
        })
        this._sounds.set(key, sound)
      })
    })
    await Promise.all(promises)
  }

  play(key, options = {}) {
    const sound = this._sounds.get(key)
    if (!sound) return
    if (options.volume !== undefined) sound.volume(options.volume)
    if (options.loop !== undefined) sound.loop(options.loop)
    sound.play()
  }

  stop(key) { this._sounds.get(key)?.stop() }

  setVolume(v) {
    this._volume = v
    for (const sound of this._sounds.values()) sound.volume(v)
  }

  mute() { this._muted = true; Howler.mute(true) }
  unmute() { this._muted = false; Howler.mute(false) }
  get muted() { return this._muted }

  destroy() {
    for (const sound of this._sounds.values()) sound.unload()
    this._sounds.clear()
  }
}
