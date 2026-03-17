import { createSplitView } from '../../helpers/split-view.js'
import { createSandboxControls } from '../../helpers/sandbox-controls.js'
import { createABCompare } from '../../helpers/ab-compare.js'
import trainingData from './data/training-sim.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Training Control Room
  {
    id: 'ch05-s01-training',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let training = false
      let lossPoints = []
      let currentOutput = ''
      let learningRate = 0.001
      let modelSize = 12

      const outputMilestones = [
        { step: 0,  text: trainingData.sampleOutputs.step0 },
        { step: 3,  text: trainingData.sampleOutputs.step100 },
        { step: 6,  text: trainingData.sampleOutputs.step500 },
        { step: 10, text: trainingData.sampleOutputs.step2000 },
        { step: 14, text: trainingData.sampleOutputs.step5000 },
      ]

      function getLoss(step) {
        const baseLoss = trainingData.lossCurve[Math.min(step, trainingData.lossCurve.length - 1)]
        const lrFactor = learningRate > 0.005 ? 1.3 + (step * 0.05)
                       : learningRate < 0.0003 ? 0.95 : 1.0
        const sizeFactor = modelSize === 6 ? 1.2 : modelSize === 24 ? 0.85 : 1.0
        return Math.max(0.5, baseLoss * lrFactor * sizeFactor)
      }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Loss curve area (top 55%)
        const curveH = h * 0.55
        const curveX = 50
        const curveW = w - 70

        // Axes
        c.strokeStyle = '#ddd'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(curveX, 20)
        c.lineTo(curveX, curveH)
        c.lineTo(curveX + curveW, curveH)
        c.stroke()

        // Y-axis labels
        c.font = '12px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'right'
        c.fillText('Loss', curveX - 5, 30)
        c.fillText('8.0', curveX - 5, 35)
        c.fillText('0', curveX - 5, curveH - 2)

        // X-axis label
        c.textAlign = 'center'
        c.fillText('Training Steps \u2192', curveX + curveW / 2, curveH + 18)

        // Draw loss curve
        if (lossPoints.length > 1) {
          c.strokeStyle = '#4A90D9'
          c.lineWidth = 2.5
          c.beginPath()
          lossPoints.forEach((loss, i) => {
            const x = curveX + (i / 14) * curveW
            const y = 25 + (1 - (loss - 0) / 9) * (curveH - 30)
            if (i === 0) c.moveTo(x, y)
            else c.lineTo(x, y)
          })
          c.stroke()

          // Current loss indicator dot
          const lastLoss = lossPoints[lossPoints.length - 1]
          const lastX = curveX + ((lossPoints.length - 1) / 14) * curveW
          const lastY = 25 + (1 - (lastLoss - 0) / 9) * (curveH - 30)
          c.fillStyle = '#4A90D9'
          c.beginPath()
          c.arc(lastX, lastY, 5, 0, Math.PI * 2)
          c.fill()
          c.textAlign = 'left'
          c.fillStyle = '#4A90D9'
          c.fillText(lastLoss.toFixed(2), lastX + 10, lastY - 6)
        }

        // Model output area (bottom 40%)
        const outY = curveH + 35
        c.font = 'bold 13px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'left'
        c.fillText(ctx.i18n.t('ch05.s02_output_label'), 20, outY)

        c.font = '14px JetBrains Mono, monospace'
        c.fillStyle = '#2D2D2D'
        const words = currentOutput.split(' ')
        let line = ''
        let lineY = outY + 20
        words.forEach(word => {
          const test = line + word + ' '
          if (c.measureText(test).width > w - 40) {
            c.fillText(line.trim(), 20, lineY)
            line = word + ' '
            lineY += 20
          } else {
            line = test
          }
        })
        if (line.trim()) c.fillText(line.trim(), 20, lineY)

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch05.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch05.s01_text')
      sv.panel.appendChild(desc)

      const controls = createSandboxControls(sv.panel, {
        controls: [
          {
            key: 'data',
            label: ctx.i18n.t('ch05.s02_data_label'),
            type: 'select',
            value: 'wikipedia',
            options: trainingData.dataSources.map(d => ({ label: d.icon + ' ' + d.name, value: d.id }))
          },
          {
            key: 'lr',
            label: ctx.i18n.t('ch05.s02_lr_label'),
            type: 'slider',
            min: 0.0001,
            max: 0.01,
            step: 0.0001,
            value: 0.001
          },
          {
            key: 'size',
            label: ctx.i18n.t('ch05.s02_size_label'),
            type: 'select',
            value: 12,
            options: [
              { label: ctx.i18n.t('ch05.s02_size_small'),  value: 6 },
              { label: ctx.i18n.t('ch05.s02_size_medium'), value: 12 },
              { label: ctx.i18n.t('ch05.s02_size_large'),  value: 24 },
            ]
          },
        ],
        onChange: (key, value) => {
          if (key === 'lr')   learningRate = parseFloat(value)
          if (key === 'size') modelSize = parseInt(value)
        }
      })

      const stepLabel = document.createElement('div')
      stepLabel.className = 'score-badge'
      stepLabel.style.margin = '12px 0'
      sv.panel.appendChild(stepLabel)

      const startBtn = document.createElement('button')
      startBtn.className = 'scene-btn'
      startBtn.textContent = ctx.i18n.t('ch05.s02_start')
      sv.panel.appendChild(startBtn)

      startBtn.addEventListener('click', async () => {
        if (training) return
        training = true
        startBtn.disabled = true
        startBtn.textContent = ctx.i18n.t('ch05.s02_step').replace('{{step}}', '0')
        lossPoints = []
        currentOutput = ''

        for (let i = 0; i <= 14; i++) {
          const loss = getLoss(i)
          lossPoints.push(loss)
          stepLabel.textContent =
            ctx.i18n.t('ch05.s02_step').replace('{{step}}', i * 350) +
            ' \u2014 ' +
            ctx.i18n.t('ch05.s02_loss').replace('{{loss}}', loss.toFixed(2))

          const milestone = outputMilestones.find(m => m.step === i)
          if (milestone) currentOutput = milestone.text

          await sleep(300)
        }

        stepLabel.textContent = ctx.i18n.t('ch05.s02_complete')
        startBtn.textContent = ctx.i18n.t('ch05.s02_btn')
        startBtn.disabled = false
        startBtn.onclick = () => ctx.bus.emit('scene:advance')
        training = false
      })

      draw()

      return { sv, controls, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.controls?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 2: Scaling Laws
  {
    id: 'ch05-s02-scaling',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let progress = 0

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const curveX = 50
        const curveW = w - 70
        const curveTop = 30
        const curveBottom = h - 40

        // Axes
        c.strokeStyle = '#ddd'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(curveX, curveTop)
        c.lineTo(curveX, curveBottom)
        c.lineTo(curveX + curveW, curveBottom)
        c.stroke()

        c.font = '12px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText('Compute \u2192', curveX + curveW / 2, h - 10)
        c.textAlign = 'right'
        c.fillText('Loss', curveX - 5, curveTop + 10)

        // 3 model curves: small (red), medium (blue), large (green)
        const models = [
          { name: ctx.i18n.t('ch05.s02_size_small'),  color: '#D4645C', offset:  1.5 },
          { name: ctx.i18n.t('ch05.s02_size_medium'), color: '#4A90D9', offset:  0   },
          { name: ctx.i18n.t('ch05.s02_size_large'),  color: '#5BA55B', offset: -1.2 },
        ]

        const points = 50
        const drawn = Math.floor(progress * points)

        models.forEach(model => {
          c.strokeStyle = model.color
          c.lineWidth = 2.5
          c.beginPath()
          for (let i = 0; i <= drawn; i++) {
            const t = i / points
            const x = curveX + t * curveW
            const loss = 3 + model.offset + 5 * Math.exp(-3 * t)
            const y = curveTop + ((loss - 1) / 9) * (curveBottom - curveTop)
            if (i === 0) c.moveTo(x, y)
            else c.lineTo(x, y)
          }
          c.stroke()

          // Label at end of drawn curve
          if (drawn > 0) {
            const t = drawn / points
            const x = curveX + t * curveW
            const loss = 3 + model.offset + 5 * Math.exp(-3 * t)
            const y = curveTop + ((loss - 1) / 9) * (curveBottom - curveTop)
            c.fillStyle = model.color
            c.textAlign = 'left'
            c.font = '11px JetBrains Mono, monospace'
            c.fillText(model.name, x + 8, y + 4)
          }
        })

        if (progress < 1) progress += 0.015

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch05.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch05.s04_text')
      sv.panel.appendChild(desc)

      const desc2 = document.createElement('p')
      desc2.textContent = ctx.i18n.t('ch05.s04_text2')
      sv.panel.appendChild(desc2)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch05.s04_btn')
      btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      sv.panel.appendChild(btn)

      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // Scene 3: The BUT — A/B Compare
  {
    id: 'ch05-s03-but',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      // No canvas needed — use the full width area via canvasWrap
      sv.canvas.style.display = 'none'

      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch05.title')
      sv.panel.appendChild(title)

      const prompt = document.createElement('p')
      prompt.textContent = ctx.i18n.t('ch05.s05_prompt')
      prompt.style.cssText = 'font-style: italic; color: var(--text-muted); margin-bottom: 16px;'
      sv.panel.appendChild(prompt)

      const ab = createABCompare(sv.canvasWrap, {
        prompt: null,
        responseA: {
          label: 'Base Model',
          text: trainingData.pretrainedOutputs.writeEmail +
                '\n' + trainingData.pretrainedOutputs.writeEmailContinued + '...'
        },
        responseB: {
          label: 'What you wanted',
          text: 'Subject: Meeting Follow-up\n\nHi team,\n\nHere\'s a summary of today\'s meeting:\n- Q3 revenue is up 12%\n- New product launch on track\n- Next review: Thursday 2pm\n\nBest,\nSarah'
        },
        typewriter: true
      })

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch05.s05_text')
      desc.className = 'fade-in'
      desc.style.marginTop = '16px'
      sv.panel.appendChild(desc)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch05.s05_btn')
      btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      sv.panel.appendChild(btn)

      return { sv, ab }
    },
    exit(rv) {
      rv?.ab?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 4: Wrap-up
  {
    id: 'ch05-s04-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch05.s06_text')
      await sleep(800)
      await ctx.narrator.say('ch05.s06_text2')
      await ctx.narrator.ask('ch05.s06_text2', [
        { key: 'ch05.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch05-pretraining') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
