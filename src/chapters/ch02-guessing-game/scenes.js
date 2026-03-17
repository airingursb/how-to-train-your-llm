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

      // Canvas: scoreboard + context display
      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Title
        c.font = 'bold 20px Caveat, cursive'
        c.fillStyle = '#2D2D2D'
        c.textAlign = 'center'
        c.fillText('Score Race', w / 2, 40)

        // Score bars
        const barX = 60
        const barW = w - 120
        const barH = 30

        // Player bar
        c.font = '16px Caveat, cursive'
        c.textAlign = 'right'
        c.fillStyle = '#4A90D9'
        c.fillText(ctx.i18n.t('ch02.s02_you'), barX - 8, 90)
        c.fillStyle = 'rgba(74, 144, 217, 0.15)'
        c.fillRect(barX, 75, barW, barH)
        c.fillStyle = '#4A90D9'
        c.fillRect(barX, 75, (playerScore / 5) * barW, barH)
        c.fillStyle = '#fff'
        c.textAlign = 'center'
        if (playerScore > 0) c.fillText(playerScore + '', barX + (playerScore / 5) * barW / 2, 95)

        // Bigram bar
        c.textAlign = 'right'
        c.fillStyle = '#E8913A'
        c.fillText(ctx.i18n.t('ch02.s02_bigram'), barX - 8, 140)
        c.fillStyle = 'rgba(232, 145, 58, 0.15)'
        c.fillRect(barX, 125, barW, barH)
        c.fillStyle = '#E8913A'
        c.fillRect(barX, 125, (bigramScore / 5) * barW, barH)
        c.fillStyle = '#fff'
        c.textAlign = 'center'
        if (bigramScore > 0) c.fillText(bigramScore + '', barX + (bigramScore / 5) * barW / 2, 145)

        // Context sentence display
        if (roundIdx < rounds.length) {
          const round = rounds[roundIdx]
          c.font = '22px JetBrains Mono, monospace'
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'

          // Word-wrap the context
          const contextWords = round.context.split(' ')
          let line = ''
          let lineY = h * 0.55
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

          // Blank
          c.fillStyle = '#4A90D9'
          c.fillText('____', w / 2, lineY + 40)
        }

        // Bigram probability bars (when showing result)
        if (showingResult && roundIdx < rounds.length) {
          const round = rounds[roundIdx]
          const by = h * 0.78
          c.font = '12px JetBrains Mono, monospace'
          c.fillStyle = '#888'
          c.textAlign = 'left'
          c.fillText(`Bigram sees: "${round.bigramPrev}" \u2192`, 20, by)

          round.options.forEach((opt, i) => {
            const oy = by + 18 + i * 22
            const prob = opt === round.bigramChoice ? round.bigramProb : Math.random() * 0.1
            c.fillStyle = opt === round.bigramChoice ? '#E8913A' : 'rgba(232,145,58,0.2)'
            c.fillRect(120, oy, prob * (w - 200), 16)
            c.fillStyle = '#666'
            c.textAlign = 'left'
            c.fillText(opt, 20, oy + 12)
            c.textAlign = 'right'
            c.fillText((prob * 100).toFixed(0) + '%', w - 20, oy + 12)
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
