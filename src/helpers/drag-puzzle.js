/**
 * Creates a drag-and-drop puzzle.
 * @param {HTMLElement} container - Container element to render into
 * @param {object} opts
 * @param {Array} opts.items - [{ id, label, color, correctSlot }]
 * @param {Array} opts.slots - [{ id, label, order }]
 * @param {function} [opts.onPlace] - (itemId, slotId, isCorrect) => void
 * @param {function} [opts.onComplete] - () => void — all items correctly placed
 * @returns {{ reset, destroy }}
 */
export function createDragPuzzle(container, { items, slots, onPlace, onComplete }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'drag-puzzle'
  wrapper.style.cssText = 'display: flex; gap: 24px; width: 100%;'
  container.appendChild(wrapper)

  const placed = new Map() // slotId → itemId
  const itemElements = new Map()

  // Items column
  const itemsCol = document.createElement('div')
  itemsCol.style.cssText = 'display: flex; flex-direction: column; gap: 10px; flex: 1;'

  // Slots column
  const slotsCol = document.createElement('div')
  slotsCol.style.cssText = 'display: flex; flex-direction: column; gap: 10px; flex: 1;'

  // Render items
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  shuffled.forEach(item => {
    const el = document.createElement('div')
    el.className = 'drag-item'
    el.textContent = item.label
    el.draggable = true
    if (item.color) {
      el.style.borderColor = item.color
      el.style.color = item.color
    }
    el.dataset.itemId = item.id

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.id)
      el.style.opacity = '0.5'
    })
    el.addEventListener('dragend', () => {
      el.style.opacity = '1'
    })

    itemsCol.appendChild(el)
    itemElements.set(item.id, el)
  })

  // Render slots
  const sortedSlots = [...slots].sort((a, b) => a.order - b.order)
  sortedSlots.forEach(slot => {
    const el = document.createElement('div')
    el.className = 'drop-slot'
    el.textContent = slot.label
    el.dataset.slotId = slot.id

    el.addEventListener('dragover', (e) => {
      e.preventDefault()
      el.classList.add('drag-over')
    })
    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over')
    })
    el.addEventListener('drop', (e) => {
      e.preventDefault()
      el.classList.remove('drag-over')
      const itemId = e.dataTransfer.getData('text/plain')
      handleDrop(itemId, slot.id, el)
    })

    slotsCol.appendChild(el)
  })

  wrapper.appendChild(itemsCol)
  wrapper.appendChild(slotsCol)

  function handleDrop(itemId, slotId, slotEl) {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const isCorrect = item.correctSlot === slotId

    if (isCorrect) {
      placed.set(slotId, itemId)
      slotEl.textContent = item.label
      slotEl.classList.add('filled', 'correct')
      if (item.color) slotEl.style.borderColor = item.color

      const itemEl = itemElements.get(itemId)
      if (itemEl) itemEl.classList.add('placed')

      onPlace?.(itemId, slotId, true)

      if (placed.size === slots.length) {
        onComplete?.()
      }
    } else {
      slotEl.classList.add('wrong')
      setTimeout(() => slotEl.classList.remove('wrong'), 400)
      onPlace?.(itemId, slotId, false)
    }
  }

  return {
    reset() {
      placed.clear()
      slotsCol.querySelectorAll('.drop-slot').forEach(el => {
        const slot = sortedSlots.find(s => s.id === el.dataset.slotId)
        el.textContent = slot?.label || ''
        el.className = 'drop-slot'
        el.style.borderColor = ''
      })
      itemElements.forEach(el => {
        el.classList.remove('placed')
        el.style.opacity = '1'
      })
    },
    getPlaced() { return new Map(placed) },
    destroy() {
      wrapper.remove()
    }
  }
}
