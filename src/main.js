import { EventBus } from './core/event-bus.js'
import { I18n } from './core/i18n.js'
import { StateManager } from './core/state.js'
import { Engine } from './core/engine.js'
import { Narrator } from './core/narrator.js'
import { AudioManager } from './core/audio.js'
import { SceneManager } from './core/scene-manager.js'
import { Landing } from './landing.js'

const CHAPTERS = [
  () => import('./chapters/ch00-magic-trick/index.js'),
]

async function boot() {
  // 1. Core services
  const bus = new EventBus()
  const i18n = new I18n()
  const state = new StateManager()
  const audio = new AudioManager()

  // 2. Load locale
  await i18n.load(state.getSetting('locale') || 'en')

  // 3. Engine
  const engine = new Engine(document.getElementById('stage'))
  await engine.init()

  // 4. Narrator
  const narrator = new Narrator(
    document.getElementById('narrator-container'),
    i18n
  )

  // 5. Scene manager
  const sceneManager = new SceneManager(bus)

  // 6. App context
  const ctx = { engine, bus, narrator, audio, i18n, state, sceneManager }

  // 7. Landing page
  const landing = new Landing(
    document.getElementById('landing-container'),
    engine,
    i18n
  )
  landing.onStart = () => bus.emit('game:start')
  landing.show()

  // 8. Wire events
  bus.on('game:start', async () => {
    landing.hide()
    await startChapter(0, ctx)
  })

  bus.on('chapter:complete', (chapterId) => {
    state.completeChapter(chapterId)
    narrator.clear()
    landing.show()
  })

  bus.on('scene:advance', () => {
    sceneManager.advance()
  })

  // 9. Sound toggle
  const soundToggle = document.getElementById('sound-toggle')
  const soundLabel = document.getElementById('sound-label')
  soundToggle.addEventListener('click', () => {
    if (audio.muted) {
      audio.unmute()
      soundLabel.textContent = i18n.t('ui.sound_on')
    } else {
      audio.mute()
      soundLabel.textContent = i18n.t('ui.sound_off')
    }
  })

  // 10. Visibility
  document.addEventListener('visibilitychange', () => {
    document.hidden ? engine.pause() : engine.resume()
  })
}

async function startChapter(index, ctx) {
  const module = await CHAPTERS[index]()
  const chapter = module.default
  ctx.sceneManager.loadChapter(chapter, {
    ...ctx,
    chapterId: chapter.id,
  })
}

boot().catch(console.error)
