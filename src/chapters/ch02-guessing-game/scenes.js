import { createSplitView } from '../../helpers/split-view.js'
import { createHeatmap } from '../../helpers/heatmap.js'
import bigramData from './data/bigram-data.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: The Race [Split-View + Prediction Game]
  {
    id: 'ch02-s01-race',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const rounds = bigramData.rounds
      let roundIdx = 0
      let playerScore = 0
      let bigramScore = 0
      let showingResult = false
      let cachedProbs = null // pre-computed random probs for non-chosen options

      // Canvas: context sentence + bigram probability bars
      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // ── Scoreboard (compact, top) ──
        const scoreY = 30
        c.font = 'bold 16px LXGW WenKai, cursive'
        c.textAlign = 'center'

        // Player score dots
        const dotR = 10, dotGap = 28
        const totalDotsW = 5 * dotGap
        const startX = (w - totalDotsW) / 2

        c.fillStyle = '#4A90D9'
        c.fillText(ctx.i18n.t('ch02.s02_you'), startX - 8, scoreY + 5)
        for (let i = 0; i < 5; i++) {
          const dx = startX + 40 + i * dotGap
          c.beginPath()
          c.arc(dx, scoreY, dotR, 0, Math.PI * 2)
          c.fillStyle = i < playerScore ? '#4A90D9' : 'rgba(74, 144, 217, 0.15)'
          c.fill()
        }

        c.fillStyle = '#E8913A'
        c.fillText(ctx.i18n.t('ch02.s02_bigram'), startX - 8, scoreY + 35)
        for (let i = 0; i < 5; i++) {
          const dx = startX + 40 + i * dotGap
          c.beginPath()
          c.arc(dx, scoreY + 30, dotR, 0, Math.PI * 2)
          c.fillStyle = i < bigramScore ? '#E8913A' : 'rgba(232, 145, 58, 0.15)'
          c.fill()
        }

        // ── Context sentence (center) ──
        if (roundIdx < rounds.length) {
          const round = rounds[roundIdx]
          c.font = '22px JetBrains Mono, monospace'
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'

          const contextWords = round.context.split(' ')
          let line = ''
          let lineY = h * 0.35
          contextWords.forEach(word => {
            const test = line + word + ' '
            if (c.measureText(test).width > w - 60) {
              c.fillText(line.trim(), w / 2, lineY)
              line = word + ' '
              lineY += 32
            } else {
              line = test
            }
          })
          c.fillText(line.trim(), w / 2, lineY)

          // Blank indicator
          c.fillStyle = '#4A90D9'
          c.fillText('____', w / 2, lineY + 40)
        }

        // ── Bigram probability bars (bottom, shown after answer) ──
        if (showingResult && roundIdx < rounds.length) {
          const round = rounds[roundIdx]
          const barAreaY = h * 0.6
          const barH = 18
          const barGap = 28
          const maxBarW = w - 180

          c.font = '13px LXGW WenKai, cursive'
          c.fillStyle = '#888'
          c.textAlign = 'left'
          c.fillText(`Bigram: "${round.bigramPrev}" →`, 20, barAreaY - 4)

          round.options.forEach((opt, i) => {
            const oy = barAreaY + 12 + i * barGap
            const prob = cachedProbs ? cachedProbs[opt] : 0
            const barW = prob * maxBarW

            // Label
            c.font = '13px JetBrains Mono, monospace'
            c.fillStyle = '#555'
            c.textAlign = 'left'
            c.fillText(opt, 20, oy + 13)

            // Bar
            c.fillStyle = opt === round.bigramChoice
              ? '#E8913A'
              : 'rgba(232, 145, 58, 0.25)'
            const rx = 90, ry = oy, rw = Math.max(barW, 2), rh = barH, radius = 3
            c.beginPath()
            c.moveTo(rx + radius, ry)
            c.lineTo(rx + rw - radius, ry)
            c.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius)
            c.lineTo(rx + rw, ry + rh - radius)
            c.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh)
            c.lineTo(rx + radius, ry + rh)
            c.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius)
            c.lineTo(rx, ry + radius)
            c.quadraticCurveTo(rx, ry, rx + radius, ry)
            c.fill()

            // Percentage
            c.fillStyle = '#888'
            c.textAlign = 'right'
            c.fillText((prob * 100).toFixed(0) + '%', w - 20, oy + 13)
          })
        }

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch02.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch02.s01_text')
      sv.panel.appendChild(desc)

      const roundLabel = document.createElement('div')
      roundLabel.className = 'score-badge'
      sv.panel.appendChild(roundLabel)

      const prompt = document.createElement('p')
      prompt.style.cssText = 'font-size: 18px; margin: 12px 0; font-weight: bold;'
      sv.panel.appendChild(prompt)

      const choicesDiv = document.createElement('div')
      choicesDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;'
      sv.panel.appendChild(choicesDiv)

      const feedbackEl = document.createElement('p')
      feedbackEl.style.cssText = 'font-size: 16px; min-height: 40px; color: var(--text-muted);'
      sv.panel.appendChild(feedbackEl)

      function renderRound() {
        showingResult = false
        cachedProbs = null
        const round = rounds[roundIdx]
        roundLabel.textContent = ctx.i18n.t('ch02.s02_round', { current: roundIdx + 1, total: rounds.length })
        prompt.textContent = ctx.i18n.t('ch02.s02_pick')
        feedbackEl.textContent = ''
        choicesDiv.innerHTML = ''

        // Remove any previous next button
        const oldNext = sv.panel.querySelector('.scene-btn')
        if (oldNext) oldNext.remove()

        round.options.forEach(opt => {
          const btn = document.createElement('button')
          btn.className = 'choice-card'
          btn.textContent = opt
          btn.addEventListener('click', () => handlePick(opt))
          choicesDiv.appendChild(btn)
        })
      }

      function handlePick(picked) {
        const round = rounds[roundIdx]
        showingResult = true

        // Pre-compute stable probabilities for display
        cachedProbs = {}
        round.options.forEach(opt => {
          cachedProbs[opt] = opt === round.bigramChoice
            ? round.bigramProb
            : 0.02 + Math.random() * 0.08
        })

        // Disable all buttons
        choicesDiv.querySelectorAll('.choice-card').forEach(b => {
          b.style.pointerEvents = 'none'
          if (b.textContent === round.correct) b.classList.add('correct')
          else if (b.textContent === picked && picked !== round.correct) b.classList.add('wrong')
        })

        // Score
        if (picked === round.correct) playerScore++
        if (round.bigramChoice === round.correct) bigramScore++

        feedbackEl.textContent = round.explanation

        // Next button
        const nextBtn = document.createElement('button')
        nextBtn.className = 'scene-btn fade-in'
        nextBtn.style.marginTop = '8px'

        if (roundIdx < rounds.length - 1) {
          nextBtn.textContent = ctx.i18n.t('ch02.s02_next')
          nextBtn.addEventListener('click', () => {
            roundIdx++
            nextBtn.remove()
            renderRound()
          })
        } else {
          nextBtn.textContent = '\u2192'
          nextBtn.addEventListener('click', () => {
            feedbackEl.textContent = ctx.i18n.t('ch02.s03_text', { playerScore, bigramScore })
            nextBtn.textContent = ctx.i18n.t('ch02.s03_btn')
            nextBtn.onclick = () => ctx.bus.emit('scene:advance')
          })
        }
        sv.panel.appendChild(nextBtn)
      }

      renderRound()
      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // Scene 2: Bigram Matrix [Split-View + Interactive Heatmap]
  {
    id: 'ch02-s02-matrix',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))

      // Small bigram matrix from common words
      const words = ['the', 'cat', 'sat', 'on', 'mat', 'a']
      const matrix = [
        { label: 'the', values: [0.05, 0.35, 0.05, 0.10, 0.25, 0.15] },
        { label: 'cat', values: [0.15, 0.02, 0.55, 0.10, 0.05, 0.08] },
        { label: 'sat', values: [0.10, 0.05, 0.02, 0.60, 0.08, 0.10] },
        { label: 'on',  values: [0.45, 0.05, 0.02, 0.05, 0.20, 0.18] },
        { label: 'mat', values: [0.30, 0.05, 0.05, 0.10, 0.02, 0.10] },
        { label: 'a',   values: [0.10, 0.30, 0.05, 0.05, 0.15, 0.05] },
      ]

      const hoveredInfo = document.createElement('p')
      hoveredInfo.style.cssText = 'font-size: 16px; color: var(--accent); min-height: 30px; font-family: var(--font-mono);'

      const heatmap = createHeatmap(sv.canvas, sv.ctx, {
        rows: matrix,
        colLabels: words,
        onCellHover: (row, col, value) => {
          hoveredInfo.textContent = `P("${words[col]}" | "${words[row]}") = ${(value * 100).toFixed(0)}%`
        }
      })

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch02.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch02.s04_text')
      sv.panel.appendChild(desc)

      const desc2 = document.createElement('p')
      desc2.textContent = ctx.i18n.t('ch02.s04_text2')
      sv.panel.appendChild(desc2)

      sv.panel.appendChild(hoveredInfo)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch02.s04_btn')
      btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      sv.panel.appendChild(btn)

      // Redraw heatmap on resize
      const resizeHandler = () => { sv.resize(); heatmap.redraw() }
      window.addEventListener('resize', resizeHandler)

      return { sv, heatmap, resizeHandler }
    },
    exit(rv) {
      if (rv?.resizeHandler) window.removeEventListener('resize', rv.resizeHandler)
      rv?.heatmap?.destroy()
      rv?.sv?.destroy()
    }
  },

  // Scene 3: Wrap-up [Narrative]
  {
    id: 'ch02-s03-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch02.s05_text')
      await sleep(800)
      await ctx.narrator.ask('ch02.s05_text2', [
        { key: 'ch02.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch02-guessing-game') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
