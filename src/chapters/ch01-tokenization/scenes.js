import bpeData from './data/bpe-demo.json'

// Token color palette — cycles through these for variety
const TOKEN_COLORS = [
  { bg: 'rgba(74,144,217,0.15)', border: '#4A90D9' },
  { bg: 'rgba(80,180,120,0.15)', border: '#50B478' },
  { bg: 'rgba(220,100,80,0.15)', border: '#DC6450' },
  { bg: 'rgba(160,100,220,0.15)', border: '#A064DC' },
  { bg: 'rgba(220,160,50,0.15)', border: '#DCA032' },
]

function tokenColor(index) {
  return TOKEN_COLORS[index % TOKEN_COLORS.length]
}

function injectPulseStyle() {
  if (document.getElementById('ch01-pulse-style')) return
  const style = document.createElement('style')
  style.id = 'ch01-pulse-style'
  style.textContent = `
    @keyframes ch01-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(74,144,217,0.6); }
      70%  { box-shadow: 0 0 0 8px rgba(74,144,217,0); }
      100% { box-shadow: 0 0 0 0 rgba(74,144,217,0); }
    }
    .ch01-token-highlight {
      animation: ch01-pulse 1.2s infinite;
      cursor: pointer;
    }
    .ch01-token-highlight:hover {
      transform: scale(1.08);
      transition: transform 0.1s;
    }
  `
  document.head.appendChild(style)
}

export default [
  // ─── Scene 1: Narrative hook ──────────────────────────────────────────────
  {
    id: 'ch01-s01-hook',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch01.s01_text')
      await ctx.narrator.ask('ch01.s01_text', [
        { key: 'ch01.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 2: Character-level view ───────────────────────────────────────
  {
    id: 'ch01-s02-chars',
    type: 'interactive',
    async enter(ctx) {
      injectPulseStyle()

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 90%; max-width: 700px;
      `

      // Narrator text above the demo
      const narText = document.createElement('div')
      narText.textContent = ctx.i18n.t('ch01.s02_text')
      narText.style.cssText = `
        font-family: var(--font-hand); font-size: 22px; color: var(--text);
        margin-bottom: 32px; line-height: 1.5;
      `
      wrapper.appendChild(narText)

      const word = 'the cat'
      const chars = word.split('')
      const charCodes = chars.map(c => c.charCodeAt(0))

      // Character boxes row
      const charRow = document.createElement('div')
      charRow.style.cssText = `display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;`

      chars.forEach((ch, i) => {
        const col = tokenColor(i)
        const box = document.createElement('div')
        box.style.cssText = `
          background: ${col.bg}; border: 2px solid ${col.border};
          border-radius: 8px; padding: 8px 12px;
          font-family: var(--font-mono); font-size: 20px; color: var(--text);
          min-width: 36px; text-align: center;
        `
        box.textContent = ch === ' ' ? '␣' : ch
        charRow.appendChild(box)
      })
      wrapper.appendChild(charRow)

      // Arrow
      const arrow = document.createElement('div')
      arrow.textContent = '↓'
      arrow.style.cssText = `font-size: 28px; color: var(--accent); margin: 8px 0;`
      wrapper.appendChild(arrow)

      // Number boxes row
      const numRow = document.createElement('div')
      numRow.style.cssText = `display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px;`

      charCodes.forEach((code, i) => {
        const col = tokenColor(i)
        const box = document.createElement('div')
        box.style.cssText = `
          background: ${col.bg}; border: 2px solid ${col.border};
          border-radius: 8px; padding: 8px 12px;
          font-family: var(--font-mono); font-size: 18px; color: var(--text);
          min-width: 36px; text-align: center;
        `
        box.textContent = code
        numRow.appendChild(box)
      })
      wrapper.appendChild(numRow)

      // Advance button
      const btn = document.createElement('button')
      btn.textContent = ctx.i18n.t('ch01.s02_btn')
      btn.className = 'narrator-btn'
      btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      wrapper.appendChild(btn)

      document.getElementById('app').appendChild(wrapper)
      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 3: BPE puzzle ──────────────────────────────────────────────────
  {
    id: 'ch01-s03-bpe',
    type: 'interactive',
    async enter(ctx) {
      injectPulseStyle()

      const { mergeSteps, initialTokens } = bpeData
      let tokens = [...initialTokens]
      let mergeIndex = 0
      let done = false

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%);
        z-index: 15; text-align: center; width: 92%; max-width: 750px;
      `

      // Narrator instruction
      const narText = document.createElement('div')
      narText.textContent = ctx.i18n.t('ch01.s03_text')
      narText.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        margin-bottom: 24px; line-height: 1.5;
      `
      wrapper.appendChild(narText)

      // Merge counter
      const counter = document.createElement('div')
      counter.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--accent);
        margin-bottom: 16px;
      `

      function updateCounter() {
        const tpl = ctx.i18n.t('ch01.s03_merge_counter')
        counter.textContent = tpl
          .replace('{{current}}', mergeIndex)
          .replace('{{total}}', mergeSteps.length)
      }
      updateCounter()
      wrapper.appendChild(counter)

      // Token display area
      const tokenArea = document.createElement('div')
      tokenArea.style.cssText = `
        display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
        padding: 20px; background: rgba(45,45,45,0.04);
        border-radius: 16px; margin-bottom: 24px; min-height: 80px;
      `
      wrapper.appendChild(tokenArea)

      // Status line (shows "click the highlighted pair")
      const statusLine = document.createElement('div')
      statusLine.style.cssText = `
        font-family: var(--font-hand); font-size: 16px; color: var(--text);
        opacity: 0.7; min-height: 24px; margin-bottom: 12px;
      `
      wrapper.appendChild(statusLine)

      document.getElementById('app').appendChild(wrapper)

      function renderTokens() {
        tokenArea.innerHTML = ''

        if (done) return

        const step = mergeSteps[mergeIndex]
        if (!step) return

        const [pA, pB] = step.pair

        // Find all positions where pair appears consecutively
        const pairPositions = new Set()
        for (let i = 0; i < tokens.length - 1; i++) {
          if (tokens[i] === pA && tokens[i + 1] === pB) {
            pairPositions.add(i)
          }
        }

        statusLine.textContent = pairPositions.size > 0
          ? `Most common pair: "${pA}" + "${pB}" (appears ${step.count}×) — click to merge!`
          : ''

        tokens.forEach((tok, i) => {
          const isHighlightA = pairPositions.has(i)
          const isHighlightB = pairPositions.has(i - 1)
          const isHighlighted = isHighlightA || isHighlightB

          const col = isHighlighted
            ? { bg: 'rgba(74,144,217,0.25)', border: '#4A90D9' }
            : tokenColor(tok.length % TOKEN_COLORS.length)

          const box = document.createElement('div')
          box.style.cssText = `
            background: ${col.bg}; border: 2px solid ${col.border};
            border-radius: 8px; padding: 8px 12px;
            font-family: var(--font-mono); font-size: 16px; color: var(--text);
            min-width: 28px; text-align: center; user-select: none;
          `
          box.textContent = tok === ' ' ? '·' : tok

          if (isHighlighted) {
            box.classList.add('ch01-token-highlight')
            box.addEventListener('click', () => doMerge())
          }

          tokenArea.appendChild(box)
        })
      }

      function doMerge() {
        if (mergeIndex >= mergeSteps.length || done) return
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
        updateCounter()

        if (mergeIndex >= mergeSteps.length) {
          done = true
          tokenArea.innerHTML = ''
          statusLine.textContent = ''

          // Show completion message
          const completeTpl = ctx.i18n.t('ch01.s03_complete')
          const completeMsg = document.createElement('div')
          completeMsg.textContent = completeTpl
            .replace('{{charCount}}', initialTokens.length)
            .replace('{{tokenCount}}', tokens.length)
          completeMsg.style.cssText = `
            font-family: var(--font-hand); font-size: 20px; color: var(--text);
            line-height: 1.6; padding: 20px;
          `
          tokenArea.style.justifyContent = 'center'
          tokenArea.style.alignItems = 'center'
          tokenArea.appendChild(completeMsg)

          // Show final token list
          const finalRow = document.createElement('div')
          finalRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 16px;`
          tokens.forEach((tok, i) => {
            const col = tokenColor(i)
            const box = document.createElement('div')
            box.style.cssText = `
              background: ${col.bg}; border: 2px solid ${col.border};
              border-radius: 8px; padding: 8px 12px;
              font-family: var(--font-mono); font-size: 16px; color: var(--text);
              min-width: 28px; text-align: center;
            `
            box.textContent = tok === ' ' ? '·' : tok
            finalRow.appendChild(box)
          })
          tokenArea.appendChild(finalRow)

          // Advance button
          const btn = document.createElement('button')
          btn.textContent = ctx.i18n.t('ch01.s03_btn')
          btn.className = 'narrator-btn'
          btn.style.marginTop = '16px'
          btn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
          wrapper.appendChild(btn)
        } else {
          renderTokens()
        }
      }

      renderTokens()
      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 4: "BUT" reversal — surprising tokenization ───────────────────
  {
    id: 'ch01-s04-but',
    type: 'interactive',
    async enter(ctx) {
      injectPulseStyle()

      const { surprisingExamples } = bpeData
      let exampleIndex = 0

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 90%; max-width: 680px;
      `

      // Intro text
      const narText = document.createElement('div')
      narText.textContent = ctx.i18n.t('ch01.s04_text')
      narText.style.cssText = `
        font-family: var(--font-hand); font-size: 22px; color: var(--text);
        margin-bottom: 32px; line-height: 1.5;
      `
      wrapper.appendChild(narText)

      // Example card
      const card = document.createElement('div')
      card.style.cssText = `
        background: rgba(45,45,45,0.04); border-radius: 16px;
        padding: 28px 24px; margin-bottom: 24px;
      `
      wrapper.appendChild(card)

      // Navigation button
      const navBtn = document.createElement('button')
      navBtn.className = 'narrator-btn'
      wrapper.appendChild(navBtn)

      function renderExample() {
        card.innerHTML = ''
        const ex = surprisingExamples[exampleIndex]

        // Word label
        const wordLabel = document.createElement('div')
        wordLabel.textContent = `"${ex.text}"`
        wordLabel.style.cssText = `
          font-family: var(--font-mono); font-size: 26px; color: var(--text);
          margin-bottom: 16px; font-weight: bold;
        `
        card.appendChild(wordLabel)

        // Token boxes
        const tokenRow = document.createElement('div')
        tokenRow.style.cssText = `display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;`
        ex.tokens.forEach((tok, i) => {
          const col = tokenColor(i)
          const box = document.createElement('div')
          box.style.cssText = `
            background: ${col.bg}; border: 2px solid ${col.border};
            border-radius: 8px; padding: 8px 14px;
            font-family: var(--font-mono); font-size: 18px; color: var(--text);
          `
          box.textContent = tok
          tokenRow.appendChild(box)
        })
        card.appendChild(tokenRow)

        // Note
        const note = document.createElement('div')
        note.textContent = ex.note
        note.style.cssText = `
          font-family: var(--font-hand); font-size: 18px; color: var(--accent);
          line-height: 1.5;
        `
        card.appendChild(note)

        // Progress dots
        const dots = document.createElement('div')
        dots.style.cssText = `display: flex; gap: 6px; justify-content: center; margin-top: 20px;`
        surprisingExamples.forEach((_, di) => {
          const dot = document.createElement('div')
          dot.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%;
            background: ${di === exampleIndex ? 'var(--accent)' : 'rgba(45,45,45,0.2)'};
          `
          dots.appendChild(dot)
        })
        card.appendChild(dots)

        // Update button label
        const isLast = exampleIndex === surprisingExamples.length - 1
        navBtn.textContent = ctx.i18n.t(isLast ? 'ch01.s04_btn_done' : 'ch01.s04_btn_next')
      }

      navBtn.addEventListener('click', () => {
        if (exampleIndex < surprisingExamples.length - 1) {
          exampleIndex++
          renderExample()
        } else {
          ctx.bus.emit('scene:advance')
        }
      })

      renderExample()
      document.getElementById('app').appendChild(wrapper)
      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 5: Wrap-up ─────────────────────────────────────────────────────
  {
    id: 'ch01-s05-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch01.s05_text')
      await new Promise(r => setTimeout(r, 1000))
      await ctx.narrator.say('ch01.s05_text2')
      await ctx.narrator.ask('ch01.s05_text2', [
        { key: 'ch01.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch01-tokenization') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
