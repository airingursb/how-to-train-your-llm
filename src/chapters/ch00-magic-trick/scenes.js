import completionsData from './data/completions.json'

function findCompletion(prompt) {
  const lower = prompt.toLowerCase().trim()
  const match = completionsData.completions.find(c =>
    lower.startsWith(c.prompt.toLowerCase().substring(0, 10))
  )
  return match || {
    prompt,
    output: completionsData.fallback.output,
  }
}

export default [
  // Scene 1: Hook — "Feels like magic"
  {
    id: 'ch00-s01-hook',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch00.s01_text')
      await ctx.narrator.ask('ch00.s01_text', [
        { key: 'ch00.s01_btn', action: () => ctx.bus.emit('scene:advance') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  },

  // Scene 2: Interactive — type a prompt, see "generation"
  {
    id: 'ch00-s02-generate',
    type: 'interactive',
    async enter(ctx) {
      const { narrator, bus } = ctx

      const wrapper = document.createElement('div')
      wrapper.id = 'ch00-prompt-ui'
      wrapper.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 15; text-align: center; width: 90%; max-width: 600px;
      `

      const label = document.createElement('div')
      label.textContent = ctx.i18n.t('ch00.s02_prompt_label')
      label.style.cssText = `font-family: var(--font-hand); font-size: 24px; margin-bottom: 16px; color: var(--text);`

      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = ctx.i18n.t('ch00.s02_prompt_placeholder')
      input.style.cssText = `
        font-family: var(--font-mono); font-size: 18px; padding: 12px 20px;
        width: 100%; border: 2.5px solid var(--text); border-radius: 12px;
        background: var(--bg); color: var(--text); outline: none;
      `

      const btn = document.createElement('button')
      btn.textContent = ctx.i18n.t('ch00.s02_generate')
      btn.className = 'narrator-btn'
      btn.style.marginTop = '16px'

      const output = document.createElement('div')
      output.style.cssText = `
        font-family: var(--font-mono); font-size: 16px; line-height: 1.6;
        margin-top: 24px; text-align: left; color: var(--text);
        min-height: 80px; padding: 16px; border-radius: 12px;
        background: rgba(45,45,45,0.05); display: none;
      `

      wrapper.appendChild(label)
      wrapper.appendChild(input)
      wrapper.appendChild(btn)
      wrapper.appendChild(output)
      document.getElementById('app').appendChild(wrapper)

      const generate = async () => {
        const prompt = input.value.trim() || 'Once upon a time'
        const completion = findCompletion(prompt)
        btn.textContent = ctx.i18n.t('ch00.s02_generating')
        btn.disabled = true
        output.style.display = 'block'
        output.innerHTML = `<strong>${prompt}</strong>`

        const chars = completion.output.split('')
        for (let i = 0; i < chars.length; i++) {
          output.innerHTML += chars[i]
          await new Promise(r => setTimeout(r, 25))
        }

        btn.textContent = ctx.i18n.t('ch00.s02_generate')
        btn.disabled = false

        await new Promise(r => setTimeout(r, 2000))
        bus.emit('scene:advance')
      }

      btn.addEventListener('click', generate)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generate()
      })

      input.focus()

      return { wrapper }
    },
    exit(returnVal) {
      returnVal?.wrapper?.remove()
    }
  },

  // Scene 3: "No magic" reveal
  {
    id: 'ch00-s03-reveal',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch00.s03_text')
      await new Promise(r => setTimeout(r, 1500))
      ctx.bus.emit('scene:advance')
    }
  },

  // Scene 4: "Let's build one" call to action
  {
    id: 'ch00-s04-cta',
    type: 'narrative',
    async enter(ctx) {
      await ctx.narrator.say('ch00.s04_text')
      await new Promise(r => setTimeout(r, 1000))
      await ctx.narrator.say('ch00.s04_text2')
      await ctx.narrator.ask('ch00.s04_text2', [
        { key: 'ch00.s04_btn', action: () => ctx.bus.emit('chapter:complete', 'ch00-magic-trick') }
      ])
    },
    exit(_, ctx) {
      ctx?.narrator?.clear()
    }
  }
]
