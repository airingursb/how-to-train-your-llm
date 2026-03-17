/**
 * Creates a split-view container: canvas (left) + panel (right).
 * @param {HTMLElement} parent - Mount point (usually #app)
 * @param {object} opts - { canvasWidth, canvasHeight, panelContent }
 * @returns {{ container, canvasWrap, canvas, ctx, panel, destroy }}
 */
export function createSplitView(parent, opts = {}) {
  const container = document.createElement('div')
  container.className = 'scene-split'

  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'scene-canvas'

  const canvas = document.createElement('canvas')
  canvasWrap.appendChild(canvas)

  const panel = document.createElement('div')
  panel.className = 'scene-panel'

  container.appendChild(canvasWrap)
  container.appendChild(panel)
  parent.appendChild(container)

  const resize = () => {
    canvas.width = canvasWrap.clientWidth * devicePixelRatio
    canvas.height = canvasWrap.clientHeight * devicePixelRatio
    canvas.style.width = canvasWrap.clientWidth + 'px'
    canvas.style.height = canvasWrap.clientHeight + 'px'
  }
  resize()
  window.addEventListener('resize', resize)

  const ctx = canvas.getContext('2d')

  return {
    container,
    canvasWrap,
    canvas,
    ctx,
    panel,
    resize,
    destroy() {
      window.removeEventListener('resize', resize)
      container.remove()
    }
  }
}
