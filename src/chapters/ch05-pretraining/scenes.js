import simData from './data/training-sim.json'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function injectCh05Style() {
  if (document.getElementById('ch05-pretraining-style')) return
  const style = document.createElement('style')
  style.id = 'ch05-pretraining-style'
  style.textContent = `
    @keyframes ch05-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .ch05-cursor::after {
      content: '▋';
      display: inline-block;
      animation: ch05-blink 1s step-start infinite;
      margin-left: 1px;
    }
    .ch05-data-btn {
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .ch05-data-btn:hover {
      transform: scale(1.04);
    }
    .ch05-seg-btn {
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
  `
  document.head.appendChild(style)
}

async function typewrite(el, text, delay = 18) {
  el.textContent = ''
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i]
    await new Promise(r => setTimeout(r, delay))
  }
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

export default [

  // ── Scene 1: Narrative intro ───────────────────────────────────────────────
  {
    id: 'ch05-s01-intro',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch05.s01_text')
      await new Promise(r => setTimeout(r, 600))
      await ctx.narrator.say('ch05.s01_text2')
      await ctx.narrator.ask('ch05.s01_text2', [
        { key: 'ch05.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ── Scene 2: Interactive training sandbox ──────────────────────────────────
  {
    id: 'ch05-s02-sandbox',
    type: 'interactive',
    async enter(ctx) {
      injectCh05Style()
      const { i18n, bus } = ctx
      const { dataSources, sampleOutputs, lossCurve } = simData

      // State
      let selectedSources = new Set(['wikipedia'])
      let lrIndex = 1   // 0=too small, 1=just right, 2=too big
      let sizeIndex = 1 // 0=small, 1=medium, 2=large
      let trainingStarted = false
      let animationTimers = []

      // ── Root wrapper ──
      const wrapper = document.createElement('div')
      wrapper.id = 'ch05-sandbox-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 94%; max-width: 820px;
        display: flex; flex-direction: column; align-items: stretch; gap: 18px;
      `

      // ── Data source picker ──
      const dataSection = document.createElement('div')
      dataSection.style.cssText = `display: flex; flex-direction: column; gap: 10px;`

      const dataLabel = document.createElement('div')
      dataLabel.textContent = i18n.t('ch05.s02_data_label')
      dataLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 18px; color: var(--text);
      `

      const dataRow = document.createElement('div')
      dataRow.style.cssText = `display: flex; gap: 10px; flex-wrap: wrap;`

      const dataButtons = dataSources.map(src => {
        const btn = document.createElement('button')
        btn.className = 'ch05-data-btn'
        btn.innerHTML = `${src.icon} ${src.name}`
        const updateStyle = (active) => {
          btn.style.cssText = `
            font-family: var(--font-hand); font-size: 15px;
            padding: 8px 16px; border-radius: 20px; cursor: pointer;
            border: 2.5px solid ${active ? 'var(--accent)' : 'var(--text)'};
            background: ${active ? 'rgba(var(--accent-rgb,255,140,0), 0.18)' : 'transparent'};
            color: var(--text);
          `
        }
        updateStyle(selectedSources.has(src.id))
        btn.addEventListener('click', () => {
          if (trainingStarted) return
          if (selectedSources.has(src.id)) {
            if (selectedSources.size === 1) return // require at least 1
            selectedSources.delete(src.id)
          } else {
            selectedSources.add(src.id)
          }
          updateStyle(selectedSources.has(src.id))
        })
        dataRow.appendChild(btn)
        return { btn, src, updateStyle }
      })

      dataSection.appendChild(dataLabel)
      dataSection.appendChild(dataRow)

      // ── Hyperparameters ──
      const hyperSection = document.createElement('div')
      hyperSection.style.cssText = `display: flex; flex-direction: column; gap: 14px;`

      // Learning rate: 3-position button group
      const lrRow = document.createElement('div')
      lrRow.style.cssText = `display: flex; flex-direction: column; gap: 8px;`
      const lrLabel = document.createElement('div')
      lrLabel.textContent = i18n.t('ch05.s02_lr_label')
      lrLabel.style.cssText = `font-family: var(--font-hand); font-size: 17px; color: var(--text);`

      const lrOptions = [
        i18n.t('ch05.s02_lr_low'),
        i18n.t('ch05.s02_lr_mid'),
        i18n.t('ch05.s02_lr_high'),
      ]
      const lrBtnRow = document.createElement('div')
      lrBtnRow.style.cssText = `display: flex; gap: 8px;`
      const lrBtns = lrOptions.map((label, idx) => {
        const btn = document.createElement('button')
        btn.className = 'ch05-seg-btn'
        btn.textContent = label
        const updateLr = (active) => {
          btn.style.cssText = `
            font-family: var(--font-hand); font-size: 14px; padding: 6px 14px;
            border-radius: 16px; cursor: pointer;
            border: 2px solid ${active ? '#4A90D9' : 'var(--text)'};
            background: ${active ? 'rgba(74,144,217,0.2)' : 'transparent'};
            color: var(--text);
          `
        }
        updateLr(idx === lrIndex)
        btn.addEventListener('click', () => {
          if (trainingStarted) return
          lrIndex = idx
          lrBtns.forEach((b, i) => b._update(i === idx))
        })
        btn._update = updateLr
        lrBtnRow.appendChild(btn)
        return btn
      })
      lrRow.appendChild(lrLabel)
      lrRow.appendChild(lrBtnRow)

      // Model size: 3-position button group
      const sizeRow = document.createElement('div')
      sizeRow.style.cssText = `display: flex; flex-direction: column; gap: 8px;`
      const sizeLabel = document.createElement('div')
      sizeLabel.textContent = i18n.t('ch05.s02_size_label')
      sizeLabel.style.cssText = `font-family: var(--font-hand); font-size: 17px; color: var(--text);`

      const sizeOptions = [
        i18n.t('ch05.s02_size_small'),
        i18n.t('ch05.s02_size_medium'),
        i18n.t('ch05.s02_size_large'),
      ]
      const sizeBtnRow = document.createElement('div')
      sizeBtnRow.style.cssText = `display: flex; gap: 8px;`
      const sizeBtns = sizeOptions.map((label, idx) => {
        const btn = document.createElement('button')
        btn.className = 'ch05-seg-btn'
        btn.textContent = label
        const updateSize = (active) => {
          btn.style.cssText = `
            font-family: var(--font-hand); font-size: 14px; padding: 6px 14px;
            border-radius: 16px; cursor: pointer;
            border: 2px solid ${active ? '#50B478' : 'var(--text)'};
            background: ${active ? 'rgba(80,180,120,0.2)' : 'transparent'};
            color: var(--text);
          `
        }
        updateSize(idx === sizeIndex)
        btn.addEventListener('click', () => {
          if (trainingStarted) return
          sizeIndex = idx
          sizeBtns.forEach((b, i) => b._update(i === idx))
        })
        btn._update = updateSize
        sizeBtnRow.appendChild(btn)
        return btn
      })
      sizeRow.appendChild(sizeLabel)
      sizeRow.appendChild(sizeBtnRow)

      hyperSection.appendChild(lrRow)
      hyperSection.appendChild(sizeRow)

      // ── Start button ──
      const startBtn = document.createElement('button')
      startBtn.className = 'narrator-btn'
      startBtn.textContent = i18n.t('ch05.s02_start')
      startBtn.style.alignSelf = 'flex-start'

      // ── Training display (hidden until start) ──
      const trainingDisplay = document.createElement('div')
      trainingDisplay.style.cssText = `
        display: none; flex-direction: column; gap: 14px;
      `

      // Step + loss counter row
      const statsRow = document.createElement('div')
      statsRow.style.cssText = `
        display: flex; gap: 24px; align-items: baseline;
      `
      const stepLabel = document.createElement('div')
      stepLabel.style.cssText = `font-family: var(--font-hand); font-size: 17px; color: var(--accent);`
      const lossDisplay = document.createElement('div')
      lossDisplay.style.cssText = `font-family: var(--font-hand); font-size: 17px; color: var(--text); opacity: 0.8;`
      statsRow.appendChild(stepLabel)
      statsRow.appendChild(lossDisplay)

      // Loss curve canvas
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 180
      canvas.style.cssText = `
        width: 100%; height: auto; border-radius: 10px;
        background: rgba(45,45,45,0.05);
        border: 1.5px solid rgba(45,45,45,0.12);
      `

      // Model output area
      const outputSection = document.createElement('div')
      outputSection.style.cssText = `
        background: rgba(45,45,45,0.05); border-radius: 10px;
        padding: 14px 18px; border: 1.5px solid rgba(45,45,45,0.12);
      `
      const outputLabel = document.createElement('div')
      outputLabel.textContent = i18n.t('ch05.s02_output_label')
      outputLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 15px; color: var(--text);
        opacity: 0.65; margin-bottom: 8px;
      `
      const outputText = document.createElement('div')
      outputText.className = 'ch05-cursor'
      outputText.style.cssText = `
        font-family: var(--font-mono); font-size: 14px; color: var(--text);
        line-height: 1.6; min-height: 22px;
      `
      outputSection.appendChild(outputLabel)
      outputSection.appendChild(outputText)

      // Advance button (hidden until done)
      const advBtn = document.createElement('button')
      advBtn.className = 'narrator-btn'
      advBtn.textContent = i18n.t('ch05.s02_btn')
      advBtn.style.display = 'none'
      advBtn.style.alignSelf = 'flex-start'
      advBtn.addEventListener('click', () => bus.emit('scene:advance'))

      trainingDisplay.appendChild(statsRow)
      trainingDisplay.appendChild(canvas)
      trainingDisplay.appendChild(outputSection)
      trainingDisplay.appendChild(advBtn)

      // Assemble wrapper
      wrapper.appendChild(dataSection)
      wrapper.appendChild(hyperSection)
      wrapper.appendChild(startBtn)
      wrapper.appendChild(trainingDisplay)

      document.getElementById('app').appendChild(wrapper)

      // ── Draw loss curve ──
      function drawCurve(points, maxPoints, diverge) {
        const ctx2 = canvas.getContext('2d')
        const W = canvas.width
        const H = canvas.height
        const pad = { top: 16, right: 20, bottom: 28, left: 42 }
        const plotW = W - pad.left - pad.right
        const plotH = H - pad.top - pad.bottom

        ctx2.clearRect(0, 0, W, H)

        // Axes
        ctx2.strokeStyle = 'rgba(100,100,100,0.25)'
        ctx2.lineWidth = 1
        ctx2.beginPath()
        ctx2.moveTo(pad.left, pad.top)
        ctx2.lineTo(pad.left, pad.top + plotH)
        ctx2.lineTo(pad.left + plotW, pad.top + plotH)
        ctx2.stroke()

        // Y-axis labels
        ctx2.fillStyle = 'rgba(100,100,100,0.6)'
        ctx2.font = '11px monospace'
        ctx2.textAlign = 'right'
        const yMax = diverge ? 12 : 9
        for (let v = 0; v <= yMax; v += 3) {
          const y = pad.top + plotH - (v / yMax) * plotH
          ctx2.fillText(v.toFixed(0), pad.left - 6, y + 4)
          ctx2.strokeStyle = 'rgba(100,100,100,0.08)'
          ctx2.beginPath()
          ctx2.moveTo(pad.left, y)
          ctx2.lineTo(pad.left + plotW, y)
          ctx2.stroke()
        }

        if (points.length < 2) return

        // Curve
        ctx2.strokeStyle = diverge ? '#ef4444' : '#4A90D9'
        ctx2.lineWidth = 2.5
        ctx2.lineJoin = 'round'
        ctx2.beginPath()
        points.forEach((pt, i) => {
          const x = pad.left + (i / (maxPoints - 1)) * plotW
          const y = pad.top + plotH - (Math.min(pt, yMax) / yMax) * plotH
          if (i === 0) ctx2.moveTo(x, y)
          else ctx2.lineTo(x, y)
        })
        ctx2.stroke()

        // Current point dot
        const last = points[points.length - 1]
        const lx = pad.left + ((points.length - 1) / (maxPoints - 1)) * plotW
        const ly = pad.top + plotH - (Math.min(last, yMax) / yMax) * plotH
        ctx2.fillStyle = diverge ? '#ef4444' : '#4A90D9'
        ctx2.beginPath()
        ctx2.arc(lx, ly, 4, 0, Math.PI * 2)
        ctx2.fill()
      }

      // ── Training animation ──
      startBtn.addEventListener('click', () => {
        if (trainingStarted) return
        trainingStarted = true
        startBtn.style.display = 'none'
        trainingDisplay.style.display = 'flex'

        const diverge = lrIndex === 2
        const slowdown = lrIndex === 0

        // Build loss points
        const baseCurve = lossCurve.map((v, i) => {
          if (diverge) return v < 4 ? v * 0.8 : v * 1.4 + i * 0.6
          if (slowdown) return v * 0.6 + (lossCurve[lossCurve.length - 1] * 0.4)
          // size bonus
          const sizeBonus = [0.15, 0, -0.12][sizeIndex]
          return Math.max(1.5, v + sizeBonus)
        })

        const steps = [0, 100, 500, 2000, 5000]
        const outputKeys = ['step0', 'step100', 'step500', 'step2000', 'step5000']

        let curvePoints = []
        const totalCurveFrames = baseCurve.length
        let frameIdx = 0

        const stepDelay = 380  // ms per curve point

        function animateCurveFrame() {
          if (frameIdx >= totalCurveFrames) {
            // training complete
            stepLabel.textContent = i18n.t('ch05.s02_complete')
            lossDisplay.textContent = ''
            advBtn.style.display = 'inline-block'
            return
          }

          curvePoints.push(baseCurve[frameIdx])
          const progress = frameIdx / (totalCurveFrames - 1)
          const stepVal = Math.round(progress * 5000)
          const lossVal = baseCurve[frameIdx].toFixed(2)

          stepLabel.textContent = i18n.t('ch05.s02_step').replace('{{step}}', stepVal)
          lossDisplay.textContent = i18n.t('ch05.s02_loss').replace('{{loss}}', lossVal)
          drawCurve(curvePoints, totalCurveFrames, diverge)

          // Determine which output stage we're at
          const outputStageIdx = Math.min(
            Math.floor(progress * outputKeys.length),
            outputKeys.length - 1
          )

          if (frameIdx === 0 || outputStageIdx !== Math.floor(((frameIdx - 1) / (totalCurveFrames - 1)) * outputKeys.length)) {
            const key = diverge ? 'step0' : outputKeys[outputStageIdx]
            const text = simData.sampleOutputs[key]
            // typewrite without awaiting — run concurrently with curve
            typewrite(outputText, text, 14)
          }

          frameIdx++
          const timer = setTimeout(animateCurveFrame, stepDelay)
          animationTimers.push(timer)
        }

        animateCurveFrame()
      })

      return { wrapper, animationTimers }
    },
    exit(returnVal) {
      // Cancel any pending animation timers
      if (returnVal?.animationTimers) {
        returnVal.animationTimers.forEach(t => clearTimeout(t))
      }
      returnVal?.wrapper?.remove()
    }
  },

  // ── Scene 3: Narrative — loss explained ───────────────────────────────────
  {
    id: 'ch05-s03-loss',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch05.s03_text')
      await ctx.narrator.ask('ch05.s03_text', [
        { key: 'ch05.s03_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ── Scene 4: Narrative — scaling laws ─────────────────────────────────────
  {
    id: 'ch05-s04-scaling',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch05.s04_text')
      await new Promise(r => setTimeout(r, 700))
      await ctx.narrator.say('ch05.s04_text2')
      await ctx.narrator.ask('ch05.s04_text2', [
        { key: 'ch05.s04_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // ── Scene 5: Interactive — the BUT moment ─────────────────────────────────
  {
    id: 'ch05-s05-but',
    type: 'interactive',
    async enter(ctx) {
      injectCh05Style()
      const { i18n, bus, narrator } = ctx
      const { pretrainedOutputs } = simData

      const wrapper = document.createElement('div')
      wrapper.id = 'ch05-but-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; width: 92%; max-width: 720px;
        display: flex; flex-direction: column; align-items: stretch; gap: 18px;
      `

      // Prompt box
      const promptBox = document.createElement('div')
      promptBox.style.cssText = `
        padding: 14px 20px; border-radius: 12px;
        background: rgba(var(--accent-rgb,255,140,0), 0.12);
        border: 2px solid var(--accent);
        font-family: var(--font-mono); font-size: 15px; color: var(--text);
        line-height: 1.5;
      `
      const promptLabelEl = document.createElement('span')
      promptLabelEl.style.cssText = `font-family: var(--font-hand); opacity: 0.7; margin-right: 8px;`
      promptLabelEl.textContent = i18n.t('ch05.s05_prompt')
      promptBox.appendChild(promptLabelEl)

      // Output box
      const outputBox = document.createElement('div')
      outputBox.style.cssText = `
        padding: 18px 22px; border-radius: 12px;
        background: rgba(45,45,45,0.05);
        border: 1.5px solid rgba(45,45,45,0.15);
        font-family: var(--font-mono); font-size: 14px; color: var(--text);
        line-height: 1.7; min-height: 90px; white-space: pre-wrap;
      `
      outputBox.className = 'ch05-cursor'

      // "keep going" label
      const keepGoingLabel = document.createElement('div')
      keepGoingLabel.style.cssText = `
        font-family: var(--font-hand); font-size: 14px; color: var(--text);
        opacity: 0.55; text-align: center; display: none;
      `
      keepGoingLabel.textContent = '↓  it just keeps going…'

      wrapper.appendChild(promptBox)
      wrapper.appendChild(outputBox)
      wrapper.appendChild(keepGoingLabel)

      document.getElementById('app').appendChild(wrapper)

      // Typewrite the pretrained output — first part, then continuation
      const fullText = pretrainedOutputs.writeEmail + '\n' + pretrainedOutputs.writeEmailContinued + '…'
      await typewrite(outputBox, fullText, 22)

      // Show "keeps going" label
      keepGoingLabel.style.display = 'block'

      // Remove cursor class once done
      outputBox.classList.remove('ch05-cursor')

      // Narrator explains the BUT
      await new Promise(r => setTimeout(r, 500))
      await narrator.say('ch05.s05_text')
      await narrator.ask('ch05.s05_text', [
        { key: 'ch05.s05_btn', action: () => bus.emit('scene:advance') }
      ])

      return { wrapper }
    },
    exit(returnVal, ctx) {
      ctx?.narrator?.clear()
      returnVal?.wrapper?.remove()
    }
  },

  // ── Scene 6: Narrative — transition to Act II ─────────────────────────────
  {
    id: 'ch05-s06-transition',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch05.s06_text')
      await new Promise(r => setTimeout(r, 700))
      await ctx.narrator.say('ch05.s06_text2')
      await ctx.narrator.ask('ch05.s06_text2', [
        { key: 'ch05.s06_btn', action: () => ctx.bus.emit('chapter:complete', 'ch05-pretraining') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },
]
