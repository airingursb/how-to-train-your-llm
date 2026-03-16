import transformerData from './data/transformer-parts.json'

function injectTransformerStyle() {
  if (document.getElementById('ch04-transformer-style')) return
  const style = document.createElement('style')
  style.id = 'ch04-transformer-style'
  style.textContent = `
    @keyframes ch04-slot-shake {
      0%   { transform: translateX(0); }
      20%  { transform: translateX(-8px); }
      40%  { transform: translateX(8px); }
      60%  { transform: translateX(-5px); }
      80%  { transform: translateX(5px); }
      100% { transform: translateX(0); }
    }
    @keyframes ch04-slot-flash-green {
      0%   { box-shadow: 0 0 0 0 rgba(91,165,91,0.8); }
      50%  { box-shadow: 0 0 0 12px rgba(91,165,91,0.3); }
      100% { box-shadow: 0 0 0 0 rgba(91,165,91,0); }
    }
    @keyframes ch04-token-travel {
      0%   { transform: translateY(0) scale(1); }
      50%  { transform: translateY(-6px) scale(1.08); }
      100% { transform: translateY(0) scale(1); }
    }
    @keyframes ch04-bubble-in {
      0%   { opacity: 0; transform: translateX(-12px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes ch04-stack-pulse {
      0%   { opacity: 0.7; transform: scaleY(1); }
      50%  { opacity: 1; transform: scaleY(1.03); }
      100% { opacity: 0.7; transform: scaleY(1); }
    }
    .ch04-slot-shake {
      animation: ch04-slot-shake 0.35s ease;
    }
    .ch04-slot-flash {
      animation: ch04-slot-flash-green 0.5s ease;
    }
    .ch04-token-bounce {
      animation: ch04-token-travel 0.6s ease;
    }
    .ch04-bubble-in {
      animation: ch04-bubble-in 0.3s ease;
    }
    .ch04-component-card {
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
    }
    .ch04-component-card:hover {
      transform: scale(1.03);
    }
    .ch04-component-card.selected {
      box-shadow: 0 0 0 3px rgba(74,144,217,0.6);
    }
  `
  document.head.appendChild(style)
}

export default [
  // ─── Scene 1: Narrative hook ──────────────────────────────────────────────
  {
    id: 'ch04-s01-hook',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch04.s01_text')
      await ctx.narrator.say('ch04.s01_text2')
      await ctx.narrator.ask('ch04.s01_text2', [
        { key: 'ch04.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 2: Build the pipeline puzzle ───────────────────────────────────
  {
    id: 'ch04-s02-build',
    type: 'interactive',
    async enter(ctx) {
      injectTransformerStyle()

      const { components } = transformerData
      // Shuffle a copy for the left panel
      const shuffled = [...components].sort(() => Math.random() - 0.5)

      let selectedCard = null   // { id, element }
      let placedCount = 0
      const slotsFilled = new Array(components.length).fill(false)

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 860px;
        display: flex; flex-direction: column; align-items: center; gap: 16px;
      `

      // Instruction
      const instruction = document.createElement('div')
      instruction.textContent = ctx.i18n.t('ch04.s02_instruction')
      instruction.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        text-align: center; line-height: 1.5;
      `
      wrapper.appendChild(instruction)

      // Counter
      const counter = document.createElement('div')
      counter.style.cssText = `
        font-family: var(--font-hand); font-size: 17px; color: var(--accent);
      `
      function updateCounter() {
        const tpl = ctx.i18n.t('ch04.s02_placed')
        counter.textContent = tpl.replace('{{placed}}', placedCount)
      }
      updateCounter()
      wrapper.appendChild(counter)

      // Main two-column layout
      const columns = document.createElement('div')
      columns.style.cssText = `
        display: flex; gap: 32px; width: 100%; align-items: flex-start; justify-content: center;
      `

      // ── Left panel: shuffled component cards ──
      const leftPanel = document.createElement('div')
      leftPanel.style.cssText = `
        display: flex; flex-direction: column; gap: 10px;
        width: 220px; flex-shrink: 0;
      `

      const leftLabel = document.createElement('div')
      leftLabel.textContent = 'Components'
      leftLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--text);
        opacity: 0.6; text-align: center; margin-bottom: 4px;
      `
      leftPanel.appendChild(leftLabel)

      const cardElements = {}  // id → element

      shuffled.forEach(comp => {
        const card = document.createElement('div')
        card.className = 'ch04-component-card'
        card.dataset.id = comp.id
        card.style.cssText = `
          width: 200px; padding: 10px 12px 10px 0;
          background: #fff; border-radius: 10px;
          border: 2px solid ${comp.color};
          border-left: 6px solid ${comp.color};
          cursor: pointer; user-select: none;
          display: flex; flex-direction: column; gap: 3px;
        `

        const name = document.createElement('div')
        name.textContent = comp.name
        name.style.cssText = `
          font-family: var(--font-hand); font-size: 15px;
          color: var(--text); font-weight: bold; padding-left: 12px;
        `
        const desc = document.createElement('div')
        desc.textContent = comp.description
        desc.style.cssText = `
          font-family: var(--font-hand); font-size: 12px;
          color: var(--text); opacity: 0.7; line-height: 1.3; padding-left: 12px;
        `
        card.appendChild(name)
        card.appendChild(desc)
        leftPanel.appendChild(card)
        cardElements[comp.id] = card

        card.addEventListener('click', () => {
          if (card.dataset.placed === 'true') return
          // Deselect previous
          if (selectedCard) {
            selectedCard.element.classList.remove('selected')
          }
          if (selectedCard && selectedCard.id === comp.id) {
            selectedCard = null
            return
          }
          selectedCard = { id: comp.id, element: card }
          card.classList.add('selected')
        })
      })

      // ── Right panel: ordered slots ──
      const rightPanel = document.createElement('div')
      rightPanel.style.cssText = `
        display: flex; flex-direction: column; gap: 10px;
        width: 220px; flex-shrink: 0;
      `

      const rightLabel = document.createElement('div')
      rightLabel.textContent = 'Pipeline (in order)'
      rightLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--text);
        opacity: 0.6; text-align: center; margin-bottom: 4px;
      `
      rightPanel.appendChild(rightLabel)

      const slotElements = []  // index → element

      // Sort components by order for the slots
      const ordered = [...components].sort((a, b) => a.order - b.order)

      ordered.forEach((comp, slotIndex) => {
        const slot = document.createElement('div')
        slot.dataset.slotIndex = slotIndex
        slot.style.cssText = `
          width: 200px; height: 56px;
          border: 2px dashed rgba(45,45,45,0.3); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; position: relative;
        `

        const slotNum = document.createElement('div')
        slotNum.textContent = slotIndex + 1
        slotNum.style.cssText = `
          font-family: var(--font-hand); font-size: 22px;
          color: rgba(45,45,45,0.25); user-select: none;
        `
        slot.appendChild(slotNum)
        rightPanel.appendChild(slot)
        slotElements.push(slot)

        slot.addEventListener('click', () => {
          if (slotsFilled[slotIndex]) return
          if (!selectedCard) return

          // Find the component being placed
          const placingComp = components.find(c => c.id === selectedCard.id)
          const correctOrder = placingComp.order - 1  // 0-indexed

          if (correctOrder === slotIndex) {
            // Correct placement
            placeCard(placingComp, slotIndex, slot)
          } else {
            // Wrong — shake the slot
            slot.classList.remove('ch04-slot-shake')
            void slot.offsetWidth  // reflow to restart animation
            slot.classList.add('ch04-slot-shake')
            setTimeout(() => slot.classList.remove('ch04-slot-shake'), 400)
          }
        })
      })

      // Connect panels with an arrow in between
      const arrowCol = document.createElement('div')
      arrowCol.style.cssText = `
        display: flex; flex-direction: column; justify-content: center;
        align-items: center; font-size: 24px; color: var(--accent);
        opacity: 0.5; padding-top: 32px;
      `
      arrowCol.textContent = '→'

      columns.appendChild(leftPanel)
      columns.appendChild(arrowCol)
      columns.appendChild(rightPanel)
      wrapper.appendChild(columns)

      // Advance button (hidden until complete)
      const advBtn = document.createElement('button')
      advBtn.className = 'narrator-btn'
      advBtn.textContent = ctx.i18n.t('ch04.s02_btn')
      advBtn.style.display = 'none'
      wrapper.appendChild(advBtn)
      advBtn.addEventListener('click', () => ctx.bus.emit('scene:advance'))

      document.getElementById('app').appendChild(wrapper)

      function placeCard(comp, slotIndex, slot) {
        slotsFilled[slotIndex] = true
        placedCount++

        // Hide the source card
        const srcCard = cardElements[comp.id]
        srcCard.style.opacity = '0.35'
        srcCard.style.pointerEvents = 'none'
        srcCard.dataset.placed = 'true'
        srcCard.classList.remove('selected')
        selectedCard = null

        // Fill the slot with a mini card
        slot.innerHTML = ''
        slot.style.border = `2px solid ${comp.color}`
        slot.style.borderLeft = `6px solid ${comp.color}`
        slot.style.background = '#fff'
        slot.style.cursor = 'default'
        slot.classList.add('ch04-slot-flash')
        setTimeout(() => slot.classList.remove('ch04-slot-flash'), 600)

        const miniName = document.createElement('div')
        miniName.textContent = comp.name
        miniName.style.cssText = `
          font-family: var(--font-hand); font-size: 14px;
          color: var(--text); font-weight: bold; padding-left: 12px;
          text-align: left; width: 100%;
        `
        slot.appendChild(miniName)

        updateCounter()

        if (placedCount === components.length) {
          // All placed — show completion and button
          const completeMsg = document.createElement('div')
          completeMsg.textContent = ctx.i18n.t('ch04.s02_complete')
          completeMsg.style.cssText = `
            font-family: var(--font-hand); font-size: 20px; color: #5BA55B;
            text-align: center; margin-top: 4px;
          `
          wrapper.insertBefore(completeMsg, advBtn)
          advBtn.style.display = ''
        }
      }

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 3: Narrative — let's trace a token ─────────────────────────────
  {
    id: 'ch04-s03-trace-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch04.s03_text')
      await ctx.narrator.ask('ch04.s03_text', [
        { key: 'ch04.s03_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ─── Scene 4: Token journey animation ────────────────────────────────────
  {
    id: 'ch04-s04-journey',
    type: 'interactive',
    async enter(ctx) {
      injectTransformerStyle()

      const { tokenJourney } = transformerData
      const { components } = transformerData
      const steps = tokenJourney.steps
      let currentStep = 0  // 0 = Input (before pipeline), 1..N = pipeline stages

      // Map stage names to component colors
      const stageColorMap = {
        'Input':     '#aaa',
        'Embedding': '#4A90D9',
        'Position':  '#5BA55B',
        'Attention': '#8278B4',
        'FFN':       '#D4645C',
        'Output':    '#C88C3C',
      }

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 780px;
        display: flex; flex-direction: column; align-items: center; gap: 16px;
      `

      // Step counter label
      const stepLabel = document.createElement('div')
      stepLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 16px; color: var(--accent); opacity: 0.9;
      `
      wrapper.appendChild(stepLabel)

      // Main area: pipeline on left, info on right
      const mainRow = document.createElement('div')
      mainRow.style.cssText = `
        display: flex; gap: 32px; align-items: flex-start; width: 100%; justify-content: center;
      `

      // ── Pipeline column ──
      const pipelineCol = document.createElement('div')
      pipelineCol.style.cssText = `
        display: flex; flex-direction: column; align-items: center; gap: 0;
        width: 180px; flex-shrink: 0;
      `

      // Token ball at the top
      const tokenBall = document.createElement('div')
      tokenBall.textContent = tokenJourney.token
      tokenBall.style.cssText = `
        width: 52px; height: 52px; border-radius: 50%;
        background: #4A90D9; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-family: var(--font-mono); font-size: 14px; font-weight: bold;
        margin-bottom: 8px; transition: background 0.4s, transform 0.4s;
        box-shadow: 0 2px 10px rgba(74,144,217,0.4);
        position: relative; z-index: 2;
      `
      pipelineCol.appendChild(tokenBall)

      // Pipeline stages
      const ordered = [...components].sort((a, b) => a.order - b.order)
      const stageBlocks = []  // { element, connectorEl }

      ordered.forEach((comp, i) => {
        // Connector line
        const connector = document.createElement('div')
        connector.style.cssText = `
          width: 2px; height: 14px; background: rgba(45,45,45,0.2);
          margin: 0 auto;
        `
        pipelineCol.appendChild(connector)

        const block = document.createElement('div')
        block.style.cssText = `
          width: 160px; padding: 8px 12px;
          border-radius: 10px; text-align: center;
          border: 2px solid ${comp.color};
          border-left: 5px solid ${comp.color};
          background: rgba(255,255,255,0.5);
          font-family: var(--font-hand); font-size: 13px; color: var(--text);
          transition: background 0.3s, box-shadow 0.3s;
        `
        block.textContent = comp.name
        pipelineCol.appendChild(block)
        stageBlocks.push({ element: block, connector })
      })

      mainRow.appendChild(pipelineCol)

      // ── Info column ──
      const infoCol = document.createElement('div')
      infoCol.style.cssText = `
        flex: 1; max-width: 360px; min-width: 200px;
        display: flex; flex-direction: column; gap: 12px;
        padding-top: 60px;
      `

      // Speech bubble
      const bubble = document.createElement('div')
      bubble.style.cssText = `
        background: rgba(45,45,45,0.05); border-radius: 12px;
        padding: 16px 18px; border: 2px solid rgba(45,45,45,0.12);
        min-height: 90px;
      `

      const bubbleStage = document.createElement('div')
      bubbleStage.style.cssText = `
        font-family: var(--font-hand); font-size: 15px; font-weight: bold;
        color: var(--accent); margin-bottom: 6px;
      `
      const bubbleValue = document.createElement('div')
      bubbleValue.style.cssText = `
        font-family: var(--font-mono); font-size: 13px; color: var(--text);
        margin-bottom: 8px; word-break: break-all;
      `
      const bubbleDesc = document.createElement('div')
      bubbleDesc.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--text); opacity: 0.8;
        line-height: 1.5;
      `
      bubble.appendChild(bubbleStage)
      bubble.appendChild(bubbleValue)
      bubble.appendChild(bubbleDesc)
      infoCol.appendChild(bubble)

      mainRow.appendChild(infoCol)
      wrapper.appendChild(mainRow)

      // Next button
      const nextBtn = document.createElement('button')
      nextBtn.className = 'narrator-btn'
      wrapper.appendChild(nextBtn)

      document.getElementById('app').appendChild(wrapper)

      function render() {
        const step = steps[currentStep]
        const color = stageColorMap[step.stage] || '#aaa'

        // Update step label
        const tpl = ctx.i18n.t('ch04.s04_step')
        stepLabel.textContent = tpl
          .replace('{{current}}', currentStep + 1)
          .replace('{{total}}', steps.length)
          .replace('{{stage}}', step.stage)

        // Move token ball color to match current stage
        tokenBall.style.background = color
        tokenBall.style.boxShadow = `0 2px 10px ${color}66`
        tokenBall.classList.remove('ch04-token-bounce')
        void tokenBall.offsetWidth
        tokenBall.classList.add('ch04-token-bounce')

        // Highlight the matching pipeline block
        // Map: step 0 = Input (no block), step 1 = Embedding (block 0), step 2 = Position (block 1), etc.
        stageBlocks.forEach(({ element }, i) => {
          const isActive = (currentStep - 1) === i
          element.style.background = isActive ? `${color}22` : 'rgba(255,255,255,0.5)'
          element.style.boxShadow = isActive ? `0 0 0 2px ${color}55` : 'none'
          element.style.borderColor = isActive ? color : ordered[i].color
        })

        // Update speech bubble
        bubble.classList.remove('ch04-bubble-in')
        void bubble.offsetWidth
        bubble.classList.add('ch04-bubble-in')
        bubbleStage.textContent = step.stage
        bubbleStage.style.color = color
        bubbleValue.textContent = step.value
        bubbleDesc.textContent = step.description

        // Update button
        const isLast = currentStep === steps.length - 1
        nextBtn.textContent = ctx.i18n.t(isLast ? 'ch04.s04_done' : 'ch04.s04_next')
      }

      nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
          currentStep++
          render()
        } else {
          ctx.bus.emit('scene:advance')
        }
      })

      render()
      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 5: The BUT reversal — stacking layers ──────────────────────────
  {
    id: 'ch04-s05-but',
    type: 'interactive',
    async enter(ctx) {
      injectTransformerStyle()

      const layerCounts = [1, 12, 96]
      let currentIndex = 0

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 720px;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
        text-align: center;
      `

      // Text 1
      const text1 = document.createElement('div')
      text1.textContent = ctx.i18n.t('ch04.s05_text')
      text1.style.cssText = `
        font-family: var(--font-hand); font-size: 20px; color: var(--text);
        line-height: 1.5; max-width: 560px;
      `
      wrapper.appendChild(text1)

      // Stack visual area
      const stackArea = document.createElement('div')
      stackArea.style.cssText = `
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        min-height: 180px; justify-content: flex-end;
        padding: 16px; width: 100%;
      `
      wrapper.appendChild(stackArea)

      // Layer count label
      const layerLabel = document.createElement('div')
      layerLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 26px; color: var(--accent); font-weight: bold;
      `
      wrapper.appendChild(layerLabel)

      // Text 2
      const text2 = document.createElement('div')
      text2.textContent = ctx.i18n.t('ch04.s05_text2')
      text2.style.cssText = `
        font-family: var(--font-hand); font-size: 19px; color: var(--text);
        line-height: 1.6; max-width: 560px; display: none;
      `
      wrapper.appendChild(text2)

      // Button
      const btn = document.createElement('button')
      btn.className = 'narrator-btn'
      wrapper.appendChild(btn)

      document.getElementById('app').appendChild(wrapper)

      function renderStack(count) {
        stackArea.innerHTML = ''
        layerLabel.textContent = `${count} layer${count > 1 ? 's' : ''}`

        // Show up to 12 visual blocks, then use a compressed representation
        const maxVisible = 12
        const showCount = Math.min(count, maxVisible)
        const blockHeight = count === 1 ? 44 : count <= 12 ? 28 : 14

        for (let i = 0; i < showCount; i++) {
          const block = document.createElement('div')
          block.style.cssText = `
            width: 260px; height: ${blockHeight}px; border-radius: 6px;
            background: linear-gradient(90deg, rgba(130,120,180,0.7) 0%, rgba(212,100,92,0.7) 100%);
            border: 1px solid rgba(130,120,180,0.4);
            display: flex; align-items: center; justify-content: center;
            font-family: var(--font-hand); font-size: ${blockHeight > 20 ? '12px' : '10px'};
            color: rgba(255,255,255,0.9);
          `
          if (count === 1 || showCount <= 6) {
            block.textContent = 'Attention + FFN'
          }
          stackArea.appendChild(block)
        }

        if (count > maxVisible) {
          const ellipsis = document.createElement('div')
          ellipsis.textContent = `+ ${count - maxVisible} more`
          ellipsis.style.cssText = `
            font-family: var(--font-hand); font-size: 13px; color: var(--text);
            opacity: 0.55; margin-top: 4px;
          `
          stackArea.appendChild(ellipsis)
        }
      }

      function updateBtn() {
        const isLast = currentIndex === layerCounts.length - 1
        if (isLast) {
          btn.textContent = ctx.i18n.t('ch04.s05_btn')
        } else {
          const next = layerCounts[currentIndex + 1]
          btn.textContent = `Stack ${next} layers →`
        }
      }

      renderStack(layerCounts[0])
      updateBtn()

      btn.addEventListener('click', () => {
        const isLast = currentIndex === layerCounts.length - 1
        if (!isLast) {
          currentIndex++
          if (currentIndex === 1) {
            text2.style.display = ''
          }
          renderStack(layerCounts[currentIndex])
          updateBtn()
        } else {
          ctx.bus.emit('scene:advance')
        }
      })

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // ─── Scene 6: Wrap-up ─────────────────────────────────────────────────────
  {
    id: 'ch04-s06-wrapup',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch04.s06_text')
      await ctx.narrator.say('ch04.s06_text2')
      await ctx.narrator.ask('ch04.s06_text2', [
        { key: 'ch04.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch04-transformer') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
