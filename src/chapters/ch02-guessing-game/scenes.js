import bigramData from './data/bigram-data.json'

// Module-level score storage so Scene 3 can read Scene 2's results
let _ch02Score = { player: 0, bigram: 0 }

export default [
  // Scene 1: Narrative hook — introduce bigram model
  {
    id: 'ch02-s01-hook',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch02.s01_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch02.s01_text2')
      await ctx.narrator.ask('ch02.s01_text2', [
        { key: 'ch02.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Interactive — the guessing game
  {
    id: 'ch02-s02-game',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const rounds = bigramData.rounds
      let currentRound = 0
      let playerScore = 0
      let bigramScore = 0

      // Reset module-level score
      _ch02Score = { player: 0, bigram: 0 }

      const wrapper = document.createElement('div')
      wrapper.id = 'ch02-game-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 92%; max-width: 640px;
      `

      // Score bar
      const scoreBar = document.createElement('div')
      scoreBar.style.cssText = `
        display: flex; justify-content: center; gap: 48px;
        margin-bottom: 28px; font-family: var(--font-hand); font-size: 22px;
        color: var(--text);
      `
      const youScore = document.createElement('span')
      const bigramScoreEl = document.createElement('span')
      scoreBar.appendChild(youScore)
      scoreBar.appendChild(bigramScoreEl)
      wrapper.appendChild(scoreBar)

      // Round label
      const roundLabel = document.createElement('div')
      roundLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
        opacity: 0.65; margin-bottom: 16px;
      `
      wrapper.appendChild(roundLabel)

      // Context display
      const contextEl = document.createElement('div')
      contextEl.style.cssText = `
        font-family: var(--font-hand); font-size: 28px; line-height: 1.5;
        color: var(--text); margin-bottom: 8px;
        min-height: 80px;
      `
      wrapper.appendChild(contextEl)

      // Pick prompt
      const pickPrompt = document.createElement('div')
      pickPrompt.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        opacity: 0.75; margin-bottom: 20px;
      `
      pickPrompt.textContent = i18n.t('ch02.s02_pick')
      wrapper.appendChild(pickPrompt)

      // Options grid
      const optionsGrid = document.createElement('div')
      optionsGrid.style.cssText = `
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        margin-bottom: 20px;
      `
      wrapper.appendChild(optionsGrid)

      // Result area
      const resultArea = document.createElement('div')
      resultArea.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; line-height: 1.6;
        color: var(--text); min-height: 72px; margin-bottom: 16px;
        padding: 12px 16px; border-radius: 12px;
        background: rgba(128,128,128,0.07);
        display: none;
      `
      wrapper.appendChild(resultArea)

      // Next button
      const nextBtn = document.createElement('button')
      nextBtn.className = 'narrator-btn'
      nextBtn.style.display = 'none'
      wrapper.appendChild(nextBtn)

      document.getElementById('app').appendChild(wrapper)

      const updateScoreBar = () => {
        youScore.textContent = `${i18n.t('ch02.s02_you')} 🧠 ${playerScore}`
        bigramScoreEl.textContent = `${i18n.t('ch02.s02_bigram')} 🤖 ${bigramScore}`
      }

      const renderRound = (roundIdx) => {
        const round = rounds[roundIdx]
        resultArea.style.display = 'none'
        nextBtn.style.display = 'none'
        pickPrompt.style.display = 'block'

        roundLabel.textContent = i18n.t('ch02.s02_round', {
          current: roundIdx + 1,
          total: rounds.length
        })

        // Build context with last word highlighted
        const words = round.context.split(' ')
        const lastWord = words[words.length - 1]
        const restOfContext = words.slice(0, -1).join(' ')
        contextEl.innerHTML = `${restOfContext} <span style="color: var(--accent); font-weight: 700;">${lastWord}</span>`

        // Build option buttons
        optionsGrid.innerHTML = ''
        round.options.forEach(option => {
          const btn = document.createElement('button')
          btn.textContent = option
          btn.style.cssText = `
            font-family: var(--font-mono); font-size: 20px; padding: 16px 24px;
            background: var(--bg); border: 2.5px solid var(--text);
            border-radius: 12px; cursor: pointer; color: var(--text);
            transition: background 0.15s, border-color 0.15s;
          `
          btn.addEventListener('mouseenter', () => {
            btn.style.background = 'var(--accent-light)'
          })
          btn.addEventListener('mouseleave', () => {
            if (!btn.dataset.resolved) btn.style.background = 'var(--bg)'
          })
          btn.addEventListener('click', () => handlePick(option, round))
          optionsGrid.appendChild(btn)
        })

        updateScoreBar()
      }

      const handlePick = (playerPick, round) => {
        // Disable all buttons
        const btns = Array.from(optionsGrid.querySelectorAll('button'))
        btns.forEach(btn => {
          btn.disabled = true
          btn.dataset.resolved = 'true'
          btn.style.cursor = 'default'
          btn.onmouseenter = null
          btn.onmouseleave = null
          btn.style.background = 'var(--bg)'
        })

        const playerCorrect = playerPick === round.correct
        const bigramCorrect = round.bigramChoice === round.correct

        if (playerCorrect) playerScore++
        if (bigramCorrect) bigramScore++

        // Color player's pick
        const playerBtn = btns.find(b => b.textContent === playerPick)
        if (playerBtn) {
          if (playerCorrect) {
            playerBtn.style.borderColor = '#5ba55b'
            playerBtn.style.background = 'rgba(91,165,91,0.15)'
          } else {
            playerBtn.style.borderColor = '#c83c3c'
            playerBtn.style.background = 'rgba(200,60,60,0.1)'
          }
        }

        // Highlight correct answer if player was wrong
        if (!playerCorrect) {
          const correctBtn = btns.find(b => b.textContent === round.correct)
          if (correctBtn) {
            correctBtn.style.borderColor = '#5ba55b'
            correctBtn.style.background = 'rgba(91,165,91,0.15)'
          }
        }

        // Show bigram pick label
        const bigramBtn = btns.find(b => b.textContent === round.bigramChoice)
        if (bigramBtn) {
          const bigramLabel = document.createElement('span')
          bigramLabel.textContent = ' 🤖'
          bigramLabel.style.fontSize = '14px'
          bigramBtn.appendChild(bigramLabel)
          if (bigramCorrect && round.bigramChoice !== playerPick) {
            bigramBtn.style.borderColor = '#5ba55b'
            bigramBtn.style.background = 'rgba(91,165,91,0.15)'
          } else if (!bigramCorrect && round.bigramChoice !== playerPick && round.bigramChoice !== round.correct) {
            bigramBtn.style.borderColor = '#c83c3c'
            bigramBtn.style.background = 'rgba(200,60,60,0.1)'
          }
        }

        // Show result and explanation
        const verdict = playerCorrect ? i18n.t('ch02.s02_correct') : i18n.t('ch02.s02_wrong')
        resultArea.innerHTML = `<strong>${verdict}</strong><br><span style="opacity:0.8;font-size:16px;">${round.explanation}</span>`
        resultArea.style.display = 'block'
        pickPrompt.style.display = 'none'

        updateScoreBar()

        // Advance to next round or finish
        const isLast = currentRound === rounds.length - 1
        if (isLast) {
          nextBtn.style.display = 'none'
          // Store final scores
          _ch02Score = { player: playerScore, bigram: bigramScore }
          setTimeout(() => bus.emit('scene:advance'), 2200)
        } else {
          nextBtn.textContent = i18n.t('ch02.s02_next')
          nextBtn.style.display = 'inline-block'
          nextBtn.onclick = () => {
            currentRound++
            renderRound(currentRound)
          }
        }
      }

      renderRound(0)
      updateScoreBar()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 3: Reveal scores and contrast context vs. no context
  {
    id: 'ch02-s03-scores',
    type: 'narrative',
    async enter(ctx) {
      const { player, bigram } = _ch02Score
      // narrator.say supports simple key interpolation via i18n
      // We build the string directly since scores are dynamic
      const text1 = ctx.i18n.t('ch02.s03_text', { playerScore: player, bigramScore: bigram })
      const text2 = ctx.i18n.t('ch02.s03_text2')
      const btnKey = 'ch02.s03_btn'

      await ctx.narrator.say(text1)
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say(text2)
      await ctx.narrator.ask(text2, [
        { key: btnKey, action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 4: The BUT — pivot toward attention
  {
    id: 'ch02-s04-but',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch02.s04_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch02.s04_text2')
      await ctx.narrator.ask('ch02.s04_text2', [
        { key: 'ch02.s04_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 5: Transition — introduce "attention"
  {
    id: 'ch02-s05-attention',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch02.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch02.s05_text2')
      await ctx.narrator.ask('ch02.s05_text2', [
        { key: 'ch02.s05_btn', action: () => ctx.bus.emit('chapter:complete', 'ch02-guessing-game') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
