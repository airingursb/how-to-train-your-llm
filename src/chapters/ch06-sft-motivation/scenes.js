import { createSplitView } from '../../helpers/split-view.js'
import { createABCompare } from '../../helpers/ab-compare.js'
import comparisons from './data/model-comparisons.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Spot the SFT [Split-View + A/B Compare]
  {
    id: 'ch06-s01-spot',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      sv.canvas.style.display = 'none'

      const rounds = comparisons.comparisons
      let roundIdx = 0
      let score = 0
      let currentAB = null

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch06.title')
      sv.panel.appendChild(title)

      const instrEl = document.createElement('p')
      instrEl.textContent = ctx.i18n.t('ch06.s02_instruction')
      sv.panel.appendChild(instrEl)

      const roundLabel = document.createElement('div')
      roundLabel.className = 'score-badge'
      sv.panel.appendChild(roundLabel)

      const promptEl = document.createElement('p')
      promptEl.style.cssText = 'font-style: italic; color: var(--accent); margin: 12px 0;'
      sv.panel.appendChild(promptEl)

      const feedbackEl = document.createElement('p')
      feedbackEl.style.cssText = 'font-size: 16px; min-height: 40px; color: var(--text-muted);'
      sv.panel.appendChild(feedbackEl)

      // Mount area for AB compare inside canvasWrap
      const abMount = document.createElement('div')
      sv.canvasWrap.appendChild(abMount)

      function renderRound() {
        const round = rounds[roundIdx]
        roundLabel.textContent = ctx.i18n.t('ch06.s02_round', { current: roundIdx + 1, total: rounds.length })
        promptEl.textContent = ctx.i18n.t('ch06.s02_prompt_label') + ' ' + round.prompt
        feedbackEl.textContent = ''

        // Remove any leftover next button
        const existingBtn = sv.panel.querySelector('.round-next-btn')
        if (existingBtn) existingBtn.remove()

        // Randomize which side is SFT
        const sftIsA = Math.random() > 0.5

        if (currentAB) { currentAB.destroy() }

        currentAB = createABCompare(abMount, {
          prompt: null,
          responseA: {
            label: ctx.i18n.t('ch06.s02_response_a'),
            text: sftIsA ? round.sft : round.base
          },
          responseB: {
            label: ctx.i18n.t('ch06.s02_response_b'),
            text: sftIsA ? round.base : round.sft
          },
          typewriter: true,
          onPick: (picked) => {
            const correctSide = sftIsA ? 'a' : 'b'
            const isCorrect = picked === correctSide
            if (isCorrect) score++

            currentAB.markCorrect(correctSide)

            feedbackEl.textContent = (isCorrect
              ? ctx.i18n.t('ch06.s02_correct')
              : ctx.i18n.t('ch06.s02_wrong'))
              + ' ' + round.explanation
            feedbackEl.className = 'fade-in'

            // Next button
            const nextBtn = document.createElement('button')
            nextBtn.className = 'scene-btn fade-in round-next-btn'
            nextBtn.style.marginTop = '8px'

            if (roundIdx < rounds.length - 1) {
              nextBtn.textContent = ctx.i18n.t('ch06.s02_next')
              nextBtn.addEventListener('click', () => {
                roundIdx++
                nextBtn.remove()
                renderRound()
              })
            } else {
              nextBtn.textContent = '→'
              nextBtn.addEventListener('click', () => {
                ctx.state.setSetting('ch06_score', score)
                ctx.bus.emit('scene:advance')
              })
            }
            sv.panel.appendChild(nextBtn)
          }
        })
      }

      renderRound()

      return { sv, getAB: () => currentAB, score: () => score }
    },
    exit(rv) {
      rv?.getAB()?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 2: The Transformation [Split-View canvas visualization]
  {
    id: 'ch06-s02-transform',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let t = 0

      // Particles for base model (chaotic) and SFT (organized beam)
      const baseParticles = Array.from({ length: 30 }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01
      }))

      const sftParticles = Array.from({ length: 30 }, (_, i) => ({
        x: 0.5,
        y: i / 30
      }))

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)
        t++

        const halfW = w / 2

        // Labels
        c.font = 'bold 16px LXGW WenKai, sans-serif'
        c.textAlign = 'center'
        c.fillStyle = '#D4645C'
        c.fillText('Base Model', halfW / 2, 25)
        c.fillStyle = '#5BA55B'
        c.fillText('SFT Model', halfW + halfW / 2, 25)

        // Divider
        c.strokeStyle = '#ddd'
        c.lineWidth = 1
        c.setLineDash([4, 4])
        c.beginPath()
        c.moveTo(halfW, 35)
        c.lineTo(halfW, h - 10)
        c.stroke()
        c.setLineDash([])

        // Input label (top)
        c.font = '12px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText('Input: "Write me an email"', w / 2, 50)

        // Base model: chaotic particles (left half)
        baseParticles.forEach(p => {
          p.x += p.vx + (Math.random() - 0.5) * 0.003
          p.y += p.vy + (Math.random() - 0.5) * 0.003
          p.x = Math.max(0.05, Math.min(0.95, p.x))
          p.y = Math.max(0.1, Math.min(0.95, p.y))

          const px = p.x * halfW
          const py = 60 + p.y * (h - 80)
          c.fillStyle = `rgba(212, 100, 92, ${0.4 + Math.random() * 0.3})`
          c.beginPath()
          c.arc(px, py, 3, 0, Math.PI * 2)
          c.fill()
        })

        // SFT model: focused beam (right half)
        // Glowing beam line
        c.strokeStyle = 'rgba(91, 165, 91, 0.15)'
        c.lineWidth = 22
        c.beginPath()
        c.moveTo(halfW + halfW / 2, 70)
        c.lineTo(halfW + halfW / 2, h - 20)
        c.stroke()

        c.strokeStyle = 'rgba(91, 165, 91, 0.08)'
        c.lineWidth = 38
        c.beginPath()
        c.moveTo(halfW + halfW / 2, 70)
        c.lineTo(halfW + halfW / 2, h - 20)
        c.stroke()

        // Beam particles
        sftParticles.forEach((p, i) => {
          const phase = t * 0.03 + i * 0.2
          const px = halfW + (0.5 + Math.sin(phase) * 0.03) * halfW
          const py = 60 + (i / 30) * (h - 80)
          c.fillStyle = `rgba(91, 165, 91, ${0.5 + Math.sin(phase) * 0.2})`
          c.beginPath()
          c.arc(px, py, 3.5, 0, Math.PI * 2)
          c.fill()
        })

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel content
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch06.title')
      sv.panel.appendChild(title)

      const score = ctx.state.getSetting('ch06_score') ?? 0
      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch06.s03_text', { score })
      sv.panel.appendChild(desc)

      const desc2 = document.createElement('p')
      desc2.textContent = ctx.i18n.t('ch06.s04_text')
      sv.panel.appendChild(desc2)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch06.s04_btn')
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

  // Scene 3: Wrap-up [Narrative]
  {
    id: 'ch06-s03-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch06.s04_text2')
      await sleep(800)
      await ctx.narrator.say('ch06.s05_text')
      await sleep(800)
      await ctx.narrator.ask('ch06.s05_text2', [
        { key: 'ch06.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch06-sft-motivation') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
