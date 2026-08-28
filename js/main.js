/* Aurora 主题交互 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 主题切换 ---------- */
  var themeBtn = doc.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('aurora-theme', next); } catch (e) {}
      syncGiscusTheme(next);
    });
  }

  /* ---------- 移动端导航 ---------- */
  var burger = doc.getElementById('nav-burger');
  var menu = doc.getElementById('nav-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    doc.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !burger.contains(e.target)) {
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    // 点击菜单项后自动收起
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 导航滚动状态 ---------- */
  var nav = doc.getElementById('nav');
  var onNavScroll = function () {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 10);
  };
  onNavScroll();
  window.addEventListener('scroll', onNavScroll, { passive: true });

  /* ---------- 阅读进度条 ---------- */
  var progress = doc.getElementById('reading-progress');
  if (progress) {
    var onProgress = function () {
      var h = doc.documentElement;
      var total = h.scrollHeight - h.clientHeight;
      progress.style.width = total > 0 ? (h.scrollTop / total) * 100 + '%' : '0%';
    };
    onProgress();
    window.addEventListener('scroll', onProgress, { passive: true });
  }

  /* ---------- 回到顶部 ---------- */
  var backTop = doc.getElementById('back-top');
  if (backTop) {
    var onBackTopScroll = function () {
      backTop.classList.toggle('is-visible', window.scrollY > 420);
    };
    onBackTopScroll();
    window.addEventListener('scroll', onBackTopScroll, { passive: true });
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 滚动显现 ---------- */
  var revealEls = doc.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    } else {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -36px' });
      revealEls.forEach(function (el) { revealIO.observe(el); });
    }
  }

  /* ---------- TOC 高亮 ---------- */
  var tocLinks = doc.querySelectorAll('.toc-box__nav a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var ids = Array.prototype.map.call(tocLinks, function (a) { return a.getAttribute('href').slice(1); });
    var headings = {};
    ids.forEach(function (id) { var el = doc.getElementById(id); if (el) headings[id] = el; });
    var setActive = function (id) {
      tocLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    };
    var tocIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-70px 0px -65% 0px', threshold: 0 });
    ids.forEach(function (id) { if (headings[id]) tocIO.observe(headings[id]); });
    // 滚动到底部时高亮最后一个标题
    var onTocBottom = function () {
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 6) {
        setActive(ids[ids.length - 1]);
      }
    };
    window.addEventListener('scroll', onTocBottom, { passive: true });
  }

  /* ---------- Hero 打字机 ---------- */
  var typedText = doc.getElementById('typed-text');
  if (typedText) {
    var phrases = (window.AURORA_TYPED || []).filter(Boolean);
    if (phrases.length) {
      var pi = 0, ci = 0, deleting = false;
      var type = function () {
        var word = phrases[pi];
        typedText.textContent = word.slice(0, ci);
        var delay = deleting ? 42 : 82;
        if (!deleting && ci === word.length) { delay = 2000; deleting = true; }
        else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 380; }
        ci += deleting ? -1 : 1;
        setTimeout(type, reduced ? 0 : delay);
      };
      type();
    }
  }

  /* ---------- 代码复制按钮 ---------- */
  var copySvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  doc.querySelectorAll('.post-content pre').forEach(function (pre) {
    if (pre.querySelector('.code-copy')) return;
    var btn = doc.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML = copySvg;
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : pre.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          btn.innerHTML = checkSvg;
          btn.classList.add('is-copied');
          setTimeout(function () { btn.innerHTML = copySvg; btn.classList.remove('is-copied'); }, 1600);
        }).catch(function () {});
      }
    });
    pre.appendChild(btn);
  });

  /* ---------- Giscus:懒加载 + 主题同步 ---------- */
  var giscusBox = doc.getElementById('giscus');
  function giscusTheme() {
    return root.getAttribute('data-theme') === 'dark'
      ? (giscusBox.getAttribute('data-theme') || 'dark_dimmed')
      : 'light';
  }
  function loadGiscus() {
    if (doc.querySelector('script[src*="giscus.app/client.js"]')) return;
    var s = doc.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    Object.keys(giscusBox.dataset).forEach(function (key) {
      s.setAttribute('data-' + key.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), giscusBox.dataset[key]);
    });
    doc.body.appendChild(s);
  }
  function syncGiscusTheme(theme) {
    var frame = doc.querySelector('iframe.giscus-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({
        giscus: { setConfig: { theme: theme === 'dark' ? giscusTheme() : 'light' } }
      }, 'https://giscus.app');
    }
  }
  window.syncGiscusTheme = syncGiscusTheme;

  if (giscusBox) {
    giscusBox.setAttribute('data-theme', giscusTheme());
    if ('IntersectionObserver' in window) {
      var giscusIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { loadGiscus(); giscusIO.disconnect(); }
        });
      }, { rootMargin: '360px 0px' });
      giscusIO.observe(giscusBox);
    } else {
      loadGiscus();
    }
  }
})();
