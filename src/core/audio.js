// src/core/audio.js
import { Howl, Howler } from 'howler'

// Pentatonic scale frequencies for ambient music
const PENTA = [
  261.63, 293.66, 329.63, 392.00, 440.00,  // C4 D4 E4 G4 A4
  523.25, 587.33, 659.25, 783.99, 880.00,  // C5 D5 E5 G5 A5
]

// Chord voicings (indices into PENTA)
const CHORDS = [
  [0, 2, 4],    // C E G
  [1, 4, 6],    // D A D5
  [2, 4, 7],    // E G G5
  [0, 3, 5],    // C G C5
  [4, 6, 8],    // A D5 G5
  [2, 5, 7],    // E C5 G5
]

export class AudioManager {
  constructor() {
    this._sounds = new Map()
    this._volume = 0.8
    this._muted = false
    this._bgmPlaying = false
    this._bgmTimer = null
    this._bgmNodes = []
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

  mute() {
    this._muted = true
    Howler.mute(true)
    this.stopBGM()
  }

  unmute() {
    this._muted = false
    Howler.mute(false)
    this.startBGM()
  }

  get muted() { return this._muted }

  // ── Web Audio Context ──────────────────────────────────────────────────────

  _getAudioCtx() {
    if (!this._audioCtx) {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this._audioCtx
  }

  // ── Background Music (generative ambient) ─────────────────────────────────

  startBGM() {
    if (this._muted || this._bgmPlaying) return
    this._bgmPlaying = true
    this._bgmChordIdx = 0
    this._playNextChord()
  }

  stopBGM() {
    this._bgmPlaying = false
    if (this._bgmTimer) {
      clearTimeout(this._bgmTimer)
      this._bgmTimer = null
    }
    // Fade out any active BGM nodes
    for (const node of this._bgmNodes) {
      try { node.gain.gain.exponentialRampToValueAtTime(0.001, node.gain.context.currentTime + 0.5) } catch {}
    }
    this._bgmNodes = []
  }

  _playNextChord() {
    if (!this._bgmPlaying || this._muted) return
    const ac = this._getAudioCtx()
    const now = ac.currentTime
    const chord = CHORDS[this._bgmChordIdx % CHORDS.length]
    const dur = 3.5 + Math.random() * 1.5 // 3.5-5s per chord

    for (const noteIdx of chord) {
      const freq = PENTA[noteIdx]
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const filter = ac.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.value = freq
      // Slight detune for warmth
      osc.detune.value = (Math.random() - 0.5) * 8

      filter.type = 'lowpass'
      filter.frequency.value = 800
      filter.Q.value = 0.5

      const vol = this._volume * 0.04
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.8)
      gain.gain.setValueAtTime(vol, now + dur - 1.2)
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ac.destination)
      osc.start(now)
      osc.stop(now + dur + 0.1)

      this._bgmNodes.push({ gain, osc })
      osc.onended = () => {
        this._bgmNodes = this._bgmNodes.filter(n => n.osc !== osc)
      }
    }

    // Occasional high sparkle note
    if (Math.random() < 0.4) {
      const sparkleDelay = 1 + Math.random() * 2
      const sparkleFreq = PENTA[5 + Math.floor(Math.random() * 5)] // upper octave
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = sparkleFreq
      const vol = this._volume * 0.025
      gain.gain.setValueAtTime(0.001, now + sparkleDelay)
      gain.gain.exponentialRampToValueAtTime(vol, now + sparkleDelay + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + sparkleDelay + 1.2)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(now + sparkleDelay)
      osc.stop(now + sparkleDelay + 1.3)
    }

    this._bgmChordIdx++
    this._bgmTimer = setTimeout(() => this._playNextChord(), dur * 1000 - 500)
  }

  // ── Synth Sound Effects ────────────────────────────────────────────────────

  synth(type) {
    if (this._muted) return
    const ac = this._getAudioCtx()
    const now = ac.currentTime
    const gain = ac.createGain()
    gain.connect(ac.destination)
    gain.gain.value = this._volume * 0.3

    switch (type) {
      case 'ding': {
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
      case 'tick': {
        // Typewriter tick — very short, subtle
        const o = ac.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(1200 + Math.random() * 200, now)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
        o.start(now)
        o.stop(now + 0.03)
        break
      }
      case 'click': {
        // Button click — short crisp tap
        const o = ac.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(800, now)
        o.frequency.exponentialRampToValueAtTime(500, now + 0.04)
        o.connect(gain)
        gain.gain.setValueAtTime(this._volume * 0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        o.start(now)
        o.stop(now + 0.06)
        break
      }
    }
  }

  destroy() {
    this.stopBGM()
    for (const sound of this._sounds.values()) sound.unload()
    this._sounds.clear()
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null }
  }
}
