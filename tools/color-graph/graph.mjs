const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const title = value => value === 'ai' ? 'AI' : value.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const core = ['background', 'foreground', 'border', 'divider', 'interaction'];
let data, tokenMap, map;
const state = { view: 'role', theme: 'light', selected: null };

function readLocation() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.view = ['role', 'intent', 'reference'].includes(p.get('view')) ? p.get('view') : 'role';
  state.theme = ['light', 'dark'].includes(p.get('theme')) ? p.get('theme') : 'light';
  state.selected = tokenMap.has(p.get('token')) ? p.get('token') : null;
}
function saveLocation() {
  const p = new URLSearchParams({ view: state.view, theme: state.theme });
  if (state.selected) p.set('token', state.selected);
  history.replaceState(null, '', `#${p}`);
}
function closeInspector(returnFocus = false) {
  $('#inspector').close();
  document.body.classList.remove('inspector-open');
  map?.resize(true);
  if (returnFocus) $('#graph').focus({ preventScroll: true });
}
function selectToken(name, focus = false) {
  if (!tokenMap.has(name)) return;
  state.selected = name;
  $('#selection-announcement').textContent = `Selected ${tokenMap.get(name).path}`;
  renderInspector();
  if (!$('#inspector').open) {
    $('#inspector').show();
    document.body.classList.add('inspector-open');
    map.resize(true);
  }
  map.draw(); saveLocation();
  if (focus) map.focusToken(name);
}
function update({ fit = true } = {}) {
  document.documentElement.dataset.theme = state.theme;
  $$('[data-theme-choice]').forEach(b => {
    const active = b.dataset.themeChoice === state.theme;
    b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  });
  $$('[data-view]').forEach(b => {
    const active = b.dataset.view === state.view;
    b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  });
  map.layout(data.tokens, fit);
  if ($('#inspector').open) renderInspector();
  saveLocation();
}
function relatedNames(token) {
  return [...new Set(data.relationships
    .filter(relation => relation.source === token.name || relation.target === token.name)
    .flatMap(relation => [relation.source, relation.target]))]
    .filter(name => name !== token.name);
}
function renderInspector() {
  const t = tokenMap.get(state.selected);
  if (!t) return;
  const family = data.families.find(f => t.guidance.includes(f.id));
  const intent = data.intents.find(i => i.name === t.intent);
  const description = (intent ?? family)?.summary ?? 'A semantic color for its documented rendering context.';
  const related = relatedNames(t).map(name => tokenMap.get(name)).filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));
  const relatedSection = related.length ? `<section class="related" aria-labelledby="related-title"><h3 id="related-title">Related</h3><ul>${related.map(token => `<li class="related-item"><span class="small-swatch" style="--swatch:${token[state.theme].css}"></span><code>${escape(token.path)}</code></li>`).join('')}</ul></section>` : '';
  $('#inspector').innerHTML = `<div class="sheet-heading"><span class="token-swatch" style="--swatch:${t[state.theme].css}"></span><h2 id="token-title">${escape(t.path)}</h2><button id="sheet-close" class="sheet-close toggle-btn" aria-label="Close token details">Close</button></div>
    <div class="panel-body"><p class="token-path">${t.name}</p><p class="token-description">${escape(description)}</p>
      <div class="mode-values">${['light', 'dark'].map(mode => `<section class="mode-value" aria-label="${title(mode)} mode"><h3>${title(mode)}</h3><div class="mode-color"><span class="small-swatch" style="--swatch:${t[mode].css}"></span><code>${t[mode].hex}${t[mode].alpha < 1 ? ` / ${Math.round(t[mode].alpha * 100)}% opacity` : ''}</code></div><p class="reference-label">Reference</p><p class="reference-path">${escape(t[mode].referencePath ?? 'Direct value — no reference alias')}</p></section>`).join('')}</div>
      ${relatedSection}
    </div>`;
  $('#inspector').scrollTop = 0;
  $('#sheet-close').addEventListener('click', () => closeInspector(true));
}

function changeTheme(theme) {
  state.theme = theme;
  update({ fit: state.view === 'reference' });
}

/** A deterministic, animated cluster map. Layout positions have no semantic meaning;
 * only explicit alias edges and documented applicability edges describe relationships. */
class ColorMap {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.nodes = []; this.groups = []; this.positions = new Map();
    this.camera = { x: 0, y: 0, k: 1 }; this.width = 1; this.height = 1; this.availableWidth = 1;
    this.animation = 0; this.labelOpacity = 1; this.hovered = null; this.pointers = new Map();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.bind();
  }
  resize(animate = false) {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Reserve space for camera framing, but draw across the full canvas beneath the panel.
    const availableWidth = $('#inspector').open && matchMedia('(min-width:800px)').matches
      ? Math.max(1, $('#inspector').getBoundingClientRect().left - rect.left - 20)
      : rect.width;
    if (rect.width === this.width && rect.height === this.height && availableWidth === this.availableWidth) return;
    const previousWidth = this.framingWidth ?? this.availableWidth;
    const transition = this.resizeFrame;
    cancelAnimationFrame(this.animation); this.settle();
    const previous = { ...this.camera };
    const center = transition?.center ?? { x: (previousWidth / 2 - previous.x) / previous.k, y: (this.height / 2 - previous.y) / previous.k };
    const initialized = this.width > 1 && this.height > 1 && this.groups.length > 0;
    this.fit(false, previousWidth);
    const relativeZoom = transition?.relativeZoom ?? previous.k / this.camera.k;
    this.width = rect.width; this.height = rect.height; this.availableWidth = availableWidth;
    this.framingWidth = availableWidth;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.fit(false);
    if (initialized) {
      this.camera.k = Math.max(.12, Math.min(8, this.camera.k * relativeZoom));
      this.camera.x = this.availableWidth / 2 - center.x * this.camera.k;
      this.camera.y = this.height / 2 - center.y * this.camera.k;
    }
    if (animate && initialized && !reducedMotion.matches) {
      const target = { ...this.camera };
      this.camera = { ...previous };
      this.resizeFrame = { center, relativeZoom };
      this.framingWidth = previousWidth;
      const start = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - start) / 360);
        const ease = 1 - (1 - progress) ** 3;
        for (const key of ['x', 'y', 'k']) this.camera[key] = previous[key] + (target[key] - previous[key]) * ease;
        this.framingWidth = previousWidth + (availableWidth - previousWidth) * ease;
        this.draw();
        if (progress < 1) this.animation = requestAnimationFrame(tick);
        else this.resizeFrame = null;
      };
      this.animation = requestAnimationFrame(tick);
    }
    this.draw();
  }
  groupKey(token) {
    if (state.view === 'role') return token.family;
    if (state.view === 'intent') {
      if (token.family === 'color-intent') {
        const hue = token.path.split('.')[1];
        return hue === 'interaction' ? 'literal-interactions' : `literal:${hue}`;
      }
      return token.intent ?? (core.includes(token.family) ? 'shared-foundations' : token.family);
    }
    return token[state.theme].reference ?? `direct:${token.name}`;
  }
  layout(tokens, fit = true) {
    cancelAnimationFrame(this.animation);
    const buckets = new Map();
    for (const t of tokens) {
      const key = this.groupKey(t);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(t);
    }
    this.groups = [...buckets].map(([key, members]) => {
      const label = state.view === 'reference' ? (members[0][state.theme].referencePath ?? 'Direct value') : title(key.replace(/^literal:/, ''));
      const radius = Math.max(38, Math.sqrt(members.length) * 11 + 12);
      return { key, members, label, r: radius, x: 0, y: 0 };
    });
    // Pack circles without overlaps, with larger families anchoring the center.
    const packed = [...this.groups].sort((a, b) => b.r - a.r);
    for (let i = 0; i < packed.length; i++) {
      const g = packed[i];
      if (!i) continue;
      let placed = false;
      for (let step = 1; step < 14000 && !placed; step++) {
        const angle = step * 0.19;
        const distance = Math.sqrt(step) * 11;
        const x = Math.cos(angle) * distance * 1.12;
        const y = Math.sin(angle) * distance;
        if (packed.slice(0, i).every(other => Math.hypot(x - other.x, y - other.y) > g.r + other.r + 47)) {
          g.x = x; g.y = y; placed = true;
        }
      }
      if (!placed) g.x = Math.max(...packed.slice(0, i).map(other => other.x + other.r)) + g.r + 60;
    }
    const next = [];
    for (const g of this.groups) {
      const members = [...g.members].sort((a, b) => (a.intent ?? a.path).localeCompare(b.intent ?? b.path) || a.path.localeCompare(b.path));
      for (let i = 0; i < members.length; i++) {
        const t = members[i];
        const angle = i * Math.PI * (3 - Math.sqrt(5));
        const radius = state.view === 'reference' ? 22 + Math.sqrt(i) * 10 : Math.sqrt(i + .5) * 10;
        const tx = g.x + Math.cos(angle) * radius;
        const ty = g.y + Math.sin(angle) * radius;
        const old = this.positions.get(t.name);
        next.push({ t, group: g, x: old?.x ?? tx, y: old?.y ?? ty, sx: old?.x ?? tx, sy: old?.y ?? ty, tx, ty });
      }
    }
    this.nodes = next;
    const oldCamera = { ...this.camera };
    if (fit) this.fit(false);
    const nextCamera = { ...this.camera };
    this.camera = oldCamera;
    const duration = reducedMotion.matches ? 0 : 650;
    this.labelOpacity = fit && duration ? 0 : 1;
    const start = performance.now();
    const tick = now => {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      const ease = 1 - (1 - progress) ** 3;
      this.labelOpacity = fit ? progress : 1;
      for (const n of next) { n.x = n.sx + (n.tx - n.sx) * ease; n.y = n.sy + (n.ty - n.sy) * ease; this.positions.set(n.t.name, { x: n.x, y: n.y }); }
      for (const k of ['x', 'y', 'k']) this.camera[k] = oldCamera[k] + (nextCamera[k] - oldCamera[k]) * ease;
      this.draw();
      if (progress < 1) this.animation = requestAnimationFrame(tick);
    };
    this.animation = requestAnimationFrame(tick);
  }
  fit(redraw = true, width = this.availableWidth) {
    if (!this.groups.length) return;
    const minX = Math.min(...this.groups.map(g => g.x - g.r - 40));
    const maxX = Math.max(...this.groups.map(g => g.x + g.r + 40));
    const minY = Math.min(...this.groups.map(g => g.y - g.r - 40));
    const maxY = Math.max(...this.groups.map(g => g.y + g.r + 45));
    const k = Math.min((width - 48) / (maxX - minX), (this.height - 96) / (maxY - minY), 2);
    this.camera = { k: Math.max(.12, k), x: width / 2 - (minX + maxX) / 2 * k, y: this.height / 2 - (minY + maxY) / 2 * k };
    if (redraw) { cancelAnimationFrame(this.animation); this.settle(); this.draw(); }
  }
  settle() { this.labelOpacity = 1; this.resizeFrame = null; this.framingWidth = this.availableWidth; for (const n of this.nodes) { n.x = n.tx; n.y = n.ty; this.positions.set(n.t.name, { x: n.x, y: n.y }); } }
  zoom(factor, x = this.availableWidth / 2, y = this.height / 2) {
    cancelAnimationFrame(this.animation); this.settle();
    const next = Math.max(.12, Math.min(8, this.camera.k * factor));
    const ratio = next / this.camera.k;
    this.camera.x = x - (x - this.camera.x) * ratio; this.camera.y = y - (y - this.camera.y) * ratio; this.camera.k = next;
    this.draw();
  }
  focusToken(name) {
    const node = this.nodes.find(n => n.t.name === name);
    if (!node) return;
    cancelAnimationFrame(this.animation); this.settle();
    this.camera.k = Math.max(this.camera.k, 1.6);
    this.camera.x = this.availableWidth / 2 - node.x * this.camera.k;
    this.camera.y = this.height / 2 - node.y * this.camera.k;
    this.draw();
  }
  focusGroup(group) {
    cancelAnimationFrame(this.animation); this.settle();
    this.camera.k = Math.min(4, Math.min(this.availableWidth - 80, this.height - 140) / (group.r * 2));
    this.camera.x = this.availableWidth / 2 - group.x * this.camera.k;
    this.camera.y = (this.height - 80) / 2 - group.y * this.camera.k;
    this.draw();
  }
  point(node) { return { x: node.x * this.camera.k + this.camera.x, y: node.y * this.camera.k + this.camera.y }; }
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    // Canvas cannot resolve CSS variables; sample the UI's computed colors.
    const ink = getComputedStyle($('.workspace')).color;
    const dark = state.theme === 'dark';
    const line = dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.075)';
    const muted = dark ? '#AAAAAA' : '#646464';
    ctx.fillStyle = line;
    const spacing = 24;
    for (let x = ((this.camera.x % spacing) + spacing) % spacing; x < this.width; x += spacing) {
      for (let y = ((this.camera.y % spacing) + spacing) % spacing; y < this.height; y += spacing) { ctx.beginPath(); ctx.arc(x, y, .65, 0, Math.PI * 2); ctx.fill(); }
    }
    const k = this.camera.k;
    const selected = this.nodes.find(n => n.t.name === state.selected);
    const related = new Set(selected ? relatedNames(selected.t) : []);
    if (state.view === 'reference') {
      for (const n of this.nodes) {
        if (!n.t[state.theme].reference) continue;
        const a = this.point(n), b = this.point(n.group);
        ctx.strokeStyle = n.t.name === state.selected ? muted : line;
        ctx.lineWidth = n.t.name === state.selected ? 1.4 : .7;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else if (selected) {
      const a = this.point(selected);
      ctx.strokeStyle = ink; ctx.lineWidth = .9; ctx.setLineDash([3, 5]);
      for (const n of this.nodes.filter(n => related.has(n.t.name))) {
        const b = this.point(n);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 + 12, (a.y + b.y) / 2 - 20, b.x, b.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    const radius = Math.max(2.4, Math.min(13, 4.2 * k));
    const labelBoxes = [];
    const overlaps = box => labelBoxes.some(b => box.x < b.x + b.w + 6 && box.x + box.w + 6 > b.x && box.y < b.y + b.h + 5 && box.y + box.h + 5 > b.y);
    if (selected) {
      const point = this.point(selected);
      ctx.font = '9px Inter, -apple-system, sans-serif';
      const width = ctx.measureText(selected.t.path).width + 18;
      labelBoxes.push({ x: Math.max(8, Math.min(this.width - width - 8, point.x - width / 2)), y: point.y + radius + 3, w: width, h: 17 });
    }
    for (const g of [...this.groups].sort((a, b) => b.r - a.r)) {
      const p = this.point(g);
      if (state.view === 'reference') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = g.members[0][state.theme].rgb; ctx.strokeStyle = muted; ctx.lineWidth = 1;
        const size = Math.max(5, 7 * Math.min(k, 2)); ctx.fillRect(-size / 2, -size / 2, size, size); ctx.strokeRect(-size / 2, -size / 2, size, size); ctx.restore();
      }
      if (state.view !== 'reference' || k > .9 || g.members.length >= 7 || this.groups.length < 8) {
        const label = state.view === 'reference' ? g.label.replace(/^(light|dark)\//, '') : g.label;
        const y = p.y + g.r * k + 10;
        ctx.font = '500 11px Inter, -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = muted;
        const text = label.length > 30 && k < 1 ? `${label.slice(0, 28)}…` : label;
        const width = ctx.measureText(text).width;
        const box = { x: p.x - width / 2, y: y - 11, w: width, h: 29 };
        if (box.x < 8 || box.x + box.w > this.width - 8 || overlaps(box)) continue;
        labelBoxes.push(box);
        ctx.globalAlpha = this.labelOpacity;
        ctx.fillText(text, p.x, y);
        ctx.font = '9px Inter, -apple-system, sans-serif'; ctx.globalAlpha = .8 * this.labelOpacity;
        ctx.fillText(`${g.members.length} ${g.key.startsWith('literal:') ? 'hue tokens' : g.members.length === 1 ? 'token' : 'tokens'}`, p.x, y + 14); ctx.globalAlpha = 1;
      }
    }
    for (const n of this.nodes) {
      const p = this.point(n), isSelected = n.t.name === state.selected;
      const isRelated = related.has(n.t.name) && state.view !== 'reference';
      const isHighlighted = isSelected || isRelated;
      if (p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = n.t[state.theme].rgb; ctx.fill();
      ctx.strokeStyle = isHighlighted ? ink : dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)';
      ctx.lineWidth = isHighlighted ? 1 : .7;
      ctx.stroke();
    }
    // At close range, reveal names only where they fit; keyboard navigation reaches every token.
    if (k >= 2.2) {
      ctx.font = '9px Inter, -apple-system, sans-serif'; ctx.textAlign = 'left';
      for (const n of this.nodes) {
        if (n.t.name === state.selected) continue;
        const p = this.point(n), label = n.t.path;
        const width = ctx.measureText(label).width + 8;
        const box = { x: p.x - width / 2, y: p.y + radius + 3, w: width, h: 15 };
        if (box.x < 8 || box.y < 8 || box.x + box.w > this.width - 8 || box.y > this.height - 90 || overlaps(box)) continue;
        labelBoxes.push(box); ctx.fillStyle = dark ? '#161616' : '#FFFFFF'; ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = ink; ctx.fillText(label, box.x + 4, box.y + 11);
      }
    }
    if (selected) {
      const p = this.point(selected);
      if (p.x > 10 && p.x < this.width - 10 && p.y > 10 && p.y < this.height - 65) {
        const label = selected.t.path;
        ctx.font = '9px Inter, -apple-system, sans-serif';
        const width = ctx.measureText(label).width + 18;
        const x = Math.max(8, Math.min(this.width - width - 8, p.x - width / 2)); const y = p.y + radius + 3;
        ctx.fillStyle = dark ? '#EEEEEE' : '#202020'; ctx.beginPath(); ctx.rect(x, y, width, 17); ctx.fill();
        ctx.fillStyle = dark ? '#202020' : '#FFFFFF'; ctx.textAlign = 'left'; ctx.fillText(label, x + 9, y + 11);
      }
    }
  }
  hit(x, y) {
    let match = null, distance = Infinity;
    for (const n of this.nodes) {
      const p = this.point(n), d = Math.hypot(p.x - x, p.y - y);
      if (d < Math.max(8, 6 * this.camera.k) && d < distance) { match = n; distance = d; }
    }
    return match;
  }
  bind() {
    const canvas = this.canvas;
    const local = e => { const rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; };
    canvas.addEventListener('wheel', e => { e.preventDefault(); const p = local(e); this.zoom(Math.exp(-e.deltaY * .002), p.x, p.y); }, { passive: false });
    canvas.addEventListener('pointerdown', e => {
      const p = local(e); this.pointers.set(e.pointerId, p);
      cancelAnimationFrame(this.animation); this.settle();
      canvas.setPointerCapture(e.pointerId); this.drag = { start: p, previous: p, moved: false };
      canvas.classList.add('dragging'); $('#graph-tooltip').hidden = true;
    });
    canvas.addEventListener('pointermove', e => {
      const p = local(e);
      if (this.pointers.has(e.pointerId)) {
        const old = this.pointers.get(e.pointerId);
        const other = [...this.pointers].find(([id]) => id !== e.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(old.x - other.x, old.y - other.y);
          const after = Math.hypot(p.x - other.x, p.y - other.y);
          if (before > 0) this.zoom(after / before, (p.x + other.x) / 2, (p.y + other.y) / 2);
          this.drag.moved = true;
        } else {
          this.camera.x += p.x - old.x; this.camera.y += p.y - old.y;
          if (Math.hypot(p.x - this.drag.start.x, p.y - this.drag.start.y) > 4) this.drag.moved = true;
        }
        this.pointers.set(e.pointerId, p); this.draw(); return;
      }
      this.hovered = this.hit(p.x, p.y); canvas.style.cursor = this.hovered ? 'pointer' : 'grab';
      const tooltip = $('#graph-tooltip'); tooltip.hidden = !this.hovered;
      if (this.hovered) {
        tooltip.textContent = this.hovered.t.path;
        const point = this.point(this.hovered);
        const radius = Math.max(2.4, Math.min(13, 4.2 * this.camera.k));
        const halfWidth = tooltip.offsetWidth / 2;
        tooltip.style.left = `${Math.max(halfWidth + 8, Math.min(point.x, this.width - halfWidth - 8))}px`;
        tooltip.style.top = `${point.y + radius + 3}px`;
      }
      this.draw();
    });
    canvas.addEventListener('pointerup', e => {
      const p = local(e), wasSingle = this.pointers.size === 1;
      this.pointers.delete(e.pointerId); canvas.classList.remove('dragging');
      if (wasSingle && this.drag && !this.drag.moved) {
        const node = this.hit(p.x, p.y);
        if (node) selectToken(node.t.name);
        else {
          closeInspector();
          const group = this.groups.find(g => { const point = this.point(g); return Math.hypot(point.x - p.x, point.y - p.y) < g.r * this.camera.k + 20; });
          if (group) {
            this.focusGroup(group);
          }
        }
      }
    });
    canvas.addEventListener('pointercancel', e => { this.pointers.delete(e.pointerId); canvas.classList.remove('dragging'); });
    canvas.addEventListener('pointerleave', () => { this.hovered = null; $('#graph-tooltip').hidden = true; this.draw(); });
    canvas.addEventListener('dblclick', e => { const p = local(e); this.zoom(1.6, p.x, p.y); });
    canvas.addEventListener('keydown', e => {
      if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      if (e.key === '+' || e.key === '=') this.zoom(1.25);
      if (e.key === '-') this.zoom(.8);
      if (e.key === '0') this.fit();
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectToken(state.selected ?? this.nodes[0]?.t.name);
      }
      if (e.key.startsWith('Arrow') && !e.shiftKey) {
        const ordered = [...this.nodes].sort((a, b) => a.t.path.localeCompare(b.t.path));
        const index = ordered.findIndex(n => n.t.name === state.selected);
        const delta = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
        const node = ordered[(index + delta + ordered.length) % ordered.length];
        if (node) {
          state.selected = node.t.name;
          $('#selection-announcement').textContent = node.t.path;
          this.focusToken(node.t.name); saveLocation();
          if ($('#inspector').open) renderInspector();
        }
      }
      if (e.key.startsWith('Arrow') && e.shiftKey) {
        cancelAnimationFrame(this.animation); this.settle();
        this.camera.x += e.key === 'ArrowLeft' ? 45 : e.key === 'ArrowRight' ? -45 : 0;
        this.camera.y += e.key === 'ArrowUp' ? 45 : e.key === 'ArrowDown' ? -45 : 0; this.draw();
      }
    });
  }
}


function wireControls() {
  $('#zoom-in').addEventListener('click', () => map.zoom(1.3));
  $('#zoom-out').addEventListener('click', () => map.zoom(1 / 1.3));
  $('#reset-view').addEventListener('click', () => map.fit());
  $$('[data-view]').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; update(); }));
  $$('[data-theme-choice]').forEach(b => b.addEventListener('click', () => changeTheme(b.dataset.themeChoice)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#inspector').open) { e.preventDefault(); closeInspector(true); }
  });
  window.addEventListener('hashchange', () => { readLocation(); closeInspector(); update(); });
}

try {
  const response = await fetch('./graph-data.json');
  if (!response.ok) throw new Error(`Unable to load colors (${response.status})`);
  data = await response.json();
  tokenMap = new Map(data.tokens.map(t => [t.name, t]));
  readLocation();
  map = new ColorMap($('#graph')); wireControls(); update(); map.resize();
  document.fonts.ready.then(() => map.draw());
} catch (error) {
  $('#load-error').hidden = false;
  $('#load-error').textContent = 'The color graph could not be loaded. Reload the page after building the documentation.';
  console.error(error);
}
