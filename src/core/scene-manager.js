// src/core/scene-manager.js
export class SceneManager {
  constructor(bus) {
    this._bus = bus
    this._scenes = []
    this._sceneIndex = -1
    this._currentCtx = null
    this._appCtx = null
  }

  loadChapter(chapter, appCtx) {
    this.destroy()
    this._scenes = chapter.scenes || []
    this._sceneIndex = -1
    this._appCtx = appCtx
    if (this._scenes.length > 0) this.advance()
  }

  get currentScene() { return this._scenes[this._sceneIndex] || null }
  get sceneIndex() { return this._sceneIndex }
  get totalScenes() { return this._scenes.length }

  getProgress() {
    if (this._scenes.length === 0) return 0
    return (this._sceneIndex + 1) / this._scenes.length
  }

  async advance() {
    if (this._sceneIndex >= 0) {
      const current = this._scenes[this._sceneIndex]
      if (current.exit) await current.exit(this._currentCtx, this._appCtx)
      this._currentCtx = null
    }

    this._sceneIndex++

    if (this._sceneIndex >= this._scenes.length) {
      this._bus.emit('chapter:complete', this._appCtx?.chapterId)
      return
    }

    const enterIndex = this._sceneIndex
    const scene = this._scenes[enterIndex]
    this._bus.emit('scene:change', {
      index: enterIndex,
      id: scene.id,
      total: this._scenes.length,
    })

    if (scene.enter) {
      const ctx = await scene.enter(this._appCtx)
      // Only store context if scene hasn't been superseded by a reentrant advance
      if (this._sceneIndex === enterIndex) {
        this._currentCtx = ctx
      }
    }
  }

  async goTo(index) {
    if (index < 0 || index >= this._scenes.length) return

    if (this._sceneIndex >= 0) {
      const current = this._scenes[this._sceneIndex]
      if (current.exit) await current.exit(this._currentCtx, this._appCtx)
      this._currentCtx = null
    }

    this._sceneIndex = index
    const scene = this._scenes[this._sceneIndex]
    this._bus.emit('scene:change', {
      index: this._sceneIndex,
      id: scene.id,
      total: this._scenes.length,
    })

    if (scene.enter) {
      this._currentCtx = await scene.enter(this._appCtx)
    }
  }

  destroy() {
    if (this._sceneIndex >= 0 && this._sceneIndex < this._scenes.length) {
      const current = this._scenes[this._sceneIndex]
      if (current.exit) current.exit(this._currentCtx, this._appCtx)
    }
    this._scenes = []
    this._sceneIndex = -1
    this._currentCtx = null
  }
}
