import comparisonsData from './data/model-comparisons.json'

export default [
  // Scene 1: Narrative — completion ≠ conversation
  {
    id: 'ch06-s01-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch06.s01_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch06.s01_text2')
      await ctx.narrator.ask('ch06.s01_text2', [
        { key: 'ch06.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Interactive — Place Your Bets (base vs SFT)
  {
    id: 'ch06-s02-compare',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const comparisons = comparisonsData.comparisons
      let currentIndex = 0
      let score = 0
      let answered = false

      const wrapper = document.createElement('div')
      wrapper.id = 'ch06-compare-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 860px;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      `

      // Round counter
      const roundLabel = document.createElement('div')
      roundLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--accent);
        letter-spacing: 0.05em;
      `

      // Instruction
      const instruction = document.createElement('div')
      instruction.textContent = i18n.t('ch06.s02_instruction')
      instruction.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        text-align: center;
      `

      // Prompt box
      const promptBox = document.createElement('div')
      promptBox.style.cssText = `
        width: 100%; padding: 16px 24px; border-radius: 12px;
        background: rgba(var(--accent-rgb, 255,140,0), 0.12);
        border: 2px solid var(--accent);
        font-family: var(--font-mono); font-size: 16px; color: var(--text);
        line-height: 1.5;
      `

      // Responses row
      const responsesRow = document.createElement('div')
      responsesRow.style.cssText = `
        display: flex; flex-direction: row; gap: 20px; width: 100%;
      `

      const makeCard = (label) => {
        const card = document.createElement('div')
        card.style.cssText = `
          flex: 1; max-width: 45%; padding: 20px; border-radius: 12px;
          border: 2.5px solid var(--text); cursor: pointer;
          font-family: var(--font-mono); font-size: 14px; line-height: 1.6;
          color: var(--text); background: var(--bg);
          transition: border-color 0.15s;
          display: flex; flex-direction: column; gap: 12px;
        `
        card.addEventListener('mouseenter', () => {
          if (!answered) card.style.borderColor = 'var(--accent)'
        })
        card.addEventListener('mouseleave', () => {
          if (!answered) card.style.borderColor = 'var(--text)'
        })

        const cardLabel = document.createElement('div')
        cardLabel.style.cssText = `
          font-family: var(--font-hand); font-size: 16px; color: var(--accent);
          font-weight: bold;
        `
        cardLabel.textContent = label

        const cardText = document.createElement('pre')
        cardText.style.cssText = `
          margin: 0; white-space: pre-wrap; word-break: break-word;
          font-family: inherit; font-size: inherit; line-height: inherit;
        `

        const revealLabel = document.createElement('div')
        revealLabel.style.cssText = `
          font-family: var(--font-hand); font-size: 14px;
          display: none; margin-top: 4px;
        `

        card.appendChild(cardLabel)
        card.appendChild(cardText)
        card.appendChild(revealLabel)

        return { card, cardText, revealLabel }
      }

      const cardA = makeCard(i18n.t('ch06.s02_response_a'))
      const cardB = makeCard(i18n.t('ch06.s02_response_b'))
      responsesRow.appendChild(cardA.card)
      responsesRow.appendChild(cardB.card)

      // Feedback area
      const feedback = document.createElement('div')
      feedback.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
        text-align: center; min-height: 28px;
      `

      // Explanation area
      const explanationBox = document.createElement('div')
      explanationBox.style.cssText = `
        width: 100%; padding: 14px 20px; border-radius: 10px;
        background: rgba(45,45,45,0.06);
        font-family: var(--font-hand); font-size: 15px; line-height: 1.6;
        color: var(--text); display: none;
      `

      // Next button
      const nextBtn = document.createElement('button')
      nextBtn.className = 'narrator-btn'
      nextBtn.style.display = 'none'

      wrapper.appendChild(roundLabel)
      wrapper.appendChild(instruction)
      wrapper.appendChild(promptBox)
      wrapper.appendChild(responsesRow)
      wrapper.appendChild(feedback)
      wrapper.appendChild(explanationBox)
      wrapper.appendChild(nextBtn)
      document.getElementById('app').appendChild(wrapper)

      const renderRound = () => {
        answered = false
        const comp = comparisons[currentIndex]

        // Randomly assign base/sft to A/B
        const sftIsA = Math.random() < 0.5
        const textA = sftIsA ? comp.sft : comp.base
        const textB = sftIsA ? comp.base : comp.sft

        cardA.card._isSft = sftIsA
        cardB.card._isSft = !sftIsA

        roundLabel.textContent = i18n.t('ch06.s02_round', {
          current: currentIndex + 1,
          total: comparisons.length,
        })

        promptBox.innerHTML = `<strong>${i18n.t('ch06.s02_prompt_label')}</strong> ${comp.prompt}`
        cardA.cardText.textContent = textA
        cardB.cardText.textContent = textB

        // Reset styles
        for (const c of [cardA, cardB]) {
          c.card.style.borderColor = 'var(--text)'
          c.card.style.cursor = 'pointer'
          c.revealLabel.style.display = 'none'
          c.revealLabel.textContent = ''
        }
        feedback.textContent = ''
        explanationBox.style.display = 'none'
        nextBtn.style.display = 'none'

        const onChoose = (chosen, other) => {
          if (answered) return
          answered = true

          const chosenIsSft = chosen.card._isSft
          const correctCard = chosenIsSft ? chosen : other
          const wrongCard = chosenIsSft ? other : chosen

          // Color reveal
          correctCard.card.style.borderColor = '#22c55e'
          correctCard.card.style.cursor = 'default'
          wrongCard.card.style.borderColor = '#ef4444'
          wrongCard.card.style.cursor = 'default'

          // Labels
          const assignLabel = (c, isSft) => {
            c.revealLabel.textContent = isSft
              ? i18n.t('ch06.s02_sft_label')
              : i18n.t('ch06.s02_base_label')
            c.revealLabel.style.color = isSft ? '#22c55e' : '#ef4444'
            c.revealLabel.style.display = 'block'
          }
          assignLabel(cardA, cardA.card._isSft)
          assignLabel(cardB, cardB.card._isSft)

          // Feedback
          if (chosenIsSft) {
            score++
            feedback.textContent = i18n.t('ch06.s02_correct')
            feedback.style.color = '#22c55e'
          } else {
            feedback.textContent = i18n.t('ch06.s02_wrong')
            feedback.style.color = '#ef4444'
          }

          // Explanation
          explanationBox.textContent = comp.explanation
          explanationBox.style.display = 'block'

          // Next / finish
          const isLast = currentIndex === comparisons.length - 1
          nextBtn.textContent = isLast
            ? `${score + (chosenIsSft ? 0 : 0)} — ${i18n.t('ch06.s02_next').replace('→', '').trim()} ✓`
            : i18n.t('ch06.s02_next')
          nextBtn.textContent = i18n.t('ch06.s02_next')
          nextBtn.style.display = 'inline-block'

          nextBtn.onclick = () => {
            currentIndex++
            if (currentIndex >= comparisons.length) {
              ctx.state.ch06_score = score
              bus.emit('scene:advance')
            } else {
              renderRound()
            }
          }
        }

        cardA.card.onclick = () => onChoose(cardA, cardB)
        cardB.card.onclick = () => onChoose(cardB, cardA)
      }

      renderRound()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 3: Narrative — results
  {
    id: 'ch06-s03-results',
    type: 'narrative',
    async enter(ctx) {
      const score = ctx.state?.ch06_score ?? 0
      const text = ctx.i18n.t('ch06.s03_text', { score })
      await ctx.narrator.say(text)
      await ctx.narrator.ask(text, [
        { key: 'ch06.s03_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 4: Narrative — the BUT
  {
    id: 'ch06-s04-but',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch06.s04_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch06.s04_text2')
      await ctx.narrator.ask('ch06.s04_text2', [
        { key: 'ch06.s04_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 5: Narrative — transition to next chapter
  {
    id: 'ch06-s05-transition',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch06.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch06.s05_text2')
      await ctx.narrator.ask('ch06.s05_text2', [
        { key: 'ch06.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch06-sft-motivation') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },
]
