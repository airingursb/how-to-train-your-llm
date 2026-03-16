import attentionData from './data/attention-data.json'

function injectAttentionStyle() {
  if (document.getElementById('ch03-attention-style')) return
  const style = document.createElement('style')
  style.id = 'ch03-attention-style'
  style.textContent = `
    @keyframes ch03-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(74,144,217,0.7); }
      70%  { box-shadow: 0 0 0 10px rgba(74,144,217,0); }
      100% { box-shadow: 0 0 0 0 rgba(74,144,217,0); }
    }
    .ch03-query-token {
      animation: ch03-pulse 1.4s infinite;
    }
    .ch03-token-box {
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .ch03-token-box:not(.ch03-query-token):not(.ch03-disabled):hover {
      transform: scale(1.07);
    }
    .ch03-tab-btn {
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
  `
  document.head.appendChild(style)
}

export default [
  // ─── Scene 1: Narrative hook ──────────────────────────────────────────────
  {
    id: 'ch03-s01-hook',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch03.s01_text')
      await ctx.narrator.say('ch03.s01_text2')
      await ctx.narrator.ask('ch03.s01_text2', [
        { key: 'ch03.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 2: Q/K/V intuition ─────────────────────────────────────────────
  {
    id: 'ch03-s02-qkv',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch03.s02_text')
      await ctx.narrator.say('ch03.s02_text2')
      await ctx.narrator.ask('ch03.s02_text2', [
        { key: 'ch03.s02_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 3: Play as an attention head ───────────────────────────────────
  {
    id: 'ch03-s03-attention-head',
    type: 'interactive',
    async enter(ctx) {
      injectAttentionStyle()

      const sentences = attentionData.sentences
      let roundIndex = 0
      let phase = 'select' // 'select' | 'result'
      let playerSelected = []

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 92%; max-width: 780px;
      `

      // Round counter
      const roundLabel = document.createElement('div')
      roundLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 16px; color: var(--accent);
        margin-bottom: 16px; opacity: 0.85;
      `

      // Instruction text
      const instruction = document.createElement('div')
      instruction.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        margin-bottom: 24px; line-height: 1.5;
      `

      // Token row container
      const tokenRow = document.createElement('div')
      tokenRow.style.cssText = `
        display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
        margin-bottom: 28px; padding: 20px;
        background: rgba(45,45,45,0.04); border-radius: 16px;
      `

      // Explanation area
      const explanationBox = document.createElement('div')
      explanationBox.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--text);
        background: rgba(74,144,217,0.08); border-radius: 12px;
        padding: 16px 20px; margin-bottom: 20px;
        line-height: 1.6; min-height: 0; display: none;
      `

      // Score message
      const scoreMsg = document.createElement('div')
      scoreMsg.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--accent);
        margin-bottom: 16px; min-height: 0; display: none;
      `

      // Action button (Check / Next)
      const actionBtn = document.createElement('button')
      actionBtn.className = 'narrator-btn'

      wrapper.appendChild(roundLabel)
      wrapper.appendChild(instruction)
      wrapper.appendChild(tokenRow)
      wrapper.appendChild(explanationBox)
      wrapper.appendChild(scoreMsg)
      wrapper.appendChild(actionBtn)

      document.getElementById('app').appendChild(wrapper)

      function renderRound() {
        const sentence = sentences[roundIndex]
        phase = 'select'
        playerSelected = new Array(sentence.tokens.length).fill(0)

        // Round label
        const roundTpl = ctx.i18n.t('ch03.s03_round')
        roundLabel.textContent = roundTpl
          .replace('{{current}}', roundIndex + 1)
          .replace('{{total}}', sentences.length)

        // Instruction
        const instrTpl = ctx.i18n.t('ch03.s03_instruction')
        instruction.textContent = instrTpl.replace('{{word}}', sentence.queryWord)

        // Hide feedback
        explanationBox.style.display = 'none'
        scoreMsg.style.display = 'none'

        // Button
        actionBtn.textContent = ctx.i18n.t('ch03.s03_check')

        // Build token boxes
        tokenRow.innerHTML = ''
        sentence.tokens.forEach((token, i) => {
          const isQuery = i === sentence.queryToken

          const box = document.createElement('div')
          box.className = 'ch03-token-box' + (isQuery ? ' ch03-query-token' : '')
          box.style.cssText = `
            min-width: 60px; padding: 8px 12px;
            font-family: var(--font-mono); font-size: 16px;
            border-radius: 8px; text-align: center;
            user-select: none;
            color: var(--text);
            ${isQuery
              ? 'border: 3px solid #4A90D9; background: rgba(74,144,217,0.15); cursor: default;'
              : 'border: 2px solid var(--text); background: transparent; cursor: pointer;'
            }
          `
          box.textContent = token

          if (!isQuery) {
            box.addEventListener('click', () => {
              if (phase !== 'select') return
              playerSelected[i] = playerSelected[i] ? 0 : 1
              if (playerSelected[i]) {
                box.style.background = 'rgba(74,144,217,0.3)'
                box.style.borderColor = '#4A90D9'
                box.style.border = '2px solid #4A90D9'
              } else {
                box.style.background = 'transparent'
                box.style.borderColor = 'var(--text)'
                box.style.border = '2px solid var(--text)'
              }
            })
          }

          tokenRow.appendChild(box)
        })
      }

      function showResult() {
        phase = 'result'
        const sentence = sentences[roundIndex]
        const correct = sentence.correctAttention
        const boxes = tokenRow.querySelectorAll('.ch03-token-box')

        let matches = 0
        let totalCorrect = correct.filter(v => v === 1).length

        boxes.forEach((box, i) => {
          if (i === sentence.queryToken) return // skip query token itself

          const wasSelected = playerSelected[i] === 1
          const shouldSelect = correct[i] === 1

          box.style.cursor = 'default'
          box.classList.add('ch03-disabled')

          if (wasSelected && shouldSelect) {
            // Correct match
            box.style.background = 'rgba(91,165,91,0.3)'
            box.style.border = '2px solid green'
            matches++
          } else if (!wasSelected && shouldSelect) {
            // Missed
            box.style.background = 'rgba(200,140,60,0.3)'
            box.style.border = '2px solid orange'
          } else if (wasSelected && !shouldSelect) {
            // Wrong guess
            box.style.background = 'rgba(200,60,60,0.2)'
            box.style.border = '2px solid red'
          }
        })

        // Score message
        scoreMsg.style.display = 'block'
        scoreMsg.textContent = matches === totalCorrect
          ? ctx.i18n.t('ch03.s03_score_perfect')
          : ctx.i18n.t('ch03.s03_score_partial')

        // Explanation
        explanationBox.style.display = 'block'
        explanationBox.textContent = sentence.explanation

        // Next button
        const isLast = roundIndex === sentences.length - 1
        actionBtn.textContent = ctx.i18n.t(isLast ? 'ch03.s04_btn' : 'ch03.s03_next')
      }

      actionBtn.addEventListener('click', () => {
        if (phase === 'select') {
          showResult()
        } else {
          // advance round or scene
          if (roundIndex < sentences.length - 1) {
            roundIndex++
            renderRound()
          } else {
            ctx.bus.emit('scene:advance')
          }
        }
      })

      renderRound()
      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 4: The BUT reversal ────────────────────────────────────────────
  {
    id: 'ch03-s04-but',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch03.s04_text')
      await ctx.narrator.say('ch03.s04_text2')
      await ctx.narrator.ask('ch03.s04_text2', [
        { key: 'ch03.s04_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 5: Multi-head attention visualization ──────────────────────────
  {
    id: 'ch03-s05-multihead',
    type: 'interactive',
    async enter(ctx) {
      injectAttentionStyle()

      const { sentence, heads } = attentionData.multiHeadDemo
      let activeHead = 0

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 92%; max-width: 800px;
      `

      // Instruction
      const instruction = document.createElement('div')
      instruction.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        margin-bottom: 24px; line-height: 1.5;
      `
      instruction.textContent = ctx.i18n.t('ch03.s05_instruction')
      wrapper.appendChild(instruction)

      // Token row (reference, non-interactive)
      const tokenRowContainer = document.createElement('div')
      tokenRowContainer.style.cssText = `
        position: relative; margin-bottom: 0;
      `

      // SVG overlay for arcs (above tokens)
      const svgHeight = 80
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.style.cssText = `
        position: absolute; bottom: 0; left: 0; width: 100%; height: ${svgHeight}px;
        pointer-events: none; overflow: visible;
      `
      tokenRowContainer.appendChild(svg)

      const tokenRow = document.createElement('div')
      tokenRow.style.cssText = `
        display: flex; flex-wrap: nowrap; gap: 8px; justify-content: center;
        padding: 14px 20px; position: relative; z-index: 1;
        background: rgba(45,45,45,0.04); border-radius: 16px;
        margin-top: ${svgHeight}px;
      `

      const tokenBoxes = []
      sentence.forEach((token, i) => {
        const box = document.createElement('div')
        box.className = 'ch03-token-box'
        box.style.cssText = `
          min-width: 60px; padding: 8px 12px;
          font-family: var(--font-mono); font-size: 15px;
          border-radius: 8px; text-align: center;
          border: 2px solid var(--text); background: transparent;
          color: var(--text); cursor: default; white-space: nowrap;
        `
        box.textContent = token
        tokenRow.appendChild(box)
        tokenBoxes.push(box)
      })

      tokenRowContainer.appendChild(tokenRow)
      wrapper.appendChild(tokenRowContainer)

      // Head description
      const headDesc = document.createElement('div')
      headDesc.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--text);
        opacity: 0.8; margin: 16px 0; min-height: 28px; line-height: 1.5;
      `
      wrapper.appendChild(headDesc)

      // Tab buttons for heads
      const tabRow = document.createElement('div')
      tabRow.style.cssText = `
        display: flex; gap: 10px; justify-content: center; margin: 16px 0 24px;
        flex-wrap: wrap;
      `

      const tabBtns = heads.map((head, hi) => {
        const btn = document.createElement('button')
        btn.className = 'ch03-tab-btn'

        const nameTpl = ctx.i18n.t('ch03.s05_head_name')
        btn.textContent = nameTpl
          .replace('{{n}}', hi + 1)
          .replace('{{name}}', head.name)

        btn.style.cssText = `
          font-family: var(--font-hand); font-size: 16px;
          padding: 8px 20px; border-radius: 20px; cursor: pointer;
          border: 2px solid ${hi === 0 ? '#4A90D9' : 'var(--text)'};
          background: ${hi === 0 ? 'rgba(74,144,217,0.15)' : 'transparent'};
          color: var(--text);
        `
        btn.addEventListener('click', () => selectHead(hi))
        tabRow.appendChild(btn)
        return btn
      })

      wrapper.appendChild(tabRow)

      // Advance button
      const advBtn = document.createElement('button')
      advBtn.className = 'narrator-btn'
      advBtn.textContent = ctx.i18n.t('ch03.s05_btn')
      advBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))
      wrapper.appendChild(advBtn)

      document.getElementById('app').appendChild(wrapper)

      function getTokenCenter(index) {
        const box = tokenBoxes[index]
        const rowRect = tokenRow.getBoundingClientRect()
        const boxRect = box.getBoundingClientRect()
        return {
          x: boxRect.left - rowRect.left + boxRect.width / 2,
          y: 0 // baseline at top of tokenRow
        }
      }

      function drawArcs(headIndex) {
        svg.innerHTML = ''
        const head = heads[headIndex]

        // Reset token highlight
        tokenBoxes.forEach(b => {
          b.style.background = 'transparent'
          b.style.borderColor = 'var(--text)'
        })

        if (head.pattern === 'diagonal') {
          // Draw arcs between adjacent tokens
          for (let i = 0; i < sentence.length - 1; i++) {
            drawArc(i, i + 1, '#4A90D9', 0.5)
          }
          tokenBoxes.forEach(b => {
            b.style.background = 'rgba(74,144,217,0.1)'
            b.style.borderColor = '#4A90D9'
          })
        } else if (head.links) {
          head.links.forEach(([from, to]) => {
            drawArc(from, to, '#50B478', 0.65)
            tokenBoxes[from].style.background = 'rgba(80,180,120,0.15)'
            tokenBoxes[from].style.borderColor = '#50B478'
            tokenBoxes[to].style.background = 'rgba(80,180,120,0.15)'
            tokenBoxes[to].style.borderColor = '#50B478'
          })
        }
      }

      function drawArc(fromIdx, toIdx, color, opacity) {
        // Wait one frame so layout is settled
        requestAnimationFrame(() => {
          const rowRect = tokenRow.getBoundingClientRect()
          const containerRect = tokenRowContainer.getBoundingClientRect()

          const fromBox = tokenBoxes[fromIdx].getBoundingClientRect()
          const toBox = tokenBoxes[toIdx].getBoundingClientRect()

          const x1 = fromBox.left - containerRect.left + fromBox.width / 2
          const x2 = toBox.left - containerRect.left + toBox.width / 2
          const y = rowRect.top - containerRect.top // top of token row relative to container

          const mx = (x1 + x2) / 2
          const spread = Math.abs(x2 - x1)
          const arcHeight = Math.min(svgHeight - 10, spread * 0.45 + 20)
          const cy = y - arcHeight

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', `M ${x1} ${y} Q ${mx} ${cy} ${x2} ${y}`)
          path.setAttribute('stroke', color)
          path.setAttribute('stroke-width', '2.5')
          path.setAttribute('fill', 'none')
          path.setAttribute('opacity', String(opacity))
          path.setAttribute('stroke-linecap', 'round')
          svg.appendChild(path)

          // Arrow head at destination
          const angle = Math.atan2(y - cy, x2 - mx)
          const aw = 7
          const ah = 5
          const arr = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
          const ax = x2, ay = y
          arr.setAttribute('points', `
            ${ax},${ay}
            ${ax - aw * Math.cos(angle - 0.4)},${ay - aw * Math.sin(angle - 0.4)}
            ${ax - aw * Math.cos(angle + 0.4)},${ay - aw * Math.sin(angle + 0.4)}
          `)
          arr.setAttribute('fill', color)
          arr.setAttribute('opacity', String(opacity))
          svg.appendChild(arr)
        })
      }

      function selectHead(hi) {
        activeHead = hi
        tabBtns.forEach((btn, i) => {
          btn.style.borderColor = i === hi ? '#4A90D9' : 'var(--text)'
          btn.style.background = i === hi ? 'rgba(74,144,217,0.15)' : 'transparent'
        })
        headDesc.textContent = heads[hi].description
        svg.innerHTML = ''
        drawArcs(hi)
      }

      // Initial render
      selectHead(0)

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 6: Wrap-up ─────────────────────────────────────────────────────
  {
    id: 'ch03-s06-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch03.s06_text')
      await ctx.narrator.say('ch03.s06_text2')
      await ctx.narrator.ask('ch03.s06_text2', [
        { key: 'ch03.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch03-attention') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
