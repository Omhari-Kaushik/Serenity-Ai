/**
 * background.js
 * Manages the animated particle background and breathing gradient.
 * Entirely canvas-based for smooth GPU-accelerated rendering.
 */

// ─── Particle system ─────────────────────────────────────────────────────────
let particleCanvas, particleCtx, particles = [], animFrameId;

const PARTICLE_CONFIG = {
  count: 55,
  minRadius: 1.5,
  maxRadius: 4.5,
  minSpeed: 0.12,
  maxSpeed: 0.38,
  colors: [
    "rgba(198, 182, 230, 0.55)",   // lavender
    "rgba(167, 210, 220, 0.45)",   // soft teal
    "rgba(180, 210, 240, 0.45)",   // soft blue
    "rgba(240, 190, 210, 0.45)",   // blush pink
    "rgba(220, 235, 245, 0.4)",    // ice white
  ],
};

class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * this.canvas.width;
    this.y = initial ? Math.random() * this.canvas.height : this.canvas.height + 10;
    this.radius = PARTICLE_CONFIG.minRadius + Math.random() * (PARTICLE_CONFIG.maxRadius - PARTICLE_CONFIG.minRadius);
    this.speed = PARTICLE_CONFIG.minSpeed + Math.random() * (PARTICLE_CONFIG.maxSpeed - PARTICLE_CONFIG.minSpeed);
    this.color = PARTICLE_CONFIG.colors[Math.floor(Math.random() * PARTICLE_CONFIG.colors.length)];
    this.drift = (Math.random() - 0.5) * 0.25;
    this.opacity = 0.3 + Math.random() * 0.6;
    this.pulseSpeed = 0.005 + Math.random() * 0.008;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }

  update(tick) {
    this.y -= this.speed;
    this.x += this.drift;
    // Gentle pulse in opacity
    this.opacity = 0.3 + 0.35 * Math.abs(Math.sin(tick * this.pulseSpeed + this.pulseOffset));

    if (this.y + this.radius < 0) this.reset(false);
    if (this.x < -this.radius) this.x = this.canvas.width + this.radius;
    if (this.x > this.canvas.width + this.radius) this.x = -this.radius;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// ─── Initialise particle canvas ───────────────────────────────────────────────
function initParticles() {
  particleCanvas = document.getElementById("particle-canvas");
  if (!particleCanvas) return;

  particleCtx = particleCanvas.getContext("2d");
  resizeCanvas();
  spawnParticles();

  window.addEventListener("resize", () => {
    resizeCanvas();
    spawnParticles();
  });

  let tick = 0;
  function loop() {
    animFrameId = requestAnimationFrame(loop);
    tick++;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach((p) => {
      p.update(tick);
      p.draw(particleCtx);
    });
  }
  loop();
}

function resizeCanvas() {
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function spawnParticles() {
  particles = Array.from({ length: PARTICLE_CONFIG.count }, () => new Particle(particleCanvas));
}

// ─── Breathing gradient animation ─────────────────────────────────────────────
// The gradient cycles through a soft palette on the body background,
// simulating a slow inhale/exhale breathing rhythm.
function initBreathingGradient() {
  const el = document.getElementById("breathing-bg");
  if (!el) return;

  // Gradient stops — each array is [color-stop-1, color-stop-2, color-stop-3]
  const gradients = [
    ["#e8e0f5", "#d4eaf7", "#e0f4f1"],   // lavender → ice blue → mint
    ["#fde8f0", "#e8d8f5", "#d4eaf7"],   // blush → lavender → blue
    ["#d4f0f0", "#dce8f8", "#f0e0f5"],   // teal → sky → lilac
    ["#f0e8ff", "#ffe8f0", "#e8f4ff"],   // violet → pink → azure
  ];

  let currentIdx = 0;
  let nextIdx = 1;
  let progress = 0;
  // One full breath cycle ~8 seconds (matches CSS animation timing)
  const STEP = 0.0015;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function interpolateColor(hex1, hex2, t) {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
  }

  function tick() {
    requestAnimationFrame(tick);
    progress += STEP;
    if (progress >= 1) {
      progress = 0;
      currentIdx = nextIdx;
      nextIdx = (nextIdx + 1) % gradients.length;
    }

    const cur = gradients[currentIdx];
    const nxt = gradients[nextIdx];
    const c1 = interpolateColor(cur[0], nxt[0], progress);
    const c2 = interpolateColor(cur[1], nxt[1], progress);
    const c3 = interpolateColor(cur[2], nxt[2], progress);

    el.style.background = `radial-gradient(ellipse at 30% 20%, ${c1} 0%, transparent 60%),
      radial-gradient(ellipse at 70% 80%, ${c2} 0%, transparent 60%),
      radial-gradient(ellipse at 50% 50%, ${c3} 0%, transparent 80%),
      linear-gradient(135deg, #f0ebff 0%, #e8f4fd 50%, #e4f5f0 100%)`;
  }

  tick();
}

// ─── Boot both systems ────────────────────────────────────────────────────────
function initBackground() {
  initBreathingGradient();
  initParticles();
}
