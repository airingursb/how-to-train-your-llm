import tasksData from './data/annotation-tasks.json'

export default [
  // Scene 1: Narrative — intro to data annotation
  {
    id: 'ch07-s01-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch07.s01_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch07.s01_text2')
      await ctx.narrator.ask('ch07.s01_text2', [
        { key: 'ch07.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Interactive — annotation role play
  {
    id: 'ch07-s02-annotate',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const tasks = tasksData.tasks
      let currentIndex = 0

      const wrapper = document.createElement('div')
      wrapper.id = 'ch07-annotate-ui'
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

      // Rank instruction
      const rankInstruction = document.createElement('div')
      rankInstruction.textContent = i18n.t('ch07.s02_rank_instruction')
      rankInstruction.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
        text-align: center;
      `

      // Instruction box
      const instructionBox = document.createElement('div')
      instructionBox.style.cssText = `
        width: 100%; padding: 14px 20px; border-radius: 10px;
        background: rgba(var(--accent-rgb, 255,140,0), 0.12);
        border: 2px solid var(--accent);
        display: flex; flex-direction: column; gap: 6px;
      `

      const instructionLabel = document.createElement('div')
      instructionLabel.textContent = i18n.t('ch07.s02_instruction_label')
      instructionLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--accent);
        font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em;
      `

      const instructionText = document.createElement('div')
      instructionText.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
        line-height: 1.5;
      `

      instructionBox.appendChild(instructionLabel)
      instructionBox.appendChild(instructionText)

      // Cards container
      const cardsContainer = document.createElement('div')
      cardsContainer.style.cssText = `
        display: flex; flex-direction: column; gap: 12px; width: 100%;
      `

      // Feedback area
      const feedback = document.createElement('div')
      feedback.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--text);
        text-align: center; min-height: 26px;
      `

      // Next button
      const nextBtn = document.createElement('button')
      nextBtn.className = 'narrator-btn'
      nextBtn.style.display = 'none'

      wrapper.appendChild(roundLabel)
      wrapper.appendChild(rankInstruction)
      wrapper.appendChild(instructionBox)
      wrapper.appendChild(cardsContainer)
      wrapper.appendChild(feedback)
      wrapper.appendChild(nextBtn)
      document.getElementById('app').appendChild(wrapper)

      const qualityOrder = { good: 1, ok: 2, bad: 3 }
      const rankColors = ['#22c55e', '#eab308', '#ef4444']
      const rankLabels = [
        i18n.t('ch07.s02_rank_best'),
        i18n.t('ch07.s02_rank_ok'),
        i18n.t('ch07.s02_rank_worst'),
      ]

      const renderRound = () => {
        const task = tasks[currentIndex]
        let rankCount = 0
        let revealed = false

        roundLabel.textContent = i18n.t('ch07.s02_round', {
          current: currentIndex + 1,
          total: tasks.length,
        })
        instructionText.textContent = task.instruction
        feedback.textContent = ''
        nextBtn.style.display = 'none'
        cardsContainer.innerHTML = ''

        // Shuffle responses for display
        const shuffled = [...task.responses].sort(() => Math.random() - 0.5)
        const playerRanking = []

        const cardObjs = shuffled.map((resp) => {
          const isCode = resp.text.includes('\n') && (resp.text.includes('def ') || resp.text.includes('return '))

          const card = document.createElement('div')
          card.style.cssText = `
            width: 100%; padding: 16px 20px; border-radius: 10px;
            border: 2.5px solid var(--text); cursor: pointer;
            background: var(--bg); box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
            display: flex; flex-direction: column; gap: 8px; position: relative;
          `

          const responseText = document.createElement(isCode ? 'pre' : 'div')
          responseText.style.cssText = isCode
            ? `margin: 0; white-space: pre-wrap; word-break: break-word;
               font-family: var(--font-mono); font-size: 14px; line-height: 1.6; color: var(--text);`
            : `font-family: var(--font-hand); font-size: 16px; line-height: 1.6; color: var(--text);`
          responseText.textContent = resp.text

          // Rank badge (shown after player clicks)
          const rankBadge = document.createElement('div')
          rankBadge.style.cssText = `
            position: absolute; top: -10px; right: -10px;
            width: 28px; height: 28px; border-radius: 50%;
            display: none; align-items: center; justify-content: center;
            font-family: var(--font-hand); font-size: 15px; font-weight: bold;
            color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          `

          // Quality reveal (shown after reveal)
          const qualityReveal = document.createElement('div')
          qualityReveal.style.cssText = `
            font-family: var(--font-hand); font-size: 14px; line-height: 1.5;
            display: none; margin-top: 4px; padding-top: 8px;
            border-top: 1px dashed rgba(128,128,128,0.3);
          `

          card.appendChild(responseText)
          card.appendChild(rankBadge)
          card.appendChild(qualityReveal)

          card.addEventListener('mouseenter', () => {
            if (!revealed && !card._ranked) card.style.borderColor = 'var(--accent)'
          })
          card.addEventListener('mouseleave', () => {
            if (!revealed && !card._ranked) card.style.borderColor = 'var(--text)'
          })

          card._resp = resp
          card._rankBadge = rankBadge
          card._qualityReveal = qualityReveal
          card._ranked = false

          card.addEventListener('click', () => {
            if (revealed || card._ranked) return
            card._ranked = true
            const rank = rankCount
            rankCount++

            playerRanking.push({ resp, rank })

            card.style.borderColor = rankColors[rank]
            card.style.cursor = 'default'
            rankBadge.textContent = rank + 1
            rankBadge.style.background = rankColors[rank]
            rankBadge.style.display = 'flex'

            if (rankCount === task.responses.length) {
              revealResults()
            }
          })

          cardsContainer.appendChild(card)
          return card
        })

        const revealResults = () => {
          revealed = true

          // Check if player ranking matches quality order
          const sortedByQuality = [...playerRanking].sort(
            (a, b) => qualityOrder[a.resp.quality] - qualityOrder[b.resp.quality]
          )
          const matched = playerRanking.every(
            (item, i) => item.resp.quality === sortedByQuality[i].resp.quality
          )

          feedback.textContent = matched
            ? i18n.t('ch07.s02_matched')
            : i18n.t('ch07.s02_different')
          feedback.style.color = matched ? '#22c55e' : 'var(--accent)'

          // Reveal quality labels on each card
          cardObjs.forEach((card) => {
            const resp = card._resp
            const qOrder = qualityOrder[resp.quality]
            const color = rankColors[qOrder - 1]
            const label = rankLabels[qOrder - 1]

            card.style.borderColor = color
            card._qualityReveal.innerHTML = `<span style="color:${color}; font-weight:bold;">${label}</span> — ${resp.reason}`
            card._qualityReveal.style.display = 'block'
          })

          const isLast = currentIndex === tasks.length - 1
          nextBtn.textContent = isLast
            ? i18n.t('ch07.s02_next').replace('→', '✓')
            : i18n.t('ch07.s02_next')
          nextBtn.style.display = 'inline-block'

          nextBtn.onclick = () => {
            currentIndex++
            if (currentIndex >= tasks.length) {
              bus.emit('scene:advance')
            } else {
              renderRound()
            }
          }
        }
      }

      renderRound()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 3: Narrative — data quality > quantity
  {
    id: 'ch07-s03-quality',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch07.s03_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch07.s03_text2')
      await ctx.narrator.ask('ch07.s03_text2', [
        { key: 'ch07.s03_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 4: Interactive — annotator disagreement
  {
    id: 'ch07-s04-disagree',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n, narrator } = ctx
      const { disagreement } = tasksData

      const wrapper = document.createElement('div')
      wrapper.id = 'ch07-disagree-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 900px;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      `

      // Narrator text at top
      const introText = document.createElement('div')
      introText.textContent = i18n.t('ch07.s04_text')
      introText.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        text-align: center; max-width: 640px; line-height: 1.6;
      `

      // Ethical question box
      const questionBox = document.createElement('div')
      questionBox.style.cssText = `
        width: 100%; padding: 14px 20px; border-radius: 10px;
        background: rgba(var(--accent-rgb, 255,140,0), 0.12);
        border: 2px solid var(--accent);
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        text-align: center; line-height: 1.5;
      `
      questionBox.innerHTML = `<span style="color:var(--accent); font-size:13px; font-weight:bold; text-transform:uppercase; letter-spacing:0.08em; display:block; margin-bottom:6px;">${i18n.t('ch07.s02_instruction_label')}</span>${disagreement.instruction}`

      // Annotator panels row
      const panelsRow = document.createElement('div')
      panelsRow.style.cssText = `
        display: flex; flex-direction: row; gap: 16px; width: 100%;
      `

      const annotators = [disagreement.annotator1, disagreement.annotator2, disagreement.annotator3]
      const panelColors = ['#818cf8', '#34d399', '#f472b6']

      annotators.forEach((ann, idx) => {
        const panel = document.createElement('div')
        panel.style.cssText = `
          flex: 1; padding: 18px; border-radius: 12px;
          border: 2.5px solid ${panelColors[idx]};
          background: var(--bg);
          display: flex; flex-direction: column; gap: 10px;
        `

        const name = document.createElement('div')
        name.textContent = ann.name
        name.style.cssText = `
          font-family: var(--font-hand); font-size: 18px; font-weight: bold;
          color: ${panelColors[idx]};
        `

        const pick = document.createElement('div')
        pick.textContent = `"${ann.pick}"`
        pick.style.cssText = `
          font-family: var(--font-hand); font-size: 14px; line-height: 1.6;
          color: var(--text); font-style: italic; flex: 1;
        `

        const reasoning = document.createElement('div')
        reasoning.textContent = ann.reasoning
        reasoning.style.cssText = `
          font-family: var(--font-hand); font-size: 13px;
          color: ${panelColors[idx]}; opacity: 0.85;
          padding-top: 8px; border-top: 1px dashed rgba(128,128,128,0.3);
        `

        panel.appendChild(name)
        panel.appendChild(pick)
        panel.appendChild(reasoning)
        panelsRow.appendChild(panel)
      })

      // Bottom question
      const bottomText = document.createElement('div')
      bottomText.textContent = i18n.t('ch07.s04_question')
      bottomText.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        text-align: center; line-height: 1.6;
      `

      // Button
      const advanceBtn = document.createElement('button')
      advanceBtn.className = 'narrator-btn'
      advanceBtn.textContent = i18n.t('ch07.s04_btn')
      advanceBtn.onclick = () => bus.emit('scene:advance')

      wrapper.appendChild(introText)
      wrapper.appendChild(questionBox)
      wrapper.appendChild(panelsRow)
      wrapper.appendChild(bottomText)
      wrapper.appendChild(advanceBtn)
      document.getElementById('app').appendChild(wrapper)

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 5: Narrative — the BUT + transition to Act III
  {
    id: 'ch07-s05-but',
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
