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

  _getAudioCtx() {
    if (!this._audioCtx) {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this._audioCtx
  }

  synth(type) {
    if (this._muted) return
    const ac = this._getAudioCtx()
    const now = ac.currentTime
    const gain = ac.createGain()
    gain.connect(ac.destination)
    gain.gain.value = this._volume * 0.3

    switch (type) {
      case 'ding': {
        // Correct answer — bright two-tone chime
        const o = ac.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(880, now)
        o.frequency.setValueAtTime(1100, now + 0.08)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        o.start(now)
        o.stop(now + 0.25)
        break
      }
      case 'buzz': {
        // Wrong answer — low buzzy tone
        const o = ac.createOscillator()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(150, now)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
        o.start(now)
        o.stop(now + 0.2)
        break
      }
      case 'snap': {
        // Merge/connect — short click
        const o = ac.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(600, now)
        o.frequency.exponentialRampToValueAtTime(200, now + 0.05)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        o.start(now)
        o.stop(now + 0.06)
        break
      }
      case 'whoosh': {
        // Scene advance — filtered noise sweep
        const bufSize = ac.sampleRate * 0.15
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const noise = ac.createBufferSource()
        noise.buffer = buf
        const filter = ac.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(400, now)
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.12)
        filter.Q.value = 2
        noise.connect(filter)
        filter.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        noise.start(now)
        noise.stop(now + 0.15)
        break
      }
      case 'pop': {
        // Step advance — subtle pop
        const o = ac.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(400, now)
        o.frequency.exponentialRampToValueAtTime(250, now + 0.08)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        o.start(now)
        o.stop(now + 0.08)
        break
      }
    }
  }

  destroy() {
    for (const sound of this._sounds.values()) sound.unload()
    this._sounds.clear()
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null }
  }
}
