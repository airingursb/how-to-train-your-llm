import prefData from './data/preference-data.json'

export default [
  // Scene 1: Narrative — intro to human preferences
  {
    id: 'ch08-s01-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch08.s01_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch08.s01_text2')
      await ctx.narrator.ask('ch08.s01_text2', [
        { key: 'ch08.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Interactive — preference ranking
  {
    id: 'ch08-s02-rank',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const rounds = prefData.rounds
      let currentIndex = 0
      let agreementCount = 0
      let prefCount = 0

      const wrapper = document.createElement('div')
      wrapper.id = 'ch08-rank-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 780px;
        display: flex; flex-direction: column; align-items: center; gap: 18px;
      `

      // Round counter
      const roundLabel = document.createElement('div')
      roundLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--accent);
        letter-spacing: 0.05em; align-self: flex-start;
      `

      // Preference counter
      const prefCounter = document.createElement('div')
      prefCounter.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--text);
        opacity: 0.7; align-self: flex-end;
      `

      const topRow = document.createElement('div')
      topRow.style.cssText = `
        display: flex; justify-content: space-between; align-items: center; width: 100%;
      `
      topRow.appendChild(roundLabel)
      topRow.appendChild(prefCounter)

      // "Which is better?" label
      const whichLabel = document.createElement('div')
      whichLabel.textContent = i18n.t('ch08.s02_which_better')
      whichLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
        text-align: center;
      `

      // Prompt box
      const promptBox = document.createElement('div')
      promptBox.style.cssText = `
        width: 100%; padding: 14px 20px; border-radius: 10px;
        background: rgba(var(--accent-rgb, 255,140,0), 0.12);
        border: 2px solid var(--accent);
        display: flex; flex-direction: column; gap: 6px; box-sizing: border-box;
      `
      const promptLabel = document.createElement('div')
      promptLabel.textContent = i18n.t('ch08.s02_prompt_label')
      promptLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 13px; color: var(--accent);
        font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em;
      `
      const promptText = document.createElement('div')
      promptText.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text); line-height: 1.5;
      `
      promptBox.appendChild(promptLabel)
      promptBox.appendChild(promptText)

      // Response cards container
      const cardsRow = document.createElement('div')
      cardsRow.style.cssText = `
        display: flex; flex-direction: row; gap: 14px; width: 100%;
      `

      // Feedback area
      const feedback = document.createElement('div')
      feedback.style.cssText = `
        font-family: var(--font-hand); font-size: 16px; color: var(--text);
        text-align: center; min-height: 24px; line-height: 1.5; max-width: 640px;
      `

      // Next button
      const nextBtn = document.createElement('button')
      nextBtn.className = 'narrator-btn'
      nextBtn.style.display = 'none'

      wrapper.appendChild(topRow)
      wrapper.appendChild(whichLabel)
      wrapper.appendChild(promptBox)
      wrapper.appendChild(cardsRow)
      wrapper.appendChild(feedback)
      wrapper.appendChild(nextBtn)
      document.getElementById('app').appendChild(wrapper)

      const renderRound = () => {
        const round = rounds[currentIndex]
        let chose = null

        roundLabel.textContent = i18n.t('ch08.s02_round', {
          current: currentIndex + 1,
          total: rounds.length,
        })
        prefCounter.textContent = i18n.t('ch08.s02_preferences_collected', { count: prefCount })
        promptText.textContent = round.prompt
        feedback.textContent = ''
        nextBtn.style.display = 'none'
        cardsRow.innerHTML = ''

        const makeCard = (label, text, value) => {
          const card = document.createElement('div')
          card.style.cssText = `
            flex: 1; padding: 16px 18px; border-radius: 10px;
            border: 2.5px solid var(--text); cursor: pointer;
            background: var(--bg); box-sizing: border-box;
            display: flex; flex-direction: column; gap: 8px;
            transition: border-color 0.15s, box-shadow 0.15s;
          `

          const cardLabel = document.createElement('div')
          cardLabel.textContent = label
          cardLabel.style.cssText = `
            font-family: var(--font-hand); font-size: 13px; color: var(--accent);
            font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em;
          `

          const cardText = document.createElement('div')
          cardText.style.cssText = `
            font-family: var(--font-hand); font-size: 15px; line-height: 1.6; color: var(--text);
          `
          cardText.textContent = text

          card.appendChild(cardLabel)
          card.appendChild(cardText)

          card.addEventListener('mouseenter', () => {
            if (!chose) card.style.borderColor = 'var(--accent)'
          })
          card.addEventListener('mouseleave', () => {
            if (!chose) card.style.borderColor = 'var(--text)'
          })

          card.addEventListener('click', () => {
            if (chose) return
            chose = value
            prefCount++

            const isCorrect = value === round.better
            const agreedText = isCorrect
              ? i18n.t('ch08.s02_correct')
              : i18n.t('ch08.s02_different')

            if (isCorrect) agreementCount++

            // Highlight chosen and correct
            allCards.forEach(([c, v]) => {
              if (v === round.better) {
                c.style.borderColor = '#22c55e'
                c.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.25)'
              } else if (v === value && !isCorrect) {
                c.style.borderColor = '#ef4444'
              } else {
                c.style.borderColor = 'rgba(128,128,128,0.3)'
                c.style.cursor = 'default'
              }
            })

            const reasonDiv = document.createElement('div')
            reasonDiv.style.cssText = `
              margin-top: 6px; padding-top: 8px;
              border-top: 1px dashed rgba(128,128,128,0.3);
              font-family: var(--font-hand); font-size: 13px;
              color: #22c55e; line-height: 1.5;
            `
            reasonDiv.textContent = round.reason

            const correctCard = allCards.find(([, v]) => v === round.better)?.[0]
            if (correctCard) correctCard.appendChild(reasonDiv)

            feedback.textContent = agreedText
            feedback.style.color = isCorrect ? '#22c55e' : 'var(--accent)'

            prefCounter.textContent = i18n.t('ch08.s02_preferences_collected', { count: prefCount })

            const isLast = currentIndex === rounds.length - 1
            nextBtn.textContent = isLast
              ? i18n.t('ch08.s02_next').replace('→', '✓')
              : i18n.t('ch08.s02_next')
            nextBtn.style.display = 'inline-block'

            nextBtn.onclick = () => {
              currentIndex++
              if (currentIndex >= rounds.length) {
                bus.emit('scene:advance')
              } else {
                renderRound()
              }
            }
          })

          return card
        }

        const cardA = makeCard(i18n.t('ch08.s02_response_a'), round.responseA, 'A')
        const cardB = makeCard(i18n.t('ch08.s02_response_b'), round.responseB, 'B')
        const allCards = [[cardA, 'A'], [cardB, 'B']]

        cardsRow.appendChild(cardA)
        cardsRow.appendChild(cardB)
      }

      renderRound()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 3: Narrative — reward model explained
  {
    id: 'ch08-s03-reward-model',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch08.s03_text')
      await ctx.narrator.ask('ch08.s03_text', [
        { key: 'ch08.s03_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 4: Interactive — reward hacking demo
  {
    id: 'ch08-s04-hacking',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const { rewardHacking } = prefData

      const wrapper = document.createElement('div')
      wrapper.id = 'ch08-hacking-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 780px;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      `

      // Intro text
      const introText = document.createElement('div')
      introText.textContent = i18n.t('ch08.s04_text')
      introText.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        text-align: center; line-height: 1.6; max-width: 640px;
      `

      // Prompt box
      const promptBox = document.createElement('div')
      promptBox.style.cssText = `
        width: 100%; padding: 12px 18px; border-radius: 10px;
        background: rgba(var(--accent-rgb, 255,140,0), 0.12);
        border: 2px solid var(--accent); box-sizing: border-box;
        display: flex; gap: 10px; align-items: baseline;
      `
      const pLabel = document.createElement('span')
      pLabel.textContent = i18n.t('ch08.s02_prompt_label')
      pLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 13px; color: var(--accent);
        font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;
      `
      const pText = document.createElement('span')
      pText.textContent = rewardHacking.prompt
      pText.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--text);
      `
      promptBox.appendChild(pLabel)
      promptBox.appendChild(pText)

      // Cards row
      const cardsRow = document.createElement('div')
      cardsRow.style.cssText = `
        display: flex; flex-direction: row; gap: 16px; width: 100%;
      `

      const makeResponseCard = (labelKey, text, score, scoreColor, borderColor) => {
        const card = document.createElement('div')
        card.style.cssText = `
          flex: 1; padding: 18px; border-radius: 12px;
          border: 2.5px solid ${borderColor}; background: var(--bg);
          display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
        `

        const cardLabel = document.createElement('div')
        cardLabel.textContent = i18n.t(labelKey)
        cardLabel.style.cssText = `
          font-family: var(--font-hand); font-size: 13px; color: ${borderColor};
          font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em;
        `

        const cardText = document.createElement('div')
        cardText.style.cssText = `
          font-family: var(--font-hand); font-size: 15px; line-height: 1.6; color: var(--text); flex: 1;
        `
        cardText.textContent = text

        const scoreBar = document.createElement('div')
        scoreBar.style.cssText = `
          margin-top: 6px; padding-top: 10px;
          border-top: 1px dashed rgba(128,128,128,0.3);
          display: flex; align-items: center; gap: 10px;
        `

        const scoreLabel = document.createElement('div')
        scoreLabel.textContent = i18n.t('ch08.s04_score', { score })
        scoreLabel.style.cssText = `
          font-family: var(--font-hand); font-size: 16px; font-weight: bold; color: ${scoreColor};
          white-space: nowrap;
        `

        const barTrack = document.createElement('div')
        barTrack.style.cssText = `
          flex: 1; height: 10px; border-radius: 5px;
          background: rgba(128,128,128,0.2); overflow: hidden;
        `
        const barFill = document.createElement('div')
        barFill.style.cssText = `
          height: 100%; border-radius: 5px; background: ${scoreColor};
          width: ${score}%; transition: width 0.8s ease;
        `
        barTrack.appendChild(barFill)

        scoreBar.appendChild(scoreLabel)
        scoreBar.appendChild(barTrack)

        card.appendChild(cardLabel)
        card.appendChild(cardText)
        card.appendChild(scoreBar)

        return card
      }

      const honestCard = makeResponseCard('ch08.s04_honest_label', rewardHacking.honest, 42, '#22c55e', '#22c55e')
      const hackedCard = makeResponseCard('ch08.s04_hacked_label', rewardHacking.hacked, 91, '#ef4444', '#ef4444')

      cardsRow.appendChild(honestCard)
      cardsRow.appendChild(hackedCard)

      // Explanation
      const explainText = document.createElement('div')
      explainText.textContent = i18n.t('ch08.s04_text2')
      explainText.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--text);
        text-align: center; line-height: 1.6; max-width: 640px;
      `

      // Advance button
      const advBtn = document.createElement('button')
      advBtn.className = 'narrator-btn'
      advBtn.textContent = i18n.t('ch08.s04_btn')
      advBtn.onclick = () => bus.emit('scene:advance')

      wrapper.appendChild(introText)
      wrapper.appendChild(promptBox)
      wrapper.appendChild(cardsRow)
      wrapper.appendChild(explainText)
      wrapper.appendChild(advBtn)
      document.getElementById('app').appendChild(wrapper)

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 5: Narrative — BUT + transition to ch09
  {
    id: 'ch08-s05-but',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch08.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch08.s05_text2')
      await ctx.narrator.ask('ch08.s05_text2', [
        { key: 'ch08.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch08-reward-model') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },
]
