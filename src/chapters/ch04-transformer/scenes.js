import { createSplitView } from '../../helpers/split-view.js'
import { createDragPuzzle } from '../../helpers/drag-puzzle.js'
import { createStepThrough } from '../../helpers/step-through.js'
import partsData from './data/transformer-parts.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Assembly Line [Drag Puzzle]
  {
    id: 'ch04-s01-assembly',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))

      // Panel content
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch04.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch04.s02_instruction')
      sv.panel.appendChild(desc)

      const progressEl = document.createElement('div')
      progressEl.className = 'score-badge'
      progressEl.style.marginBottom = '16px'
      sv.panel.appendChild(progressEl)

      let placedCount = 0

      // Create drag puzzle inside the canvas wrapper (DOM-based, not canvas)
      const puzzle = createDragPuzzle(sv.canvasWrap, {
        items: partsData.components.map(c => ({
          id: c.id,
          label: c.name,
          color: c.color,
          correctSlot: 'slot-' + c.order
        })),
        slots: partsData.components.map(c => ({
          id: 'slot-' + c.order,
          label: c.order + '. ???',
          order: c.order
        })),
        onPlace: (itemId, slotId, isCorrect) => {
          if (isCorrect) {
            placedCount++
            progressEl.textContent = ctx.i18n.t('ch04.s02_placed', { placed: placedCount })
          }
        },
        onComplete: () => {
          const completeMsg = document.createElement('p')
          completeMsg.className = 'fade-in'
          completeMsg.textContent = ctx.i18n.t('ch04.s02_complete')
          completeMsg.style.cssText = 'font-size: 20px; color: #5BA55B; font-weight: bold;'
          sv.panel.appendChild(completeMsg)

          const btn = document.createElement('button')
          btn.className = 'scene-btn fade-in'
          btn.textContent = ctx.i18n.t('ch04.s02_btn')
          btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
          sv.panel.appendChild(btn)
        }
      })

      // Hide the actual canvas element — puzzle is DOM-based in canvasWrap
      sv.canvas.style.display = 'none'
      progressEl.textContent = ctx.i18n.t('ch04.s02_placed', { placed: 0 })

      return { sv, puzzle }
    },
    exit(rv) {
      rv?.puzzle?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 2: Token Journey [Split-View + Step-Through]
  {
    id: 'ch04-s02-journey',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let currentStepIdx = 0

      const { steps } = partsData.tokenJourney
      const stageColors = ['#888', '#4A90D9', '#5BA55B', '#8278B4', '#D4645C', '#E8913A']

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const blockH = 40
        const blockW = w * 0.5
        const startX = (w - blockW) / 2
        const startY = 30
        const gap = 12

        // Draw pipeline blocks
        steps.forEach((step, i) => {
          const y = startY + i * (blockH + gap)
          const isActive = i === currentStepIdx
          const isPast = i < currentStepIdx
          const color = stageColors[i]

          c.fillStyle = isActive ? color : (isPast ? color + '40' : 'rgba(45,45,45,0.06)')
          c.fillRect(startX, y, blockW, blockH)
          c.strokeStyle = isActive ? color : '#ccc'
          c.lineWidth = isActive ? 2.5 : 1
          c.strokeRect(startX, y, blockW, blockH)

          c.font = isActive ? 'bold 14px JetBrains Mono' : '13px JetBrains Mono'
          c.fillStyle = isActive ? '#fff' : '#888'
          c.textAlign = 'center'
          c.fillText(step.stage, w / 2, y + blockH / 2 + 4)

          // Arrow between blocks
          if (i < steps.length - 1) {
            c.strokeStyle = isPast || isActive ? '#4A90D9' : '#ddd'
            c.lineWidth = 1.5
            c.beginPath()
            c.moveTo(w / 2, y + blockH)
            c.lineTo(w / 2, y + blockH + gap)
            c.stroke()
          }
        })

        // Ball at current step
        const ballY = startY + currentStepIdx * (blockH + gap) + blockH / 2
        const ballColor = stageColors[currentStepIdx]
        c.fillStyle = ballColor
        c.beginPath()
        c.arc(startX - 25, ballY, 12, 0, Math.PI * 2)
        c.fill()
        c.font = 'bold 10px JetBrains Mono'
        c.fillStyle = '#fff'
        c.textAlign = 'center'
        c.fillText('cat', startX - 25, ballY + 3)

        // Value display
        const step = steps[currentStepIdx]
        c.font = '12px JetBrains Mono'
        c.fillStyle = '#666'
        c.textAlign = 'left'
        c.fillText(step.value, startX + blockW + 15, ballY + 4)

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      const stepperSteps = steps.map((step, i) => ({
        id: step.stage.toLowerCase(),
        label: ctx.i18n.t('ch04.s04_step', { current: i + 1, total: steps.length, stage: step.stage }),
        description: step.description,
        color: stageColors[i]
      }))

      const stepper = createStepThrough(sv.panel, {
        steps: stepperSteps,
        onStep: (idx, data) => {
          currentStepIdx = idx
          if (data.done) ctx.bus.emit('scene:advance')
        },
        i18n: ctx.i18n
      })

      draw()

      return { sv, stepper, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.stepper?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 3: Layer Stacking [Split-View]
  {
    id: 'ch04-s03-stacking',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let layerCount = 1
      const layerStages = [1, 12, 24, 96]
      let stageIdx = 0

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Draw stacked layers
        const blockH = Math.min(20, (h - 80) / Math.max(layerCount, 1))
        const blockW = w * 0.4
        const startX = (w - blockW) / 2
        const colors = ['#4A90D9', '#5BA55B', '#8278B4', '#D4645C', '#E8913A', '#C88C3C']

        const maxVisible = Math.min(layerCount, Math.floor((h - 60) / (blockH + 2)))
        const startY = h - 40 - maxVisible * (blockH + 2)

        for (let i = 0; i < maxVisible; i++) {
          const y = startY + i * (blockH + 2)
          const color = colors[i % colors.length]
          c.fillStyle = color + '30'
          c.fillRect(startX, y, blockW, blockH)
          c.strokeStyle = color
          c.lineWidth = 1
          c.strokeRect(startX, y, blockW, blockH)
        }

        if (layerCount > maxVisible) {
          c.font = '14px LXGW WenKai'
          c.fillStyle = '#888'
          c.textAlign = 'center'
          c.fillText(`... ${layerCount - maxVisible} more layers ...`, w / 2, startY - 10)
        }

        // Layer count label
        c.font = 'bold 28px LXGW WenKai'
        c.fillStyle = '#2D2D2D'
        c.textAlign = 'center'
        c.fillText(`${layerCount} layer${layerCount > 1 ? 's' : ''}`, w / 2, h - 15)

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch04.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch04.s05_text')
      sv.panel.appendChild(desc)

      const desc2 = document.createElement('p')
      desc2.textContent = ctx.i18n.t('ch04.s05_text2')
      sv.panel.appendChild(desc2)

      const infoEl = document.createElement('p')
      infoEl.style.cssText = 'font-size: 16px; color: var(--accent); font-family: var(--font-mono);'
      sv.panel.appendChild(infoEl)

      const stackBtn = document.createElement('button')
      stackBtn.className = 'scene-btn'
      stackBtn.textContent = 'Stack →'
      stackBtn.addEventListener('click', async () => {
        stageIdx++
        if (stageIdx < layerStages.length) {
          const target = layerStages[stageIdx]
          // Animate growth
          const step = Math.max(1, Math.floor((target - layerCount) / 15))
          while (layerCount < target) {
            layerCount = Math.min(target, layerCount + step)
            await sleep(40)
          }
          const labels = ['', 'GPT-2: 12 layers', 'GPT-2 Medium: 24 layers', 'GPT-3: 96 layers!']
          infoEl.textContent = labels[stageIdx] || ''

          if (stageIdx >= layerStages.length - 1) {
            stackBtn.textContent = ctx.i18n.t('ch04.s05_btn')
            stackBtn.onclick = () => ctx.bus.emit('scene:advance')
          }
        }
      })
      sv.panel.appendChild(stackBtn)

      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // Scene 4: Wrap-up [Narrative]
  {
    id: 'ch04-s04-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch04.s06_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.ask('ch04.s06_text2', [
        { key: 'ch04.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch04-transformer') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
