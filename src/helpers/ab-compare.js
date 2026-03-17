/**
 * Creates a side-by-side A/B comparison.
 * @param {HTMLElement} panel - DOM panel to render into
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {{ label: string, text: string }} opts.responseA
 * @param {{ label: string, text: string }} opts.responseB
 * @param {boolean} [opts.typewriter] — stream text character by character
 * @param {function} [opts.onPick] — (picked: 'a'|'b') => void
 * @returns {{ reveal, destroy }}
 */
export function createABCompare(panel, { prompt, responseA, responseB, typewriter = false, onPick }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'ab-compare'
  panel.appendChild(wrapper)

  // Prompt
  if (prompt) {
    const p = document.createElement('p')
    p.textContent = prompt
    p.style.cssText = 'font-size: 18px; margin-bottom: 16px; color: var(--text-muted);'
    wrapper.appendChild(p)
  }

  // Cards container
  const cards = document.createElement('div')
  cards.style.cssText = 'display: flex; gap: 12px;'

  function makeCard(response, side) {
    const card = document.createElement('div')
    card.className = 'compare-card'

    const label = document.createElement('div')
    label.className = 'compare-label'
    label.textContent = response.label

    const text = document.createElement('div')
    text.className = 'compare-text'

    card.appendChild(label)
    card.appendChild(text)

    if (onPick) {
      card.addEventListener('click', () => {
        if (card.dataset.picked) return
        card.dataset.picked = 'true'
        onPick(side)
      })
    }

    return { card, text }
  }

  const cardA = makeCard(responseA, 'a')
  const cardB = makeCard(responseB, 'b')
  cards.appendChild(cardA.card)
  cards.appendChild(cardB.card)
  wrapper.appendChild(cards)

  let aborted = false

  // Typewriter effect
  async function typewrite(el, fullText, speed = 20) {
    el.textContent = ''
    for (let i = 0; i < fullText.length && !aborted; i++) {
      el.textContent += fullText[i]
      await new Promise(r => setTimeout(r, speed))
    }
    if (aborted) el.textContent = fullText
  }

  if (typewriter) {
    typewrite(cardA.text, responseA.text)
    typewrite(cardB.text, responseB.text)
  } else {
    cardA.text.textContent = responseA.text
    cardB.text.textContent = responseB.text
  }

  return {
    markCorrect(side) {
      if (side === 'a') {
        cardA.card.classList.add('picked-correct')
        cardB.card.classList.add('picked-wrong')
      } else {
        cardB.card.classList.add('picked-correct')
        cardA.card.classList.add('picked-wrong')
      }
    },
    reveal() {
      aborted = true
      cardA.text.textContent = responseA.text
      cardB.text.textContent = responseB.text
    },
    destroy() {
      aborted = true
      wrapper.remove()
    }
  }
}
