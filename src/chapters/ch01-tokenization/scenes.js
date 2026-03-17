import { createSplitView } from '../../helpers/split-view.js'
import { createPredictionGame } from '../../helpers/prediction-game.js'
import bpeData from './data/bpe-demo.json'

// Token color palette — cycles through these for variety
const TOKEN_COLORS = [
  { bg: 'rgba(74,144,217,0.15)', border: '#4A90D9' },
  { bg: 'rgba(80,180,120,0.15)', border: '#50B478' },
  { bg: 'rgba(220,100,80,0.15)', border: '#DC6450' },
  { bg: 'rgba(160,100,220,0.15)', border: '#A064DC' },
  { bg: 'rgba(220,160,50,0.15)', border: '#DCA032' },
]

function tokenColor(i) { return TOKEN_COLORS[i % TOKEN_COLORS.length] }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default [
  // ─── Scene 1: Character Split [Split-View] ────────────────────────────────
  {
    id: 'ch01-s01-chars',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const sentence = bpeData.trainingText
      const chars = sentence.split('')

      // Each char has position, target position, velocity
      const cols = 15
      const tiles = chars.map((ch, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        return {
          char: ch,
          // Start position: center (normalized 0..1)
          x: 0.5, y: 0.4,
          // Target: spread out in grid
          tx: 0.1 + (col / cols) * 0.8,
          ty: 0.2 + row * 0.12,
          vx: 0, vy: 0,
          color: tokenColor(i),
        }
      })

      let exploding = false

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Title
        c.font = 'bold 18px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText('"' + sentence + '"', w / 2, 40)

        // Draw tiles
        c.font = '16px JetBrains Mono, monospace'
        tiles.forEach(tile => {
          if (exploding) {
            // Spring physics toward target
            const dx = tile.tx - tile.x
            const dy = tile.ty - tile.y
            tile.vx += dx * 0.08
            tile.vy += dy * 0.08
            tile.vx *= 0.85
            tile.vy *= 0.85
            tile.x += tile.vx
            tile.y += tile.vy
          }

          const px = tile.x * w
          const py = tile.y * h
          const size = 28

          // Box background
          c.fillStyle = tile.color.bg
          c.fillRect(px - size / 2, py - size / 2, size, size)
          // Box border
          c.strokeStyle = tile.color.border
          c.lineWidth = 1.5
          c.strokeRect(px - size / 2, py - size / 2, size, size)

          // Character label
          c.fillStyle = '#2D2D2D'
          c.textAlign = 'center'
          c.textBaseline = 'middle'
          c.fillText(tile.char === ' ' ? '·' : tile.char, px, py)
        })

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Right panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch01.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch01.s01_text')
      sv.panel.appendChild(desc)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch01.s01_btn')
      btn.addEventListener('click', async () => {
        exploding = true
        btn.remove()
        await sleep(1500)

        const desc2 = document.createElement('p')
        desc2.textContent = ctx.i18n.t('ch01.s02_text')
        desc2.className = 'fade-in'
        sv.panel.appendChild(desc2)

        const btn2 = document.createElement('button')
        btn2.className = 'scene-btn fade-in'
        btn2.textContent = ctx.i18n.t('ch01.s02_btn')
        btn2.addEventListener('click', () => ctx.bus.emit('scene:advance'))
        sv.panel.appendChild(btn2)
      })
      sv.panel.appendChild(btn)

      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // ─── Scene 2: BPE Merge Puzzle [Split-View + Direct Manipulation] ─────────
  {
    id: 'ch01-s02-bpe',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const { mergeSteps, initialTokens } = bpeData
      let tokens = [...initialTokens]
      let mergeIndex = 0
      let done = false

      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        if (done) {
          // Show final tokens in a flow layout
          c.font = 'bold 16px JetBrains Mono, monospace'
          c.textAlign = 'center'
          c.fillStyle = '#888'
          c.fillText('Final tokens:', w / 2, 40)

          c.font = '15px JetBrains Mono, monospace'
          let x = 30, y = 70
          tokens.forEach((tok, i) => {
            const col = tokenColor(i)
            const label = tok === ' ' ? '·' : tok
            const tw = c.measureText(label).width + 16
            if (x + tw > w - 20) { x = 30; y += 40 }
            c.fillStyle = col.bg
            c.fillRect(x, y, tw, 30)
            c.strokeStyle = col.border
            c.lineWidth = 1.5
            c.strokeRect(x, y, tw, 30)
            c.fillStyle = '#2D2D2D'
            c.textAlign = 'center'
            c.fillText(label, x + tw / 2, y + 20)
            c.textAlign = 'left'
            x += tw + 6
          })
        } else {
          // Compression counter
          c.font = 'bold 14px JetBrains Mono, monospace'
          c.fillStyle = '#4A90D9'
          c.textAlign = 'left'
          c.fillText(`${initialTokens.length} → ${tokens.length} tokens`, 20, 22)

          // Show current tokens; highlight the mergeable pair
          const step = mergeSteps[mergeIndex]
          const [pA, pB] = step ? step.pair : ['', '']

          c.font = '15px JetBrains Mono, monospace'
          let x = 20, y = 48

          tokens.forEach((tok, i) => {
            const isPairA = step && i < tokens.length - 1 && tokens[i] === pA && tokens[i + 1] === pB
            const isPairB = step && i > 0 && tokens[i - 1] === pA && tokens[i] === pB
            const isGlow = isPairA || isPairB

            const label = tok === ' ' ? '·' : tok
            const tw = c.measureText(label).width + 14
            if (x + tw > w - 20) { x = 20; y += 38 }

            if (isGlow) {
              // Pulsing glow effect
              const t = Date.now() / 600
              const glow = 0.5 + Math.sin(t) * 0.3
              c.fillStyle = `rgba(74, 144, 217, ${glow * 0.3})`
              c.fillRect(x - 3, y - 3, tw + 6, 34)
              c.strokeStyle = '#4A90D9'
              c.lineWidth = 2.5
            } else {
              const col = tokenColor(i)
              c.fillStyle = col.bg
              c.strokeStyle = col.border
              c.lineWidth = 1
            }

            c.fillRect(x, y, tw, 28)
            c.strokeRect(x, y, tw, 28)
            c.fillStyle = '#2D2D2D'
            c.textAlign = 'center'
            c.fillText(label, x + tw / 2, y + 19)
            c.textAlign = 'left'
            x += tw + 4
          })
        }

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // Right panel
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch01.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch01.s03_text')
      sv.panel.appendChild(desc)

      const counter = document.createElement('div')
      counter.className = 'score-badge'
      counter.style.marginBottom = '12px'
      sv.panel.appendChild(counter)

      const statusEl = document.createElement('p')
      statusEl.style.cssText = 'font-size: 16px; color: var(--text-muted); min-height: 40px;'
      sv.panel.appendChild(statusEl)

      const mergeBtn = document.createElement('button')
      mergeBtn.className = 'scene-btn glow-pulse'
      mergeBtn.textContent = 'Merge! →'
      sv.panel.appendChild(mergeBtn)

      function updatePanel() {
        const tpl = ctx.i18n.t('ch01.s03_merge_counter')
        counter.textContent = tpl
          .replace('{{current}}', mergeIndex)
          .replace('{{total}}', mergeSteps.length)

        if (!done && mergeIndex < mergeSteps.length) {
          const step = mergeSteps[mergeIndex]
          statusEl.textContent = `"${step.pair[0]}" + "${step.pair[1]}" → "${step.result}" (×${step.count})`
          mergeBtn.style.display = ''
        } else {
          statusEl.textContent = ''
          mergeBtn.style.display = 'none'
        }
      }

      mergeBtn.addEventListener('click', () => {
        if (done || mergeIndex >= mergeSteps.length) return
        const step = mergeSteps[mergeIndex]
        const [pA, pB] = step.pair
        const newTokens = []
        let i = 0
        while (i < tokens.length) {
          if (i < tokens.length - 1 && tokens[i] === pA && tokens[i + 1] === pB) {
            newTokens.push(step.result)
            i += 2
          } else {
            newTokens.push(tokens[i])
            i++
          }
        }
        tokens = newTokens
        mergeIndex++

        if (mergeIndex >= mergeSteps.length) {
          done = true
          const completeTpl = ctx.i18n.t('ch01.s03_complete')
          const msg = document.createElement('p')
          msg.className = 'fade-in'
          msg.textContent = completeTpl
            .replace('{{charCount}}', initialTokens.length)
            .replace('{{tokenCount}}', tokens.length)
          sv.panel.appendChild(msg)

          const advBtn = document.createElement('button')
          advBtn.className = 'scene-btn fade-in'
          advBtn.textContent = ctx.i18n.t('ch01.s03_btn')
          advBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
          sv.panel.appendChild(advBtn)
        }
        updatePanel()
      })

      updatePanel()
      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // ─── Scene 3: Surprising Tokens [Split-View + Prediction Game] ────────────
  {
    id: 'ch01-s03-surprising',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let currentWord = null
      let currentTokens = []
      let animFrame = null

      function drawTokenBoundaries() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        if (currentWord && currentTokens.length > 0) {
          // Label
          c.font = '14px JetBrains Mono, monospace'
          c.fillStyle = '#888'
          c.textAlign = 'center'
          c.fillText('Token boundaries:', w / 2, h * 0.3)

          // Draw each token as a colored segment
          c.font = 'bold 28px JetBrains Mono, monospace'
          let totalW = 0
          currentTokens.forEach(t => { totalW += c.measureText(t).width + 20 })
          let x = (w - totalW) / 2
          const y = h * 0.5

          currentTokens.forEach((tok, i) => {
            const col = tokenColor(i)
            const tw = c.measureText(tok).width + 20
            c.fillStyle = col.bg
            c.fillRect(x, y - 24, tw, 48)
            c.strokeStyle = col.border
            c.lineWidth = 2
            c.strokeRect(x, y - 24, tw, 48)
            c.fillStyle = '#2D2D2D'
            c.textAlign = 'center'
            c.fillText(tok, x + tw / 2, y + 8)
            c.textAlign = 'left'
            x += tw + 4
          })
        } else {
          // Empty state — question mark placeholder
          c.font = 'bold 72px sans-serif'
          c.fillStyle = 'rgba(74,144,217,0.15)'
          c.textAlign = 'center'
          c.textBaseline = 'middle'
          c.fillText('?', w / 2, h / 2)
          c.textBaseline = 'alphabetic'
        }

        c.restore()
        animFrame = requestAnimationFrame(drawTokenBoundaries)
      }

      // Build prediction game rounds from surprising examples
      const rounds = bpeData.surprisingExamples.map(ex => ({
        prompt: `"${ex.text}" — How many tokens?`,
        choices: ['1', '2', '3', '4+'],
        correct: ex.tokens.length >= 4 ? 3 : ex.tokens.length - 1,
        explanation: ex.note,
        _word: ex.text,
        _tokens: ex.tokens
      }))

      let roundIdx = 0

      // Right panel — title + description above the prediction game
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch01.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch01.s04_text')
      desc.style.marginBottom = '20px'
      sv.panel.appendChild(desc)

      const game = createPredictionGame(sv.panel, {
        rounds,
        i18n: ctx.i18n,
        onComplete: (score, total) => {
          const msg = document.createElement('p')
          msg.className = 'fade-in'
          msg.textContent = `${score}/${total} correct!`
          sv.panel.appendChild(msg)

          const advBtn = document.createElement('button')
          advBtn.className = 'scene-btn fade-in'
          advBtn.textContent = ctx.i18n.t('ch01.s04_btn_done')
          advBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
          sv.panel.appendChild(advBtn)
        }
      })

      // Observe DOM to detect when an answer is revealed, then update the canvas
      const observer = new MutationObserver(() => {
        const correctCard = sv.panel.querySelector('.choice-card.correct')
        if (correctCard) {
          const roundData = rounds[roundIdx]
          if (roundData) {
            currentWord = roundData._word
            currentTokens = roundData._tokens
          }
          // When the next-round button is clicked, clear canvas and advance roundIdx
          const nextBtns = sv.panel.querySelectorAll('.scene-btn')
          nextBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              roundIdx++
              currentWord = null
              currentTokens = []
            }, { once: true })
          })
        }
      })
      observer.observe(sv.panel, { childList: true, subtree: true, attributes: true })

      drawTokenBoundaries()

      return { sv, game, observer, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.observer?.disconnect()
      rv?.game?.destroy()
      rv?.sv?.destroy()
    }
  },

  // ─── Scene 4: Wrap-up [Narrative] ─────────────────────────────────────────
  {
    id: 'ch01-s04-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch01.s05_text')
      await new Promise(r => setTimeout(r, 1000))
      await ctx.narrator.ask('ch01.s05_text2', [
        { key: 'ch01.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch01-tokenization') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
