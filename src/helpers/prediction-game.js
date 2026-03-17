/**
 * Creates a prediction game: prompt → choices → reveal → score.
 * @param {HTMLElement} panel - DOM panel to render into
 * @param {object} opts
 * @param {Array} opts.rounds - [{ prompt, choices: [string], correct: number, explanation: string }]
 * @param {object} opts.i18n
 * @param {function} opts.onComplete - (score, total) => void
 * @returns {{ destroy }}
 */
export function createPredictionGame(panel, { rounds, i18n, onComplete }) {
  let currentRound = 0
  let score = 0
  let destroyed = false

  const wrapper = document.createElement('div')
  wrapper.className = 'prediction-game'
  panel.appendChild(wrapper)

  function renderRound() {
    if (destroyed) return
    wrapper.innerHTML = ''
    const round = rounds[currentRound]

    // Round counter
    const counter = document.createElement('div')
    counter.className = 'score-badge'
    counter.textContent = `${currentRound + 1} / ${rounds.length}`
    counter.style.marginBottom = '16px'
    wrapper.appendChild(counter)

    // Prompt
    const prompt = document.createElement('p')
    prompt.textContent = round.prompt
    prompt.style.fontSize = '22px'
    prompt.style.marginBottom = '20px'
    wrapper.appendChild(prompt)

    // Choices
    const choicesDiv = document.createElement('div')
    choicesDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px;'
    round.choices.forEach((choice, i) => {
      const btn = document.createElement('button')
      btn.className = 'choice-card'
      btn.textContent = choice
      btn.addEventListener('click', () => handleChoice(i, choicesDiv, round))
      choicesDiv.appendChild(btn)
    })
    wrapper.appendChild(choicesDiv)
  }

  function handleChoice(picked, choicesDiv, round) {
    const cards = choicesDiv.querySelectorAll('.choice-card')
    cards.forEach(c => { c.style.pointerEvents = 'none' })

    const isCorrect = picked === round.correct
    if (isCorrect) score++

    cards[picked].classList.add(isCorrect ? 'correct' : 'wrong')
    if (!isCorrect) cards[round.correct].classList.add('correct')

    // Explanation
    if (round.explanation) {
      const exp = document.createElement('p')
      exp.textContent = round.explanation
      exp.className = 'fade-in'
      exp.style.cssText = 'margin-top: 16px; font-size: 17px; color: var(--text-muted);'
      wrapper.appendChild(exp)
    }

    // Next / Complete button
    const btn = document.createElement('button')
    btn.className = 'scene-btn fade-in'
    btn.style.marginTop = '16px'
    const isLast = currentRound >= rounds.length - 1
    btn.textContent = isLast ? '→' : '→'
    btn.addEventListener('click', () => {
      if (isLast) {
        onComplete?.(score, rounds.length)
      } else {
        currentRound++
        renderRound()
      }
    })
    wrapper.appendChild(btn)
  }

  renderRound()

  return {
    getScore() { return score },
    destroy() {
      destroyed = true
      wrapper.remove()
    }
  }
}
