(() => {
  'use strict';

  // ─── Color palette ──────────────────────────────────────────────
  const COLORS = [
    [0.40, 0.85, 0.55],  // green
    [0.95, 0.30, 0.35],  // red
    [0.35, 0.65, 0.95],  // blue
    [0.95, 0.75, 0.20],  // yellow
    [0.75, 0.40, 0.95],  // purple
    [0.95, 0.50, 0.20],  // orange
    [0.20, 0.90, 0.85],  // cyan
    [0.95, 0.45, 0.70],  // pink
  ];

  const COLOR_CSS = COLORS.map(c =>
    `rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`
  );

  // ─── Presets ────────────────────────────────────────────────────
  const PRESETS = {
    'Primordial Soup': {
      desc: 'Organic clusters',
      species: 6,
      matrix: [
        [ 0.5, -0.3,  0.2, -0.1,  0.0,  0.1],
        [-0.2,  0.4,  0.3, -0.2,  0.1,  0.0],
        [ 0.1, -0.1,  0.5,  0.2, -0.3,  0.2],
        [ 0.0,  0.3, -0.2,  0.4,  0.1, -0.1],
        [ 0.2, -0.2,  0.1, -0.1,  0.3,  0.3],
        [-0.1,  0.1,  0.0,  0.2, -0.2,  0.5],
      ],
    },
    'Galaxies': {
      desc: 'Spiral formations',
      species: 4,
      matrix: [
        [ 0.8, -0.5,  0.3,  0.0],
        [ 0.5,  0.8, -0.5,  0.3],
        [ 0.0,  0.5,  0.8, -0.5],
        [-0.5,  0.0,  0.5,  0.8],
      ],
    },
    'Symbiosis': {
      desc: 'Mutual attraction',
      species: 3,
      matrix: [
        [ 0.2,  0.6, -0.4],
        [-0.4,  0.2,  0.6],
        [ 0.6, -0.4,  0.2],
      ],
    },
    'Predator Prey': {
      desc: 'Chase dynamics',
      species: 4,
      matrix: [
        [ 0.1,  0.8, -0.6, 0.0],
        [-0.6,  0.1,  0.8, 0.0],
        [ 0.0, -0.6,  0.1, 0.8],
        [ 0.8,  0.0, -0.6, 0.1],
      ],
    },
    'Cells': {
      desc: 'Membrane-like',
      species: 5,
      matrix: [
        [ 0.7, -0.2,  0.0,  0.0,  0.1],
        [ 0.3,  0.7, -0.2,  0.0,  0.0],
        [ 0.0,  0.3,  0.7, -0.2,  0.0],
        [ 0.0,  0.0,  0.3,  0.7, -0.2],
        [-0.2,  0.0,  0.0,  0.3,  0.7],
      ],
    },
    'Chaos': {
      desc: 'High energy',
      species: 6,
      matrix: null,
    },
    'Snowflakes': {
      desc: 'Crystal growth',
      species: 3,
      matrix: [
        [ 0.9, -0.7,  0.5],
        [ 0.5,  0.9, -0.7],
        [-0.7,  0.5,  0.9],
      ],
    },
    'Ecosystem': {
      desc: 'Complex balance',
      species: 8,
      matrix: [
        [ 0.3, -0.2,  0.1,  0.0,  0.0,  0.0,  0.2, -0.1],
        [ 0.4,  0.3, -0.2,  0.1,  0.0,  0.0,  0.0,  0.2],
        [ 0.0,  0.4,  0.3, -0.2,  0.1,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.4,  0.3, -0.2,  0.1,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.4,  0.3, -0.2,  0.1,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.4,  0.3, -0.2,  0.1],
        [-0.1,  0.0,  0.0,  0.0,  0.0,  0.4,  0.3, -0.2],
        [ 0.2, -0.1,  0.0,  0.0,  0.0,  0.0,  0.4,  0.3],
      ],
    },
  };

  // ─── State ──────────────────────────────────────────────────────
  const state = {
    particleCount: 1500,
    speciesCount: 6,
    interactionRange: 120,
    friction: 0.15,
    forceStrength: 1.0,
    repulsionDist: 20,
    particleSize: 3.0,
    trailFade: 0.05,
    paused: false,
    matrix: [],
    activePreset: null,
    zoom: 1.0,
    panX: 0,
    panY: 0,
  };

  let particles = { x: [], y: [], vx: [], vy: [], species: [] };
  let particleCount = 0;

  // ─── Canvas & GL ────────────────────────────────────────────────
  const canvas = document.getElementById('simulation');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:white;font-size:18px;">WebGL is not supported in your browser.</div>';
    return;
  }

  let W, H;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ─── Shaders ────────────────────────────────────────────────────
  const vertSrc = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    attribute float a_size;
    uniform vec2 u_resolution;
    uniform vec2 u_pan;
    uniform float u_zoom;
    varying vec3 v_color;
    void main() {
      vec2 pos = (a_position + u_pan) * u_zoom;
      vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
      gl_PointSize = a_size * u_zoom;
      v_color = a_color;
    }
  `;

  const fragSrc = `
    precision mediump float;
    varying vec3 v_color;
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.35, dist);
      float glow = exp(-dist * 4.0) * 0.3;
      gl_FragColor = vec4(v_color * (alpha + glow), alpha);
    }
  `;

  const quadVertSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const quadFragSrc = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function createProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(vs, gl.VERTEX_SHADER));
    gl.attachShader(p, compileShader(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  const particleProg = createProgram(vertSrc, fragSrc);
  const quadProg = createProgram(quadVertSrc, quadFragSrc);

  const loc = {
    position: gl.getAttribLocation(particleProg, 'a_position'),
    color: gl.getAttribLocation(particleProg, 'a_color'),
    size: gl.getAttribLocation(particleProg, 'a_size'),
    resolution: gl.getUniformLocation(particleProg, 'u_resolution'),
    pan: gl.getUniformLocation(particleProg, 'u_pan'),
    zoom: gl.getUniformLocation(particleProg, 'u_zoom'),
  };

  const quadLoc = {
    position: gl.getAttribLocation(quadProg, 'a_position'),
    color: gl.getUniformLocation(quadProg, 'u_color'),
  };

  const posBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();

  const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ─── Spatial hashing ───────────────────────────────────────────
  const CELL_SIZE = 60;
  let gridW, gridH, grid, gridCounts;

  function initGrid() {
    gridW = Math.ceil(W / CELL_SIZE) + 1;
    gridH = Math.ceil(H / CELL_SIZE) + 1;
    const totalCells = gridW * gridH;
    grid = new Array(totalCells);
    gridCounts = new Int32Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      grid[i] = [];
    }
  }

  function clearGrid() {
    for (let i = 0; i < gridCounts.length; i++) {
      gridCounts[i] = 0;
    }
  }

  function insertParticle(idx) {
    const cx = Math.floor(particles.x[idx] / CELL_SIZE);
    const cy = Math.floor(particles.y[idx] / CELL_SIZE);
    if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) return;
    const ci = cy * gridW + cx;
    const count = gridCounts[ci];
    if (grid[ci].length <= count) {
      grid[ci].push(idx);
    } else {
      grid[ci][count] = idx;
    }
    gridCounts[ci]++;
  }

  // ─── Matrix ─────────────────────────────────────────────────────
  function randomMatrix(n) {
    const m = [];
    for (let i = 0; i < n; i++) {
      m[i] = [];
      for (let j = 0; j < n; j++) {
        m[i][j] = Math.random() * 2 - 1;
        m[i][j] = Math.round(m[i][j] * 10) / 10;
      }
    }
    return m;
  }

  function resizeMatrix(oldMatrix, newSize) {
    const m = [];
    for (let i = 0; i < newSize; i++) {
      m[i] = [];
      for (let j = 0; j < newSize; j++) {
        if (oldMatrix[i] && oldMatrix[i][j] !== undefined) {
          m[i][j] = oldMatrix[i][j];
        } else {
          m[i][j] = Math.round((Math.random() * 2 - 1) * 10) / 10;
        }
      }
    }
    return m;
  }

  // ─── Particles ──────────────────────────────────────────────────
  function initParticles() {
    const n = state.particleCount;
    particles.x = new Float32Array(n);
    particles.y = new Float32Array(n);
    particles.vx = new Float32Array(n);
    particles.vy = new Float32Array(n);
    particles.species = new Uint8Array(n);
    particleCount = n;

    const margin = 50;
    for (let i = 0; i < n; i++) {
      particles.x[i] = margin + Math.random() * (W - margin * 2);
      particles.y[i] = margin + Math.random() * (H - margin * 2);
      particles.vx[i] = 0;
      particles.vy[i] = 0;
      particles.species[i] = Math.floor(Math.random() * state.speciesCount);
    }

    initGrid();
  }

  // ─── Physics ────────────────────────────────────────────────────
  function simulate(dt) {
    if (state.paused) return;

    const n = particleCount;
    const range = state.interactionRange;
    const rangeSq = range * range;
    const friction = 1 - state.friction;
    const force = state.forceStrength;
    const repDist = state.repulsionDist;
    const repDistSq = repDist * repDist;
    const matrix = state.matrix;
    const cellsToCheck = Math.ceil(range / CELL_SIZE);

    clearGrid();
    for (let i = 0; i < n; i++) insertParticle(i);

    for (let i = 0; i < n; i++) {
      const xi = particles.x[i];
      const yi = particles.y[i];
      const si = particles.species[i];
      let fx = 0, fy = 0;

      const cx = Math.floor(xi / CELL_SIZE);
      const cy = Math.floor(yi / CELL_SIZE);

      for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= gridH) continue;
        for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
          const nx = cx + dx;
          if (nx < 0 || nx >= gridW) continue;
          const ci = ny * gridW + nx;
          const count = gridCounts[ci];
          const cell = grid[ci];

          for (let k = 0; k < count; k++) {
            const j = cell[k];
            if (i === j) continue;

            const ddx = particles.x[j] - xi;
            const ddy = particles.y[j] - yi;
            const distSq = ddx * ddx + ddy * ddy;

            if (distSq > rangeSq || distSq < 0.01) continue;

            const dist = Math.sqrt(distSq);
            const dirX = ddx / dist;
            const dirY = ddy / dist;

            if (distSq < repDistSq) {
              const repForce = (1 - dist / repDist) * -3.0;
              fx += dirX * repForce;
              fy += dirY * repForce;
            } else {
              const t = (dist - repDist) / (range - repDist);
              const attraction = matrix[si][particles.species[j]];
              const f = attraction * (1 - Math.abs(2 * t - 1));
              fx += dirX * f * force;
              fy += dirY * f * force;
            }
          }
        }
      }

      particles.vx[i] = (particles.vx[i] + fx * dt * 0.5) * friction;
      particles.vy[i] = (particles.vy[i] + fy * dt * 0.5) * friction;
    }

    for (let i = 0; i < n; i++) {
      particles.x[i] += particles.vx[i];
      particles.y[i] += particles.vy[i];

      if (particles.x[i] < 0) { particles.x[i] = 0; particles.vx[i] *= -0.5; }
      if (particles.x[i] > W) { particles.x[i] = W; particles.vx[i] *= -0.5; }
      if (particles.y[i] < 0) { particles.y[i] = 0; particles.vy[i] *= -0.5; }
      if (particles.y[i] > H) { particles.y[i] = H; particles.vy[i] *= -0.5; }
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────
  const posData = () => {
    const arr = new Float32Array(particleCount * 2);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 2] = particles.x[i];
      arr[i * 2 + 1] = particles.y[i];
    }
    return arr;
  };

  const colorData = () => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const c = COLORS[particles.species[i]];
      arr[i * 3] = c[0];
      arr[i * 3 + 1] = c[1];
      arr[i * 3 + 2] = c[2];
    }
    return arr;
  };

  const sizeData = () => {
    const dpr = window.devicePixelRatio || 1;
    const s = state.particleSize * dpr;
    const arr = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) arr[i] = s;
    return arr;
  };

  function render() {
    const dpr = window.devicePixelRatio || 1;

    gl.useProgram(quadProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(quadLoc.position);
    gl.vertexAttribPointer(quadLoc.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(quadLoc.color, 0.039, 0.039, 0.059, state.trailFade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(quadLoc.position);

    gl.useProgram(particleProg);
    gl.uniform2f(loc.resolution, W * dpr, H * dpr);
    gl.uniform2f(loc.pan, state.panX, state.panY);
    gl.uniform1f(loc.zoom, state.zoom);

    const pd = posData();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pd, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc.position);
    gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, 0, 0);

    const cd = colorData();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cd, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc.color);
    gl.vertexAttribPointer(loc.color, 3, gl.FLOAT, false, 0, 0);

    const sd = sizeData();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sd, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc.size);
    gl.vertexAttribPointer(loc.size, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, particleCount);
  }

  // ─── FPS counter ────────────────────────────────────────────────
  let fpsFrames = 0, fpsLastTime = 0, fpsDisplay = 60;

  // ─── Main loop ──────────────────────────────────────────────────
  let lastTime = 0;
  function loop(time) {
    if (lastTime === 0) { lastTime = time; fpsLastTime = time; }
    const dt = Math.min((time - lastTime) / 16.667, 3);
    lastTime = time;

    simulate(dt);
    render();

    fpsFrames++;
    const elapsed = time - fpsLastTime;
    if (elapsed >= 500) {
      fpsDisplay = Math.round(fpsFrames * 1000 / elapsed);
      fpsFrames = 0;
      fpsLastTime = time;

      document.getElementById('stat-fps').textContent = fpsDisplay;
      const dot = document.getElementById('status-dot');
      dot.style.background = fpsDisplay > 45 ? '#22c55e' : fpsDisplay > 25 ? '#eab308' : '#ef4444';
    }

    requestAnimationFrame(loop);
  }

  // ─── UI: Matrix editor ─────────────────────────────────────────
  function renderMatrix() {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    const n = state.speciesCount;

    const header = document.createElement('div');
    header.className = 'matrix-header';
    for (let j = 0; j < n; j++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-header-cell';
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.background = COLOR_CSS[j];
      cell.appendChild(dot);
      header.appendChild(cell);
    }
    container.appendChild(header);

    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'matrix-row';

      const label = document.createElement('div');
      label.className = 'matrix-row-label';
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.background = COLOR_CSS[i];
      label.appendChild(dot);
      row.appendChild(label);

      for (let j = 0; j < n; j++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        const val = state.matrix[i][j];
        cell.textContent = val > 0 ? '+' + val.toFixed(1) : val.toFixed(1);

        const r = val < 0 ? Math.round(255 * Math.abs(val)) : 0;
        const g = val > 0 ? Math.round(200 * val) : 0;
        const alpha = Math.abs(val) * 0.35 + 0.05;
        cell.style.background = `rgba(${r},${g},${val > 0 ? 60 : 40},${alpha})`;
        cell.style.color = `rgba(255,255,255,${0.5 + Math.abs(val) * 0.5})`;

        const ii = i, jj = j;
        cell.addEventListener('click', () => {
          state.matrix[ii][jj] = Math.round((state.matrix[ii][jj] + 0.3) * 10) / 10;
          if (state.matrix[ii][jj] > 1.0) state.matrix[ii][jj] = -1.0;
          state.activePreset = null;
          updatePresetHighlight();
          renderMatrix();
        });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          state.matrix[ii][jj] = Math.round((state.matrix[ii][jj] - 0.3) * 10) / 10;
          if (state.matrix[ii][jj] < -1.0) state.matrix[ii][jj] = 1.0;
          state.activePreset = null;
          updatePresetHighlight();
          renderMatrix();
        });

        row.appendChild(cell);
      }
      container.appendChild(row);
    }
  }

  // ─── UI: Presets ────────────────────────────────────────────────
  function renderPresets() {
    const grid = document.getElementById('preset-grid');
    grid.innerHTML = '';
    for (const [name, preset] of Object.entries(PRESETS)) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.dataset.name = name;
      btn.innerHTML = `<div class="preset-label">${name}</div><div class="preset-desc">${preset.desc}</div>`;
      btn.addEventListener('click', () => applyPreset(name));
      grid.appendChild(btn);
    }
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    state.speciesCount = preset.species;
    state.matrix = preset.matrix ? preset.matrix.map(r => [...r]) : randomMatrix(preset.species);
    state.activePreset = name;
    initParticles();
    renderMatrix();
    renderSpeciesSelector();
    updatePresetHighlight();
    updateStats();
  }

  function updatePresetHighlight() {
    document.querySelectorAll('.preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.name === state.activePreset);
    });
  }

  // ─── UI: Species selector ──────────────────────────────────────
  function renderSpeciesSelector() {
    const container = document.getElementById('species-count-selector');
    container.innerHTML = '';
    for (let n = 2; n <= 8; n++) {
      const btn = document.createElement('button');
      btn.className = 'species-count-btn' + (n === state.speciesCount ? ' active' : '');
      btn.textContent = n;
      btn.addEventListener('click', () => {
        state.speciesCount = n;
        state.matrix = resizeMatrix(state.matrix, n);
        state.activePreset = null;
        for (let i = 0; i < particleCount; i++) {
          if (particles.species[i] >= n) {
            particles.species[i] = Math.floor(Math.random() * n);
          }
        }
        renderMatrix();
        renderSpeciesSelector();
        updatePresetHighlight();
        updateStats();
      });
      container.appendChild(btn);
    }
    document.getElementById('species-count-display').textContent = state.speciesCount;
  }

  // ─── UI: Stats ─────────────────────────────────────────────────
  function updateStats() {
    document.getElementById('stat-particles').textContent = particleCount;
    document.getElementById('stat-species').textContent = state.speciesCount;
  }

  // ─── UI: Sliders ───────────────────────────────────────────────
  function initSliders() {
    const bind = (id, key, transform, display) => {
      const slider = document.getElementById('slider-' + id);
      const val = document.getElementById('val-' + id);
      slider.addEventListener('input', () => {
        const v = transform ? transform(slider.value) : parseFloat(slider.value);
        state[key] = v;
        val.textContent = display ? display(v) : v;

        if (key === 'particleCount') {
          initParticles();
          updateStats();
        }
      });
    };

    bind('count', 'particleCount', v => parseInt(v), v => v);
    bind('range', 'interactionRange', v => parseInt(v), v => v);
    bind('friction', 'friction', v => parseFloat(v), v => v.toFixed(2));
    bind('force', 'forceStrength', v => parseFloat(v), v => v.toFixed(1));
    bind('repulsion', 'repulsionDist', v => parseInt(v), v => v);
    bind('size', 'particleSize', v => parseFloat(v), v => v.toFixed(1));
    bind('trail', 'trailFade', v => parseFloat(v), v => v.toFixed(2));
  }

  // ─── UI: Buttons ───────────────────────────────────────────────
  function initButtons() {
    const pauseBtn = document.getElementById('btn-pause');
    pauseBtn.addEventListener('click', togglePause);

    document.getElementById('btn-randomize').addEventListener('click', () => {
      state.matrix = randomMatrix(state.speciesCount);
      state.activePreset = null;
      initParticles();
      renderMatrix();
      updatePresetHighlight();
    });

    document.getElementById('btn-toggle-panel').addEventListener('click', () => {
      document.getElementById('side-panel').classList.toggle('hidden');
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      const el = document.getElementById('instructions');
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.95)';
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      setTimeout(() => el.style.display = 'none', 250);
    });
  }

  function togglePause() {
    state.paused = !state.paused;
    const btn = document.getElementById('btn-pause');
    btn.innerHTML = state.paused
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Play`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case 'r':
        state.matrix = randomMatrix(state.speciesCount);
        state.activePreset = null;
        initParticles();
        renderMatrix();
        updatePresetHighlight();
        break;
      case 'p':
        document.getElementById('side-panel').classList.toggle('hidden');
        break;
    }
  });

  // ─── Mouse interaction ─────────────────────────────────────────
  let isDragging = false;
  let dragStartX, dragStartY;
  let dragStartPanX, dragStartPanY;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const oldZoom = state.zoom;
    state.zoom = Math.max(0.2, Math.min(5, state.zoom * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    state.panX += (mouseX / state.zoom - mouseX / oldZoom);
    state.panY += (mouseY / state.zoom - mouseY / oldZoom);
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartPanX = state.panX;
      dragStartPanY = state.panY;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    state.panX = dragStartPanX + (e.clientX - dragStartX) / state.zoom;
    state.panY = dragStartPanY + (e.clientY - dragStartY) / state.zoom;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ─── Initialize ─────────────────────────────────────────────────
  function init() {
    state.matrix = randomMatrix(state.speciesCount);
    initParticles();
    renderPresets();
    renderSpeciesSelector();
    renderMatrix();
    initSliders();
    initButtons();
    updateStats();

    applyPreset('Primordial Soup');

    requestAnimationFrame(loop);
  }

  init();
})();
