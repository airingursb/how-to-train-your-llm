import simData from './data/alignment-sim.json'

export default [
  // Scene 1: Narrative — RL intro
  {
    id: 'ch09-s01-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch09.s01_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch09.s01_text2')
      await ctx.narrator.ask('ch09.s01_text2', [
        { key: 'ch09.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Narrative — KL divergence
  {
    id: 'ch09-s02-kl',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch09.s02_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch09.s02_text2')
      await ctx.narrator.ask('ch09.s02_text2', [
        { key: 'ch09.s02_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 3: Interactive — alignment sandbox
  {
    id: 'ch09-s03-sandbox',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx
      const { scenarios, sliderDefaults } = simData

      const values = { ...sliderDefaults }

      const wrapper = document.createElement('div')
      wrapper.id = 'ch09-sandbox-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 860px;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      `

      // Instruction
      const instruction = document.createElement('div')
      instruction.textContent = i18n.t('ch09.s03_instruction')
      instruction.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        text-align: center;
      `

      // Sliders panel
      const slidersPanel = document.createElement('div')
      slidersPanel.style.cssText = `
        width: 100%; padding: 20px 24px; border-radius: 12px;
        border: 2px solid var(--accent); background: rgba(var(--accent-rgb,255,140,0),0.07);
        display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;
      `

      const sliderDefs = [
        { key: 'helpfulness', labelKey: 'ch09.s03_helpfulness', color: '#818cf8' },
        { key: 'harmlessness', labelKey: 'ch09.s03_harmlessness', color: '#34d399' },
        { key: 'honesty', labelKey: 'ch09.s03_honesty', color: '#f472b6' },
      ]

      const sliderEls = {}

      sliderDefs.forEach(({ key, labelKey, color }) => {
        const row = document.createElement('div')
        row.style.cssText = `display: flex; align-items: center; gap: 14px;`

        const label = document.createElement('div')
        label.textContent = i18n.t(labelKey)
        label.style.cssText = `
          font-family: var(--font-hand); font-size: 16px; color: ${color};
          font-weight: bold; width: 120px; flex-shrink: 0;
        `

        const sliderWrap = document.createElement('div')
        sliderWrap.style.cssText = `flex: 1; position: relative;`

        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = 0
        slider.max = 100
        slider.value = values[key]
        slider.style.cssText = `
          width: 100%; cursor: pointer; accent-color: ${color};
        `

        const valDisplay = document.createElement('div')
        valDisplay.textContent = values[key]
        valDisplay.style.cssText = `
          font-family: var(--font-hand); font-size: 15px; color: ${color};
          font-weight: bold; width: 36px; text-align: right; flex-shrink: 0;
        `

        slider.addEventListener('input', () => {
          values[key] = parseInt(slider.value)
          valDisplay.textContent = slider.value
          updateAll()
        })

        sliderWrap.appendChild(slider)
        row.appendChild(label)
        row.appendChild(sliderWrap)
        row.appendChild(valDisplay)
        slidersPanel.appendChild(row)

        sliderEls[key] = slider
      })

      // Status feedback
      const statusBox = document.createElement('div')
      statusBox.style.cssText = `
        width: 100%; padding: 12px 18px; border-radius: 8px;
        font-family: var(--font-hand); font-size: 16px; text-align: center;
        transition: background 0.3s, color 0.3s; box-sizing: border-box;
      `

      // Scenario cards
      const scenariosContainer = document.createElement('div')
      scenariosContainer.style.cssText = `
        display: flex; flex-direction: column; gap: 12px; width: 100%;
      `

      const scenarioCards = scenarios.map((scenario) => {
        const card = document.createElement('div')
        card.style.cssText = `
          width: 100%; padding: 16px 20px; border-radius: 10px;
          border: 2.5px solid var(--text); background: var(--bg);
          display: flex; flex-direction: column; gap: 8px;
          box-sizing: border-box; transition: border-color 0.3s;
        `

        const promptRow = document.createElement('div')
        promptRow.style.cssText = `
          display: flex; gap: 8px; align-items: baseline;
        `
        const pLabel = document.createElement('span')
        pLabel.textContent = 'Q:'
        pLabel.style.cssText = `
          font-family: var(--font-hand); font-size: 13px; color: var(--accent);
          font-weight: bold; white-space: nowrap;
        `
        const pText = document.createElement('span')
        pText.textContent = scenario.prompt
        pText.style.cssText = `
          font-family: var(--font-hand); font-size: 16px; color: var(--text);
        `
        promptRow.appendChild(pLabel)
        promptRow.appendChild(pText)

        const responseText = document.createElement('div')
        responseText.style.cssText = `
          font-family: var(--font-hand); font-size: 15px; line-height: 1.6;
          color: var(--text); padding-top: 8px;
          border-top: 1px dashed rgba(128,128,128,0.3);
        `

        card.appendChild(promptRow)
        card.appendChild(responseText)
        scenariosContainer.appendChild(card)

        return { card, responseText }
      })

      // Advance button
      const advBtn = document.createElement('button')
      advBtn.className = 'narrator-btn'
      advBtn.textContent = i18n.t('ch09.s03_btn')
      advBtn.onclick = () => bus.emit('scene:advance')

      wrapper.appendChild(instruction)
      wrapper.appendChild(slidersPanel)
      wrapper.appendChild(statusBox)
      wrapper.appendChild(scenariosContainer)
      wrapper.appendChild(advBtn)
      document.getElementById('app').appendChild(wrapper)

      const getResponseKey = () => {
        const { helpfulness, harmlessness } = values
        if (harmlessness > 70) return 'safe_high'
        if (helpfulness > 70) return 'helpful_high'
        return 'balanced'
      }

      const updateAll = () => {
        const responseKey = getResponseKey()
        const { helpfulness, harmlessness } = values

        // Update scenario cards
        scenarios.forEach((scenario, idx) => {
          const { card, responseText } = scenarioCards[idx]
          responseText.textContent = scenario.responses[responseKey]

          let borderColor
          if (responseKey === 'balanced') {
            borderColor = '#22c55e'
          } else if (responseKey === 'helpful_high') {
            borderColor = helpfulness > 85 ? '#ef4444' : '#eab308'
          } else {
            borderColor = harmlessness > 85 ? '#ef4444' : '#eab308'
          }
          card.style.borderColor = borderColor
        })

        // Update status
        if (responseKey === 'balanced') {
          statusBox.textContent = i18n.t('ch09.s03_balanced')
          statusBox.style.background = 'rgba(34,197,94,0.12)'
          statusBox.style.color = '#22c55e'
          statusBox.style.border = '1.5px solid #22c55e'
        } else if (responseKey === 'helpful_high') {
          statusBox.textContent = i18n.t('ch09.s03_warning_helpful')
          statusBox.style.background = 'rgba(239,68,68,0.10)'
          statusBox.style.color = '#ef4444'
          statusBox.style.border = '1.5px solid #ef4444'
        } else {
          statusBox.textContent = i18n.t('ch09.s03_warning_safe')
          statusBox.style.background = 'rgba(234,179,8,0.10)'
          statusBox.style.color = '#eab308'
          statusBox.style.border = '1.5px solid #eab308'
        }
      }

      updateAll()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 4: Narrative — tradeoffs
  {
    id: 'ch09-s04-tradeoffs',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch09.s04_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch09.s04_text2')
      await ctx.narrator.ask('ch09.s04_text2', [
        { key: 'ch09.s04_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 5: Narrative — the final BUT
  {
    id: 'ch09-s05-but',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch09.s05_text')
      await new Promise(r => setTimeout(r, 800))
      await ctx.narrator.say('ch09.s05_text2')
      await ctx.narrator.ask('ch09.s05_text2', [
        { key: 'ch09.s05_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 6: Narrative — finale
  {
    id: 'ch09-s06-finale',
    type: 'interactive',
    async enter(ctx) {
      const { bus, i18n } = ctx

      const wrapper = document.createElement('div')
      wrapper.id = 'ch09-finale-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 720px;
        display: flex; flex-direction: column; align-items: center; gap: 24px;
        text-align: center;
      `

      const text1 = document.createElement('div')
      text1.textContent = i18n.t('ch09.s06_text')
      text1.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text); line-height: 1.6;
      `

      const pipeline = document.createElement('div')
      pipeline.textContent = i18n.t('ch09.s06_pipeline')
      pipeline.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--accent);
        font-weight: bold; line-height: 1.7; letter-spacing: 0.02em;
        padding: 18px 24px; border-radius: 12px;
        border: 2px solid var(--accent);
        background: rgba(var(--accent-rgb,255,140,0),0.10);
        width: 100%; box-sizing: border-box;
      `

      const text2 = document.createElement('div')
      text2.textContent = i18n.t('ch09.s06_text2')
      text2.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text); line-height: 1.6;
      `

      const text3 = document.createElement('div')
      text3.textContent = i18n.t('ch09.s06_text3')
      text3.style.cssText = `
        font-family: var(--font-hand); font-size: 21px; color: var(--accent);
        font-weight: bold; line-height: 1.5;
      `

      const finaleBtn = document.createElement('button')
      finaleBtn.className = 'narrator-btn'
      finaleBtn.textContent = i18n.t('ch09.s06_btn')
      finaleBtn.style.cssText = `font-size: 20px; padding: 14px 32px;`
      finaleBtn.onclick = () => bus.emit('chapter:complete', 'ch09-alignment')

      wrapper.appendChild(text1)
      wrapper.appendChild(pipeline)
      wrapper.appendChild(text2)
      wrapper.appendChild(text3)
      wrapper.appendChild(finaleBtn)
      document.getElementById('app').appendChild(wrapper)

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },
]
