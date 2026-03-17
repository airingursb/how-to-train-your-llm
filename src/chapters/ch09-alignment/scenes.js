import { createSplitView } from '../../helpers/split-view.js'
import { createSandboxControls } from '../../helpers/sandbox-controls.js'
import { createStepThrough } from '../../helpers/step-through.js'
import alignData from './data/alignment-sim.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Alignment Control Panel [Split-View + Sandbox]
  {
    id: 'ch09-s01-sandbox',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let values = { helpfulness: 50, harmlessness: 50, honesty: 50 }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Triangle vertices
        const cx = w / 2
        const triH = Math.min(h * 0.6, w * 0.5)
        const triTop   = { x: cx,                  y: 40 }
        const triLeft  = { x: cx - triH * 0.9,     y: 40 + triH }
        const triRight = { x: cx + triH * 0.9,     y: 40 + triH }

        // Gradient fill — green center, red at edges
        const gradCx = cx
        const gradCy = 40 + triH * 0.6
        const gradient = c.createRadialGradient(gradCx, gradCy, 0, gradCx, gradCy, triH * 0.8)
        gradient.addColorStop(0, 'rgba(91, 165, 91, 0.2)')
        gradient.addColorStop(1, 'rgba(217, 83, 79, 0.15)')

        c.fillStyle = gradient
        c.beginPath()
        c.moveTo(triTop.x, triTop.y)
        c.lineTo(triLeft.x, triLeft.y)
        c.lineTo(triRight.x, triRight.y)
        c.closePath()
        c.fill()

        c.strokeStyle = '#ccc'
        c.lineWidth = 1.5
        c.stroke()

        // Vertex labels
        c.font = 'bold 14px Caveat'
        c.textAlign = 'center'
        c.fillStyle = '#4A90D9'
        c.fillText(ctx.i18n.t('ch09.s03_helpfulness'), triTop.x, triTop.y - 8)
        c.fillStyle = '#5BA55B'
        c.fillText(ctx.i18n.t('ch09.s03_harmlessness'), triLeft.x, triLeft.y + 20)
        c.fillStyle = '#E8913A'
        c.fillText(ctx.i18n.t('ch09.s03_honesty'), triRight.x, triRight.y + 20)

        // Barycentric dot position based on slider values
        const h_val = values.helpfulness / 100
        const s_val = values.harmlessness / 100
        const o_val = values.honesty / 100
        const total = h_val + s_val + o_val || 1

        const dotX = (h_val * triTop.x + s_val * triLeft.x + o_val * triRight.x) / total
        const dotY = (h_val * triTop.y + s_val * triLeft.y + o_val * triRight.y) / total

        // Balanced check
        const variance = Math.abs(h_val - s_val) + Math.abs(s_val - o_val) + Math.abs(h_val - o_val)
        const isBalanced = variance < 0.5
        const dotColor = isBalanced ? '#5BA55B' : '#D4645C'

        // Dot glow
        c.fillStyle = dotColor + '30'
        c.beginPath()
        c.arc(dotX, dotY, 18, 0, Math.PI * 2)
        c.fill()

        c.fillStyle = dotColor
        c.beginPath()
        c.arc(dotX, dotY, 8, 0, Math.PI * 2)
        c.fill()

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel — title & instruction
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch09.title')
      sv.panel.appendChild(title)

      const instrEl = document.createElement('p')
      instrEl.textContent = ctx.i18n.t('ch09.s03_instruction')
      sv.panel.appendChild(instrEl)

      // Sandbox sliders
      const controls = createSandboxControls(sv.panel, {
        controls: [
          { key: 'helpfulness',  label: ctx.i18n.t('ch09.s03_helpfulness'),  type: 'slider', min: 0, max: 100, value: 50 },
          { key: 'harmlessness', label: ctx.i18n.t('ch09.s03_harmlessness'), type: 'slider', min: 0, max: 100, value: 50 },
          { key: 'honesty',      label: ctx.i18n.t('ch09.s03_honesty'),      type: 'slider', min: 0, max: 100, value: 50 },
        ],
        onChange: (key, value, all) => {
          values = all
          updateScenarios()
        }
      })

      // Warning / balanced indicator
      const warningEl = document.createElement('p')
      warningEl.style.cssText = 'font-size: 15px; min-height: 30px; margin: 8px 0;'
      sv.panel.appendChild(warningEl)

      // Scenario cards
      const scenariosDiv = document.createElement('div')
      scenariosDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin: 12px 0;'

      const scenarioCards = alignData.scenarios.map(sc => {
        const card = document.createElement('div')
        card.style.cssText = 'padding: 8px 12px; border: 1.5px solid var(--text-muted); border-radius: 8px; font-size: 13px;'

        const prompt = document.createElement('div')
        prompt.style.cssText = 'font-weight: bold; font-size: 12px; color: var(--accent); margin-bottom: 4px;'
        prompt.textContent = sc.prompt

        const response = document.createElement('div')
        response.style.cssText = 'color: var(--text); font-family: var(--font-mono); font-size: 12px; white-space: pre-wrap;'

        card.appendChild(prompt)
        card.appendChild(response)
        scenariosDiv.appendChild(card)
        return { card, response, scenario: sc }
      })

      sv.panel.appendChild(scenariosDiv)

      function updateScenarios() {
        const h = values.helpfulness
        const s = values.harmlessness

        scenarioCards.forEach(({ response, scenario }) => {
          if (h > 70 && s < 40) {
            response.textContent = scenario.responses.helpful_high
          } else if (s > 70 && h < 40) {
            response.textContent = scenario.responses.safe_high
          } else {
            response.textContent = scenario.responses.balanced
          }
        })

        // Warning / balanced status
        if (h > 75) {
          warningEl.textContent = ctx.i18n.t('ch09.s03_warning_helpful')
          warningEl.className = 'status-warn'
        } else if (s > 75) {
          warningEl.textContent = ctx.i18n.t('ch09.s03_warning_safe')
          warningEl.className = 'status-warn'
        } else {
          const variance = Math.abs(h - s) + Math.abs(s - values.honesty) + Math.abs(h - values.honesty)
          if (variance < 60) {
            warningEl.textContent = ctx.i18n.t('ch09.s03_balanced')
            warningEl.className = 'status-ok'
          } else {
            warningEl.textContent = ''
            warningEl.className = ''
          }
        }
      }

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch09.s03_btn')
      btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      sv.panel.appendChild(btn)

      updateScenarios()
      draw()

      return { sv, controls, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.controls?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 2: The Full Pipeline [Split-View + Step-Through]
  {
    id: 'ch09-s02-pipeline',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let currentStepIdx = 0

      const pipelineStages = [
        { id: 'tokenize',    label: 'Tokenize',    color: '#4A90D9', chapter: 'Ch1' },
        { id: 'embed',       label: 'Embed',       color: '#4A90D9', chapter: 'Ch1' },
        { id: 'attention',   label: 'Attention',   color: '#4A90D9', chapter: 'Ch3' },
        { id: 'transformer', label: 'Transformer', color: '#4A90D9', chapter: 'Ch4' },
        { id: 'pretrain',    label: 'Pretrain',    color: '#4A90D9', chapter: 'Ch5' },
        { id: 'sft',         label: 'SFT',         color: '#5BA55B', chapter: 'Ch6-7' },
        { id: 'rlhf',        label: 'RLHF',        color: '#E8913A', chapter: 'Ch8-9' },
      ]

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const blockH = 40
        const blockW = w * 0.55
        const startX = (w - blockW) / 2
        const startY = 20
        const gap = 10

        pipelineStages.forEach((stage, i) => {
          const y = startY + i * (blockH + gap)
          const isActive = i === currentStepIdx
          const isPast   = i < currentStepIdx

          c.fillStyle = isPast || isActive
            ? stage.color + (isActive ? '' : '40')
            : 'rgba(45,45,45,0.06)'
          c.fillRect(startX, y, blockW, blockH)

          c.strokeStyle = isPast || isActive ? stage.color : '#ccc'
          c.lineWidth = isActive ? 2.5 : 1
          c.strokeRect(startX, y, blockW, blockH)

          c.font = isActive ? 'bold 14px JetBrains Mono' : '13px JetBrains Mono'
          c.fillStyle = isActive ? '#fff' : (isPast ? stage.color : '#888')
          c.textAlign = 'center'
          c.fillText(`${stage.chapter}: ${stage.label}`, w / 2, y + blockH / 2 + 4)

          // Arrow connector
          if (i < pipelineStages.length - 1) {
            c.strokeStyle = isPast || isActive ? '#4A90D9' : '#ddd'
            c.lineWidth = 1.5
            c.beginPath()
            c.moveTo(w / 2, y + blockH)
            c.lineTo(w / 2, y + blockH + gap)
            c.stroke()
          }
        })

        // Flowing ball at current stage
        if (currentStepIdx < pipelineStages.length) {
          const ballY = startY + currentStepIdx * (blockH + gap) + blockH / 2
          c.fillStyle = pipelineStages[currentStepIdx].color
          c.beginPath()
          c.arc(startX - 20, ballY, 10, 0, Math.PI * 2)
          c.fill()
        }

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      const steps = pipelineStages.map((stage, i) => ({
        id: stage.id,
        label: `${stage.chapter}: ${stage.label}`,
        description: i === pipelineStages.length - 1
          ? ctx.i18n.t('ch09.s06_text2')
          : `Stage ${i + 1}: ${stage.label}`,
        color: stage.color
      }))

      const stepper = createStepThrough(sv.panel, {
        steps,
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

  // Scene 3: Wrap-up / Congratulations [Narrative]
  {
    id: 'ch09-s03-congrats',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch09.s06_text')
      await sleep(500)
      await ctx.narrator.say('ch09.s06_pipeline')
      await sleep(1000)
      await ctx.narrator.say('ch09.s06_text2')
      await sleep(500)
      await ctx.narrator.say('ch09.s06_text3')
      await ctx.narrator.ask('ch09.s06_text3', [
        { key: 'ch09.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch09-alignment') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
