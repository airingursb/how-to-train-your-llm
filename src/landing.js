// Landing page: token neural network animation + title overlay
// Uses raw Canvas 2D (no PIXI). Engine param kept for API consistency.

const TOKEN_WORDS = [
  'the', 'cat', 'sat', 'on', 'mat', 'hello', 'world', 'predict',
  'next', 'token', 'attention', 'loss', 'train', 'learn', 'embed',
  'layer', 'weight', 'gradient', 'model', 'data', 'neural', 'net',
  'transform', 'query', 'key', 'value', 'softmax', 'GPT', 'LLM',
  'prompt', 'generate', 'sample', 'decode', 'encode', 'batch',
  'reward', 'align', 'fine-tune', 'RLHF', 'SFT', 'head',
];

const NODE_COLORS = [
  { r: 74,  g: 144, b: 217 },
  { r: 91,  g: 165, b: 91  },
  { r: 130, g: 120, b: 180 },
  { r: 200, g: 140, b: 60  },
];

const NODE_COUNT      = 90;
const CONNECT_RADIUS  = 180;
const NODES_PER_RING  = 18;

// ─── TokenNode ────────────────────────────────────────────────────────────────

class TokenNode {
  constructor(i) {
    this.text       = TOKEN_WORDS[i % TOKEN_WORDS.length];
    this.color      = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    this.index      = i;

    this.homeX      = 0;
    this.homeY      = 0;
    this.ringRadius = 0;
    this.baseAngle  = 0;

    this.x  = 0;
    this.y  = 0;
    this.vx = 0;
    this.vy = 0;

    this.fontSize   = 13 + Math.random() * 8;
    this.opacity    = 0.2 + Math.random() * 0.25;
    this.rotation   = (Math.random() - 0.5) * 0.3;
    this.driftSpeed = 0.1 + Math.random() * 0.3;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.nodeRadius = 3 + this.fontSize * 0.15;
    this.brightness = 0;
  }

  setHome(cx, cy, viewW, viewH) {
    const maxRadius    = Math.sqrt(viewW * viewW + viewH * viewH) * 0.55;
    const ring         = Math.floor(this.index / NODES_PER_RING);
    const indexInRing  = this.index % NODES_PER_RING;
    const ringCount    = Math.ceil(NODE_COUNT / NODES_PER_RING);
    const ringGap      = maxRadius / (ringCount + 0.5);
    this.ringRadius    = ringGap * (ring + 1);

    const nodesInThisRing = Math.min(NODES_PER_RING, NODE_COUNT - ring * NODES_PER_RING);
    this.baseAngle = (indexInRing / nodesInThisRing) * Math.PI * 2 + ring * 0.4;

    this.homeX = cx + Math.cos(this.baseAngle) * this.ringRadius;
    this.homeY = cy + Math.sin(this.baseAngle) * (this.ringRadius * 0.65);
    this.x     = this.homeX;
    this.y     = this.homeY;
  }

  update(time, mouse) {
    const driftX  = Math.cos(time * this.driftSpeed + this.driftPhase) * 8;
    const driftY  = Math.sin(time * this.driftSpeed * 0.7 + this.driftPhase) * 6;

    const targetX = this.homeX + driftX;
    const targetY = this.homeY + driftY;

    const dx    = this.x - mouse.x;
    const dy    = this.y - mouse.y;
    const dist2 = dx * dx + dy * dy;
    const repelRadius = 160;
    let repelX = 0, repelY = 0;
    if (dist2 < repelRadius * repelRadius && dist2 > 1) {
      const dist = Math.sqrt(dist2);
      const force = (repelRadius - dist) / repelRadius;
      repelX = (dx / dist) * force * 80;
      repelY = (dy / dist) * force * 80;
    }

    this.vx += (targetX + repelX - this.x) * 0.03;
    this.vy += (targetY + repelY - this.y) * 0.03;
    this.vx *= 0.85;
    this.vy *= 0.85;
    this.x  += this.vx;
    this.y  += this.vy;

    this.brightness *= 0.94;
  }

  draw(ctx) {
    const { r, g, b } = this.color;
    const glow = this.brightness;

    const circleAlpha = this.opacity * 0.6 + glow * 0.8;
    const circleR     = this.nodeRadius + glow * 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, circleR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${circleAlpha * 0.5})`;
    ctx.fill();

    if (glow > 0.05) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, circleR + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glow * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.x, this.y - this.nodeRadius - 8);
    ctx.rotate(this.rotation);
    ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity + glow * 0.5})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export class Landing {
  constructor(container, engine, i18n) {
    this._container = container;
    // engine is intentionally unused — landing uses its own raw canvas
    this._i18n      = i18n;
    this.onStart    = null;

    // Animation state
    this._nodes       = [];
    this._connections = [];
    this._pulses      = [];
    this._time        = 0;
    this._mouse       = { x: -1000, y: -1000 };
    this._raf         = null;
    this._W           = 0;
    this._H           = 0;

    this._canvas  = null;
    this._ctx     = null;
    this._overlay = null;

    this._boundResize    = this._resize.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseLeave = this._onMouseLeave.bind(this);

    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  show() {
    this._container.classList.remove('hidden');
    this._startLoop();
  }

  hide() {
    this._stopLoop();
    this._container.classList.add('hidden');
    // Remove canvas so it isn't rendered off-screen
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx    = null;
  }

  destroy() {
    this._stopLoop();
    window.removeEventListener('resize',      this._boundResize);
    window.removeEventListener('mousemove',   this._boundMouseMove);
    window.removeEventListener('mouseleave',  this._boundMouseLeave);
    this._container.innerHTML = '';
    this._nodes       = [];
    this._connections = [];
    this._pulses      = [];
  }

  // ── Private: DOM construction ───────────────────────────────────────────────

  _build() {
    // Ensure container is positioned so canvas absolute positioning works
    const cs = window.getComputedStyle(this._container);
    if (cs.position === 'static') {
      this._container.style.position = 'relative';
    }

    // Canvas (background)
    this._canvas = document.createElement('canvas');
    Object.assign(this._canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
    });
    this._container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    // Overlay
    this._overlay = document.createElement('div');
    Object.assign(this._overlay.style, {
      position: 'relative',
      zIndex: '1',
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      width: '100%',
      height: '100%',
    });
    this._container.appendChild(this._overlay);

    // Title
    const rawTitle = this._i18n ? this._i18n.t('landing.title') : 'How to Train Your LLM';
    const h1 = document.createElement('h1');
    Object.assign(h1.style, {
      fontSize: 'clamp(48px, 8vw, 96px)',
      fontWeight: '700',
      lineHeight: '0.95',
      textAlign: 'center',
      marginBottom: '16px',
      fontFamily: "'Caveat', cursive",
      pointerEvents: 'none',
      color: '#2D2D2D',
    });
    // Wrap "LLM" in a highlight span
    const highlighted = rawTitle.replace(/\bLLM\b/, '<span class="highlight" style="color:#4A90D9">LLM</span>');
    h1.innerHTML = highlighted.replace(' Your ', '<br>Your ');
    this._overlay.appendChild(h1);

    // Subtitle
    const subtitleText = this._i18n ? this._i18n.t('landing.subtitle') : 'an interactive guide to building a language model from scratch';
    const subtitle = document.createElement('div');
    Object.assign(subtitle.style, {
      fontFamily: "'Caveat', cursive",
      fontSize: 'clamp(18px, 2.5vw, 28px)',
      color: '#888',
      textAlign: 'center',
      marginBottom: '48px',
      maxWidth: '600px',
      pointerEvents: 'none',
    });
    subtitle.textContent = subtitleText;
    this._overlay.appendChild(subtitle);

    // Start button
    const btnText = this._i18n ? this._i18n.t('landing.start') : "let's begin →";
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      pointerEvents: 'all',
      fontFamily: "'Caveat', cursive",
      fontSize: '28px',
      padding: '14px 48px',
      background: 'none',
      border: '3px solid #2D2D2D',
      borderRadius: '50px',
      color: '#2D2D2D',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    });
    btn.textContent = btnText;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#2D2D2D';
      btn.style.color      = '#F5F0E8';
      btn.style.transform  = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'none';
      btn.style.color      = '#2D2D2D';
      btn.style.transform  = 'scale(1)';
    });
    btn.addEventListener('click', () => {
      this.onStart?.();
    });
    this._overlay.appendChild(btn);

    // Event listeners
    window.addEventListener('resize',     this._boundResize);
    window.addEventListener('mousemove',  this._boundMouseMove);
    window.addEventListener('mouseleave', this._boundMouseLeave);

    // Initial sizing
    this._resize();
  }

  // ── Private: Animation ──────────────────────────────────────────────────────

  _resize() {
    if (!this._canvas) return;

    const dpr = window.devicePixelRatio || 1;
    this._W = this._container.clientWidth  || window.innerWidth;
    this._H = this._container.clientHeight || window.innerHeight;

    this._canvas.width  = this._W * dpr;
    this._canvas.height = this._H * dpr;
    this._canvas.style.width  = this._W + 'px';
    this._canvas.style.height = this._H + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = this._W / 2;
    const cy = this._H / 2;

    if (this._nodes.length === 0) {
      for (let i = 0; i < NODE_COUNT; i++) {
        this._nodes.push(new TokenNode(i));
      }
    }
    for (const n of this._nodes) {
      n.setHome(cx, cy, this._W, this._H);
    }
    this._buildConnections();
  }

  _buildConnections() {
    this._connections = [];
    const r2 = CONNECT_RADIUS * CONNECT_RADIUS;
    const nodes = this._nodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].homeX - nodes[j].homeX;
        const dy = nodes[i].homeY - nodes[j].homeY;
        if (dx * dx + dy * dy < r2) {
          this._connections.push({ from: i, to: j });
        }
      }
    }
  }

  _spawnPulse() {
    if (this._connections.length === 0) return;
    const c       = this._connections[Math.floor(Math.random() * this._connections.length)];
    const forward = Math.random() > 0.5;
    this._pulses.push({
      from:     forward ? c.from : c.to,
      to:       forward ? c.to   : c.from,
      progress: 0,
      speed:    0.008 + Math.random() * 0.012,
      color:    this._nodes[c.from].color,
    });
  }

  _drawConnections() {
    const ctx   = this._ctx;
    const nodes = this._nodes;
    for (const c of this._connections) {
      const a  = nodes[c.from];
      const b  = nodes[c.to];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist    = Math.sqrt(dx * dx + dy * dy);
      const maxDist = CONNECT_RADIUS * 1.5;
      let alpha = Math.max(0, 1 - dist / maxDist) * 0.07;
      alpha += (a.brightness + b.brightness) * 0.08;

      ctx.strokeStyle = `rgba(74, 144, 217, ${alpha})`;
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  _updatePulses() {
    const ctx   = this._ctx;
    const nodes = this._nodes;
    for (let i = this._pulses.length - 1; i >= 0; i--) {
      const p = this._pulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) {
        nodes[p.to].brightness = 1;
        this._pulses.splice(i, 1);
        continue;
      }

      const a = nodes[p.from];
      const b = nodes[p.to];
      const x = a.x + (b.x - a.x) * p.progress;
      const y = a.y + (b.y - a.y) * p.progress;
      const { r, g, b: bl } = p.color;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, 0.8)`;
      ctx.fill();

      const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${bl}, 0.2)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _tick() {
    if (!this._ctx) return;
    this._time += 0.016;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._W, this._H);

    if (Math.random() < 0.08) this._spawnPulse();

    this._drawConnections();
    this._updatePulses();

    for (const n of this._nodes) {
      n.update(this._time, this._mouse);
      n.draw(ctx);
    }

    this._raf = requestAnimationFrame(() => this._tick());
  }

  _startLoop() {
    if (this._raf !== null) return;
    // Re-create canvas if it was removed by hide()
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      Object.assign(this._canvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '0',
      });
      this._container.insertBefore(this._canvas, this._container.firstChild);
      this._ctx = this._canvas.getContext('2d');
      this._resize();
    }
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _stopLoop() {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  // ── Private: Event handlers ─────────────────────────────────────────────────

  _onMouseMove(e) {
    // Convert page coords to container-local coords
    const rect = this._container.getBoundingClientRect();
    this._mouse.x = e.clientX - rect.left;
    this._mouse.y = e.clientY - rect.top;
  }

  _onMouseLeave() {
    this._mouse.x = -1000;
    this._mouse.y = -1000;
  }
}
