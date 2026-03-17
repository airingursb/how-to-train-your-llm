/**
 * Creates a step-through controller.
 * @param {HTMLElement} panel - DOM panel to render into
 * @param {object} opts
 * @param {Array} opts.steps - [{ id, label, description, color }]
 * @param {function} opts.onStep - (stepIndex, stepData) => void — called to update canvas
 * @param {object} [opts.i18n]
 * @returns {{ next, prev, goTo, getCurrentStep, destroy }}
 */
export function createStepThrough(panel, { steps, onStep, i18n }) {
  let currentStep = 0
  let destroyed = false

  const wrapper = document.createElement('div')
  wrapper.className = 'step-through'
  panel.appendChild(wrapper)

  function render() {
    if (destroyed) return
    wrapper.innerHTML = ''

    // Step indicator bar
    const indicator = document.createElement('div')
    indicator.className = 'step-indicator'
    steps.forEach((step, i) => {
      if (i > 0) {
        const line = document.createElement('div')
        line.className = 'step-line' + (i <= currentStep ? ' complete' : '')
        indicator.appendChild(line)
      }
      const dot = document.createElement('div')
      dot.className = 'step-dot'
      if (i < currentStep) dot.classList.add('complete')
      else if (i === currentStep) dot.classList.add('active')
      dot.textContent = i + 1
      if (step.color && i === currentStep) {
        dot.style.borderColor = step.color
        dot.style.background = step.color
      }
      indicator.appendChild(dot)
    })
    wrapper.appendChild(indicator)

    // Current step info
    const step = steps[currentStep]
    const title = document.createElement('h2')
    title.textContent = step.label
    if (step.color) title.style.color = step.color
    wrapper.appendChild(title)

    const desc = document.createElement('p')
    desc.textContent = step.description
    desc.className = 'fade-in'
    wrapper.appendChild(desc)

    // Navigation
    const nav = document.createElement('div')
    nav.style.cssText = 'display: flex; gap: 12px; margin-top: 20px;'

    if (currentStep > 0) {
      const prevBtn = document.createElement('button')
      prevBtn.className = 'scene-btn'
      prevBtn.textContent = '← Back'
      prevBtn.style.opacity = '0.6'
      prevBtn.addEventListener('click', () => prev())
      nav.appendChild(prevBtn)
    }

    const nextBtn = document.createElement('button')
    nextBtn.className = 'scene-btn'
    nextBtn.textContent = currentStep < steps.length - 1 ? 'Next Step →' : 'Done →'
    nextBtn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) next()
      else onStep?.(currentStep, { ...step, done: true })
    })
    nav.appendChild(nextBtn)

    wrapper.appendChild(nav)

    // Notify canvas
    onStep?.(currentStep, step)
  }

  function next() {
    if (currentStep < steps.length - 1) {
      currentStep++
      render()
    }
  }

  function prev() {
    if (currentStep > 0) {
      currentStep--
      render()
    }
  }

  function goTo(index) {
    if (index >= 0 && index < steps.length) {
      currentStep = index
      render()
    }
  }

  render()

  return {
    next,
    prev,
    goTo,
    getCurrentStep() { return currentStep },
    destroy() {
      destroyed = true
      wrapper.remove()
    }
  }
}
