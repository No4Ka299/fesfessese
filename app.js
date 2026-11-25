const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
async function sendHook(url, payload) {
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }) }); } catch {}
}
const NICK_RE = /^[\p{L}\d_ -]{3,30}$/u;
const getUser = () => LS.get('mf_user', null);
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); const p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`; };
const fmtDate = t => new Date(t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ===== Шапка и подвал =====
(function layout() {
  const page = document.body.dataset.page, u = getUser();
  const links = [['index.html','Главная','home'],['rules.html','Правила','rules'],['apply.html','Вступить','apply'],['warehouse.html','Склад','wh']];
  document.body.insertAdjacentHTML('afterbegin',
    `<div class="stripe"></div><header><div class="bar"><a class="logo" href="index.html">${CONFIG.NAME}</a>
    <nav>${links.map(l => `<a href="${l[0]}" class="${l[2] === page ? 'on' : ''}">${l[1]}</a>`).join('')}</nav>
    <span class="who">${u ? 'Вы: <b>' + esc(u) + '</b>' : 'Не авторизован'}</span></div></header>`);
  document.body.insertAdjacentHTML('beforeend',
    `<footer>${CONFIG.NAME} · ${CONFIG.SERVER} · Санкт-Петербург${CONFIG.DISCORD ? ' · <a href="' + esc(CONFIG.DISCORD) + '">Discord</a>' : ''}</footer>`);
})();

// ===== Заявка =====
const appForm = $('#appForm');
if (appForm) appForm.addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(appForm)); d.t = Date.now();
  LS.set('mf_apps', [...LS.get('mf_apps', []), d]);
  if (CONFIG.WEBHOOK) {
    try {
      await fetch(CONFIG.WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `**Новая заявка в ${CONFIG.NAME}**\nНик: ${d.nick}\nСтатик: ${d.static}\nВозраст: ${d.age}\nОнлайн: ${d.online}\nОпыт: ${d.exp}\nО себе: ${d.about}` }) });
    } catch {}
  }
  appForm.reset();
  $('#appMsg').innerHTML = '<div class="msg ok">Заявка отправлена! Ожидайте ответа от руководства семьи.</div>';
});

// ===== Склад =====
const wh = $('#wh');
if (wh) {
  const log = () => LS.get('mf_log', []);
  const taken = id => log().filter(l => l.id === id).reduce((a, l) => a + l.qty, 0);
  const left = it => Math.max(0, it.stock - taken(it.id));
  const readyAt = (nick, it) => {
    const last = log().filter(l => l.nick === nick && l.id === it.id).pop();
    return last ? last.t + it.cooldownMin * 60000 : 0;
  };

  function render() {
    const u = getUser();
    if (!u) {
      wh.innerHTML = `<div class="card"><h2>Вход на склад</h2>
        <p class="lead" style="font-size:15px">Введите игровой ник. Если вас ещё нет, вы будете зарегистрированы автоматически.</p>
        <label>Ник (например, Ivan_Musorov)</label><input id="nick" maxlength="30" autocomplete="off">
        <button class="btn" id="login">Войти / Зарегистрироваться</button><div id="m"></div></div>`;
      $('#login').onclick = () => {
        const n = $('#nick').value.trim();
        if (!NICK_RE.test(n)) return $('#m').innerHTML = '<div class="msg err">Ник: 3–30 символов, буквы, цифры, пробел, _ или -</div>';
        const users = LS.get('mf_users', {});
        if (!users[n]) { users[n] = Date.now(); LS.set('mf_users', users); }
        LS.set('mf_user', n); location.reload();
      };
      return;
    }
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2 style="margin:0">Склад семьи</h2><button class="btn ghost" id="out" style="margin:0">Выйти (${esc(u)})</button></div>`;
    if (!CONFIG.ITEMS.length) html += '<div class="msg" style="margin-top:20px">Склад пока пуст. Предметы скоро появятся.</div>';
    else html += '<div class="grid">' + CONFIG.ITEMS.map(it => `
      <div class="card item" data-id="${esc(it.id)}">${it.img ? `<img src="${esc(it.img)}" alt="${esc(it.name)}">` : ''}<h3>${esc(it.name)}</h3>
        <div class="row"><span>На складе</span><b>${left(it)} / ${it.stock}</b></div>
        <div class="row"><span>Лимит на человека</span><b>${it.limit} шт.</b></div>
        <div class="row"><span>КД</span><b>${it.cooldownMin} мин.</b></div>
        <div class="row"><span>Доступно через</span><span class="cd" data-cd></span></div>
        <div class="qty"><input type="number" min="1" max="${it.limit}" value="1"><button class="btn">Запросить</button></div>
      </div>`).join('') + '</div><div id="m"></div>';
    const mine = log().filter(l => l.nick === u).slice(-10).reverse();
    html += `<div class="sec"><h2>Мои последние запросы</h2><div class="wrap"><table><tr><th>Дата</th><th>Предмет</th><th>Кол-во</th></tr>
      ${mine.length ? mine.map(l => { const it = CONFIG.ITEMS.find(i => i.id === l.id);
        return `<tr><td>${fmtDate(l.t)}</td><td>${esc(it ? it.name : l.id)}</td><td>${l.qty}</td></tr>`; }).join('') : '<tr><td colspan="3">Пока ничего</td></tr>'}
      </table></div></div>`;
    wh.innerHTML = html;
    $('#out').onclick = () => { localStorage.removeItem('mf_user'); location.reload(); };
    wh.querySelectorAll('.item').forEach(card => {
      const it = CONFIG.ITEMS.find(i => i.id === card.dataset.id), inp = card.querySelector('input');
      card.querySelector('.btn').onclick = () => {
        const q = parseInt(inp.value, 10), m = $('#m');
        if (!(q >= 1) || q > it.limit) return m.innerHTML = `<div class="msg err">Количество: от 1 до ${it.limit}</div>`;
        if (Date.now() < readyAt(u, it)) return m.innerHTML = '<div class="msg err">КД ещё не прошёл</div>';
        if (q > left(it)) return m.innerHTML = `<div class="msg err">На складе только ${left(it)} шт.</div>`;
        LS.set('mf_log', [...log(), { nick: u, id: it.id, qty: q, t: Date.now() }]);
        sendHook(CONFIG.WEBHOOK_WAREHOUSE, { embeds: [{ title: '📦 Запрос со склада', color: 0xb6ff3c, fields: [
          { name: 'Ник', value: u, inline: true }, { name: 'Предмет', value: it.name + ' × ' + q, inline: true },
          { name: 'Осталось на складе', value: String(left(it)), inline: true }], timestamp: new Date().toISOString() }] });
        render(); $('#m').innerHTML = `<div class="msg ok">Запрошено: ${esc(it.name)} × ${q}</div>`;
      };
    });
    tick();
  }
  function tick() {
    const u = getUser(); if (!u) return;
    wh.querySelectorAll('.item').forEach(card => {
      const it = CONFIG.ITEMS.find(i => i.id === card.dataset.id), rem = readyAt(u, it) - Date.now();
      const cd = card.querySelector('[data-cd]'), btn = card.querySelector('.btn'), out = left(it) <= 0;
      cd.textContent = rem > 0 ? fmt(rem) : 'Можно брать';
      cd.style.color = rem > 0 ? '' : 'var(--acc)';
      btn.disabled = rem > 0 || out; if (out) btn.textContent = 'Нет в наличии';
    });
  }
  render(); setInterval(tick, 1000);
}
