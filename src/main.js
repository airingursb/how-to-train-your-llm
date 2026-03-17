import { EventBus } from './core/event-bus.js'
import { I18n } from './core/i18n.js'
import { StateManager } from './core/state.js'
import { Engine } from './core/engine.js'
import { Narrator } from './core/narrator.js'
import { AudioManager } from './core/audio.js'
import { SceneManager } from './core/scene-manager.js'
import { Landing } from './landing.js'

const CHAPTER_IDS = [
  'ch00-magic-trick','ch01-tokenization','ch02-guessing-game','ch03-attention',
  'ch04-transformer','ch05-pretraining','ch06-sft-motivation','ch07-sft-process',
  'ch08-reward-model','ch09-alignment',
]

const CHAPTERS = [
  () => import('./chapters/ch00-magic-trick/index.js'),
  () => import('./chapters/ch01-tokenization/index.js'),
  () => import('./chapters/ch02-guessing-game/index.js'),
  () => import('./chapters/ch03-attention/index.js'),
  () => import('./chapters/ch04-transformer/index.js'),
  () => import('./chapters/ch05-pretraining/index.js'),
  () => import('./chapters/ch06-sft-motivation/index.js'),
  () => import('./chapters/ch07-sft-process/index.js'),
  () => import('./chapters/ch08-reward-model/index.js'),
  () => import('./chapters/ch09-alignment/index.js'),
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
    i18n,
    state
  )
  landing.onStart    = () => bus.emit('game:start')
  landing.onContinue = () => bus.emit('game:continue')
  landing.onRestart  = () => bus.emit('game:restart')
  landing.show()

  // 8. Wire events
  bus.on('game:start', async () => {
    landing.hide()
    await startChapter(0, ctx)
  })

  bus.on('game:continue', async () => {
    landing.hide()
    const startIndex = state.getSetting('lastChapter') || 0
    await startChapter(startIndex, ctx)
  })

  bus.on('game:restart', async () => {
    landing.hide()
    state.reset()
    await startChapter(0, ctx)
  })

  bus.on('chapter:complete', async (chapterId) => {
    state.completeChapter(chapterId)
    narrator.clear()

    const currentIndex = CHAPTER_IDS.indexOf(chapterId)
    if (currentIndex < CHAPTER_IDS.length - 1) {
      // Auto-advance to next chapter
      await startChapter(currentIndex + 1, ctx)
    } else {
      // Final chapter — return to landing (which will show completion screen)
      landing.show()
    }
  })

  bus.on('scene:advance', () => {
    audio.synth('whoosh')
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

  // 10. Language toggle
  const langEn = document.getElementById('lang-en')
  const langZh = document.getElementById('lang-zh')

  const setLangUI = (locale) => {
    langEn.classList.toggle('active', locale === 'en')
    langZh.classList.toggle('active', locale === 'zh')
  }

  langEn.addEventListener('click', async () => {
    await i18n.switchLocale('en')
    state.setSetting('locale', 'en')
    setLangUI('en')
    bus.emit('locale:change', 'en')
  })

  langZh.addEventListener('click', async () => {
    await i18n.switchLocale('zh')
    state.setSetting('locale', 'zh')
    setLangUI('zh')
    bus.emit('locale:change', 'zh')
  })

  // Update static UI on locale change
  i18n.onChange((locale) => {
    soundLabel.textContent = audio.muted ? i18n.t('ui.sound_off') : i18n.t('ui.sound_on')
  })

  // Set initial state from saved preference
  setLangUI(i18n.locale)

  // 11. Visibility
  document.addEventListener('visibilitychange', () => {
    document.hidden ? engine.pause() : engine.resume()
  })
}

async function startChapter(index, ctx) {
  ctx.state.setSetting('lastChapter', index)
  const module = await CHAPTERS[index]()
  const chapter = module.default
  ctx.sceneManager.loadChapter(chapter, {
    ...ctx,
    chapterId: chapter.id,
  })
}

boot().catch(console.error)
