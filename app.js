// 名词汇工具：搜索 + 场景互斥 + 章节横向走廊 + 分页 + 列表/卡片双视图 + 弹层刷词(含辨析联动) + 辨析长廊
(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('appData').textContent);
  var terms = DATA.terms, confusions = DATA.confusions, chapters = DATA.chapters;
  var chTitles = {};
  var chFullTitles = {};
  chapters.forEach(function (c) {
    chFullTitles[c.id] = c.title;
    var n = parseInt(c.id.slice(2), 10);
    if (isNaN(n)) { chTitles[c.id] = c.title; return; }
    chTitles[c.id] = ('0' + n).slice(-2) + ' ' + c.title.replace(/^第?[零一二三四五六七八九十]+章?[、，]?\s*/, '');
  });

  var elInput = document.getElementById('searchInput');
  var elResults = document.getElementById('results');
  var elSummary = document.getElementById('summaryText');
  var elPagination = document.getElementById('pagination');
  var elPageSize = document.getElementById('pageSizeSelect');
  var elBackTop = document.getElementById('backTop');
  var elChapterRail = document.getElementById('chapterRail');
  var elSceneBar = document.getElementById('sceneBar');
  var elSceneBarName = document.getElementById('sceneBarName');
  var elMoreChapters = document.getElementById('moreChapters');
  var elMask = document.getElementById('modalMask');
  var elModalBody = document.getElementById('modalBody');
  var elModalNav = document.querySelector('.modal-nav');
  var state = { scene: 'all', chapter: 'all', q: '', page: 1, pageSize: 15, view: 'list' };
  var sceneNames = { all: '', '入门': '新手入门', '面试': '面试刷词', '升学科研': '升学保研', '职场': '职场黑话', '前沿': '2026前沿' };

  // ---- 章节：主要章节按钮（两位序号+主题词）+ 其余进「更多章节」下拉 ----
  var MAIN_CHAPTERS = 7;
  function chNo(c) { return ('0' + parseInt(c.id.slice(2), 10)).slice(-2); }
  chapters.forEach(function (c) {
    if (c.id === 'appendix1' || c.id === 'other' || c.id === 'x') return;
    var chIdx = parseInt(c.id.slice(2), 10);
    var topic = c.title.replace(/^第?[零一二三四五六七八九十]+章?[、，]?\s*/, '');
    var label = chNo(c) + ' ' + topic;
    if (chIdx < MAIN_CHAPTERS) {
      var btn = document.createElement('button');
      btn.className = 'rail-pill';
      btn.dataset.ch = c.id;
      btn.title = chFullTitles[c.id];
      btn.textContent = label;
      elChapterRail.appendChild(btn);
    } else {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.title = chFullTitles[c.id];
      opt.textContent = label;
      elMoreChapters.appendChild(opt);
    }
  });
  var confOpt = document.createElement('option');
  confOpt.value = 'conf';
  confOpt.textContent = '易混淆名词辨析 · ' + confusions.length + ' 组';
  elMoreChapters.appendChild(confOpt);
  elChapterRail.appendChild(elMoreChapters);

  // ---- 辨析功能新用户引导（仅首次进入，交互后不再出现） ----
  (function () {
    var TIP_KEY = 'dict-conf-tip-v1';
    var seen = false;
    try { seen = localStorage.getItem(TIP_KEY) === '1'; } catch (e) {}
    if (seen) return;
    var bubble = document.createElement('div');
    bubble.className = 'tip-bubble';
    bubble.textContent = '还有 ' + confusions.length + ' 组易混淆辨析，点这里';
    var railWrap = elChapterRail.parentElement;
    railWrap.appendChild(bubble);
    function posBubble() {
      var wr = railWrap.getBoundingClientRect();
      var sr = elMoreChapters.getBoundingClientRect();
      var left = sr.left - wr.left + (sr.width - bubble.offsetWidth) / 2;
      left = Math.max(2, Math.min(left, wr.width - bubble.offsetWidth - 2));
      bubble.style.left = left + 'px';
      bubble.style.top = Math.max(2, sr.top - wr.top - bubble.offsetHeight - 6) + 'px';
      bubble.style.opacity = '1';
    }
    posBubble();
    var rafId = requestAnimationFrame(function () { posBubble(); });
    window.addEventListener('resize', posBubble);
    function dismissTip() {
      bubble.classList.add('tip-hide');
      setTimeout(function () { if (bubble.parentNode) bubble.remove(); }, 400);
      window.removeEventListener('resize', posBubble);
      document.removeEventListener('click', dismissTip);
      try { localStorage.setItem(TIP_KEY, '1'); } catch (e) {}
    }
    setTimeout(function () {
      if (bubble.parentNode) dismissTip();
    }, 4500);
    document.addEventListener('click', dismissTip);
    void rafId;
  })();
  // ---- 分享链接：集中同步 hash（q=搜索词 & ch=章节 & s=场景） ----
  function updateHash() {
    if (!history.replaceState) return;
    var parts = [];
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.chapter !== 'all') parts.push('ch=' + encodeURIComponent(state.chapter));
    if (state.scene !== 'all') parts.push('s=' + encodeURIComponent(state.scene));
    history.replaceState(null, '', parts.length ? '#?' + parts.join('&') : location.pathname + location.search);
  }
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }
  function legacyCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('链接已复制'); } catch (e) { showToast('复制失败，请手动复制地址栏链接'); }
    document.body.removeChild(ta);
  }
  document.getElementById('shareBtn').addEventListener('click', function () {
    updateHash();
    var url = location.href;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { showToast('链接已复制'); }, function () { legacyCopy(url); });
    } else legacyCopy(url);
  });

  function clearScene() {
    if (state.scene !== 'all') {
      state.scene = 'all';
      elSceneBar.classList.remove('show');
    }
  }
  elChapterRail.addEventListener('click', function (e) {
    var btn = e.target.closest('.rail-pill'); if (!btn || !btn.dataset.ch) return;
    state.chapter = btn.dataset.ch;
    document.querySelectorAll('.rail-pill').forEach(function (p) {
      p.classList.toggle('active', p === btn);
    });
    clearScene();
    elMoreChapters.value = 'all';
    state.page = 1; render();
    updateHash();
  });
  elMoreChapters.addEventListener('change', function () {
    var v = elMoreChapters.value;
    if (v !== 'all' && v !== 'conf' && !chTitles[v]) {
      elMoreChapters.value = (state.chapter === 'all' || state.chapter === 'conf') ? 'all' : state.chapter;
      return;
    }
    state.chapter = v;
    document.querySelectorAll('.rail-pill').forEach(function (p) {
      p.classList.toggle('active', p.dataset.ch === 'all' && v === 'all');
    });
    clearScene();
    state.page = 1; render();
    updateHash();
  });

  // ---- 场景筛选：点卡片彩色标签触发，章节自动回「全部」 ----
  function setScene(s) {
    state.scene = s;
    state.chapter = 'all';
    document.querySelectorAll('.rail-pill').forEach(function (p) {
      p.classList.toggle('active', p.dataset.ch === 'all');
    });
    var on = s !== 'all';
    elSceneBar.classList.toggle('show', on);
    if (on) elSceneBarName.textContent = sceneNames[s] || s;
    state.page = 1; render();
    updateHash();
  }
  document.getElementById('sceneBarClear').addEventListener('click', function () {
    setScene('all');
  });

  // ---- 每页条数 ----
  elPageSize.addEventListener('change', function () {
    state.pageSize = parseInt(elPageSize.value, 10) || 0;
    state.page = 1; render();
  });

  // ---- 视图切换 ----
  try { state.view = localStorage.getItem('dict-view') === 'grid' ? 'grid' : 'list'; } catch (e) {}
  syncViewBtns();
  document.getElementById('viewToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.view-btn'); if (!btn || btn.dataset.view === state.view) return;
    state.view = btn.dataset.view;
    syncViewBtns();
    try { localStorage.setItem('dict-view', state.view); } catch (err) {}
    render();
  });
  function syncViewBtns() {
    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === state.view);
    });
  }

  // ---- 搜索（防抖） ----
  var debounceTimer = null;
  elInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      state.q = elInput.value.trim().toLowerCase();
      state.page = 1;
      render();
      updateHash();
    }, 150);
  });

  // ---- 匹配评分 ----
  function matchTerm(t, q) {
    if (!q) return { hit: true, score: 0 };
    var name = (t.term + ' ' + (t.en || '')).toLowerCase();
    if (name.indexOf(q) === 0) return { hit: true, score: 8 };
    if (name.indexOf(q) !== -1) return { hit: true, score: 6 };
    if (t.py && t.py.indexOf(q) !== -1) return { hit: true, score: 4 };
    if (t.pyFull && t.pyFull.indexOf(q) !== -1) return { hit: true, score: 4 };
    if (t.searchText && t.searchText.indexOf(q) !== -1) return { hit: true, score: 2 };
    return { hit: false };
  }

  // ---- 渲染工具 ----
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hl(text, q) {
    if (!q) return esc(text);
    var lower = text.toLowerCase(), idx = lower.indexOf(q);
    if (idx === -1) return esc(text);
    return esc(text.slice(0, idx)) + '<span class="hl">' + esc(text.slice(idx, idx + q.length)) + '</span>' + esc(text.slice(idx + q.length));
  }

  function getFiltered() {
    var q = state.q;
    var list = [];
    terms.forEach(function (t) {
      if (state.chapter !== 'all' && t.chapter !== state.chapter) return;
      if (state.scene !== 'all' && t.tags.indexOf(state.scene) === -1) return;
      var m = matchTerm(t, q);
      if (m.hit) list.push({ t: t, score: m.score });
    });
    list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  function makeTags(t) {
    return t.tags.map(function (g) {
      return '<span class="tag scene-' + esc(g) + '" data-scene="' + esc(g) + '" tabindex="0" role="button" title="按场景筛选「' + esc(g) + '」">' + esc(g) + '</span>';
    }).join('');
  }

  // ---- 词条渲染 ----
  function renderConf() {
    var q = state.q;
    var list = confusions.filter(function (c) {
      if (!q) return true;
      return (c.pair + ' ' + c.desc).toLowerCase().indexOf(q) !== -1;
    });
    var parts = [];
    if (q) parts.push('关键词「' + elInput.value.trim() + '」');
    var sumHtml = '共 <b class="sum-num">' + list.length + '</b> 组易混淆辨析';
    if (parts.length) sumHtml += ' · 筛选：' + parts.map(function (p) {
      return '<b>' + esc(p) + '</b>';
    }).join(' + ');
    sumHtml += '<span style="opacity:.75"> · 记住区别一句话，面试笔试高频</span>';
    elSummary.innerHTML = sumHtml;
    elPagination.innerHTML = '';
    if (!list.length) {
      elResults.innerHTML = '<div class="empty">没有匹配的辨析组，换个关键词试试<br>如 <b>事务</b>、<b>进程</b>、<b>TCP</b></div>';
      return;
    }
    var html = '<div class="conf-view">';
    list.forEach(function (c) {
      var ps = c.pair.split(' vs ');
      var sides = '';
      if (ps.length >= 2) {
        sides = '<div class="conf-side">' + hl(ps[0], q) + '</div><span class="conf-vs">VS</span>' +
          (ps.length === 3 ? '<div class="conf-side">' + hl(ps[1], q) + '</div><span class="conf-vs">VS</span><div class="conf-side">' + hl(ps[2], q) + '</div>' : '<div class="conf-side">' + hl(ps[1], q) + '</div>');
      } else {
        sides = '<div class="conf-side" style="flex:1.6">' + hl(c.pair, q) + '</div>';
      }
      html += '<div class="conf-card"><div class="conf-head">' + sides + '</div><div class="conf-desc">' + hl(c.desc, q) + '</div></div>';
    });
    html += '</div>';
    elResults.innerHTML = html;
    runReveal();
  }

  function render() {
    if (state.chapter === 'conf') { renderConf(); return; }
    var q = state.q;
    var list = getFiltered();
    var total = list.length;
    var pageSize = state.pageSize || total || 1;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (state.page > maxPage) state.page = maxPage;
    var start = (state.page - 1) * pageSize;
    var pageList = pageSize === total ? list : list.slice(start, start + pageSize);

    var sceneName = sceneNames[state.scene];
    var parts = [];
    if (state.scene !== 'all') parts.push('场景「' + sceneName + '」');
    if (state.chapter !== 'all') parts.push('章节「' + chTitles[state.chapter] + '」');
    if (q) parts.push('关键词「' + elInput.value.trim() + '」');
    var sumHtml = '共 <b class="sum-num">' + total + '</b> 个词条';
    if (parts.length) sumHtml += ' · 筛选：' + parts.map(function (p) {
      return '<b>' + esc(p) + '</b>';
    }).join(' + ');
    sumHtml += '<span style="opacity:.75"> · 点词条展开 / 点卡片看全貌；点彩色标签可按场景筛选</span>';
    elSummary.innerHTML = sumHtml;

    if (!total) {
      elResults.innerHTML = '<div class="empty">没有找到匹配的词条<br>试试 <b>并发</b>、<b>索引</b>、<b>保研</b>，或拼音首字母如 <b>cxsj</b></div>';
      elPagination.innerHTML = '';
      return;
    }

    if (state.view === 'grid') {
      var gh = '';
      pageList.forEach(function (it) {
        var t = it.t;
        var chName = chTitles[t.chapter] || '';
        var enHtml = t.en ? '<span class="en">' + esc(t.en) + '</span>' : '';
        var tagsHtml = makeTags(t);
        gh += '<div class="grid-card" data-id="' + t.id + '" tabindex="0" role="button" title="' + esc(chName) + '">' +
          '<span class="term-ch">' + esc(chName) + '</span>' +
          '<span class="term-name">' + hl(t.term, q) + enHtml + '</span>' +
          '<div class="term-plain">' + hl(t.plain, q) + '</div>' +
          (tagsHtml ? '<div class="tags">' + tagsHtml + '</div>' : '') + '</div>';
      });
      elResults.innerHTML = '<div class="grid-view">' + gh + '</div>';
    } else {
      var html = '';
      pageList.forEach(function (it) {
        var t = it.t;
        var chName = chTitles[t.chapter] || '';
        var enHtml = t.en ? '<span class="en">' + esc(t.en) + '</span>' : '';
        var tagsHtml = makeTags(t);
        var detailHtml = '';
        if (t.analogy) detailHtml += '<div class="detail-row"><b>类比</b>' + hl(t.analogy, q) + '</div>';
        if (t.tip) detailHtml += '<div class="detail-row"><b>点拨</b>' + hl(t.tip, q) + '</div>';
        html += '<div class="term-card" data-id="' + t.id + '" tabindex="0" role="button">' +
          '<div class="term-top"><span class="term-name">' + hl(t.term, q) + enHtml + '</span>' +
          '<span class="term-ch">' + esc(chName) + '</span></div>' +
          '<div class="term-plain">' + hl(t.plain, q) + '</div>' +
          (tagsHtml ? '<div class="tags">' + tagsHtml + '</div>' : '') +
          (detailHtml ? '<div class="term-detail">' + detailHtml + '</div>' : '') +
          '</div>';
      });
      elResults.innerHTML = html;
    }
    renderPagination(maxPage, total);
    runReveal();
  }

  function renderPagination(maxPage, total) {
    if (state.pageSize === 0 || maxPage <= 1) { elPagination.innerHTML = ''; return; }
    var cur = state.page;
    var set = new Set([1, maxPage, cur - 1, cur, cur + 1]);
    var arr = [];
    set.forEach(function (p) { if (p >= 1 && p <= maxPage) arr.push(p); });
    arr.sort(function (a, b) { return a - b; });
    var html = '';
    if (cur > 1) html += '<button class="pg-btn" data-page="' + (cur - 1) + '">&#8249; 上一页</button>';
    var prev = 0;
    arr.forEach(function (p) {
      if (prev && p - prev > 1) html += '<span class="pg-ellipsis">&hellip;</span>';
      html += '<button class="pg-btn' + (p === cur ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
      prev = p;
    });
    if (cur < maxPage) html += '<button class="pg-btn" data-page="' + (cur + 1) + '">下一页 &#8250;</button>';
    elPagination.innerHTML = html;
  }

  // ---- 词条 → 辨析联动 ----
  function confForTerm(term) {
    var clean = term.replace(/[（(].*?[）)]/g, '').trim();
    var hits = [];
    confusions.forEach(function (c) {
      var sides = c.pair.split(' vs ');
      var hit = sides.some(function (s) {
        var sClean = s.replace(/[（(].*?[）)]/g, '').trim();
        return sClean === clean || (sClean.length >= 2 && clean.indexOf(sClean) !== -1) || (clean.length >= 2 && sClean.indexOf(clean) !== -1);
      });
      if (hit) hits.push(c);
    });
    return hits;
  }

  // ---- 弹层刷词 ----
  var modalList = [], modalIdx = 0;
  function openModal(idx) {
    modalIdx = idx;
    var it = modalList[idx]; if (!it) return;
    var t = it.t;
    var q = state.q;
    var html = '<div class="modal-term">' + hl(t.term, q) + (t.en ? '<span class="en">' + esc(t.en) + '</span>' : '') + '</div>';
    html += '<div class="modal-meta">' + makeTags(t) + '<span class="modal-ch">' + esc(chTitles[t.chapter] || '') + '</span></div>';
    html += '<div class="modal-plain">' + hl(t.plain, q) + '</div>';
    if (t.analogy || t.tip) html += '<div class="modal-rows">';
    if (t.analogy) html += '<div class="detail-row"><b>类比</b>' + hl(t.analogy, q) + '</div>';
    if (t.tip) html += '<div class="detail-row"><b>点拨</b>' + hl(t.tip, q) + '</div>';
    if (t.analogy || t.tip) html += '</div>';

    var confs = confForTerm(t.term);
    if (confs.length) {
      html += '<div class="modal-conf"><b style="color:var(--accent);font-size:12px">&#9889; 易混淆辨析</b>';
      confs.forEach(function (c) {
        html += '<div class="mc-item"><b>' + esc(c.pair) + '</b>' + esc(c.desc) + '</div>';
      });
      html += '</div>';
    }
    elModalBody.innerHTML = html;
    elModalNav.style.display = '';
    document.getElementById('modalPrev').disabled = idx <= 0;
    document.getElementById('modalNext').disabled = idx >= modalList.length - 1;
    elMask.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    elMask.style.display = 'none';
    document.body.style.overflow = '';
  }

  elResults.addEventListener('click', function (e) {
    var tag = e.target.closest('.tag');
    if (tag) {
      e.stopPropagation();
      setScene(tag.dataset.scene);
      return;
    }
    var gcard = e.target.closest('.grid-card');
    if (gcard) {
      var id = gcard.dataset.id;
      var list = getFiltered();
      var pageSize = state.pageSize || list.length || 1;
      var start = (state.page - 1) * pageSize;
      modalList = list.slice(start, start + pageSize);
      var idx = -1;
      for (var i = 0; i < modalList.length; i++) if (modalList[i].t.id === id) { idx = i; break; }
      if (idx >= 0) openModal(idx);
      return;
    }
    var card = e.target.closest('.term-card'); if (!card) return;
    card.classList.toggle('open');
  });
  elResults.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var el = e.target.closest ? (e.target.closest('.tag') || e.target.closest('.grid-card') || e.target.closest('.term-card')) : null;
    if (el) { e.preventDefault(); el.click(); }
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  elMask.addEventListener('click', function (e) { if (e.target === elMask) closeModal(); });
  elModalBody.addEventListener('click', function (e) {
    var tag = e.target.closest('.tag');
    if (tag) { closeModal(); setScene(tag.dataset.scene); }
  });
  document.getElementById('modalPrev').addEventListener('click', function () { if (modalIdx > 0) openModal(modalIdx - 1); });
  document.getElementById('modalNext').addEventListener('click', function () { if (modalIdx < modalList.length - 1) openModal(modalIdx + 1); });
  document.addEventListener('keydown', function (e) {
    if (elMask.style.display === 'none') return;
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'ArrowLeft' && elModalNav.style.display !== 'none') document.getElementById('modalPrev').click();
    else if (e.key === 'ArrowRight' && elModalNav.style.display !== 'none') document.getElementById('modalNext').click();
  });

  // ---- spotlight 光斑（单委托监听，容器级） ----
  elResults.addEventListener('pointermove', function (e) {
    var rect = elResults.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    elResults.style.setProperty('--mx', x + 'px');
    elResults.style.setProperty('--my', y + 'px');
  });
  elResults.addEventListener('pointerleave', function () {
    elResults.style.setProperty('--mx', '50%');
    elResults.style.setProperty('--my', '50%');
  });

  // ---- 错峰入场 ----
  function runReveal() {
    var cards = elResults.querySelectorAll('.term-card, .grid-card');
    for (var i = 0; i < cards.length && i < 12; i++) {
      (function (card, n) {
        card.classList.add('reveal');
        card.style.setProperty('--d', (n * 40) + 'ms');
        if (window.IntersectionObserver) {
          var io = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
              card.classList.add('in');
              io.disconnect();
            }
          }, { threshold: 0.1 });
          io.observe(card);
        } else {
          card.classList.add('in');
        }
      })(cards[i], i);
    }
  }

  // ---- 分页点击 ----
  elPagination.addEventListener('click', function (e) {
    var btn = e.target.closest('.pg-btn'); if (!btn || btn.disabled) return;
    var p = parseInt(btn.dataset.page, 10);
    if (!p || p === state.page) return;
    state.page = p; render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- 回到顶部 ----
  window.addEventListener('scroll', function () {
    if (window.scrollY > 600) elBackTop.classList.add('show');
    else elBackTop.classList.remove('show');
  });
  elBackTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    elInput.focus({ preventScroll: true });
  });

  // ---- 主题 ----
  var saved = null;
  try { saved = localStorage.getItem('dict-theme'); } catch (e) {}
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  document.getElementById('themeBtn').addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) { document.documentElement.removeAttribute('data-theme'); try { localStorage.setItem('dict-theme', 'light'); } catch (e) {} }
    else { document.documentElement.setAttribute('data-theme', 'dark'); try { localStorage.setItem('dict-theme', 'dark'); } catch (e) {} }
  });

  // ---- 初始渲染 + hash 支持（#?q=xxx&ch=ch05&s=面试） ----
  var hm = location.hash;
  var qm = hm.match(/[?&]q=([^&]+)/);
  if (qm) {
    state.q = decodeURIComponent(qm[1]).toLowerCase();
    elInput.value = decodeURIComponent(qm[1]);
  }
  var cm = hm.match(/[?&]ch=([^&]+)/);
  if (cm) {
    var cv = decodeURIComponent(cm[1]);
    if (cv === 'all' || cv === 'conf' || chTitles[cv]) {
      state.chapter = cv;
      document.querySelectorAll('.rail-pill').forEach(function (p) {
        p.classList.toggle('active', p.dataset.ch === cv);
      });
      elMoreChapters.value = cv === 'conf' ? 'conf' : 'all';
    }
  }
  var sm = hm.match(/[?&]s=([^&]+)/);
  if (sm) {
    var sv = decodeURIComponent(sm[1]);
    if (sceneNames[sv]) {
      state.scene = sv;
      state.chapter = 'all';
      document.querySelectorAll('.rail-pill').forEach(function (p) {
        p.classList.toggle('active', p.dataset.ch === 'all');
      });
      elMoreChapters.value = 'all';
      elSceneBar.classList.add('show');
      elSceneBarName.textContent = sceneNames[sv];
    }
  }
  state.pageSize = parseInt(elPageSize.value, 10) || 15;
  render();
})();