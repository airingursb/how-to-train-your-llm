/**
 * Creates an interactive heatmap/matrix on canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts
 * @param {Array} opts.rows - [{ label: string, values: [number] }]
 * @param {Array} opts.colLabels - [string]
 * @param {function} opts.colorScale - (value: 0-1) => rgbaString
 * @param {function} [opts.onCellHover] - (row, col, value) => void
 * @param {function} [opts.onCellClick] - (row, col, value) => void
 * @returns {{ update, highlight, destroy }}
 */
export function createHeatmap(canvas, ctx, { rows, colLabels, colorScale, onCellHover, onCellClick }) {
  const dpr = devicePixelRatio
  let hoveredCell = null
  let data = rows

  const defaultColorScale = (v) => `rgba(74, 144, 217, ${0.1 + v * 0.85})`
  const getColor = colorScale || defaultColorScale

  function getLayout() {
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const labelW = 80
    const labelH = 40
    const cellW = (w - labelW) / colLabels.length
    const cellH = (h - labelH) / data.length
    return { w, h, labelW, labelH, cellW, cellH }
  }

  function draw() {
    const { w, h, labelW, labelH, cellW, cellH } = getLayout()
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Column labels
    ctx.fillStyle = '#888'
    colLabels.forEach((label, i) => {
      const x = labelW + i * cellW + cellW / 2
      ctx.fillText(label, x, labelH / 2, cellW - 4)
    })

    // Rows
    data.forEach((row, ri) => {
      const y = labelH + ri * cellH

      // Row label
      ctx.fillStyle = '#888'
      ctx.textAlign = 'right'
      ctx.fillText(row.label, labelW - 8, y + cellH / 2, labelW - 12)
      ctx.textAlign = 'center'

      // Cells
      row.values.forEach((val, ci) => {
        const x = labelW + ci * cellW
        ctx.fillStyle = getColor(val)
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2)

        // Value text
        ctx.fillStyle = val > 0.6 ? '#fff' : '#333'
        ctx.fillText(val.toFixed(2), x + cellW / 2, y + cellH / 2)

        // Hover highlight
        if (hoveredCell && hoveredCell.row === ri && hoveredCell.col === ci) {
          ctx.strokeStyle = '#4A90D9'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2)
        }
      })
    })

    ctx.restore()
  }

  function getCellAt(e) {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const { labelW, labelH, cellW, cellH } = getLayout()
    const col = Math.floor((x - labelW) / cellW)
    const row = Math.floor((y - labelH) / cellH)
    if (row >= 0 && row < data.length && col >= 0 && col < colLabels.length) {
      return { row, col, value: data[row].values[col] }
    }
    return null
  }

  function onMouseMove(e) {
    const cell = getCellAt(e)
    hoveredCell = cell
    draw()
    if (cell) onCellHover?.(cell.row, cell.col, cell.value)
  }

  function onClick(e) {
    const cell = getCellAt(e)
    if (cell) onCellClick?.(cell.row, cell.col, cell.value)
  }

  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('click', onClick)
  draw()

  return {
    update(newRows) {
      data = newRows
      draw()
    },
    highlight(row, col) {
      hoveredCell = { row, col }
      draw()
    },
    redraw() { draw() },
    destroy() {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
    }
  }
}
