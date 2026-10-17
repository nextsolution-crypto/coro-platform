/**
 * Sondes exécutées DANS la page (chaînes JavaScript évaluées par Chrome).
 * - SNAPSHOT : styles calculés de chaque élément du <body> (+ html, body).
 * - CONTRAST : ratio de contraste WCAG de chaque nœud de texte visible.
 */

const SNAPSHOT = String.raw`(() => {
  const PROPS = ['color','backgroundColor','backgroundImage','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopStyle','borderTopLeftRadius','borderTopRightRadius',
    'borderBottomRightRadius','borderBottomLeftRadius','boxShadow','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign',
    'textTransform','textDecorationLine','display','position','top','left','width','height','marginTop','marginRight','marginBottom','marginLeft',
    'paddingTop','paddingRight','paddingBottom','paddingLeft','opacity','visibility','zIndex','overflowX','overflowY','cursor','transform',
    'filter','backdropFilter','flexDirection','justifyContent','alignItems','gap'];
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','LINK','META','TITLE','TEMPLATE','NEXTJS-PORTAL']);
  const els = [];
  const rec = (el, path) => {
    const cs = getComputedStyle(el);
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
    els.push({ p: path, c: typeof el.className === 'string' ? el.className.slice(0, 120) : '', x: own.trim().slice(0, 40), v: PROPS.map((k) => cs[k]) });
  };
  const walk = (el, path) => {
    if (SKIP.has(el.tagName) || el.hasAttribute('data-bench')) return;
    rec(el, path);
    let i = 0;
    for (const ch of el.children) { if (SKIP.has(ch.tagName) || ch.hasAttribute('data-bench')) continue; walk(ch, path + '>' + ch.tagName.toLowerCase() + '[' + i + ']'); i++; }
  };
  rec(document.documentElement, 'html');
  walk(document.body, 'body');
  return JSON.stringify({ url: location.pathname, vw: innerWidth, props: PROPS, count: els.length, els });
})()`;

const CONTRAST = String.raw`(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (str) => {
    if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = str; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const root = getComputedStyle(document.documentElement);
  const canvasVar = root.getPropertyValue('--cg-canvas').trim();
  const baseCanvas = canvasVar ? parse(canvasVar) : { r: 255, g: 255, b: 255, a: 1 };
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + id + c; };
  const results = []; let total = 0, approx = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode; const el = node.parentElement;
    if (!el || seen.has(el) || !node.textContent.trim()) continue;
    if (['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName) || el.closest('nextjs-portal') || el.closest('[inert]') || el.closest('[data-bench]')) continue;
    const cs = getComputedStyle(el); const rect = el.getBoundingClientRect();
    if (cs.visibility !== 'visible' || cs.display === 'none' || rect.width < 1 || rect.height < 1) continue;
    if (rect.right <= 0 || rect.left >= innerWidth) continue;
    if (el.disabled || el.closest('[disabled]') || el.closest('[aria-disabled="true"]')) continue;
    seen.add(el); total++;
    let fg = parse(cs.color);
    let opacity = 1, usesImage = false; const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e); opacity *= Number(s.opacity);
      const bg = parse(s.backgroundColor);
      if (s.backgroundImage !== 'none') usesImage = true;
      if (bg.a > 0) layers.push(bg);
      if (bg.a >= 1) break;
    }
    let base = layers.length && layers[layers.length - 1].a >= 1 ? layers.pop() : baseCanvas;
    while (layers.length) base = over(layers.pop(), base);
    const fgOver = over({ ...fg, a: fg.a * opacity }, base);
    const r = ratio(fgOver, base);
    const px = parseFloat(cs.fontSize); const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    if (usesImage) approx++;
    if (r < need) results.push({ sel: sel(el), text: node.textContent.trim().slice(0, 40), fg: cs.color, bg: 'rgb(' + Math.round(base.r) + ',' + Math.round(base.g) + ',' + Math.round(base.b) + ')', ratio: Math.round(r * 100) / 100, need, approx: usesImage });
  }
  results.sort((a, b) => a.ratio - b.ratio);
  return JSON.stringify({ url: location.pathname, total, failures: results.length, approxBackgrounds: approx, items: results.slice(0, 60) });
})()`;

module.exports = { SNAPSHOT, CONTRAST };
