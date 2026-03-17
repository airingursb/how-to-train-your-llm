import { createSplitView } from '../../helpers/split-view.js'
import completionsData from './data/completions.json'

function findCompletion(prompt) {
  const lower = prompt.toLowerCase().trim()
  const match = completionsData.completions.find(c =>
    lower.startsWith(c.prompt.toLowerCase().substring(0, 10))
  )
  return match || { prompt, output: completionsData.fallback.output }
}

// Helpers
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function generateCandidates(chosen) {
  // Generate 4 fake candidates with the real one being most probable
  const fakes = ['the', 'a', 'and', 'to', 'in', 'of', 'is', 'it', 'was', 'for']
    .filter(w => w !== chosen.toLowerCase())
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  const chosenProb = 0.3 + Math.random() * 0.4
  const remaining = 1 - chosenProb
  const bars = [
    { label: chosen, prob: chosenProb, chosen: true, currentWidth: 0 },
    ...fakes.map((f, i) => ({
      label: f,
      prob: remaining * (0.5 - i * 0.12),
      chosen: false,
      currentWidth: 0
    }))
  ]
  return bars.sort((a, b) => b.prob - a.prob)
}

export default [
  // Scene 1: Live Generation [Split-View]
  {
    id: 'ch00-s01-generate',
    type: 'interactive',
    async enter(ctx) {
      const { i18n, bus } = ctx
      const app = document.getElementById('app')
      const sv = createSplitView(app)

      // --- Canvas animation state ---
      const tokens = []
      let candidateBars = []
      let cursorVisible = true
      let animating = false
      let animFrame = null

      // Cursor blink
      const cursorInterval = setInterval(() => { cursorVisible = !cursorVisible }, 500)

      function drawCanvas() {
        const { ctx: c, canvas } = sv
        const dpr = devicePixelRatio
        const w = canvas.width / dpr
        const h = canvas.height / dpr

        c.save()
        c.scale(dpr, dpr)
        c.clearRect(0, 0, w, h)

        // Draw generated tokens
        c.font = '24px JetBrains Mono, monospace'
        c.fillStyle = '#2D2D2D'
        const startX = 40
        const startY = h * 0.3
        const maxWidth = w - 80
        let x = startX
        let y = startY
        const lineHeight = 36

        tokens.forEach((token) => {
          const metrics = c.measureText(token.text)
          if (x + metrics.width > startX + maxWidth) {
            x = startX
            y += lineHeight
          }

          // Token glow for recently added
          if (token.age < 30) {
            const alpha = (30 - token.age) / 30 * 0.3
            c.fillStyle = `rgba(74, 144, 217, ${alpha})`
            c.fillRect(x - 2, y - 22, metrics.width + 4, 30)
          }

          c.fillStyle = '#2D2D2D'
          c.fillText(token.text, x, y)
          x += metrics.width
          token.age++
        })

        // Blinking cursor
        if (cursorVisible && tokens.length > 0) {
          c.fillStyle = '#4A90D9'
          c.fillRect(x + 2, y - 20, 3, 28)
        }

        // Candidate probability bars
        if (candidateBars.length > 0) {
          const barY = h * 0.65
          const barMaxW = w * 0.5
          c.font = '14px JetBrains Mono, monospace'

          candidateBars.forEach((bar, i) => {
            const by = barY + i * 36

            // Label
            c.fillStyle = '#888'
            c.textAlign = 'right'
            c.fillText(bar.label, startX + 100, by + 16)

            // Bar background
            c.fillStyle = 'rgba(0,0,0,0.06)'
            c.fillRect(startX + 110, by + 4, barMaxW, 18)

            // Bar fill (animate)
            const displayWidth = bar.currentWidth
            c.fillStyle = bar.chosen ? '#4A90D9' : 'rgba(74, 144, 217, 0.3)'
            c.fillRect(startX + 110, by + 4, displayWidth * barMaxW, 18)

            // Probability text
            c.fillStyle = '#666'
            c.textAlign = 'left'
            c.fillText((bar.prob * 100).toFixed(0) + '%', startX + 115 + displayWidth * barMaxW, by + 16)
          })
          c.textAlign = 'left'
        }

        c.restore()
        animFrame = requestAnimationFrame(drawCanvas)
      }

      // --- Panel UI ---
      const title = document.createElement('h2')
      title.textContent = i18n.t('ch00.title')
      sv.panel.appendChild(title)

      const desc = document.createElement('p')
      desc.textContent = i18n.t('ch00.s01_text')
      sv.panel.appendChild(desc)

      const inputLabel = document.createElement('p')
      inputLabel.textContent = i18n.t('ch00.s02_prompt_label')
      inputLabel.style.cssText = 'font-size: 17px; margin-bottom: 8px; color: var(--text-muted);'
      sv.panel.appendChild(inputLabel)

      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = i18n.t('ch00.s02_prompt_placeholder')
      input.style.cssText = `
        font-family: var(--font-mono); font-size: 16px; padding: 10px 16px;
        width: 100%; border: 2.5px solid var(--text); border-radius: 10px;
        background: var(--bg); color: var(--text); outline: none; margin-bottom: 12px;
        box-sizing: border-box;
      `
      sv.panel.appendChild(input)

      const btn = document.createElement('button')
      btn.className = 'scene-btn'
      btn.textContent = i18n.t('ch00.s02_generate')
      sv.panel.appendChild(btn)

      // Generate logic
      async function generate() {
        if (animating) return
        animating = true
        btn.disabled = true
        btn.textContent = i18n.t('ch00.s02_generating')
        tokens.length = 0
        candidateBars = []

        const prompt = input.value.trim() || 'Once upon a time'
        const completion = findCompletion(prompt)

        // Show prompt tokens first
        prompt.split(' ').forEach(word => {
          tokens.push({ text: word + ' ', age: 100 })
        })

        // Simulate token-by-token generation
        const words = completion.output.split(' ')
        for (let i = 0; i < words.length; i++) {
          // Show candidate bars briefly
          const chosen = words[i]
          candidateBars = generateCandidates(chosen)

          // Animate bars filling
          for (let f = 0; f < 12; f++) {
            candidateBars.forEach(b => {
              b.currentWidth = Math.min(b.prob, b.currentWidth + b.prob / 12)
            })
            await sleep(30)
          }

          await sleep(80)

          // Add token
          tokens.push({ text: (i > 0 ? ' ' : '') + chosen, age: 0 })
          candidateBars = []
          await sleep(60)
        }

        // Done — show advance button
        btn.textContent = i18n.t('ch00.s04_btn')
        btn.disabled = false
        btn.onclick = () => bus.emit('scene:advance')
        animating = false
      }

      btn.addEventListener('click', generate)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generate()
      })

      // Start canvas rendering
      drawCanvas()
      input.focus()

      return { sv, cursorInterval, animFrame: () => animFrame }
    },
    exit(returnVal) {
      if (returnVal?.cursorInterval) clearInterval(returnVal.cursorInterval)
      const frame = returnVal?.animFrame?.()
      if (frame) cancelAnimationFrame(frame)
      returnVal?.sv?.destroy()
    }
  },

  // Scene 2: The Reveal [Narrative]
  {
    id: 'ch00-s02-reveal',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch00.s03_text')
      await sleep(1500)
      await ctx.narrator.say('ch00.s04_text')
      await sleep(800)
      await ctx.narrator.ask('ch00.s04_text2', [
        { key: 'ch00.s04_btn', action: () => ctx.bus.emit('chapter:complete', 'ch00-magic-trick') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
