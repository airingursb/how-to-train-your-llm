import { createSplitView } from '../../helpers/split-view.js'
import prefData from './data/preference-data.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Preference Collection [Split-View + Interactive]
  {
    id: 'ch08-s01-preferences',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const rounds = prefData.rounds
      let roundIdx = 0
      let collected = 0

      // Neural network nodes for reward model visualization
      const layers = [4, 6, 4, 1]
      const nodes = []
      const connections = []

      // Build network structure
      layers.forEach((count, li) => {
        for (let ni = 0; ni < count; ni++) {
          nodes.push({ layer: li, index: ni, activation: 0.3 })
        }
      })

      // Build connections with random initial weights
      for (let li = 0; li < layers.length - 1; li++) {
        for (let fi = 0; fi < layers[li]; fi++) {
          for (let ti = 0; ti < layers[li + 1]; ti++) {
            connections.push({
              fromLayer: li,
              fromNode: fi,
              toLayer: li + 1,
              toNode: ti,
              weight: 0.1 + Math.random() * 0.2
            })
          }
        }
      }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Title
        c.font = 'bold 16px LXGW WenKai'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText('Reward Model', w / 2, 25)

        // Draw neural network
        const netH = h * 0.55
        const netY = 40

        function nodePos(layer, index) {
          const layerX = 40 + (layer / (layers.length - 1)) * (w - 80)
          const count = layers[layer]
          const spacing = Math.min(40, netH / (count + 1))
          const startY = netY + (netH - count * spacing) / 2
          return { x: layerX, y: startY + index * spacing + spacing / 2 }
        }

        // Draw connections
        connections.forEach(conn => {
          const from = nodePos(conn.fromLayer, conn.fromNode)
          const to = nodePos(conn.toLayer, conn.toNode)
          c.strokeStyle = `rgba(74, 144, 217, ${conn.weight})`
          c.lineWidth = conn.weight * 3
          c.beginPath()
          c.moveTo(from.x, from.y)
          c.lineTo(to.x, to.y)
          c.stroke()
        })

        // Draw nodes
        nodes.forEach(node => {
          const pos = nodePos(node.layer, node.index)
          c.fillStyle = `rgba(74, 144, 217, ${0.3 + node.activation * 0.7})`
          c.beginPath()
          c.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
          c.fill()
          c.strokeStyle = '#4A90D9'
          c.lineWidth = 1.5
          c.stroke()
        })

        // Progress bar
        const barY = netY + netH + 20
        c.fillStyle = 'rgba(0,0,0,0.06)'
        c.fillRect(30, barY, w - 60, 20)
        c.fillStyle = '#4A90D9'
        c.fillRect(30, barY, (collected / rounds.length) * (w - 60), 20)
        c.font = '12px JetBrains Mono'
        c.fillStyle = '#666'
        c.textAlign = 'center'
        c.fillText(ctx.i18n.t('ch08.s02_preferences_collected', { count: collected }), w / 2, barY + 14)

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      function updateNetwork() {
        // Simulate learning — increase weights and activations
        connections.forEach(conn => {
          conn.weight = Math.min(0.9, conn.weight + 0.05 + Math.random() * 0.05)
        })
        nodes.forEach(node => {
          node.activation = Math.min(1, node.activation + 0.1 + Math.random() * 0.1)
        })
      }

      // Panel content
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch08.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch08.s01_text2')
      sv.panel.appendChild(desc)

      const roundLabel = document.createElement('div')
      roundLabel.className = 'score-badge'
      sv.panel.appendChild(roundLabel)

      const promptEl = document.createElement('p')
      promptEl.style.cssText = 'font-style: italic; color: var(--accent); margin: 8px 0;'
      sv.panel.appendChild(promptEl)

      const cardsDiv = document.createElement('div')
      cardsDiv.style.cssText = 'display: flex; gap: 10px; margin: 12px 0;'
      sv.panel.appendChild(cardsDiv)

      const feedbackEl = document.createElement('p')
      feedbackEl.style.cssText = 'font-size: 15px; color: var(--text-muted); min-height: 40px;'
      sv.panel.appendChild(feedbackEl)

      function renderRound() {
        const round = rounds[roundIdx]
        roundLabel.textContent = ctx.i18n.t('ch08.s02_round', { current: roundIdx + 1, total: rounds.length })
        promptEl.textContent = ctx.i18n.t('ch08.s02_prompt_label') + ' ' + round.prompt
        feedbackEl.textContent = ''
        cardsDiv.innerHTML = ''

        // Remove any leftover next button
        sv.panel.querySelectorAll('.scene-btn').forEach(b => b.remove())

        const makeCard = (label, text, side) => {
          const card = document.createElement('div')
          card.className = 'compare-card'
          const lbl = document.createElement('div')
          lbl.className = 'compare-label'
          lbl.textContent = label
          const txt = document.createElement('div')
          txt.className = 'compare-text'
          txt.textContent = text
          txt.style.cssText = 'font-size: 14px; white-space: pre-wrap;'
          card.appendChild(lbl)
          card.appendChild(txt)
          card.addEventListener('click', () => handlePick(side))
          return card
        }

        const cardA = makeCard(ctx.i18n.t('ch08.s02_response_a'), round.responseA, 'A')
        const cardB = makeCard(ctx.i18n.t('ch08.s02_response_b'), round.responseB, 'B')
        cardsDiv.appendChild(cardA)
        cardsDiv.appendChild(cardB)
      }

      function handlePick(picked) {
        const round = rounds[roundIdx]
        collected++
        updateNetwork()

        // Disable cards
        cardsDiv.querySelectorAll('.compare-card').forEach(card => {
          card.style.pointerEvents = 'none'
        })

        const isCorrect = picked === round.better
        feedbackEl.textContent = (isCorrect
          ? ctx.i18n.t('ch08.s02_correct')
          : ctx.i18n.t('ch08.s02_different')) + ' ' + round.reason
        feedbackEl.className = 'fade-in'

        // Highlight correct/wrong cards
        const cards = cardsDiv.querySelectorAll('.compare-card')
        const correctIdx = round.better === 'A' ? 0 : 1
        cards[correctIdx].classList.add('picked-correct')
        if (!isCorrect) {
          cards[correctIdx === 0 ? 1 : 0].classList.add('picked-wrong')
        }

        const nextBtn = document.createElement('button')
        nextBtn.className = 'scene-btn fade-in'
        nextBtn.style.marginTop = '8px'

        if (roundIdx < rounds.length - 1) {
          nextBtn.textContent = ctx.i18n.t('ch08.s02_next')
          nextBtn.addEventListener('click', () => {
            roundIdx++
            nextBtn.remove()
            renderRound()
          })
        } else {
          nextBtn.textContent = ctx.i18n.t('ch08.s03_btn')
          nextBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
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

  // Scene 2: Reward Hacking [Split-View]
  {
    id: 'ch08-s02-hacking',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let honestScore = 0
      let hackedScore = 0
      let animating = false
      let warning = false
      let t = 0

      const { rewardHacking } = prefData

      function wrapText(context, text, maxW) {
        const words = text.split(' ')
        const lines = []
        let line = ''
        words.forEach(word => {
          const test = line + word + ' '
          if (context.measureText(test).width > maxW) {
            lines.push(line.trim())
            line = word + ' '
          } else {
            line = test
          }
        })
        if (line.trim()) lines.push(line.trim())
        return lines
      }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)
        t++

        // Two score gauges side by side
        const gaugeW = (w - 60) / 2
        const gaugeH = 30
        const gaugeY = h * 0.4

        // --- Honest gauge ---
        c.font = 'bold 14px JetBrains Mono'
        c.fillStyle = '#5BA55B'
        c.textAlign = 'center'
        c.fillText(ctx.i18n.t('ch08.s04_honest_label'), 20 + gaugeW / 2, gaugeY - 15)

        c.fillStyle = 'rgba(0,0,0,0.06)'
        c.fillRect(20, gaugeY, gaugeW, gaugeH)
        c.fillStyle = '#5BA55B'
        c.fillRect(20, gaugeY, (honestScore / 100) * gaugeW, gaugeH)

        c.fillStyle = '#5BA55B'
        c.fillText(ctx.i18n.t('ch08.s04_score', { score: Math.floor(honestScore) }), 20 + gaugeW / 2, gaugeY + gaugeH + 20)

        // --- Hacked gauge ---
        const hx = 40 + gaugeW
        const hackedColor = warning ? (t % 20 < 10 ? '#D4645C' : '#E8913A') : '#E8913A'

        c.fillStyle = hackedColor
        c.fillText(ctx.i18n.t('ch08.s04_hacked_label'), hx + gaugeW / 2, gaugeY - 15)

        c.fillStyle = 'rgba(0,0,0,0.06)'
        c.fillRect(hx, gaugeY, gaugeW, gaugeH)
        c.fillStyle = warning ? '#D4645C' : '#E8913A'
        c.fillRect(hx, gaugeY, (hackedScore / 100) * gaugeW, gaugeH)

        c.fillStyle = warning ? '#D4645C' : '#E8913A'
        c.fillText(ctx.i18n.t('ch08.s04_score', { score: Math.floor(hackedScore) }), hx + gaugeW / 2, gaugeY + gaugeH + 20)

        // Warning flash when hacking detected
        if (warning && t % 30 < 15) {
          c.strokeStyle = '#D4645C'
          c.lineWidth = 3
          c.strokeRect(hx - 2, gaugeY - 2, gaugeW + 4, gaugeH + 4)
          c.font = 'bold 20px LXGW WenKai'
          c.fillStyle = '#D4645C'
          c.fillText('⚠️ REWARD HACKING!', w / 2, gaugeY + gaugeH + 55)
        }

        // Response text previews
        const previewY = gaugeY + gaugeH + 75

        c.font = '12px JetBrains Mono'
        c.fillStyle = '#666'
        c.textAlign = 'left'
        c.fillText('Honest:', 20, previewY)
        c.font = '11px JetBrains Mono'
        const honestLines = wrapText(c, rewardHacking.honest, gaugeW - 10)
        honestLines.slice(0, 3).forEach((line, i) => {
          c.fillText(line, 20, previewY + 18 + i * 15)
        })

        c.font = '12px JetBrains Mono'
        c.fillStyle = '#666'
        c.fillText('Hacked:', hx, previewY)
        c.font = '11px JetBrains Mono'
        const hackedLines = wrapText(c, rewardHacking.hacked, gaugeW - 10)
        hackedLines.slice(0, 3).forEach((line, i) => {
          c.fillText(line, hx, previewY + 18 + i * 15)
        })

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel content
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch08.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch08.s04_text')
      sv.panel.appendChild(desc)

      const raceBtn = document.createElement('button')
      raceBtn.className = 'scene-btn'
      raceBtn.textContent = 'Race! →'
      sv.panel.appendChild(raceBtn)

      const desc2 = document.createElement('p')
      desc2.style.cssText = 'font-size: 16px; color: var(--text-muted); min-height: 40px; display: none;'
      desc2.textContent = rewardHacking.explanation
      sv.panel.appendChild(desc2)

      raceBtn.addEventListener('click', async () => {
        if (animating) return
        animating = true
        raceBtn.disabled = true

        // Animate both scores racing up
        for (let i = 0; i <= 40; i++) {
          honestScore = Math.min(42, i * 1.05)
          hackedScore = Math.min(91, i * 2.3)
          if (hackedScore > 60) warning = true
          await sleep(50)
        }

        desc2.style.display = ''
        desc2.className = 'fade-in'

        raceBtn.textContent = ctx.i18n.t('ch08.s04_btn')
        raceBtn.disabled = false
        raceBtn.onclick = () => ctx.bus.emit('scene:advance')
      })

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
    id: 'ch08-s03-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch08.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.ask('ch08.s05_text2', [
        { key: 'ch08.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch08-reward-model') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
