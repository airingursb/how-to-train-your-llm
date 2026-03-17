import { createSplitView } from '../../helpers/split-view.js'
import { createStepThrough } from '../../helpers/step-through.js'
import attentionData from './data/attention-data.json'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // Scene 1: Draw Attention
  {
    id: 'ch03-s01-draw',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const sentences = attentionData.sentences
      let sentIdx = 0
      let userConnections = [] // [{from, to}]
      let revealed = false

      function getTokenPositions(tokens, w, h) {
        const tokenW = Math.min(70, (w - 40) / tokens.length)
        const startX = (w - tokenW * tokens.length) / 2
        const y = h * 0.4
        return tokens.map((t, i) => ({
          x: startX + i * tokenW + tokenW / 2,
          y,
          w: tokenW - 4,
          h: 36,
          label: t,
          index: i
        }))
      }

      function drawArc(ctx2d, from, to, color, lineWidth) {
        const midX = (from.x + to.x) / 2
        const midY = Math.min(from.y, to.y) - 40 - Math.abs(from.x - to.x) * 0.15
        ctx2d.strokeStyle = color
        ctx2d.lineWidth = lineWidth
        ctx2d.beginPath()
        ctx2d.moveTo(from.x, from.y - from.h / 2)
        ctx2d.quadraticCurveTo(midX, midY, to.x, to.y - to.h / 2)
        ctx2d.stroke()
      }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const sent = sentences[sentIdx]
        const positions = getTokenPositions(sent.tokens, w, h)
        const queryIdx = sent.queryToken

        // Draw user connections (blue arcs)
        userConnections.forEach(({ from, to }) => {
          drawArc(c, positions[from], positions[to], 'rgba(74, 144, 217, 0.5)', 2)
        })

        // Draw model connections (revealed, green arcs with varying intensity)
        if (revealed) {
          sent.correctAttention.forEach((weight, i) => {
            if (weight > 0) {
              drawArc(c, positions[queryIdx], positions[i], `rgba(91, 165, 91, ${weight * 0.7})`, 3)
            }
          })
        }

        // Draw token cards
        positions.forEach((pos, i) => {
          const isQuery = i === queryIdx

          c.fillStyle = isQuery ? 'rgba(74, 144, 217, 0.2)' : 'rgba(45,45,45,0.05)'
          c.fillRect(pos.x - pos.w / 2, pos.y - pos.h / 2, pos.w, pos.h)

          c.strokeStyle = isQuery ? '#4A90D9' : '#ccc'
          c.lineWidth = isQuery ? 2.5 : 1
          c.strokeRect(pos.x - pos.w / 2, pos.y - pos.h / 2, pos.w, pos.h)

          c.font = '14px JetBrains Mono, monospace'
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'
          c.textBaseline = 'middle'
          c.fillText(pos.label, pos.x, pos.y)
        })

        // Instructions on canvas
        c.font = '13px LXGW WenKai, cursive'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText(`Click tokens to draw attention from "${sent.queryWord}"`, w / 2, h * 0.15)

        if (revealed) {
          c.fillStyle = '#4A90D9'
          c.fillText('Blue = your guesses', w * 0.3, h * 0.85)
          c.fillStyle = '#5BA55B'
          c.fillText('Green = model attention', w * 0.7, h * 0.85)
        }

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Click handler
      canvas.addEventListener('click', (e) => {
        if (revealed) return
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        const sent = sentences[sentIdx]
        const positions = getTokenPositions(sent.tokens, w, h)

        const clicked = positions.find(p =>
          mx >= p.x - p.w / 2 && mx <= p.x + p.w / 2 &&
          my >= p.y - p.h / 2 && my <= p.y + p.h / 2
        )

        if (!clicked) return

        // Always draw from the query token
        if (clicked.index !== sent.queryToken) {
          userConnections.push({ from: sent.queryToken, to: clicked.index })
        }
      })

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch03.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch03.s01_text')
      sv.panel.appendChild(desc)

      const roundLabel = document.createElement('div')
      roundLabel.className = 'score-badge'
      sv.panel.appendChild(roundLabel)

      const instrEl = document.createElement('p')
      sv.panel.appendChild(instrEl)

      const feedbackEl = document.createElement('p')
      feedbackEl.style.cssText = 'font-size: 16px; color: var(--text-muted); min-height: 40px;'
      sv.panel.appendChild(feedbackEl)

      const checkBtn = document.createElement('button')
      checkBtn.className = 'scene-btn'
      sv.panel.appendChild(checkBtn)

      function renderRound() {
        revealed = false
        userConnections = []
        const sent = sentences[sentIdx]
        roundLabel.textContent = ctx.i18n.t('ch03.s03_round', { current: sentIdx + 1, total: sentences.length })
        instrEl.textContent = ctx.i18n.t('ch03.s03_instruction', { word: sent.queryWord })
        feedbackEl.textContent = ''
        checkBtn.textContent = ctx.i18n.t('ch03.s03_check')
        checkBtn.style.display = ''
        checkBtn.onclick = () => {
          revealed = true
          feedbackEl.textContent = sent.explanation
          feedbackEl.className = 'fade-in'

          if (sentIdx < sentences.length - 1) {
            checkBtn.textContent = ctx.i18n.t('ch03.s03_next')
            checkBtn.onclick = () => {
              sentIdx++
              renderRound()
            }
          } else {
            checkBtn.textContent = ctx.i18n.t('ch03.s04_btn')
            checkBtn.onclick = () => ctx.bus.emit('scene:advance')
          }
        }
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

  // Scene 2: Q/K/V Step-Through
  {
    id: 'ch03-s02-qkv',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let currentStepIdx = 0

      const tokens = ['The', 'cat', 'sat']

      function drawArrowHead(ctx2d, x, y, color) {
        ctx2d.fillStyle = color
        ctx2d.beginPath()
        ctx2d.moveTo(x, y + 6)
        ctx2d.lineTo(x - 4, y - 2)
        ctx2d.lineTo(x + 4, y - 2)
        ctx2d.closePath()
        ctx2d.fill()
      }

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const tokenW = 80
        const startX = (w - tokenW * tokens.length) / 2
        const baseY = h * 0.2

        // Draw tokens
        c.font = '16px JetBrains Mono, monospace'
        tokens.forEach((tok, i) => {
          const x = startX + i * tokenW + tokenW / 2
          c.fillStyle = 'rgba(45,45,45,0.08)'
          c.fillRect(x - 30, baseY, 60, 32)
          c.strokeStyle = '#ccc'
          c.strokeRect(x - 30, baseY, 60, 32)
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'
          c.fillText(tok, x, baseY + 22)
        })

        // Step 0: Query arrows (blue, pointing down)
        if (currentStepIdx >= 0) {
          tokens.forEach((_, i) => {
            const x = startX + i * tokenW + tokenW / 2
            c.strokeStyle = '#4A90D9'
            c.lineWidth = 2
            c.beginPath()
            c.moveTo(x, baseY + 36)
            c.lineTo(x, baseY + 70)
            c.stroke()
            drawArrowHead(c, x, baseY + 70, '#4A90D9')
            c.font = '11px JetBrains Mono, monospace'
            c.fillStyle = '#4A90D9'
            c.fillText('Q', x + 10, baseY + 55)
          })
        }

        // Step 1: Key arrows (green)
        if (currentStepIdx >= 1) {
          tokens.forEach((_, i) => {
            const x = startX + i * tokenW + tokenW / 2 - 15
            c.strokeStyle = '#5BA55B'
            c.lineWidth = 2
            c.beginPath()
            c.moveTo(x, baseY + 36)
            c.lineTo(x, baseY + 70)
            c.stroke()
            drawArrowHead(c, x, baseY + 70, '#5BA55B')
            c.font = '11px JetBrains Mono, monospace'
            c.fillStyle = '#5BA55B'
            c.fillText('K', x - 10, baseY + 55)
          })
        }

        // Step 2: Dot products (numbers between pairs)
        if (currentStepIdx >= 2) {
          const dotProducts = [[0.8, 0.3, 0.1], [0.2, 0.7, 0.4], [0.1, 0.3, 0.9]]
          const dpY = baseY + 90
          c.font = '12px JetBrains Mono, monospace'
          tokens.forEach((_, qi) => {
            tokens.forEach((_, ki) => {
              const qx = startX + qi * tokenW + tokenW / 2
              const kx = startX + ki * tokenW + tokenW / 2
              const mx = (qx + kx) / 2
              const my = dpY + qi * 25
              c.fillStyle = '#E8913A'
              c.fillText(dotProducts[qi][ki].toFixed(1), mx, my)
            })
          })
        }

        // Step 3: Softmax bars
        if (currentStepIdx >= 3) {
          const softmax = [[0.55, 0.30, 0.15], [0.15, 0.50, 0.35], [0.10, 0.25, 0.65]]
          const barY = baseY + 170
          c.font = '11px JetBrains Mono, monospace'
          tokens.forEach((_, qi) => {
            const y = barY + qi * 28
            c.fillStyle = '#888'
            c.textAlign = 'right'
            c.fillText(tokens[qi] + ':', startX - 5, y + 12)
            c.textAlign = 'left'
            tokens.forEach((_, ki) => {
              const x = startX + ki * tokenW
              const bw = softmax[qi][ki] * (tokenW - 8)
              c.fillStyle = `rgba(74, 144, 217, ${0.2 + softmax[qi][ki] * 0.7})`
              c.fillRect(x, y, bw, 18)
              c.fillStyle = '#666'
              c.fillText((softmax[qi][ki] * 100).toFixed(0) + '%', x + bw + 4, y + 13)
            })
          })
        }

        // Step 4: Output vectors
        if (currentStepIdx >= 4) {
          const outY = baseY + 280
          c.font = '13px JetBrains Mono, monospace'
          c.fillStyle = '#888'
          c.textAlign = 'center'
          c.fillText('Output Vectors:', w / 2, outY)
          tokens.forEach((tok, i) => {
            const x = startX + i * tokenW + tokenW / 2
            c.fillStyle = '#4A90D9'
            c.fillRect(x - 25, outY + 10, 50, 24)
            c.fillStyle = '#fff'
            c.fillText('v_' + tok, x, outY + 26)
          })
        }

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      const steps = [
        { id: 'q', label: '1. Query Vectors', description: 'Each token creates a Query vector — "What am I looking for?"', color: '#4A90D9' },
        { id: 'k', label: '2. Key Vectors', description: 'Each token also creates a Key vector — "What do I contain?"', color: '#5BA55B' },
        { id: 'dot', label: '3. Dot Products', description: 'Query · Key = similarity score. Higher score = more relevant.', color: '#E8913A' },
        { id: 'soft', label: '4. Softmax', description: 'Scores are normalized to probabilities. They must sum to 100%.', color: '#4A90D9' },
        { id: 'out', label: '5. Weighted Sum', description: "Each token's output is a weighted sum of all Value vectors, using the attention weights.", color: '#5BA55B' },
      ]

      const stepper = createStepThrough(sv.panel, {
        steps,
        onStep: (idx, stepData) => {
          currentStepIdx = idx
          if (stepData.done) {
            ctx.bus.emit('scene:advance')
          }
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

  // Scene 3: Multi-Head Explorer
  {
    id: 'ch03-s03-multihead',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let activeHead = 0

      const { sentence, heads } = attentionData.multiHeadDemo
      const headColors = ['#4A90D9', '#5BA55B', '#E8913A']

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const tokenW = Math.min(65, (w - 40) / sentence.length)
        const startX = (w - tokenW * sentence.length) / 2
        const tokenY = h * 0.5

        // Draw tokens
        c.font = '13px JetBrains Mono, monospace'
        sentence.forEach((tok, i) => {
          const x = startX + i * tokenW + tokenW / 2
          c.fillStyle = 'rgba(45,45,45,0.06)'
          c.fillRect(x - tokenW / 2 + 2, tokenY - 16, tokenW - 4, 32)
          c.strokeStyle = '#ccc'
          c.strokeRect(x - tokenW / 2 + 2, tokenY - 16, tokenW - 4, 32)
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'
          c.fillText(tok, x, tokenY + 4)
        })

        // Draw attention beams for active head
        const head = heads[activeHead]
        const color = headColors[activeHead]

        if (head.pattern === 'diagonal') {
          // Positional: each token attends to neighbors
          for (let i = 0; i < sentence.length; i++) {
            for (let j = Math.max(0, i - 2); j <= Math.min(sentence.length - 1, i + 2); j++) {
              if (i === j) continue
              const fromX = startX + i * tokenW + tokenW / 2
              const toX = startX + j * tokenW + tokenW / 2
              const intensity = 1 - Math.abs(i - j) * 0.3
              const midY = tokenY - 30 - Math.abs(i - j) * 12
              // Build rgba from hex color
              c.strokeStyle = color + Math.round(intensity * 0.5 * 255).toString(16).padStart(2, '0')
              c.lineWidth = intensity * 3
              c.beginPath()
              c.moveTo(fromX, tokenY - 16)
              c.quadraticCurveTo((fromX + toX) / 2, midY, toX, tokenY - 16)
              c.stroke()
            }
          }
        } else if (head.links) {
          head.links.forEach(([from, to]) => {
            const fromX = startX + from * tokenW + tokenW / 2
            const toX = startX + to * tokenW + tokenW / 2
            const midY = tokenY - 40 - Math.abs(from - to) * 15
            c.strokeStyle = color
            c.lineWidth = 3
            c.beginPath()
            c.moveTo(fromX, tokenY - 16)
            c.quadraticCurveTo((fromX + toX) / 2, midY, toX, tokenY - 16)
            c.stroke()
            // Dot at target
            c.fillStyle = color
            c.beginPath()
            c.arc(toX, tokenY - 16, 4, 0, Math.PI * 2)
            c.fill()
          })
        }

        // Head label
        c.font = 'bold 16px LXGW WenKai, cursive'
        c.fillStyle = color
        c.textAlign = 'center'
        c.fillText(`Head ${activeHead + 1}: ${head.name}`, w / 2, 30)

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch03.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch03.s05_instruction')
      sv.panel.appendChild(desc)

      // Head selector buttons
      const headBtns = document.createElement('div')
      headBtns.style.cssText = 'display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap;'

      const headDesc = document.createElement('p')
      headDesc.textContent = heads[0].description
      headDesc.style.cssText = 'color: var(--text-muted); font-size: 16px; margin-bottom: 20px;'

      heads.forEach((head, i) => {
        const btn = document.createElement('button')
        btn.className = 'choice-card'
        if (i === 0) btn.classList.add('selected')
        btn.textContent = `Head ${i + 1}: ${head.name}`
        btn.style.cssText = `font-size: 14px; padding: 8px 14px; border-color: ${headColors[i]};`
        btn.addEventListener('click', () => {
          headBtns.querySelectorAll('.choice-card').forEach(b => b.classList.remove('selected'))
          btn.classList.add('selected')
          activeHead = i
          headDesc.textContent = head.description
        })
        headBtns.appendChild(btn)
      })

      sv.panel.appendChild(headBtns)
      sv.panel.appendChild(headDesc)

      const advBtn = document.createElement('button')
      advBtn.className = 'scene-btn'
      advBtn.textContent = ctx.i18n.t('ch03.s05_btn')
      advBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      sv.panel.appendChild(advBtn)

      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // Scene 4: Wrap-up
  {
    id: 'ch03-s04-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch03.s06_text')
      await sleep(800)
      await ctx.narrator.ask('ch03.s06_text2', [
        { key: 'ch03.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch03-attention') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
