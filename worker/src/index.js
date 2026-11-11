// Serves shared recipes at /r/<id> (append ?dev for Carnet Dev) with per-recipe
// Open Graph tags, so Messages and other apps show the recipe's title and photo.
// Records live in the app's CloudKit public database (record type SharedRecipe).

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function lookup(env, id, dev) {
  const container = dev ? env.DEV_CONTAINER : env.PROD_CONTAINER;
  const token = dev ? env.DEV_TOKEN : env.PROD_TOKEN;
  const res = await fetch(
    `https://api.apple-cloudkit.com/database/1/${container}/${dev ? 'development' : 'production'}/public/records/lookup?ckAPIToken=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://maxig0d.github.io' },
      body: JSON.stringify({ records: [{ recordName: id }] }) });
  const rec = (await res.json()).records?.[0];
  if (!rec?.fields) return null;
  const f = k => rec.fields[k]?.value;
  return {
    t: f('title'), time: f('time'), prep: f('prep'), cook: f('cook'), por: f('portions'),
    ing: f('ingredients') || [], steps: f('steps') || [],
    photo: f('photo')?.downloadURL?.replace('${f}', 'photo.jpg'), source: f('source'),
  };
}

const ICON = {
  prep: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  cook: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-4 2.5-5 .2 1.6 1 2.6 2 3 .6-2.6.5-5.2.5-8z"/></svg>',
  time: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  por: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/></svg>',
};
const isSection = l => /^#\s*/.test(l) || (/^pour\b/i.test(l) && !/\d/.test(l) && l.length < 60) || /:\s*$/.test(l);
const clean = l => l.replace(/^#\s*/, '').replace(/:\s*$/, '');
function list(lines, step) {
  let n = 0, html = '';
  for (const l of lines) {
    if (isSection(l)) { html += `<li class="sec">${esc(clean(l))}</li>`; continue; }
    n++; html += step ? `<li><b>${n}</b><p>${esc(l)}</p></li>` : `<li>${esc(l)}</li>`;
  }
  return { html, n };
}

function page(env, r, url, imgURL) {
  const ing = list(r.ing), st = list(r.steps, true);
  const stats = [['prep', 'Préparation', r.prep], ['cook', 'Cuisson', r.cook], ['time', 'Total', r.time], ['por', 'Portions', r.por]].filter(x => x[2]);
  const desc = [r.time, r.por].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.t)}</title>
<meta property="og:title" content="${esc(r.t)}"><meta property="og:site_name" content="Carnet de Recettes"><meta property="og:type" content="article"><meta property="og:url" content="${esc(url)}">
${desc ? `<meta property="og:description" content="${esc(desc)}">` : ''}
<meta property="og:image" content="${esc(imgURL || env.SITE + '/icon.png')}"><meta name="twitter:card" content="${imgURL ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="${env.SITE}/icon.png"><link rel="apple-touch-icon" href="${env.SITE}/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${env.SITE}/r/recipe.css?v=1"></head><body><main>
<header class="hero${imgURL ? '' : ' plain'}">${imgURL ? `<img src="${esc(imgURL)}" alt="">` : ''}<h1>${esc(r.t)}</h1></header>
${stats.length ? `<div class="stats">${stats.map(([i, k, v]) => `<div>${ICON[i]}<span><small>${k}</small><strong>${esc(v)}</strong></span></div>`).join('')}</div>` : ''}
<div class="body"><section class="ing card"><h2>Ingrédients</h2><p class="count">${ing.n} ingrédient${ing.n > 1 ? 's' : ''}</p><ul>${ing.html}</ul></section>
<section class="steps"><h2>Préparation</h2><p class="count">${st.n} étape${st.n > 1 ? 's' : ''}</p><ol>${st.html}</ol></section></div>
</main><footer><a href="${env.SITE}/"><img src="${env.SITE}/icon.png" alt="">Carnet de Recettes</a></footer></body></html>`;
}

const notFound = env => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette introuvable</title><link rel="stylesheet" href="${env.SITE}/r/recipe.css?v=1"></head><body><main><header class="hero plain"><h1>Recette introuvable</h1></header></main><footer><a href="${env.SITE}/"><img src="${env.SITE}/icon.png" alt="">Carnet de Recettes</a></footer></body></html>`,
  { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/r\/([A-Za-z0-9]{6,40})(\/photo\.jpg)?\/?$/);
    if (!m) return Response.redirect(env.SITE + '/', 302);
    const [, id, wantsPhoto] = m, dev = url.searchParams.has('dev');

    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) return hit;

    const r = await lookup(env, id, dev).catch(() => null);
    if (!r) return notFound(env);

    let res;
    if (wantsPhoto) {
      // CloudKit asset URLs expire, so the photo is proxied through a stable address.
      const src = r.photo || r.source;
      if (!src) return new Response('', { status: 404 });
      const img = await fetch(src, { headers: { 'User-Agent': 'Carnet' } });
      if (!img.ok) return new Response('', { status: 404 });
      res = new Response(img.body, { headers: { 'Content-Type': img.headers.get('Content-Type') || 'image/jpeg', 'Cache-Control': 'public, max-age=604800' } });
    } else {
      const imgURL = (r.photo || r.source) ? `${url.origin}/r/${id}/photo.jpg${dev ? '?dev' : ''}` : null;
      res = new Response(page(env, r, url.href, imgURL), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
    }
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  },
};
