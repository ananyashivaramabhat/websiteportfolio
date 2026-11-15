(function () {
  'use strict';

  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(path + ' ' + r.status);
        return r.json();
      });
    }
    return cache[path];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var page = document.body.getAttribute('data-page');

  /* ---------- shell: header + footer ---------- */
  function renderShell(site) {
    var links = [
      ['index.html', 'Home', 'home'],
      ['work.html', 'Work', 'work'],
      ['ambientrx.html', 'AmbientRx', 'ambientrx'],
      ['about.html', 'About', 'about']
    ];
    var nav = links.map(function (l) {
      var on = page === l[2] || (page === 'project' && l[2] === 'work');
      return '<a href="' + l[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
    }).join('');

    var header = $('#site-header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML = '<div class="wrap"><a class="brand" href="index.html"><span class="dot" aria-hidden="true"></span>ananya.bhat</a>' +
        '<nav class="nav" aria-label="Primary">' + nav + '</nav>' +
        '<a class="btn nav-cta" href="' + esc(site.resume) + '">Résumé <span class="arrow">↓</span></a></div>';
      var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var footer = $('#site-footer');
    if (footer) {
      var year = new Date().getFullYear();
      footer.className = 'site-footer';
      footer.innerHTML =
        '<div class="wrap">' +
          '<div class="footer-grid">' +
            '<div style="grid-column: span 2; min-width: 0"><p class="footer-big">Building firmware for hardware that has to work.</p>' +
              '<p class="mute" style="margin-top: 16px">' + esc(site.email) + '</p></div>' +
            '<div class="footer-links">' +
              '<a href="mailto:' + esc(site.email) + '">Email <span class="arrow">→</span></a>' +
              '<a href="' + esc(site.linkedin) + '">LinkedIn <span class="arrow">→</span></a>' +
              '<a href="https://github.com/' + esc(site.github) + '">GitHub <span class="arrow">→</span></a>' +
              '<a href="' + esc(site.resume) + '">Résumé (PDF) <span class="arrow">→</span></a>' +
            '</div>' +
          '</div>' +
          '<div class="footer-base mono"><span>© ' + year + ' ' + esc(site.name) + '</span><span id="local-time"></span></div>' +
        '</div>';
      tickTime();
      setInterval(tickTime, 30000);
    }
  }

  function tickTime() {
    var el = $('#local-time');
    if (!el) return;
    try {
      var t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date());
      el.textContent = 'Philadelphia · ' + t + ' ET';
    } catch (e) { el.textContent = 'Philadelphia'; }
  }

  /* ---------- reveal on scroll ---------- */
  function observeReveals() {
    var els = $all('.reveal:not(.in), .chart:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- work rows ---------- */
  function rowHTML(p, i) {
    var href = p.page || ('project.html#' + p.id);
    return '<div class="row"><a class="row-link" href="' + esc(href) + '">' +
      '<span class="n">' + pad(i + 1) + '</span>' +
      '<span class="t">' + esc(p.org) + (p.award ? '<span class="badge">AWARD</span>' : '') + '</span>' +
      '<span class="c">' + esc(p.role) + '</span>' +
      '<span class="y">' + esc(p.when || p.year) + '</span>' +
      '<span class="i" aria-hidden="true">→</span></a></div>';
  }

  /* ---------- pages ---------- */
  function initHome() {
    var photo = $('.hero-photo');
    if (photo) {
      var img = $('img', photo);
      var done = function () { photo.classList.add('loaded'); };
      if (img.complete) done(); else img.addEventListener('load', done);
      var hero = $('.hero');
      if (hero && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        hero.addEventListener('pointermove', function (e) {
          var r = hero.getBoundingClientRect();
          photo.style.transform = 'translate(' + (((e.clientX - r.left) / r.width - 0.5) * -14).toFixed(1) + 'px,' + (((e.clientY - r.top) / r.height - 0.5) * -10).toFixed(1) + 'px) scale(1.02)';
        });
        hero.addEventListener('pointerleave', function () { photo.style.transform = ''; });
      }
    }

    initNerd();
    loadGitHub();
  }

  /* home: little techie girl who walks across the name, points, then jumps onto the photo */
  var FACE = {"E": [330, 292, 536, 330], "M": [308, 286, 558, 476], "img": {"lookr": "face-lookr.webp", "ul": "face-ul.webp", "up": "face-up.webp", "ur": "face-ur.webp", "smile": "face-smile.webp"}};
  function stagePhoto(photo) {
    var img = $('img', photo);
    if (!img || $('.hp-stage', photo)) return $('.hp-stage', photo);
    var st = document.createElement('div');
    st.className = 'hp-stage';
    photo.insertBefore(st, img);
    st.appendChild(img);
    var IW = 896, IH = 833;
    function fx(b, k) { return (b[k] / (k % 2 ? IH : IW) * 100) + '%'; }
    function addFrame(key, box) {
      var f = document.createElement('img');
      f.className = 'hp-face hp-' + key;
      f.alt = '';
      f.onerror = function () { f.remove(); };
      f.src = FACE.img[key];
      f.style.left = (box[0] / IW * 100) + '%';
      f.style.top = (box[1] / IH * 100) + '%';
      f.style.width = ((box[2] - box[0]) / IW * 100) + '%';
      f.style.height = ((box[3] - box[1]) / IH * 100) + '%';
      st.appendChild(f);
    }
    function fit() {
      var cw = photo.clientWidth, ch = photo.clientHeight;
      var s = Math.max(cw / IW, ch / IH), w = IW * s, h = IH * s;
      var pos = (getComputedStyle(img).objectPosition || '50% 8%').split(' ');
      var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1] || '50%') / 100;
      if (isNaN(px)) px = 0.5; if (isNaN(py)) py = 0.08;
      st.style.width = w + 'px'; st.style.height = h + 'px';
      st.style.left = (cw - w) * px + 'px'; st.style.top = (ch - h) * py + 'px';
    }
    photo.classList.add('staged');
    fit();
    window.addEventListener('resize', fit);
    return st;
  }
  function faceShow(key) {
    $all('.hp-face').forEach(function (f) { f.classList.toggle('on', f.classList.contains('hp-' + key)); });
  }

  function initNerd() {
    var inner = $('.hero-inner'), h1 = $('.hero h1'), photo = $('.hero-photo');
    if (!inner || !h1 || !photo || !window.Element.prototype.animate) return;
    var spans = $all('.hero h1 .line span');
    if (spans.length < 2) return;
    var stage = stagePhoto(photo);
    var el = document.createElement('div');
    el.className = 'nerd';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="nerd-bubble mono"></div>' +
      '<div class="nerd-flip"><svg viewBox="0 0 40 62" width="40" height="62">' +
        '<g class="n-leg n-leg-b"><rect x="17" y="40" width="4.4" height="15" rx="2" fill="#1B2350"/><rect x="15.6" y="53.5" width="7.4" height="4.6" rx="2.2" fill="#E9EDF7"/></g>' +
        '<g class="n-arm n-arm-b"><rect x="18" y="28" width="4" height="12" rx="2" fill="#1666D6"/><circle cx="20" cy="40.5" r="2.1" fill="#C98C62"/></g>' +
        '<g class="n-leg n-leg-f"><rect x="19" y="40" width="4.4" height="15" rx="2" fill="#2A3258"/><rect x="18.6" y="53.5" width="7.4" height="4.6" rx="2.2" fill="#F2F4FA"/></g>' +
        '<path d="M11.5 31.5C11.5 27 15 25 20.5 25S29.5 27 29.5 31.5V40.5C29.5 42 28.5 43 27 43H14C12.5 43 11.5 42 11.5 40.5Z" fill="#1E7BFF"/>' +
        '<path d="M15.5 36.5H25.5" stroke="#0F4DB0" stroke-width="1.2" stroke-linecap="round"/>' +
        '<text x="20.5" y="35" text-anchor="middle" font-family="Geist Mono, monospace" font-size="4.6" fill="#DCE8FF">{ }</text>' +
        '<g class="n-head">' +
          '<path d="M10.5 17.5C10.5 8 30.5 8 30.5 17.5C30.5 22 29 25.5 27 27H14C12 25.5 10.5 22 10.5 17.5Z" fill="#1C1412"/>' +
          '<circle cx="31" cy="12.5" r="3.6" fill="#1C1412"/>' +
          '<ellipse cx="20.5" cy="17.5" rx="7.6" ry="8" fill="#C98C62"/>' +
          '<path d="M12.6 15.5C13 9.5 18 8 21.5 8.5C26 9 29 12 28.6 15.5C25.5 12.5 18 12 12.6 15.5Z" fill="#1C1412"/>' +
          '<g class="n-eyes" fill="#1A1A22"><circle cx="17.6" cy="18.2" r="1"/><circle cx="23.6" cy="18.2" r="1"/></g>' +
          '<g fill="rgba(255,255,255,.22)" stroke="#0A0A10" stroke-width="1.1"><circle cx="17.6" cy="18.2" r="2.7"/><circle cx="23.6" cy="18.2" r="2.7"/></g>' +
          '<path d="M20.3 18.2H20.9" stroke="#0A0A10" stroke-width="1.1"/>' +
          '<path class="n-mouth" d="M18.8 22.6Q20.6 24 22.4 22.6" fill="none" stroke="#6E3424" stroke-width="0.9" stroke-linecap="round"/>' +
          '<path d="M11.4 18.5C11.4 6.8 29.8 6.8 29.8 18.5" fill="none" stroke="#1E7BFF" stroke-width="1.9" stroke-linecap="round"/>' +
          '<rect x="8.9" y="15.6" width="4.2" height="7" rx="2" fill="#1E7BFF"/><rect x="28.1" y="15.6" width="4.2" height="7" rx="2" fill="#1E7BFF"/>' +
        '</g>' +
        '<g class="n-arm n-arm-f"><rect x="19" y="28" width="4" height="13" rx="2" fill="#2B86FF"/><circle cx="21" cy="41.5" r="2.2" fill="#C98C62"/><rect class="n-finger" x="20.3" y="42" width="1.5" height="4.2" rx=".75" fill="#C98C62"/></g>' +
      '</svg></div>';
    inner.appendChild(el);
    var bubble = $('.nerd-bubble', el);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scale = 1, perched = false, timers = [], raf = 0;

    function nat(x, y) {
      var ir = inner.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      return { x: sr.left - ir.left + x / 896 * sr.width, y: sr.top - ir.top + y / 833 * sr.height };
    }
    function shoulder() {
      var ir = inner.getBoundingClientRect(), pr = photo.getBoundingClientRect();
      var cands = [[785, 646], [700, 598], [640, 598]];
      for (var i = 0; i < cands.length; i++) {
        var p = nat(cands[i][0], cands[i][1]);
        if (p.x + ir.left > pr.left + 26 && p.x + ir.left < pr.right - 26) return p;
      }
      return nat(cands[cands.length - 1][0], cands[cands.length - 1][1]);
    }
    function geom() {
      var ir = inner.getBoundingClientRect();
      var fs = parseFloat(getComputedStyle(h1).fontSize);
      scale = Math.max(0.85, Math.min(1.6, fs / 60));
      var r1 = spans[0].getBoundingClientRect(), r2 = spans[1].getBoundingClientRect();
      var cap = fs * 0.27;
      return {
        s: scale,
        a: { x: r1.left - ir.left + fs * 0.62, y: r1.top - ir.top + cap },
        b: { x: r1.right - ir.left - 8 * scale, y: r1.top - ir.top + cap },
        c: { x: Math.min(r1.right + fs * 0.9, r2.right - fs) - ir.left, y: r2.top - ir.top + cap },
        d: { x: r2.right - ir.left - fs * 0.16, y: r2.top - ir.top + fs * 0.2 },
        face: nat(430, 318)
      };
    }
    function tf(p, rot) { return 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) scale(' + scale + ')' + (rot ? ' rotate(' + rot + 'deg)' : ''); }
    function place(p) { el.style.transform = tf(p); }
    function aim(from, to) {
      var dx = to.x - (from.x + 6 * scale), dy = to.y - (from.y - 29 * scale);
      var ang = Math.max(-58, Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI);
      el.style.setProperty('--aim', (ang - 90).toFixed(1) + 'deg');
      el.classList.toggle('aim-left', dx < 0);
    }
    function say(t, ms) { bubble.textContent = t; el.classList.toggle('bubble-left', el.getBoundingClientRect().right > window.innerWidth - 150); el.classList.add('talk'); if (ms) later(function () { el.classList.remove('talk'); }, ms); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function wait(ms) { return new Promise(function (r) { later(r, ms); }); }
    function stopAll() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); perched = false; el.getAnimations().forEach(function (a) { a.cancel(); }); faceShow(''); }
    function glue() {
      if (!perched) return;
      place(shoulder());
      raf = requestAnimationFrame(glue);
    }
    function endState() {
      var g = geom();
      el.className = 'nerd done';
      el.style.opacity = 1;
      place(g.d);
      el.classList.remove('aim-left');
    }

    function run() {
      stopAll();
      var g = geom();
      el.className = 'nerd walking';
      el.style.opacity = 1;
      place(g.a);
      var walkMs = Math.max(1400, (g.b.x - g.a.x) * 6.5);
      el.animate([{ transform: tf(g.a), opacity: 0 }, { transform: tf({ x: g.a.x + 18, y: g.a.y }), opacity: 1, offset: 0.08 }, { transform: tf(g.b), opacity: 1 }], { duration: walkMs, easing: 'linear', fill: 'forwards' }).finished
        .then(function () {
          el.classList.remove('walking'); el.classList.add('sliding');
          return el.animate([{ transform: tf(g.b) }, { transform: tf({ x: g.b.x + 10 * g.s, y: g.b.y - 14 * g.s }), offset: 0.28 }, { transform: tf(g.c) }], { duration: 700, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' }).finished;
        })
        .then(function () {
          return el.animate([{ transform: tf(g.c) }, { transform: tf(g.d) }], { duration: Math.max(700, (g.d.x - g.c.x) * 2.4), easing: 'cubic-bezier(.15,.6,.25,1)', fill: 'forwards' }).finished;
        })
        .then(function () {
          el.getAnimations().forEach(function (a) { a.cancel(); });
          el.className = 'nerd pointing';
          place(g.d); aim(g.d, g.face);
          return wait(2600);
        })
        .then(endState);
    }

    el.addEventListener('click', function () { run(); });
    window.addEventListener('resize', function () { if (el.classList.contains('done')) place(geom().d); });
    if (reduced) { later(function () { el.style.opacity = 1; el.className = 'nerd done'; place(geom().d); }, 300); return; }
    var go = function () { later(run, 1400); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  function relTime(iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (d < 1) return 'today';
    if (d < 2) return 'yesterday';
    if (d < 30) return Math.floor(d) + ' days ago';
    if (d < 365) return Math.floor(d / 30) + ' mo ago';
    return Math.floor(d / 365) + ' yr ago';
  }

  function loadGitHub() {
    var el = $('#gh');
    if (!el) return;
    getJSON('data-site.json').then(function (site) {
      var user = site.github;
      el.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
      return fetch('https://api.github.com/users/' + encodeURIComponent(user) + '/repos?sort=pushed&per_page=6')
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (repos) {
          repos = repos.filter(function (r) { return !r.fork; });
          if (!repos.length) throw new Error('empty');
          el.innerHTML = repos.map(function (r) {
            return '<a class="gh" href="' + esc(r.html_url) + '">' +
              '<span class="mono">' + esc(r.name) + '</span>' +
              '<span class="mute" style="font-size: 15px">' + esc(r.description || 'No description yet.') + '</span>' +
              '<span class="meta mono">' + (r.language ? '<span class="lang">' + esc(r.language) + '</span>' : '') +
              '<span>' + relTime(r.pushed_at) + '</span></span></a>';
          }).join('');
        })
        .catch(function () {
          return getJSON('data-github.json').catch(function () { return []; }).then(function (pinned) {
            var cards = (pinned || []).map(function (r) {
              return '<a class="gh" href="' + esc(r.url) + '"><span class="mono">' + esc(r.name) + '</span>' +
                '<span class="mute" style="font-size: 15px">' + esc(r.description || '') + '</span>' +
                '<span class="meta mono">' + (r.language ? '<span class="lang">' + esc(r.language) + '</span>' : '') + '</span></a>';
            }).join('');
            el.innerHTML = cards + '<a class="gh gh-profile" href="https://github.com/' + esc(user) + '"><span><span class="mono mute">github.com/' + esc(user) + '</span><br><span class="big">All repositories</span></span><span class="mono">Open GitHub <span class="arrow">→</span></span></a>';
          });
        });
    });
  }

  function initWork() {
    getJSON('data-work.json').then(function (d) {
      $('#exp-list').innerHTML = d.experience.map(rowHTML).join('');
      $('#proj-list').innerHTML = d.projects.map(rowHTML).join('');
    }).catch(function () {
      $('#exp-list').innerHTML = '<p class="notice">Work data could not load.</p>';
    });
  }

  function initAbout() {
    getJSON('data-experience.json').then(function (d) {
      $('#jobs').innerHTML = d.jobs.map(function (j) {
        return '<article class="job reveal"><div><p class="mono mute">' + esc(j.when) + '</p><p class="mono mute">' + esc(j.where) + '</p></div>' +
          '<div><h3>' + esc(j.org) + '</h3><p class="role">' + esc(j.role) + '</p><ul>' +
          j.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></article>';
      }).join('');
      $('#edu').innerHTML = d.education.map(function (e) {
        return '<li><strong style="font-weight: 500">' + esc(e.school) + '</strong><span class="mute">' + esc(e.degree) + '</span>' + (e.courses ? '<span class="mute" style="font-size: 0.85em">Coursework: ' + esc(e.courses.join(', ')) + '</span>' : '') + '<span class="mono mute">' + esc(e.when) + '</span></li>';
      }).join('');
      $('#pubs').innerHTML = d.publications.map(function (p) {
        var t = '<strong style="font-weight: 500">' + esc(p.title) + (p.url ? ' ↗' : '') + '</strong>';
        return '<li>' + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + t + '</a>' : t) + '<span class="mono mute">' + esc(p.venue) + ' · ' + esc(p.year) + '</span></li>';
      }).join('');
      $('#skills').innerHTML = Object.keys(d.skills).map(function (k) {
        return '<div class="reveal"><h3>' + esc(k) + '</h3><div class="tags">' +
          d.skills[k].map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') + '</div></div>';
      }).join('');
      observeReveals();
    });

    getJSON('data-site.json').then(function (site) {
      var form = $('#contact-form');
      if (!form) return;
      if (!site.formEndpoint) { form.hidden = true; $('#contact-fallback').hidden = false; return; }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = $('.form-msg', form);
        msg.textContent = 'Sending…';
        fetch(site.formEndpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error();
            form.reset();
            msg.textContent = 'Thanks. I will get back to you soon.';
          })
          .catch(function () { msg.textContent = 'That did not go through. Email ' + site.email + ' instead.'; });
      });
    });
  }

  function cineArxHero() {
    var h = $('.cs-hero');
    if (!h || h.classList.contains('cine')) return;
    h.classList.add('cine');
    var bg = document.createElement('div');
    bg.className = 'arx-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<div class="arx-board"><img src="img-ambientrx-layers-l1-top.png" alt=""><i class="arx-scan"></i></div>';
    h.insertBefore(bg, h.firstChild);
  }

  function initAmbientRx() {
    cineArxHero();
    getJSON('data-ambientrx.json').then(function (d) {
      drawLoadChart(d.loadTest);
      drawBugs(d.bugs);
      drawRequirements(d.requirements);
      renderMedia(d.media);
      drawLinks(d.links);
      observeReveals();
    });
    runPipeline();
    setupTabs();
  }

  function drawLoadChart(pts) {
    var el = $('#load-chart');
    if (!el) return;
    var W = 720, H = 300, L = 56, R = 24, T = 24, B = 44;
    var xMax = 650, yMin = 4.80, yMax = 5.00;
    function x(v) { return L + (v / xMax) * (W - L - R); }
    function y(v) { return T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="5 V rail voltage versus load current: 4.93 V at 50 mA down to 4.87 V at 600 mA">';
    s += '<rect class="band" x="' + L + '" y="' + y(5.00) + '" width="' + (W - L - R) + '" height="' + (y(4.90) - y(5.00)) + '"></rect>';
    s += '<text x="' + (W - R) + '" y="' + (y(5.00) + 14) + '" text-anchor="end">±100 mV budget from 5.00 V</text>';
    [4.80, 4.85, 4.90, 4.95, 5.00].forEach(function (v) {
      s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"></line>';
      s += '<text x="' + (L - 10) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v.toFixed(2) + '</text>';
    });
    [0, 100, 200, 300, 400, 500, 600].forEach(function (v) {
      s += '<text x="' + x(v) + '" y="' + (H - B + 20) + '" text-anchor="middle">' + v + '</text>';
    });
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Load current (mA)</text>';
    s += '<line class="ax" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - B) + '"></line>';
    s += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"></line>';
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.mA) + ' ' + y(p.V); }).join(' ');
    s += '<path class="ln" pathLength="1" d="' + path + '"></path>';
    pts.forEach(function (p) {
      s += '<circle cx="' + x(p.mA) + '" cy="' + y(p.V) + '" r="4.5"></circle>';
      s += '<text class="v" x="' + x(p.mA) + '" y="' + (y(p.V) - 12) + '" text-anchor="middle">' + p.V.toFixed(2) + ' V</text>';
      s += '<text x="' + x(p.mA) + '" y="' + (y(p.V) + 22) + '" text-anchor="middle">' + p.label + '</text>';
    });
    s += '</svg>';
    el.innerHTML = s;
  }

  function drawBugs(list) {
    var el = $('#bugs');
    if (!el) return;
    el.innerHTML = list.map(function (b, i) {
      return '<details class="bug"' + (i === 1 ? ' open' : '') + '><summary><span class="id">#' + pad(i + 1) + '</span><span class="ttl">' + esc(b.title) + '</span><span class="area">' + esc(b.area) + '</span><span class="i" aria-hidden="true">+</span></summary>' +
        '<div class="bd"><dl><dt>Symptom</dt><dd>' + esc(b.symptom) + '</dd><dt>Cause</dt><dd>' + esc(b.cause) + '</dd><dt>Fix</dt><dd>' + esc(b.fix) + '</dd></dl></div></details>';
    }).join('');
  }

  function drawRequirements(reqs) {
    var tally = { met: 0, partial: 0, not: 0 };
    reqs.forEach(function (r) { tally[r.s]++; });
    var total = reqs.length;
    var bar = $('#score');
    if (bar) {
      bar.innerHTML = '<span style="background: var(--ok)"></span><span style="background: var(--warn)"></span><span style="background: var(--bad)"></span>';
      var spans = $all('span', bar);
      var widths = [tally.met, tally.partial, tally.not].map(function (n) { return (n / total * 100) + '%'; });
      var go = function () { spans.forEach(function (sp, i) { sp.style.width = widths[i]; }); };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { go(); io.disconnect(); } });
        io.observe(bar);
      } else go();
      $('#legend').innerHTML =
        '<span><i style="background: var(--ok)"></i>' + tally.met + ' met</span>' +
        '<span><i style="background: var(--warn)"></i>' + tally.partial + ' partially met</span>' +
        '<span><i style="background: var(--bad)"></i>' + tally.not + ' not met</span>' +
        '<span class="mono">' + total + ' total</span>';
    }

    var label = { met: 'Met', partial: 'Partial', not: 'Not met' };
    var state = { kind: 'All', status: 'All' };
    var fEl = $('#req-filters'), tEl = $('#req-body');
    function draw() {
      var kinds = ['All', 'HRS', 'SRS'], stats = ['All', 'met', 'partial', 'not'];
      fEl.innerHTML =
        kinds.map(function (k) { return '<button type="button" class="filter" data-k="' + k + '" aria-pressed="' + (state.kind === k) + '">' + (k === 'All' ? 'All requirements' : k) + '</button>'; }).join('') +
        '<span style="width: 12px"></span>' +
        stats.map(function (s) { return '<button type="button" class="filter" data-s="' + s + '" aria-pressed="' + (state.status === s) + '">' + (s === 'All' ? 'Any status' : label[s]) + '</button>'; }).join('');
      var rows = reqs.filter(function (r) {
        return (state.kind === 'All' || r.id.indexOf(state.kind) === 0) && (state.status === 'All' || r.s === state.status);
      });
      tEl.innerHTML = rows.map(function (r) {
        return '<tr><td>' + esc(r.id) + '</td><td class="d">' + esc(r.d) + '</td><td><span class="st ' + r.s + '">' + label[r.s] + '</span></td><td class="n">' + esc(r.n) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="mute">No requirements match.</td></tr>';
      $all('button', fEl).forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.dataset.k) state.kind = b.dataset.k;
          if (b.dataset.s) state.status = b.dataset.s;
          draw();
        });
      });
    }
    if (fEl && tEl) draw();
  }

  function renderMedia(media) {
    Object.keys(media || {}).forEach(function (key) {
      var el = document.getElementById('m-' + key);
      if (!el) return;
      el.innerHTML = media[key].map(function (f, i) {
        var cls = 'shot' + (f.wide ? ' wide' : '') + (f.tall ? ' tall' : '') + (f.light ? ' light' : '');
        return '<figure class="' + cls + ' reveal"><button type="button" class="zoom" data-src="' + esc(f.src) + '" data-cap="' + esc(f.caption) + '" aria-label="Enlarge: ' + esc(f.caption) + '">' +
          '<img src="' + esc(f.src) + '" alt="' + esc(f.caption) + '" loading="' + (key === 'hero' ? 'eager' : 'lazy') + '"></button>' +
          '<figcaption>' + esc(f.caption) + '</figcaption></figure>';
      }).join('');
    });
    setupLightbox();
  }

  function setupLightbox() {
    if (document.getElementById('lb')) return;
    var dlg = document.createElement('dialog');
    dlg.id = 'lb';
    dlg.className = 'lightbox';
    dlg.innerHTML =
      '<div class="lb-bar"><p class="lb-cap mono"></p><span class="lb-count mono mute"></span>' +
      '<div class="lb-actions"><button type="button" class="lb-btn" data-act="prev" aria-label="Previous">‹</button><button type="button" class="lb-btn" data-act="next" aria-label="Next">›</button>' +
      '<button type="button" class="lb-btn lb-wide" data-act="zoom">Zoom</button><a class="lb-btn lb-wide" target="_blank" rel="noopener">Full size ↗</a>' +
      '<button type="button" class="lb-btn" data-act="close" aria-label="Close">×</button></div></div>' +
      '<div class="lb-stage"><img alt=""></div>';
    document.body.appendChild(dlg);
    var stage = $('.lb-stage', dlg), img = $('img', dlg), group = [], idx = 0;
    function show(i) {
      idx = (i + group.length) % group.length;
      var b = group[idx];
      dlg.classList.remove('zoomed');
      img.src = b.dataset.src; img.alt = b.dataset.cap;
      $('.lb-cap', dlg).textContent = b.dataset.cap;
      $('.lb-count', dlg).textContent = group.length > 1 ? (idx + 1) + ' / ' + group.length : '';
      $('a.lb-btn', dlg).href = b.dataset.src;
      $all('[data-act=prev],[data-act=next]', dlg).forEach(function (x) { x.hidden = group.length < 2; });
      stage.scrollTo(0, 0);
    }
    function zoom(e) {
      var on = !dlg.classList.contains('zoomed');
      dlg.classList.toggle('zoomed', on);
      $('[data-act=zoom]', dlg).textContent = on ? 'Fit' : 'Zoom';
      if (on && e && e.offsetX != null && e.target === img) {
        var fx = e.offsetX / img.clientWidth, fy = e.offsetY / img.clientHeight;
        requestAnimationFrame(function () { stage.scrollLeft = fx * img.scrollWidth - stage.clientWidth / 2; stage.scrollTop = fy * img.scrollHeight - stage.clientHeight / 2; });
      }
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.zoom');
      if (!b) return;
      var box = b.closest('.media') || b.parentNode;
      group = $all('.zoom', box);
      if (dlg.showModal) { show(group.indexOf(b)); $('[data-act=zoom]', dlg).textContent = 'Zoom'; dlg.showModal(); } else window.open(b.dataset.src);
    });
    dlg.addEventListener('click', function (e) {
      var act = e.target.dataset && e.target.dataset.act;
      if (e.target === dlg || act === 'close') dlg.close();
      else if (act === 'prev') show(idx - 1);
      else if (act === 'next') show(idx + 1);
      else if (act === 'zoom') zoom();
      else if (e.target === img && !dragged) zoom(e);
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'z' || e.key === 'Z') zoom();
    });
    var drag = null, dragged = false;
    stage.addEventListener('pointerdown', function (e) {
      if (!dlg.classList.contains('zoomed') || e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; dragged = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
      stage.scrollLeft = drag.l - dx; stage.scrollTop = drag.t - dy;
    });
    window.addEventListener('pointerup', function () { drag = null; setTimeout(function () { dragged = false; }, 0); });
  }

  /* AmbientRx: tabbed explorer */
  var ARX_TABS = [
    { id: 'overview', label: 'Overview', blurb: 'The problem, the system and the block diagram.', meta: 'Start here', secs: ['overview', 'architecture'] },
    { id: 'hardware', label: 'Hardware', blurb: 'Power path, regulation, MCU, sensors and protection.', meta: '4-layer board', secs: ['hardware', 'schematics', 'layout'], subs: [['hardware', 'Design'], ['schematics', 'Schematics'], ['layout', 'PCB layout']] },
    { id: 'firmware', label: 'Firmware & cloud', blurb: 'FreeRTOS tasks, on-device vision, MQTT and OTA.', meta: 'C · FreeRTOS · MQTT', secs: ['firmware', 'cloud'], subs: [['firmware', 'Firmware'], ['cloud', 'Cloud']] },
    { id: 'testing', label: 'Testing', blurb: 'Rail regulation, thermal imaging and all 40 requirements.', meta: '31 of 40 met', secs: ['power-test', 'validation'], subs: [['power-test', 'Power and thermal'], ['validation', 'Validation']] },
    { id: 'bringup', label: 'Bring-up log', blurb: 'Seven bugs, from dead I2C pins to a 5 V rail that would not start.', meta: '7 bugs', secs: ['bringup'] },
    { id: 'build', label: 'Enclosure & Rev 2', blurb: 'The CAD enclosure and what the next revision changes.', meta: 'What I would change', secs: ['gallery', 'rev2'] }
  ];
  function setupTabs() {
    var layout = $('.cs-layout');
    if (!layout) return;
    var toc = $('.toc', layout); if (toc) toc.remove();
    layout.classList.add('tabbed');
    var owner = {};
    ARX_TABS.forEach(function (t) { t.secs.forEach(function (s) { owner[s] = t.id; }); });

    var explore = document.createElement('div');
    explore.className = 'explore';
    explore.innerHTML = '<p class="mono mute explore-h">Explore the project</p><div class="explore-grid">' + ARX_TABS.map(function (t, i) {
      return '<a class="xcard" href="#' + t.id + '" data-tab="' + t.id + '"><span class="mono mute">' + pad(i + 1) + '</span><strong>' + esc(t.label) + '</strong><span class="xb">' + esc(t.blurb) + '</span><span class="mono xm">' + esc(t.meta) + ' →</span></a>';
    }).join('') + '</div>';
    var hero = $('.cs-hero');
    var heroMedia = $('#m-hero');
    hero.insertBefore(explore, heroMedia);

    var bar = document.createElement('nav');
    bar.className = 'cs-tabs';
    bar.setAttribute('aria-label', 'Project sections');
    bar.innerHTML = '<div class="cs-tabs-in">' + ARX_TABS.map(function (t) { return '<a href="#' + t.id + '" data-tab="' + t.id + '">' + esc(t.label) + '</a>'; }).join('') + '</div>';
    layout.parentNode.insertBefore(bar, layout);

    var body = $('div', layout) || layout;
    var subnav = document.createElement('div');
    subnav.className = 'cs-subnav';
    body.insertBefore(subnav, body.firstChild);
    var pager = document.createElement('div');
    pager.className = 'cs-pager';
    var moreWork = $('nav[aria-label="More work"]', body);
    body.insertBefore(pager, moreWork || null);

    var current = null;
    function select(id, sub, scroll) {
      var t = ARX_TABS.filter(function (x) { return x.id === id; })[0] || ARX_TABS[0];
      current = t.id;
      $all('section.section[id]', body).forEach(function (s) { if (owner[s.id]) s.hidden = owner[s.id] !== t.id; });
      $all('a', bar).forEach(function (a) { a.classList.toggle('active', a.dataset.tab === t.id); if (a.dataset.tab === t.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      subnav.innerHTML = t.subs ? t.subs.map(function (x) { return '<a href="#' + x[0] + '" data-sub="' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') : '';
      subnav.hidden = !t.subs;
      var i = ARX_TABS.indexOf(t), prev = ARX_TABS[i - 1], next = ARX_TABS[i + 1];
      pager.innerHTML = (prev ? '<a href="#' + prev.id + '" data-tab="' + prev.id + '"><span class="mono mute">← Previous</span><span>' + esc(prev.label) + '</span></a>' : '<span></span>') +
        (next ? '<a href="#' + next.id + '" data-tab="' + next.id + '" style="text-align: right"><span class="mono mute">Next →</span><span>' + esc(next.label) + '</span></a>' : '<span></span>');
      $all('.reveal', body).forEach(function (e) { if (!e.closest('[hidden]')) e.classList.add('in'); });
      $all('.chart', body).forEach(function (e) { if (!e.closest('[hidden]')) e.classList.add('in'); });
      if (scroll) {
        var target = sub ? document.getElementById(sub) : bar;
        var hh = ($('.site-header') || {}).offsetHeight || 0;
        var y = target.getBoundingClientRect().top + window.scrollY - (sub ? hh + bar.offsetHeight + 16 : hh);
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
    function fromHash(scroll) {
      var h = (location.hash || '').slice(1);
      if (ARX_TABS.some(function (t) { return t.id === h; })) select(h, null, scroll);
      else if (owner[h]) select(owner[h], h, scroll);
      else select('overview', null, false);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-tab], a[data-sub]');
      if (!a) return;
      e.preventDefault();
      if (a.dataset.tab) { history.replaceState(null, '', '#' + a.dataset.tab); select(a.dataset.tab, null, true); }
      else { history.replaceState(null, '', '#' + a.dataset.sub); var el = document.getElementById(a.dataset.sub); var hh = ($('.site-header') || {}).offsetHeight || 0; window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - hh - bar.offsetHeight - 16, behavior: 'smooth' }); }
    });
    window.addEventListener('hashchange', function () { fromHash(true); });
    fromHash(!!location.hash);
  }

  function drawLinks(links) {
    var el = $('#cs-links');
    if (!el) return;
    el.innerHTML = links.filter(function (l) { return l.href; }).map(function (l) {
      return '<a class="btn" href="' + esc(l.href) + '">' + esc(l.label) + ' <span class="arrow">→</span></a>';
    }).join('');
  }

  function runPipeline() {
    var steps = $all('.pipeline .step');
    if (!steps.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var i = 0;
    setInterval(function () {
      steps.forEach(function (s, j) { s.classList.toggle('on', j === i); });
      i = (i + 1) % steps.length;
    }, 900);
  }

  function tocSpy() {
    var links = $all('.toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('active'); });
          var a = map[en.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }


  var VIS = {
    memmap:
      '<svg viewBox="0 0 640 300" role="img" aria-label="Flash memory map: bootloader, application bank A, application bank B and boot state">' +
      '<g font-family="Geist Mono, monospace" font-size="12">' +
      '<rect x="40" y="30" width="240" height="44" fill="#060814" stroke="#2A3258"></rect><text x="56" y="57" fill="#F2F4FA">Bootloader</text><text x="270" y="57" fill="#8E97B3" text-anchor="end">verify · decrypt</text>' +
      '<rect class="pv-a" x="40" y="84" width="240" height="70" fill="#060814" stroke="#1E7BFF"></rect><text x="56" y="114" fill="#F2F4FA">Bank A</text><text x="56" y="134" fill="#8E97B3">application image</text>' +
      '<rect class="pv-b" x="40" y="164" width="240" height="70" fill="#060814" stroke="#2A3258"></rect><text x="56" y="194" fill="#F2F4FA">Bank B</text><text x="56" y="214" fill="#8E97B3">application image</text>' +
      '<rect x="40" y="244" width="240" height="30" fill="#060814" stroke="#2A3258"></rect><text x="56" y="264" fill="#8E97B3">run / commit state</text>' +
      '<path d="M300 52 H360 V119 H300" fill="none" stroke="#1E7BFF" stroke-width="2" class="pv-ja"></path>' +
      '<path d="M300 52 H380 V199 H300" fill="none" stroke="#1E7BFF" stroke-width="2" class="pv-jb"></path>' +
      '<text x="400" y="100" fill="#F2F4FA">jump to last</text><text x="400" y="118" fill="#F2F4FA">known-good image</text>' +
      '<text x="400" y="150" fill="#8E97B3">relocate vector table</text><text x="400" y="168" fill="#8E97B3">roll back if not committed</text>' +
      '</g></svg>',
    bus:
      '<svg viewBox="0 0 640 220" role="img" aria-label="I2C transaction waveform">' +
      '<g font-family="Geist Mono, monospace" font-size="12" fill="#8E97B3">' +
      '<text x="20" y="64">SCL</text><text x="20" y="144">SDA</text>' +
      '<path d="M60 60 H600 M60 96 H600 M60 140 H600 M60 176 H600" stroke="#151A33"></path>' +
      '<path class="pv-draw" pathLength="1" fill="none" stroke="#F2F4FA" stroke-width="1.5" d="M60 60 H110 V96 H130 V60 H150 V96 H170 V60 H190 V96 H210 V60 H230 V96 H250 V60 H270 V96 H290 V60 H310 V96 H330 V60 H350 V96 H370 V60 H390 V96 H410 V60 H430 V96 H450 V60 H470 V96 H490 V60 H600"></path>' +
      '<path class="pv-draw" pathLength="1" fill="none" stroke="#1E7BFF" stroke-width="1.5" d="M60 140 H100 V176 H140 V140 H180 V176 H260 V140 H300 V176 H380 V140 H420 V176 H500 V140 H600" style="animation-delay: .3s"></path>' +
      '<text x="96" y="204">START</text><text x="230" y="204">ADDR + W</text><text x="420" y="204">ACK</text><text x="540" y="204">STOP</text>' +
      '</g></svg>',
    loop:
      '<svg viewBox="0 0 640 260" role="img" aria-label="Closed control loop: setpoint, controller, actuator, device, sensor and feedback">' +
      '<g font-family="Geist Mono, monospace" font-size="12">' +
      '<path d="M90 100 H160 M290 100 H340 M470 100 H540 M560 100 V200 H180 V125" fill="none" stroke="#2A3258" stroke-width="1.5"></path>' +
      '<path class="pv-loop" pathLength="1" d="M90 100 H160 M290 100 H340 M470 100 H560 V200 H180 V125" fill="none" stroke="#1E7BFF" stroke-width="2"></path>' +
      '<text x="20" y="104" fill="#8E97B3">target</text>' +
      '<rect x="160" y="75" width="130" height="50" fill="#060814" stroke="#F2F4FA"></rect><text x="225" y="104" text-anchor="middle" fill="#F2F4FA">controller</text>' +
      '<rect x="340" y="75" width="130" height="50" fill="#060814" stroke="#2A3258"></rect><text x="405" y="98" text-anchor="middle" fill="#F2F4FA">DAC · bias</text><text x="405" y="114" text-anchor="middle" fill="#8E97B3">device</text>' +
      '<text x="372" y="222" fill="#8E97B3" text-anchor="middle">ADC · photodiode / thermistor</text>' +
      '</g></svg>',
    drivers: "<svg viewBox=\"0 0 640 280\" role=\"img\" aria-label=\"STM32 with bare-metal peripheral drivers\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"250\" y=\"105\" width=\"140\" height=\"70\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"320.0\" y=\"137.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">STM32</text><text x=\"320.0\" y=\"153.0\" text-anchor=\"middle\" fill=\"#8E97B3\">Cortex-M</text><rect x=\"40\" y=\"30\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"54.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">I2C</text><rect x=\"40\" y=\"120\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"144.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">SPI</text><rect x=\"40\" y=\"210\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"234.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">UART</text><rect x=\"500\" y=\"30\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"550.0\" y=\"54.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">ADC</text><rect x=\"500\" y=\"120\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"550.0\" y=\"144.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">DAC</text><rect x=\"500\" y=\"210\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"550.0\" y=\"234.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">GPIO</text><rect x=\"270\" y=\"225\" width=\"100\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"320.0\" y=\"249.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">TIMER</text><path d=\"M140 50 H195 V140 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M140 50 H195 V140 H250\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-0.00s\"></path><path d=\"M140 140 H195 V140 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M140 140 H195 V140 H250\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-0.45s\"></path><path d=\"M140 230 H195 V140 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M140 230 H195 V140 H250\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-0.90s\"></path><path d=\"M500 50 H445 V140 H390\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M500 50 H445 V140 H390\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-1.35s\"></path><path d=\"M500 140 H445 V140 H390\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M500 140 H445 V140 H390\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-1.80s\"></path><path d=\"M500 230 H445 V140 H390\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M500 230 H445 V140 H390\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-2.25s\"></path><path d=\"M320 225 V175\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M320 225 V175\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-2.70s\"></path><text x=\"320\" y=\"96\" text-anchor=\"middle\" fill=\"#8E97B3\">cooperative scheduler</text></g></svg>",
    calib: "<svg viewBox=\"0 0 640 260\" role=\"img\" aria-label=\"Calibration: raw ADC codes mapped to SI units with per-unit coefficients\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\" fill=\"#8E97B3\"><path d=\"M70 220 H600 M70 220 V24\" stroke=\"#2A3258\"></path><text x=\"335\" y=\"248\" text-anchor=\"middle\">ADC code</text><text x=\"24\" y=\"122\" transform=\"rotate(-90 24 122)\" text-anchor=\"middle\">SI units</text><circle class=\"pv-pop\" cx=\"100\" cy=\"196\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.00s\"></circle><circle class=\"pv-pop\" cx=\"150\" cy=\"184\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.12s\"></circle><circle class=\"pv-pop\" cx=\"200\" cy=\"171\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.24s\"></circle><circle class=\"pv-pop\" cx=\"250\" cy=\"145\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.36s\"></circle><circle class=\"pv-pop\" cx=\"300\" cy=\"137\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.48s\"></circle><circle class=\"pv-pop\" cx=\"350\" cy=\"127\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.60s\"></circle><circle class=\"pv-pop\" cx=\"400\" cy=\"106\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.72s\"></circle><circle class=\"pv-pop\" cx=\"450\" cy=\"91\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.84s\"></circle><circle class=\"pv-pop\" cx=\"500\" cy=\"75\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:0.96s\"></circle><circle class=\"pv-pop\" cx=\"550\" cy=\"58\" r=\"4\" fill=\"#060814\" stroke=\"#C5CBDD\" style=\"animation-delay:1.08s\"></circle><path class=\"pv-draw\" pathLength=\"1\" d=\"M90 206 L570 50\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:1.3s\"></path><rect x=\"430\" y=\"170\" width=\"170\" height=\"40\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"515\" y=\"194\" text-anchor=\"middle\" fill=\"#F2F4FA\">gain \u00b7 offset \u2192 flash</text></g></svg>",
    latency: "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Touch-to-render latency before and after removing a redundant compositor sync\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\" fill=\"#8E97B3\"><text x=\"20\" y=\"74\">before</text><g class=\"pv-grow\" style=\"animation-delay:0.00s\"><rect x=\"110\" y=\"50\" width=\"56\" height=\"36\" rx=\"3\" fill=\"#3D4670\"></rect><text x=\"138.0\" y=\"73\" text-anchor=\"middle\" fill=\"#F2F4FA\">input</text></g><g class=\"pv-grow\" style=\"animation-delay:0.18s\"><rect x=\"170\" y=\"50\" width=\"66\" height=\"36\" rx=\"3\" fill=\"#2A3258\"></rect><text x=\"203.0\" y=\"73\" text-anchor=\"middle\" fill=\"#F2F4FA\">kernel</text></g><g class=\"pv-grow\" style=\"animation-delay:0.36s\"><rect x=\"240\" y=\"50\" width=\"56\" height=\"36\" rx=\"3\" fill=\"#3D4670\"></rect><text x=\"268.0\" y=\"73\" text-anchor=\"middle\" fill=\"#F2F4FA\">IPC</text></g><g class=\"pv-grow\" style=\"animation-delay:0.54s\"><rect x=\"300\" y=\"50\" width=\"86\" height=\"36\" rx=\"3\" fill=\"#1E7BFF\"></rect><text x=\"343.0\" y=\"73\" text-anchor=\"middle\" fill=\"#F2F4FA\">sync</text></g><g class=\"pv-grow\" style=\"animation-delay:0.72s\"><rect x=\"390\" y=\"50\" width=\"106\" height=\"36\" rx=\"3\" fill=\"#2A3258\"></rect><text x=\"443.0\" y=\"73\" text-anchor=\"middle\" fill=\"#F2F4FA\">render</text></g><text x=\"20\" y=\"164\">after</text><g class=\"pv-grow\" style=\"animation-delay:1.20s\"><rect x=\"110\" y=\"140\" width=\"56\" height=\"36\" rx=\"3\" fill=\"#3D4670\"></rect><text x=\"138.0\" y=\"163\" text-anchor=\"middle\" fill=\"#F2F4FA\">input</text></g><g class=\"pv-grow\" style=\"animation-delay:1.38s\"><rect x=\"170\" y=\"140\" width=\"66\" height=\"36\" rx=\"3\" fill=\"#2A3258\"></rect><text x=\"203.0\" y=\"163\" text-anchor=\"middle\" fill=\"#F2F4FA\">kernel</text></g><g class=\"pv-grow\" style=\"animation-delay:1.56s\"><rect x=\"240\" y=\"140\" width=\"56\" height=\"36\" rx=\"3\" fill=\"#3D4670\"></rect><text x=\"268.0\" y=\"163\" text-anchor=\"middle\" fill=\"#F2F4FA\">IPC</text></g><g class=\"pv-grow\" style=\"animation-delay:1.92s\"><rect x=\"300\" y=\"140\" width=\"106\" height=\"36\" rx=\"3\" fill=\"#2A3258\"></rect><text x=\"353.0\" y=\"163\" text-anchor=\"middle\" fill=\"#F2F4FA\">render</text></g><path d=\"M410 136 V184\" stroke=\"#1E7BFF\" stroke-dasharray=\"3 3\"></path><path d=\"M500 46 V94\" stroke=\"#2A3258\" stroke-dasharray=\"3 3\"></path><text x=\"455.0\" y=\"220\" text-anchor=\"middle\" fill=\"#F2F4FA\">\u221215 ms (~20%)</text><path d=\"M410 210 H500\" stroke=\"#1E7BFF\"></path></g></svg>",
    imagestack: "<svg viewBox=\"0 0 640 260\" role=\"img\" aria-label=\"Containerized toolchain and BSP layers producing images for four hardware platforms\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"30\" y=\"40\" width=\"150\" height=\"46\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"105.0\" y=\"60.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">container</text><text x=\"105.0\" y=\"76.0\" text-anchor=\"middle\" fill=\"#8E97B3\">toolchain</text><rect x=\"30\" y=\"110\" width=\"150\" height=\"46\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"105.0\" y=\"130.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">BSP layers</text><text x=\"105.0\" y=\"146.0\" text-anchor=\"middle\" fill=\"#8E97B3\">drivers \u00b7 init</text><rect x=\"30\" y=\"180\" width=\"150\" height=\"46\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"105.0\" y=\"200.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">HMI runtime</text><text x=\"105.0\" y=\"216.0\" text-anchor=\"middle\" fill=\"#8E97B3\">services</text><rect x=\"250\" y=\"95\" width=\"130\" height=\"76\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"315.0\" y=\"130.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">build</text><text x=\"315.0\" y=\"146.0\" text-anchor=\"middle\" fill=\"#8E97B3\">reproducible</text><rect x=\"470\" y=\"24\" width=\"140\" height=\"42\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"540.0\" y=\"49.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">platform A</text><path d=\"M380 133 H420 V45 H470\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M380 133 H420 V45 H470\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-0.0s\"></path><rect x=\"470\" y=\"82\" width=\"140\" height=\"42\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"540.0\" y=\"107.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">platform B</text><path d=\"M380 133 H420 V103 H470\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M380 133 H420 V103 H470\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-0.7s\"></path><rect x=\"470\" y=\"140\" width=\"140\" height=\"42\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"540.0\" y=\"165.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">platform C</text><path d=\"M380 133 H420 V161 H470\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M380 133 H420 V161 H470\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-1.4s\"></path><rect x=\"470\" y=\"198\" width=\"140\" height=\"42\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"540.0\" y=\"223.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">platform D</text><path d=\"M380 133 H420 V219 H470\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M380 133 H420 V219 H470\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\" style=\"animation-delay:-2.1s\"></path><path d=\"M180 63 H215 V133 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path d=\"M180 133 H215 V133 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path d=\"M180 203 H215 V133 H250\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path></g></svg>",
    remote: "<svg viewBox=\"0 0 640 220\" role=\"img\" aria-label=\"Remote display and debug: headless board running Weston and a VNC server, viewed over the network\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"20\" y=\"40\" width=\"250\" height=\"140\" rx=\"6\" fill=\"none\" stroke=\"#2A3258\" stroke-dasharray=\"4 4\"></rect><text x=\"34\" y=\"60\" fill=\"#8E97B3\">headless ARM target</text><rect x=\"40\" y=\"80\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"99.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">Weston</text><text x=\"90.0\" y=\"115.0\" text-anchor=\"middle\" fill=\"#8E97B3\">Wayland</text><rect x=\"150\" y=\"80\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"200.0\" y=\"99.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">VNC</text><text x=\"200.0\" y=\"115.0\" text-anchor=\"middle\" fill=\"#8E97B3\">server</text><rect x=\"430\" y=\"70\" width=\"180\" height=\"64\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"520.0\" y=\"99.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">engineer</text><text x=\"520.0\" y=\"115.0\" text-anchor=\"middle\" fill=\"#8E97B3\">VNC viewer</text><path d=\"M250 102 H430\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M250 102 H430\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M430 112 H250\" stroke=\"#7FA8FF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-1.4s\"></path><text x=\"340\" y=\"92\" text-anchor=\"middle\" fill=\"#8E97B3\">display \u2194 input</text><text x=\"520\" y=\"158\" text-anchor=\"middle\" fill=\"#8E97B3\">TigerVNC \u00b7 TightVNC</text><text x=\"40\" y=\"160\" fill=\"#8E97B3\">bring-up \u00b7 validation \u00b7 field debug</text></g></svg>",
    modbus: "<svg viewBox=\"0 0 640 220\" role=\"img\" aria-label=\"Modbus frames between a PLC and an HMI\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"30\" y=\"70\" width=\"110\" height=\"70\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"85.0\" y=\"102.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">PLC</text><text x=\"85.0\" y=\"118.0\" text-anchor=\"middle\" fill=\"#8E97B3\">Modbus</text><rect x=\"500\" y=\"70\" width=\"110\" height=\"70\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"555.0\" y=\"102.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">HMI</text><text x=\"555.0\" y=\"118.0\" text-anchor=\"middle\" fill=\"#8E97B3\">3 HW revs</text><path d=\"M140 105 H500\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><g class=\"pv-frame\"><rect x=\"0\" y=\"88\" width=\"150\" height=\"34\" rx=\"3\" fill=\"#0C0F22\" stroke=\"#1E7BFF\"></rect><rect x=\"0\" y=\"88\" width=\"34\" height=\"34\" fill=\"none\" stroke=\"#2A3258\"></rect><text x=\"17.0\" y=\"110\" text-anchor=\"middle\" fill=\"#F2F4FA\" font-size=\"11\">addr</text><rect x=\"34\" y=\"88\" width=\"26\" height=\"34\" fill=\"none\" stroke=\"#2A3258\"></rect><text x=\"47.0\" y=\"110\" text-anchor=\"middle\" fill=\"#F2F4FA\" font-size=\"11\">fn</text><rect x=\"60\" y=\"88\" width=\"54\" height=\"34\" fill=\"none\" stroke=\"#2A3258\"></rect><text x=\"87.0\" y=\"110\" text-anchor=\"middle\" fill=\"#F2F4FA\" font-size=\"11\">data</text><rect x=\"114\" y=\"88\" width=\"36\" height=\"34\" fill=\"none\" stroke=\"#2A3258\"></rect><text x=\"132.0\" y=\"110\" text-anchor=\"middle\" fill=\"#F2F4FA\" font-size=\"11\">CRC</text></g><text x=\"320\" y=\"170\" text-anchor=\"middle\" fill=\"#8E97B3\">RTU (serial) \u00b7 TCP</text></g></svg>",
    xmlcli: "<svg viewBox=\"0 0 640 260\" role=\"img\" aria-label=\"XML configuration parsed and validated against a schema, then emitted as CLI commands\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"20\" y=\"30\" width=\"170\" height=\"200\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"34\" y=\"60\" fill=\"#C5CBDD\" xml:space=\"preserve\">&lt;config&gt;</text><text x=\"34\" y=\"88\" fill=\"#C5CBDD\" xml:space=\"preserve\">  &lt;node&gt;</text><text x=\"34\" y=\"116\" fill=\"#C5CBDD\" xml:space=\"preserve\">    &lt;param/&gt;</text><text x=\"34\" y=\"144\" fill=\"#C5CBDD\" xml:space=\"preserve\">    &lt;param/&gt;</text><text x=\"34\" y=\"172\" fill=\"#C5CBDD\" xml:space=\"preserve\">  &lt;/node&gt;</text><text x=\"34\" y=\"200\" fill=\"#C5CBDD\" xml:space=\"preserve\">&lt;/config&gt;</text><rect x=\"240\" y=\"90\" width=\"150\" height=\"80\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"315.0\" y=\"127.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">parse + validate</text><text x=\"315.0\" y=\"143.0\" text-anchor=\"middle\" fill=\"#8E97B3\">schema</text><rect x=\"440\" y=\"30\" width=\"180\" height=\"200\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><g class=\"pv-pop\" style=\"animation-delay:0.50s\"><text x=\"454\" y=\"60\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"50\" width=\"120\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><g class=\"pv-pop\" style=\"animation-delay:0.75s\"><text x=\"454\" y=\"88\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"78\" width=\"90\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><g class=\"pv-pop\" style=\"animation-delay:1.00s\"><text x=\"454\" y=\"116\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"106\" width=\"130\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><g class=\"pv-pop\" style=\"animation-delay:1.25s\"><text x=\"454\" y=\"144\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"134\" width=\"100\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><g class=\"pv-pop\" style=\"animation-delay:1.50s\"><text x=\"454\" y=\"172\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"162\" width=\"80\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><g class=\"pv-pop\" style=\"animation-delay:1.75s\"><text x=\"454\" y=\"200\" fill=\"#1E7BFF\">\u203a</text><rect x=\"470\" y=\"190\" width=\"115\" height=\"10\" rx=\"2\" fill=\"#2A3258\"></rect></g><path d=\"M190 130 H240\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M190 130 H240\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\"></path><path d=\"M390 130 H440\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M390 130 H440\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\"></path><text x=\"315\" y=\"200\" text-anchor=\"middle\" fill=\"#8E97B3\">\u221287.5% manual config</text></g></svg>",
    tests: "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Schema-driven unit tests passing across generated commands\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"40\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M60 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.00s\"></path><rect x=\"112\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M132 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.06s\"></path><rect x=\"184\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M204 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.12s\"></path><rect x=\"256\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M276 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.18s\"></path><rect x=\"328\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M348 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.24s\"></path><rect x=\"400\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M420 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.30s\"></path><rect x=\"472\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M492 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.36s\"></path><rect x=\"544\" y=\"24\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M564 43 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.42s\"></path><rect x=\"40\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M60 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.48s\"></path><rect x=\"112\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M132 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.54s\"></path><rect x=\"184\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M204 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.60s\"></path><rect x=\"256\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M276 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.66s\"></path><rect x=\"328\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M348 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.72s\"></path><rect x=\"400\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M420 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.78s\"></path><rect x=\"472\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M492 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.84s\"></path><rect x=\"544\" y=\"72\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M564 91 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.90s\"></path><rect x=\"40\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M60 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:0.96s\"></path><rect x=\"112\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M132 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.02s\"></path><rect x=\"184\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M204 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.08s\"></path><rect x=\"256\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M276 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.14s\"></path><rect x=\"328\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M348 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.20s\"></path><rect x=\"400\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M420 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.26s\"></path><rect x=\"472\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M492 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.32s\"></path><rect x=\"544\" y=\"120\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M564 139 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.38s\"></path><rect x=\"40\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M60 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.44s\"></path><rect x=\"112\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M132 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.50s\"></path><rect x=\"184\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M204 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.56s\"></path><rect x=\"256\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M276 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.62s\"></path><rect x=\"328\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M348 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.68s\"></path><rect x=\"400\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M420 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.74s\"></path><rect x=\"472\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M492 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.80s\"></path><rect x=\"544\" y=\"168\" width=\"60\" height=\"36\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><path class=\"pv-pop\" d=\"M564 187 l7 7 l14 -14\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" fill=\"none\" style=\"animation-delay:1.86s\"></path><text x=\"320\" y=\"226\" text-anchor=\"middle\" fill=\"#8E97B3\">generated command \u2192 schema rules \u2192 pass</text></g></svg>",
    regress: "<svg viewBox=\"0 0 640 200\" role=\"img\" aria-label=\"Regression cycle reduced from 8 hours to under 1 hour\"><g font-family=\"Geist Mono, monospace\" font-size=\"13\"><text x=\"20\" y=\"64\" fill=\"#8E97B3\">manual</text><g class=\"pv-grow\"><rect x=\"110\" y=\"40\" width=\"480\" height=\"38\" rx=\"3\" fill=\"#2A3258\"></rect></g><text x=\"580\" y=\"64\" text-anchor=\"end\" fill=\"#F2F4FA\">8 h</text><text x=\"20\" y=\"134\" fill=\"#8E97B3\">automated</text><g class=\"pv-grow\" style=\"animation-delay:.6s\"><rect x=\"110\" y=\"110\" width=\"56\" height=\"38\" rx=\"3\" fill=\"#1E7BFF\"></rect></g><text x=\"180\" y=\"134\" fill=\"#F2F4FA\">&lt; 1 h</text><path d=\"M110 172 H590\" stroke=\"#2A3258\"></path><text x=\"110\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">0h</text><text x=\"170\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">1h</text><text x=\"230\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">2h</text><text x=\"290\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">3h</text><text x=\"350\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">4h</text><text x=\"410\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">5h</text><text x=\"470\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">6h</text><text x=\"530\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">7h</text><text x=\"590\" y=\"190\" text-anchor=\"middle\" fill=\"#8E97B3\" font-size=\"10\">8h</text></g></svg>",
    peaksplit: "<svg viewBox=\"0 0 640 260\" role=\"img\" aria-label=\"Resonance response near 430 kHz: single peak at low drive, split peak above 400 mV\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\" fill=\"#8E97B3\"><path d=\"M60 220 H610 M60 220 V20\" stroke=\"#2A3258\"></path><text x=\"335\" y=\"248\" text-anchor=\"middle\">frequency \u00b7 ~430 kHz</text><text x=\"24\" y=\"120\" transform=\"rotate(-90 24 120)\" text-anchor=\"middle\">amplitude</text><path class=\"pv-draw\" pathLength=\"1\" fill=\"none\" stroke=\"#8E97B3\" stroke-width=\"2\" d=\"M60 214 C 200 212, 260 200, 300 170 C 320 150, 330 140, 335 140 C 340 140, 350 150, 370 170 C 410 200, 470 212, 610 214\"></path><path class=\"pv-draw\" pathLength=\"1\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2.5\" d=\"M60 210 C 200 205, 260 180, 300 110 C 315 70, 322 52, 330 60 C 337 68, 340 80, 346 64 C 352 46, 362 40, 372 52 L 374 150 C 400 196, 470 208, 610 211\" style=\"animation-delay:.6s\"></path><text x=\"470\" y=\"60\" fill=\"#F2F4FA\">&gt; 400 mV \u00b7 split</text><text x=\"470\" y=\"80\" fill=\"#8E97B3\">low drive \u00b7 linear</text><rect x=\"452\" y=\"50\" width=\"12\" height=\"3\" fill=\"#1E7BFF\"></rect><rect x=\"452\" y=\"72\" width=\"12\" height=\"3\" fill=\"#8E97B3\"></rect></g></svg>",
    platform: "<svg viewBox=\"0 0 640 280\" role=\"img\" aria-label=\"Autonomous racecar platform: Jetson and Raspberry Pi with cameras, LiDAR, motor controller and power\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"190\" y=\"70\" width=\"260\" height=\"140\" rx=\"8\" fill=\"none\" stroke=\"#2A3258\" stroke-dasharray=\"4 4\"></rect><text x=\"204\" y=\"90\" fill=\"#8E97B3\">racecar platform</text><rect x=\"210\" y=\"110\" width=\"105\" height=\"60\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"262.5\" y=\"137.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">Jetson</text><text x=\"262.5\" y=\"153.0\" text-anchor=\"middle\" fill=\"#8E97B3\">compute</text><rect x=\"325\" y=\"110\" width=\"105\" height=\"60\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"377.5\" y=\"137.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">Raspberry Pi</text><text x=\"377.5\" y=\"153.0\" text-anchor=\"middle\" fill=\"#8E97B3\">I/O</text><rect x=\"30\" y=\"30\" width=\"120\" height=\"52\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"53.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">cameras</text><text x=\"90.0\" y=\"69.0\" text-anchor=\"middle\" fill=\"#8E97B3\">I2C \u00b7 CSI</text><path d=\"M150 56 H190\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M150 56 H190\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-0.0s\"></path><rect x=\"30\" y=\"180\" width=\"120\" height=\"52\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"90.0\" y=\"203.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">LiDAR</text><text x=\"90.0\" y=\"219.0\" text-anchor=\"middle\" fill=\"#8E97B3\">UART</text><path d=\"M150 206 H190\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M150 206 H190\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-0.6s\"></path><rect x=\"490\" y=\"30\" width=\"120\" height=\"52\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"550.0\" y=\"53.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">motor ctrl</text><text x=\"550.0\" y=\"69.0\" text-anchor=\"middle\" fill=\"#8E97B3\">PWM \u00b7 SPI</text><path d=\"M490 56 H450\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M490 56 H450\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-1.2s\"></path><rect x=\"490\" y=\"180\" width=\"120\" height=\"52\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"550.0\" y=\"203.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">power</text><text x=\"550.0\" y=\"219.0\" text-anchor=\"middle\" fill=\"#8E97B3\">rails</text><path d=\"M490 206 H450\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M490 206 H450\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-1.8s\"></path><text x=\"320\" y=\"250\" text-anchor=\"middle\" fill=\"#8E97B3\">scope \u00b7 logic analyzer \u00b7 DMM</text></g></svg>",
    ros: "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"ROS2 graph: LiDAR scan and AprilTag TF into a gap-following node that publishes Ackermann drive commands\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect x=\"20\" y=\"40\" width=\"130\" height=\"48\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"85.0\" y=\"61.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">/scan</text><text x=\"85.0\" y=\"77.0\" text-anchor=\"middle\" fill=\"#8E97B3\">LiDAR</text><rect x=\"20\" y=\"150\" width=\"130\" height=\"48\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"85.0\" y=\"171.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">AprilTag</text><text x=\"85.0\" y=\"187.0\" text-anchor=\"middle\" fill=\"#8E97B3\">TF lookup</text><rect x=\"240\" y=\"90\" width=\"160\" height=\"60\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"320.0\" y=\"117.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">gap_follow</text><text x=\"320.0\" y=\"133.0\" text-anchor=\"middle\" fill=\"#8E97B3\">ROS2 node</text><rect x=\"490\" y=\"95\" width=\"130\" height=\"50\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"555.0\" y=\"117.0\" text-anchor=\"middle\" fill=\"#F2F4FA\">/drive</text><text x=\"555.0\" y=\"133.0\" text-anchor=\"middle\" fill=\"#8E97B3\">Ackermann</text><path d=\"M150 64 H195 V110 H240\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M150 64 H195 V110 H240\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\"></path><path d=\"M150 174 H195 V130 H240\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M150 174 H195 V130 H240\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\"></path><path d=\"M400 120 H490\" fill=\"none\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M400 120 H490\" fill=\"none\" stroke=\"#1E7BFF\" stroke-width=\"2\"></path><path class=\"pv-draw\" pathLength=\"1\" d=\"M250 215 C 300 180, 340 230, 390 200 S 470 170, 520 205\" fill=\"none\" stroke=\"#7FA8FF\" stroke-width=\"2\"></path><text x=\"540\" y=\"210\" fill=\"#8E97B3\">closed-loop path</text></g></svg>",
    update: "<svg viewBox=\"0 0 640 160\" role=\"img\" aria-label=\"Field firmware update flow: host, image transfer, decrypt, program, run\"><g font-family=\"Geist Mono, monospace\" font-size=\"12\"><rect class=\"pv-pop\" style=\"animation-delay:0.00s\" x=\"20\" y=\"55\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"70\" y=\"81\" text-anchor=\"middle\" fill=\"#F2F4FA\">host</text><path d=\"M120 77 H145\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M120 77 H145\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-0.0s\"></path><rect class=\"pv-pop\" style=\"animation-delay:0.15s\" x=\"145\" y=\"55\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"195\" y=\"81\" text-anchor=\"middle\" fill=\"#F2F4FA\">image transfer</text><path d=\"M245 77 H270\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M245 77 H270\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-0.4s\"></path><rect class=\"pv-pop\" style=\"animation-delay:0.30s\" x=\"270\" y=\"55\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"320\" y=\"81\" text-anchor=\"middle\" fill=\"#F2F4FA\">decrypt</text><path d=\"M370 77 H395\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M370 77 H395\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-0.8s\"></path><rect class=\"pv-pop\" style=\"animation-delay:0.45s\" x=\"395\" y=\"55\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#1E7BFF\"></rect><text x=\"445\" y=\"81\" text-anchor=\"middle\" fill=\"#F2F4FA\">program</text><path d=\"M495 77 H520\" stroke=\"#2A3258\" stroke-width=\"1.5\"></path><path class=\"pv-loop\" pathLength=\"1\" d=\"M495 77 H520\" stroke=\"#1E7BFF\" stroke-width=\"2\" fill=\"none\" style=\"animation-delay:-1.2s\"></path><rect class=\"pv-pop\" style=\"animation-delay:0.60s\" x=\"520\" y=\"55\" width=\"100\" height=\"44\" rx=\"4\" fill=\"#060814\" stroke=\"#2A3258\"></rect><text x=\"570\" y=\"81\" text-anchor=\"middle\" fill=\"#F2F4FA\">run</text><text x=\"320\" y=\"135\" text-anchor=\"middle\" fill=\"#8E97B3\">encrypted image \u00b7 in-field over the host interface</text></g></svg>",
    none: ''
  };

  function initProject() {
    getJSON('data-work.json').then(function (d) {
      var list = d.experience;
      function draw() {
        var id = (location.hash || '').replace('#', '');
        var i = 0;
        list.forEach(function (p, k) { if (p.id === id) i = k; });
        var p = list[i];
        var prev = list[(i - 1 + list.length) % list.length];
        var next = list[(i + 1) % list.length];
        document.title = p.org + ' · Ananya Shivarama Bhat';
        var toc = p.highlights.length > 1 ? '<nav class="hl-toc" aria-label="On this page">' + p.highlights.map(function (h, k) {
          return '<a href="#' + esc(p.id) + '" data-go="hl-' + k + '">' + pad(k + 1) + ' ' + esc(h.title) + '</a>';
        }).join('') + '</nav>' : '';
        var secs = p.highlights.map(function (h, k) {
          return '<section class="section hl" id="hl-' + k + '"><div class="sec-head"><span class="num">' + pad(k + 1) + '</span><h2>' + esc(h.title) + '</h2></div>' +
            (VIS[h.visual] ? '<div class="proj-vis reveal" style="margin-bottom: 28px">' + VIS[h.visual] + '</div>' : '') +
            (h.images ? '<div class="media" style="margin-bottom: 28px">' + h.images.map(function (f) {
              var cls = 'shot' + (f.wide ? ' wide' : '') + (f.light ? ' light' : '') + (f.narrow ? ' narrow' : '');
              return '<figure class="' + cls + ' reveal"><button type="button" class="zoom" data-src="' + esc(f.src) + '" data-cap="' + esc(f.caption) + '" aria-label="Enlarge: ' + esc(f.caption) + '"><img src="' + esc(f.src) + '" alt="' + esc(f.caption) + '" loading="lazy"></button><figcaption>' + esc(f.caption) + '</figcaption></figure>';
            }).join('') + '</div>' : '') +
            '<ol class="built">' + h.points.map(function (x) { return '<li class="reveal"><span class="mono mute">·</span><span>' + esc(x) + '</span></li>'; }).join('') + '</ol></section>';
        }).join('');
        $('#project').innerHTML =
          '<section class="cs-hero' + (p.logo ? ' has-logo' : '') + '">' +
            (p.logo ? '<div class="cs-bg" aria-hidden="true"><div class="cs-x"><img src="' + esc(p.logo) + '" alt=""><i class="cs-sweep"></i></div></div>' : '') +
            '<a class="crumb mono" href="work.html"><span aria-hidden="true">←</span> Work</a>' +
            '<p class="mono mute" style="margin-top: 18px">' + esc(p.when) + ' · ' + esc(p.where) + '</p>' +
            '<h1 style="font-size: clamp(44px, 7.5vw, 104px)">' + esc(p.org) + '</h1>' +
            '<p class="lede"><span style="color: var(--fg)">' + esc(p.role) + '.</span> ' + esc(p.summary) + '</p>' +
            '<div class="tags" style="margin-top: 28px">' + p.stack.map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') + '</div>' +
            toc +
          '</section>' + secs +
          '<nav class="section pager" aria-label="More experience">' +
            '<a href="project.html#' + esc(prev.id) + '"><span class="mono mute">← Previous</span><span>' + esc(prev.org) + '</span></a>' +
            '<a href="project.html#' + esc(next.id) + '" style="text-align: right"><span class="mono mute">Next →</span><span>' + esc(next.org) + '</span></a>' +
          '</nav>';
        $all('.hl-toc a').forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var t = document.getElementById(a.dataset.go);
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
        setupLightbox();
        observeReveals();
        window.scrollTo(0, 0);
      }
      draw();
      window.addEventListener('hashchange', draw);
    }).catch(function () {
      $('#project').innerHTML = '<p class="notice" style="margin-top: 96px">Work data could not load.</p>';
    });
  }

  /* ---------- boot ---------- */
  getJSON('data-site.json').then(renderShell).catch(function () {
    renderShell({ name: 'Ananya Shivarama Bhat', email: 'ananya9@engineering.upenn.edu', github: 'ananyashivaramabhat', linkedin: 'https://linkedin.com/in/ananya473', resume: 'resume.pdf' });
  });
  observeReveals();
  if (page === 'home') initHome();
  if (page === 'work') initWork();
  if (page === 'about') initAbout();
  if (page === 'ambientrx') initAmbientRx();
  if (page === 'project') initProject();
})();
