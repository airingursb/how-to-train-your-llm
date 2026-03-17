import { createSplitView } from '../../helpers/split-view.js'
import taskData from './data/annotation-tasks.json'

export default [
  // Scene 1: Annotation Lab
  {
    id: 'ch07-s01-annotate',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null

      const tasks = taskData.tasks
      let taskIdx = 0
      let rankings = [] // responses in user-ranked order (index 0 = Best)
      let revealed = false

      // Canvas: visual ranking tracker
      function draw() {
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        const task = tasks[taskIdx]

        // Instruction ticket
        c.fillStyle = 'rgba(74,144,217,0.1)'
        c.fillRect(20, 16, w - 40, 52)
        c.strokeStyle = '#4A90D9'
        c.lineWidth = 1.5
        c.strokeRect(20, 16, w - 40, 52)
        c.font = '13px JetBrains Mono, monospace'
        c.fillStyle = '#4A90D9'
        c.textAlign = 'center'
        c.fillText('📋 ' + task.instruction, w / 2, 48, w - 60)

        // Ranking slots
        const slotLabels = [
          ctx.i18n.t('ch07.s02_rank_best'),
          ctx.i18n.t('ch07.s02_rank_ok'),
          ctx.i18n.t('ch07.s02_rank_worst'),
        ]
        const slotColors = ['#5BA55B', '#E8913A', '#D4645C']

        slotLabels.forEach((label, i) => {
          const y = 90 + i * 72
          const slotH = 60

          // Slot background
          c.fillStyle = slotColors[i] + '18'
          c.fillRect(20, y, w - 40, slotH)
          c.strokeStyle = slotColors[i]
          c.lineWidth = revealed && rankings[i] ? 2.5 : 1
          c.strokeRect(20, y, w - 40, slotH)

          if (rankings[i]) {
            const resp = rankings[i]
            const preview = resp.text.substring(0, 55) + (resp.text.length > 55 ? '…' : '')
            c.font = '12px JetBrains Mono, monospace'
            c.fillStyle = '#2D2D2D'
            c.textAlign = 'left'
            c.fillText(preview, 30, y + 26, w - 70)

            if (revealed) {
              const icon = resp.quality === 'good' ? '✓' : resp.quality === 'ok' ? '⚠' : '✗'
              const iconColor = resp.quality === 'good' ? '#5BA55B' : resp.quality === 'ok' ? '#E8913A' : '#D4645C'
              c.font = 'bold 18px sans-serif'
              c.fillStyle = iconColor
              c.textAlign = 'right'
              c.fillText(icon, w - 28, y + 38)

              // Reason text
              c.font = '11px JetBrains Mono, monospace'
              c.fillStyle = iconColor
              c.textAlign = 'left'
              c.fillText(resp.reason, 30, y + 46, w - 70)
            }
          } else {
            // Empty slot label
            c.font = '15px Caveat, cursive'
            c.fillStyle = slotColors[i]
            c.textAlign = 'center'
            c.fillText((i + 1) + '. ' + label, w / 2, y + 36)
          }
        })

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // ── Panel ──────────────────────────────────────────────
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch07.title')
      sv.panel.appendChild(title)

      const roundLabel = document.createElement('div')
      roundLabel.className = 'score-badge'
      sv.panel.appendChild(roundLabel)

      const instrEl = document.createElement('p')
      instrEl.style.cssText = 'font-style: italic; color: var(--accent); margin: 8px 0;'
      sv.panel.appendChild(instrEl)

      const desc = document.createElement('p')
      desc.textContent = ctx.i18n.t('ch07.s02_rank_instruction')
      sv.panel.appendChild(desc)

      const cardsDiv = document.createElement('div')
      cardsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin: 12px 0;'
      sv.panel.appendChild(cardsDiv)

      const feedbackEl = document.createElement('p')
      feedbackEl.style.cssText = 'font-size: 15px; color: var(--text-muted); min-height: 40px; white-space: pre-wrap;'
      sv.panel.appendChild(feedbackEl)

      function renderTask() {
        revealed = false
        rankings = []

        // Remove any leftover next button
        const oldBtn = sv.panel.querySelector('.scene-btn')
        if (oldBtn) oldBtn.remove()

        const task = tasks[taskIdx]
        roundLabel.textContent = ctx.i18n.t('ch07.s02_round', {
          current: taskIdx + 1,
          total: tasks.length,
        })
        instrEl.textContent = ctx.i18n.t('ch07.s02_instruction_label') + ' ' + task.instruction
        feedbackEl.textContent = ''
        cardsDiv.innerHTML = ''

        // Shuffle responses for display
        const shuffled = [...task.responses].sort(() => Math.random() - 0.5)

        shuffled.forEach(resp => {
          const card = document.createElement('div')
          card.className = 'choice-card'
          card.style.cssText = 'text-align: left; font-size: 14px; white-space: pre-wrap; padding: 10px 14px; cursor: pointer;'
          card.textContent = resp.text

          card.addEventListener('click', () => {
            if (revealed || rankings.includes(resp)) return
            rankings.push(resp)

            const rankNum = rankings.length
            card.classList.add('selected')
            card.style.opacity = '0.55'

            const prefix = document.createElement('span')
            prefix.textContent = rankNum === 1 ? '#1 ' : rankNum === 2 ? '#2 ' : '#3 '
            prefix.style.cssText = 'font-weight: bold; color: var(--accent);'
            card.prepend(prefix)

            if (rankings.length === task.responses.length) {
              revealResults(task)
            }
          })

          cardsDiv.appendChild(card)
        })
      }

      function revealResults(task) {
        revealed = true

        // Check if user ranking matches expert order (good → ok → bad)
        const expertOrder = ['good', 'ok', 'bad']
        const userOrder = rankings.map(r => r.quality)
        const matched = JSON.stringify(userOrder) === JSON.stringify(expertOrder)

        let fb = matched ? ctx.i18n.t('ch07.s02_matched') : ctx.i18n.t('ch07.s02_different')
        rankings.forEach((r, i) => {
          const posLabel = i === 0 ? ctx.i18n.t('ch07.s02_rank_best')
            : i === 1 ? ctx.i18n.t('ch07.s02_rank_ok')
            : ctx.i18n.t('ch07.s02_rank_worst')
          fb += '\n' + posLabel + ': ' + r.reason
        })
        feedbackEl.textContent = fb
        feedbackEl.className = 'fade-in'

        const nextBtn = document.createElement('button')
        nextBtn.className = 'scene-btn fade-in'
        nextBtn.style.marginTop = '8px'

        if (taskIdx < tasks.length - 1) {
          nextBtn.textContent = ctx.i18n.t('ch07.s02_next')
          nextBtn.addEventListener('click', () => {
            taskIdx++
            nextBtn.remove()
            renderTask()
          })
        } else {
          nextBtn.textContent = ctx.i18n.t('ch07.s04_btn')
          nextBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
        }

        sv.panel.appendChild(nextBtn)
      }

      renderTask()
      draw()

      return { sv, getAnimFrame: () => animFrame }
    },
    exit(rv) {
      cancelAnimationFrame(rv?.getAnimFrame?.())
      rv?.sv?.destroy()
    }
  },

  // Scene 2: Disagreement
  {
    id: 'ch07-s02-disagree',
    type: 'interactive',
    async enter(ctx) {
      const sv = createSplitView(document.getElementById('app'))
      const { canvas, ctx: c } = sv
      const dpr = devicePixelRatio
      let animFrame = null
      let t = 0

      const { disagreement } = taskData
      const annotators = [
        { ...disagreement.annotator1, color: '#4A90D9' },
        { ...disagreement.annotator2, color: '#5BA55B' },
        { ...disagreement.annotator3, color: '#E8913A' },
      ]

      function wrapText(text, maxW) {
        const words = text.split(' ')
        const lines = []
        let line = ''
        words.forEach(word => {
          const test = line + word + ' '
          if (test.length * 6.2 > maxW) {
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

        // Question at top
        c.font = 'bold 13px JetBrains Mono, monospace'
        c.fillStyle = '#888'
        c.textAlign = 'center'
        c.fillText('"' + disagreement.instruction + '"', w / 2, 28, w - 20)

        // 3 annotator cards side by side
        const cardGap = 10
        const cardW = (w - 30 - cardGap * 2) / 3
        const cardY = 46
        const cardH = h - cardY - 16

        annotators.forEach((ann, i) => {
          const cardX = 15 + i * (cardW + cardGap)

          // Pulsing border
          const pulse = 0.45 + Math.sin(t * 0.025 + i * 2.1) * 0.35
          const alpha = Math.floor(pulse * 255).toString(16).padStart(2, '0')

          c.fillStyle = ann.color + '12'
          c.fillRect(cardX, cardY, cardW, cardH)

          c.strokeStyle = ann.color + alpha
          c.lineWidth = 3
          c.strokeRect(cardX, cardY, cardW, cardH)

          // Avatar circle
          const cx = cardX + cardW / 2
          const avatarY = cardY + 28
          c.fillStyle = ann.color
          c.beginPath()
          c.arc(cx, avatarY, 18, 0, Math.PI * 2)
          c.fill()

          c.font = 'bold 15px sans-serif'
          c.fillStyle = '#fff'
          c.textAlign = 'center'
          c.fillText(ann.name[0], cx, avatarY + 6)

          // Name
          c.font = 'bold 14px Caveat, cursive'
          c.fillStyle = ann.color
          c.fillText(ann.name, cx, avatarY + 42)

          // Pick text
          c.font = '10px JetBrains Mono, monospace'
          c.fillStyle = '#555'
          const lines = wrapText(ann.pick, cardW - 14)
          lines.slice(0, 6).forEach((line, li) => {
            c.fillText(line, cx, avatarY + 62 + li * 15, cardW - 14)
          })

          // Reasoning tag at bottom
          c.font = 'italic 10px JetBrains Mono, monospace'
          c.fillStyle = ann.color
          c.fillText(ann.reasoning, cx, cardY + cardH - 12, cardW - 14)
        })

        c.restore()
        animFrame = requestAnimationFrame(draw)
      }

      // ── Panel ──────────────────────────────────────────────
      const title = document.createElement('h2')
      title.textContent = ctx.i18n.t('ch07.title')
      sv.panel.appendChild(title)

      const q = document.createElement('p')
      q.textContent = ctx.i18n.t('ch07.s04_text')
      sv.panel.appendChild(q)

      const q2 = document.createElement('p')
      q2.textContent = ctx.i18n.t('ch07.s04_question')
      q2.style.cssText = 'font-weight: bold; color: var(--accent);'
      sv.panel.appendChild(q2)

      const answer = document.createElement('p')
      answer.textContent = "Who's right? Nobody — that's the point. Annotators bring their own values and perspectives. SFT can only teach the model to mimic examples. It can't resolve genuine disagreements about what 'good' means."
      answer.style.cssText = 'font-size: 14px; color: var(--text-muted); margin-top: 8px;'
      sv.panel.appendChild(answer)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = ctx.i18n.t('ch07.s04_btn')
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

  // Scene 3: Wrap-up
  {
    id: 'ch07-s03-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch07.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch07.s05_text2')
      await ctx.narrator.ask('ch07.s05_text2', [
        { key: 'ch07.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch07-sft-process') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },
]
