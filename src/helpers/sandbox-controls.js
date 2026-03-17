/**
 * Creates sandbox control panel with sliders, toggles, and selects.
 * @param {HTMLElement} panel - DOM panel to render into
 * @param {object} opts
 * @param {Array} opts.controls - [{ key, label, type: 'slider'|'toggle'|'select', min, max, step, value, options }]
 * @param {function} opts.onChange - (key, value, allValues) => void
 * @returns {{ getValues, setValue, destroy }}
 */
export function createSandboxControls(panel, { controls, onChange }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'sandbox-controls'
  wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px;'
  panel.appendChild(wrapper)

  const values = {}
  const inputs = {}

  controls.forEach(ctrl => {
    values[ctrl.key] = ctrl.value

    if (ctrl.type === 'slider') {
      const row = document.createElement('div')
      row.className = 'slider-row'

      const label = document.createElement('label')
      label.textContent = ctrl.label

      const input = document.createElement('input')
      input.type = 'range'
      input.min = ctrl.min ?? 0
      input.max = ctrl.max ?? 100
      input.step = ctrl.step ?? 1
      input.value = ctrl.value

      const valDisplay = document.createElement('span')
      valDisplay.className = 'slider-value'
      valDisplay.textContent = ctrl.value

      input.addEventListener('input', () => {
        const v = parseFloat(input.value)
        values[ctrl.key] = v
        valDisplay.textContent = v
        onChange?.(ctrl.key, v, { ...values })
      })

      row.appendChild(label)
      row.appendChild(input)
      row.appendChild(valDisplay)
      wrapper.appendChild(row)
      inputs[ctrl.key] = { input, valDisplay }

    } else if (ctrl.type === 'toggle') {
      const row = document.createElement('div')
      row.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 8px;'

      const label = document.createElement('label')
      label.textContent = ctrl.label
      label.style.minWidth = '100px'

      const input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = !!ctrl.value
      input.style.cssText = 'width: 20px; height: 20px; cursor: pointer;'

      input.addEventListener('change', () => {
        values[ctrl.key] = input.checked
        onChange?.(ctrl.key, input.checked, { ...values })
      })

      row.appendChild(label)
      row.appendChild(input)
      wrapper.appendChild(row)
      inputs[ctrl.key] = { input }

    } else if (ctrl.type === 'select') {
      const row = document.createElement('div')
      row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;'

      const label = document.createElement('div')
      label.textContent = ctrl.label
      label.style.cssText = 'width: 100%; font-size: 16px; margin-bottom: 4px;'
      row.appendChild(label)

      const buttons = []
      ctrl.options.forEach(opt => {
        const btn = document.createElement('button')
        btn.className = 'choice-card'
        if (opt.value === ctrl.value) btn.classList.add('selected')
        btn.textContent = opt.label
        btn.style.fontSize = '14px'
        btn.style.padding = '6px 14px'
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('selected'))
          btn.classList.add('selected')
          values[ctrl.key] = opt.value
          onChange?.(ctrl.key, opt.value, { ...values })
        })
        buttons.push(btn)
        row.appendChild(btn)
      })

      wrapper.appendChild(row)
      inputs[ctrl.key] = { buttons }
    }
  })

  return {
    getValues() { return { ...values } },
    setValue(key, val) {
      values[key] = val
      const inp = inputs[key]
      if (!inp) return
      if (inp.input) {
        if (inp.input.type === 'checkbox') inp.input.checked = !!val
        else inp.input.value = val
        if (inp.valDisplay) inp.valDisplay.textContent = val
      }
      if (inp.buttons) {
        inp.buttons.forEach(b => b.classList.toggle('selected', b.textContent === String(val)))
      }
    },
    destroy() {
      wrapper.remove()
    }
  }
}
