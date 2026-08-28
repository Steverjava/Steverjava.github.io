/* Aurora 站内搜索 */
(function () {
  'use strict';

  var doc = document;
  var modal = doc.getElementById('search-modal');
  if (!modal) return;

  var input = doc.getElementById('search-input');
  var list = doc.getElementById('search-results');
  var empty = doc.getElementById('search-empty');
  var toggle = doc.getElementById('search-toggle');
  var PATH = modal.getAttribute('data-path') || '/search.json';

  var indexPromise = null;
  var activeIndex = -1;
  var currentResults = [];

  function fetchIndex() {
    if (!indexPromise) {
      indexPromise = fetch(PATH, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .catch(function () {
          indexPromise = null;
          return [];
        });
    }
    return indexPromise;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function highlight(text, term) {
    var idx = text.toLowerCase().indexOf(term);
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) +
      '<mark>' + escapeHtml(text.slice(idx, idx + term.length)) + '</mark>' +
      escapeHtml(text.slice(idx + term.length));
  }

  function score(post, terms) {
    var s = 0;
    var title = post.title.toLowerCase();
    var tags = (post.tags || []).join(' ').toLowerCase();
    var cats = (post.categories || []).join(' ').toLowerCase();
    var content = post.content.toLowerCase();
    terms.forEach(function (t) {
      if (title.indexOf(t) !== -1) s += 8;
      if (tags.indexOf(t) !== -1) s += 6;
      if (cats.indexOf(t) !== -1) s += 5;
      if (content.indexOf(t) !== -1) s += 1;
    });
    return s;
  }

  function snippet(post, terms) {
    var content = post.content || '';
    var lower = content.toLowerCase();
    var pos = -1;
    terms.forEach(function (t) {
      var i = lower.indexOf(t);
      if (i !== -1 && (pos === -1 || i < pos)) pos = i;
    });
    var start = Math.max(0, pos - 30);
    var text = content.slice(start, start + 110);
    if (start > 0) text = '…' + text;
    if (start + 110 < content.length) text += '…';
    return text;
  }

  function render() {
    list.innerHTML = '';
    empty.hidden = true;
    var q = input.value.trim().toLowerCase();
    if (!q) return;

    var terms = q.split(/\s+/).filter(Boolean);
    var scored = currentResults
      .map(function (post) { return { post: post, score: score(post, terms) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || (b.post.date || '').localeCompare(a.post.date || ''); })
      .slice(0, 20);

    if (!scored.length) {
      empty.hidden = false;
      return;
    }

    activeIndex = -1;
    scored.forEach(function (r) {
      var li = doc.createElement('li');
      li.className = 'search-results__item';
      var a = doc.createElement('a');
      a.href = r.post.url;
      var titleEl = doc.createElement('span');
      titleEl.className = 'search-results__item-title';
      titleEl.innerHTML = highlight(r.post.title, terms[0]);
      var snipEl = doc.createElement('span');
      snipEl.className = 'search-results__item-snippet';
      snipEl.innerHTML = highlight(snippet(r.post, terms), terms[0]);
      a.appendChild(titleEl);
      a.appendChild(snipEl);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  var debounceTimer = null;
  function onInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      fetchIndex().then(function (data) {
        currentResults = data;
        render();
      });
    }, 140);
  }

  function moveActive(dir) {
    var items = list.querySelectorAll('.search-results__item');
    if (!items.length) return;
    activeIndex = (activeIndex + dir + items.length) % items.length;
    items.forEach(function (li, i) {
      li.querySelector('a').classList.toggle('is-active', i === activeIndex);
    });
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    modal.hidden = false;
    doc.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    modal.hidden = true;
    doc.body.style.overflow = '';
    input.value = '';
    list.innerHTML = '';
    empty.hidden = true;
    activeIndex = -1;
  }

  if (toggle) toggle.addEventListener('click', open);

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-search-close]')) close();
  });

  input.addEventListener('input', onInput);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var active = list.querySelector('.search-results__item a.is-active');
      var link = active || list.querySelector('.search-results__item a');
      if (link) window.location.href = link.href;
    }
    else if (e.key === 'Escape') close();
  });

  doc.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.hidden ? open() : close();
    }
  });

  // 预取索引,提升首次输入体验
  if ('requestIdleCallback' in window) {
    requestIdleCallback(function () { fetchIndex(); });
  } else {
    setTimeout(fetchIndex, 1200);
  }
})();
