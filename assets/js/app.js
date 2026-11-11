/*
 * Shared demo behaviour.
 *  - In the shell (index.html): provides the toast used for notifications.
 *  - Inside a screen shown in the shell frame: makes the Stitch markup interactive
 *    (navigation buttons, filter chips and tabs, pagination, table search, Excel
 *    export, image viewer, save/delete feedback), hooks the alert workflow to the
 *    mock DB, and forwards alert() / toasts to the shell.
 *  - On a standalone page (Core Server): toast only.
 */
(function () {
  'use strict';

  var embedded = window.top !== window.self;
  var here = location.pathname.split('/').pop() || 'index.html';

  // ---------- helpers ----------
  var ICON_SEL = '.material-symbols-outlined, .material-icons, .material-symbols-rounded, svg, i[data-lucide]';

  // Visible label of a control, without icon ligature names ("edit", "polyline"...) or emoji.
  function labelOf(el) {
    var clone = el.cloneNode(true);
    clone.querySelectorAll(ICON_SEL).forEach(function (n) { n.remove(); });
    var text = (clone.textContent || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text || (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
  }
  function norm(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function stripCount(s) { return s.replace(/\(?\s*[\d.,]+\s*\)?\s*$/, '').trim(); }

  // ---------- toast ----------
  var toastBox;
  function localToast(message, opts) {
    opts = opts || {};
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'demo-toasts';
      document.body.appendChild(toastBox);
    }
    var t = document.createElement('div');
    t.className = 'demo-toast' + (opts.level ? ' demo-toast--' + opts.level : '');
    t.innerHTML = '<span class="demo-toast__dot"></span><span class="demo-toast__msg"></span>';
    t.querySelector('.demo-toast__msg').textContent = message;
    if (opts.href) {
      var a = document.createElement('a');
      a.href = opts.href;
      a.textContent = opts.linkText || 'Xem';
      a.className = 'demo-toast__link';
      t.appendChild(a);
    }
    toastBox.appendChild(t);
    var d = opts.duration || 3500;
    setTimeout(function () { t.classList.add('is-leaving'); }, d);
    setTimeout(function () { t.remove(); }, d + 400);
  }

  function toast(message, opts) {
    if (embedded) {
      try { if (window.parent.demoToast) { window.__lastToast = Date.now(); return window.parent.demoToast(message, opts); } } catch (e) { /* ignore */ }
    }
    window.__lastToast = Date.now();
    localToast(message, opts);
  }
  window.demoToast = toast;
  window.alert = function (msg) { toast(String(msg)); };

  if (!embedded) return; // shell and standalone pages need nothing else

  var main = null;
  function go(target) { location.href = target; }

  // ---------- 1. buttons that open another screen ----------
  var ACTION_RULES = [
    [/^xem sự cố$/i, 'alert-popup.html'],
    [/^chi tiết$/i, 'incidents.html'],
    [/^bản đồ \(map\)$/i, 'dashboard.html'],
    [/đóng cửa sổ|^hủy$/i, here === 'camera-edit.html' ? 'cameras.html' : null],
    [/^đóng$/i, here === 'alert-popup.html' ? 'incidents.html' : null],
    [/^sửa$/i, here === 'cameras.html' ? 'camera-edit.html' : null],
    [/mở cấu hình vùng|^vùng & luật$/i, 'rules.html'],
    [/thêm camera$/i, 'camera-edit.html']
  ];
  function routeFor(el) {
    var text = labelOf(el);
    for (var i = 0; i < ACTION_RULES.length; i++) if (ACTION_RULES[i][0].test(text)) return ACTION_RULES[i][1];
    return null;
  }

  // ---------- 2. filter chips / tabs / segmented controls / pagination ----------
  // A group is a set of sibling buttons where one is styled as selected (blue fill,
  // blue underline or white "segment" fill). Each sibling keeps its own idle look.
  var ACTIVE_RE = /(^|\s)(bg-blue-[56]00|bg-\[#2563eb\]|bg-\[#3b82f6\]|border-blue-500|border-b-2 border-\[#60a5fa\]|bg-white|bg-\[#0f172a\] text-blue-400)(\s|$)/;
  var NEUTRAL = 'bg-[#1e293b] text-[#94a3b8] border border-[#334155] hover:text-[#e2e8f0]';

  function groupOf(btn) {
    var parent = btn.parentElement;
    if (!parent) return null;
    if (parent.__demoGroup) return parent.__demoGroup;
    var sibs = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === btn.tagName; });
    if (sibs.length < 2 || sibs.length > 14) return null;
    var actives = sibs.filter(function (s) { return ACTIVE_RE.test(s.className); });
    var activeEl = actives.length === 1 ? actives[0] : null;
    if (!activeEl) {
      // chips with no highlighted state: "Tất cả" is the default selection
      activeEl = sibs.filter(function (s) { return /^tất cả/i.test(labelOf(s)); })[0] || null;
    }
    if (!activeEl) {
      // fallback: exactly one sibling styled differently from all the others
      var counts = {};
      sibs.forEach(function (s) { counts[s.className] = (counts[s.className] || 0) + 1; });
      var keys = Object.keys(counts);
      if (keys.length !== 2) return null;
      var odd = counts[keys[0]] === 1 ? keys[0] : (counts[keys[1]] === 1 ? keys[1] : null);
      activeEl = odd && sibs.filter(function (s) { return s.className === odd; })[0];
      if (!activeEl) return null;
    }
    var activeCls = activeEl.className;
    var original = sibs.map(function (s) { return s.className; });
    var others = original.filter(function (c) { return c !== activeCls; });
    var common = others.sort(function (a, b) { return others.filter(function (x) { return x === b; }).length - others.filter(function (x) { return x === a; }).length; })[0];
    var neutral = common || activeCls.replace(ACTIVE_RE, ' ').replace(/\btext-white\b|\bfont-bold\b|\bshadow\S*/g, '') + ' ' + NEUTRAL;
    var g = { sibs: sibs, activeCls: activeCls, original: original, origActive: activeEl, neutral: neutral };
    parent.__demoGroup = g;
    return g;
  }

  function activate(btn, g) {
    g.sibs.forEach(function (s, i) {
      if (s === btn) s.className = g.activeCls;
      else s.className = s === g.origActive ? g.neutral : g.original[i];
    });
  }

  // Words a chip filters on, derived from its label.
  var KEYWORDS = {
    'khẩn cấp': ['khẩn cấp'], 'cảnh báo': ['cảnh báo'], 'bình thường': ['bình thường', 'an toàn', 'online'],
    'mới': ['mới'], 'đang xử lý': ['đang xử lý'], 'đã xử lý': ['đã xử lý'], 'báo giả': ['báo giả'],
    'quá nhiệt': ['nhiệt'], 'lối pccc': ['pccc'], 'chiếm ô sạc': ['ô sạc', 'xe xăng'], 'đỗ pccc': ['pccc'],
    'bỏ quên': ['bỏ quên', 'vali'], 'an ninh đêm': ['tụ tập', 'lảng vảng'],
    'xe điện ev': ['ev'], 'xe xăng ice': ['ice'], 'ngừng hoạt động': ['ngừng'],
    'khu 3.1 trạm sạc': ['3.1'], 'khu 3.2 sân nền': ['3.2']
  };

  // The list a chip group filters: table rows, the incident list, or the largest card grid.
  function itemsFor(btn) {
    var rows = main.querySelectorAll('tbody tr');
    if (rows.length > 2) return Array.prototype.slice.call(rows);
    var list = document.getElementById('incident-list-container');
    if (list) return Array.prototype.slice.call(list.children);
    var best = null;
    main.querySelectorAll('[class*="grid-cols"]').forEach(function (g) {
      if (g.contains(btn)) return;
      if (!best || g.children.length > best.children.length) best = g;
    });
    return best && best.children.length > 2 ? Array.prototype.slice.call(best.children) : [];
  }

  function applyChipFilter(btn) {
    var key = norm(stripCount(labelOf(btn)));
    var items = itemsFor(btn);
    if (!items.length) return false;
    if (/^tất cả/.test(key)) { items.forEach(function (it) { it.style.display = ''; }); return true; }
    var words = KEYWORDS[key];
    if (!words) return false;
    var shown = 0;
    items.forEach(function (it) {
      var t = norm(it.textContent);
      var hit = words.some(function (w) { return w.length <= 3 ? new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(t) : t.indexOf(w) >= 0; });
      it.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    if (!shown) items.forEach(function (it) { it.style.display = ''; });
    toast(shown ? 'Đang lọc: ' + stripCount(labelOf(btn)) + ' (' + shown + ')' : 'Không có mục nào khớp – hiển thị tất cả');
    return true;
  }

  function handleGroupClick(btn) {
    var g = groupOf(btn);
    if (!g) return false;
    var text = labelOf(btn);
    if (/^(trước|sau|trang trước|trang tiếp theo)?$/i.test(text) && !/^\d+$/.test(text)) {
      toast('Đang ở dữ liệu mẫu – chỉ có 1 trang dữ liệu thật');
      return true;
    }
    activate(btn, g);
    if (/^\d+$/.test(text)) { toast('Trang ' + text + ' (dữ liệu mẫu)'); return true; }
    if (/^(tuần|tháng)$/i.test(text)) { toast('Đang hiển thị theo ' + text.toLowerCase()); return true; }
    if (!applyChipFilter(btn)) toast('Đã chọn: ' + stripCount(text));
    return true;
  }

  // ---------- 3. table search ----------
  function wireSearch() {
    main.querySelectorAll('input[type="text"], input[type="search"], input:not([type])').forEach(function (inp) {
      if (!/tìm|search|biển số/i.test(inp.placeholder || '')) return;
      inp.addEventListener('input', function () {
        var q = norm(inp.value).replace(/[-.\s]/g, '');
        var rows = main.querySelectorAll('tbody tr');
        rows.forEach(function (r) {
          var t = norm(r.textContent).replace(/[-.\s]/g, '');
          r.style.display = !q || t.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    });
  }

  // ---------- 4. Excel (CSV) export ----------
  function exportTable() {
    var table = main.querySelector('table');
    if (!table) { toast('Không có bảng để xuất trên màn hình này'); return; }
    var lines = [];
    table.querySelectorAll('tr').forEach(function (tr) {
      if (tr.style.display === 'none') return;
      var cells = Array.prototype.map.call(tr.querySelectorAll('th, td'), function (c) {
        var v = labelOf(c).replace(/"/g, '""');
        return '"' + v + '"';
      });
      if (cells.length) lines.push(cells.join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'binhan-' + here.replace('.html', '') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Đã xuất ' + (lines.length - 1) + ' dòng ra file Excel (CSV)');
  }

  // ---------- 5. image viewer ----------
  function openViewer(src, caption) {
    if (!src) return false;
    var box = document.createElement('div');
    box.className = 'demo-viewer';
    box.innerHTML = '<figure><img alt=""/><figcaption></figcaption></figure><button type="button" aria-label="Đóng">✕</button>';
    box.querySelector('img').src = src;
    box.querySelector('figcaption').textContent = caption || '';
    function close() { box.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'BUTTON') close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
    return true;
  }
  function nearestImage(el) {
    var node = el;
    while (node && node !== document.body) {
      var img = node.querySelector && node.querySelector('img');
      if (img) return img;
      node = node.parentElement;
    }
    return null;
  }

  // ---------- 6. specific actions with feedback ----------
  function rowOf(el) { return el.closest('tr') || el.closest('[class*="rounded"]'); }
  var SPECIFIC = [
    [/xuất excel|xuất báo cáo/i, function () { exportTable(); }],
    [/xem ảnh chụp|phóng to|maximize/i, function (el) {
      var img = nearestImage(el);
      openViewer(img && img.src, img && (img.alt || '')) || toast('Không có ảnh chụp');
    }],
    [/^xóa$|^xóa xe$|^xóa camera$/i, function (el) {
      var row = el.closest('tr');
      if (row) {
        row.style.transition = 'opacity .25s'; row.style.opacity = '0';
        setTimeout(function () { row.remove(); }, 250);
        toast('Đã xóa khỏi danh sách (dữ liệu mẫu)', { level: 'warning' });
      } else {
        toast('Đã xóa (dữ liệu mẫu)', { level: 'warning' });
        if (here === 'camera-edit.html') setTimeout(function () { go('cameras.html'); }, 600);
      }
    }],
    [/lưu camera/i, function () { toast('Đã lưu camera CAM-EV-01'); setTimeout(function () { go('cameras.html'); }, 700); }],
    [/lưu cấu hình/i, function () { toast('Đã lưu và áp dụng ngay luật AI (hot-reload)'); }],
    [/lưu thông tin|^lưu$/i, function () { toast('Đã lưu thông tin xe'); }],
    [/^\+? ?thêm xe$/i, function () {
      var form = main.querySelector('aside') || main;
      form.querySelectorAll('input[type="text"], input:not([type])').forEach(function (i) { i.value = ''; });
      var first = form.querySelector('input'); if (first) first.focus();
      toast('Nhập thông tin xe mới ở khung bên phải');
    }],
    [/^sửa thông tin$|^sửa$/i, function (el) {
      var row = el.closest('tr');
      var plate = row && (row.querySelector('.font-mono') || row.cells[0]);
      var form = main.querySelector('aside');
      var input = form && form.querySelector('input');
      if (input && plate) { input.value = labelOf(plate).split(' ')[0]; input.focus(); }
      toast('Đang sửa ' + (plate ? labelOf(plate).split(' ')[0] : 'xe'));
    }],
    [/^hủy$/i, function () { toast('Đã hủy thay đổi'); }],
    [/tải lại/i, function () { toast('Đã tải lại danh sách'); }],
    [/vẽ vùng/i, function (el) { el.classList.toggle('ring-2'); toast('Chế độ vẽ: click lên ảnh để thêm đỉnh, double-click để đóng vùng'); }],
    [/xóa điểm/i, function () { toast('Đã xóa điểm cuối của đa giác'); }],
    [/chụp lại ảnh/i, function () { toast('Đã lấy ảnh chụp mới nhất từ camera (luồng phụ 720p)'); }],
    [/sao chép/i, function (el) {
      var block = el.closest('div');
      var coords = block ? (block.parentElement || block).textContent.match(/\[[^\]]+\](\s*•\s*\[[^\]]+\])*/) : null;
      var text = coords ? coords[0] : '';
      try { navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
      toast('Đã sao chép tọa độ vùng');
    }],
    [/^hôm nay/i, function () { toast('Đang xem dữ liệu hôm nay (11/11/2026)'); }]
  ];
  function specificFor(el) {
    var text = labelOf(el);
    for (var i = 0; i < SPECIFIC.length; i++) if (SPECIFIC[i][0].test(text)) return SPECIFIC[i][1];
    return null;
  }

  // ---------- click dispatcher ----------
  // Camera image from the mock DB, e.g. for map pins whose Stitch handler has no tile to focus.
  function cameraFallback(el) {
    var src = (el.getAttribute('onclick') || '') + ' ' + labelOf(el);
    var m = src.match(/CAM[_-](EV|GR|ANPR)[_-]\d+/i);
    if (!m || !window.MockDB) return false;
    var cam = MockDB.camera(m[0].toUpperCase().replace(/_/g, '-'));
    if (!cam) return false;
    if (!cam.image) { toast(cam.id + ' – ' + cam.name + ': mất kết nối', { level: 'warning' }); return true; }
    return openViewer('../assets/img/' + cam.image, cam.id + ' • ' + cam.name + ' • LIVE');
  }

  function onClick(e) {
    var pin = e.target.closest('[onclick]');
    if (pin && !pin.closest('button, a')) { watchForNoResponse(pin, cameraFallback); return; }
    var el = e.target.closest('button, a, [role="button"]');
    if (!el || !main.contains(el)) return;
    var hasOwnHandler = el.hasAttribute('onclick') || (el.tagName === 'A' && /\.html/.test(el.getAttribute('href') || ''));

    var target = routeFor(el);
    if (target && target !== here) { e.preventDefault(); e.stopImmediatePropagation(); go(target); return; }

    var fn = specificFor(el);
    if (fn) { e.preventDefault(); e.stopImmediatePropagation(); fn(el); return; }

    if (!hasOwnHandler && el.tagName === 'BUTTON' && handleGroupClick(el)) { e.preventDefault(); return; }

    if (el.tagName === 'A' && (el.getAttribute('href') || '#') === '#') e.preventDefault();
    watchForNoResponse(el);
  }

  // Safety net: if a click changes nothing on screen, say what it would do.
  function watchForNoResponse(el, fallbackFn) {
    var changed = false;
    var t0 = Date.now();
    var obs = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var txt = list[i].target.textContent || '';
        if (list[i].type === 'characterData' || (txt.length < 30 && /\d{1,2}:\d{2}/.test(txt))) continue;
        changed = true; break;
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    var href = location.href;
    setTimeout(function () {
      obs.disconnect();
      if (changed || location.href !== href || (window.__lastToast || 0) >= t0) return;
      if (fallbackFn && fallbackFn(el)) return;
      var label = stripCount(labelOf(el)) || 'này';
      toast('Bản demo: chức năng “' + label + '” sẽ hoạt động ở bản chính thức');
    }, 300);
  }

  // ---------- alert workflow (section 5.2) ----------
  function wireAlertWorkflow() {
    var alertId = here === 'incidents.html' ? 1042 : (here === 'alert-popup.html' ? 1043 : null);
    if (!alertId || !window.MockDB) return;
    var noteEl = document.querySelector('textarea, #dispatch-note-input');
    document.querySelectorAll('button').forEach(function (b) {
      var text = labelOf(b);
      if (/nhận xử lý/i.test(text)) b.addEventListener('click', function () { MockDB.acknowledge(alertId, 'Lê Văn Minh'); });
      if (/(^|\s)hoàn tất$/i.test(text)) b.addEventListener('click', function () { MockDB.resolve(alertId, noteEl && noteEl.value); });
      if (/báo giả/i.test(text)) b.addEventListener('click', function () {
        MockDB.falseAlarm(alertId, noteEl && noteEl.value);
        toast('Đã đánh dấu Báo giả và đóng cảnh báo');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Whole page: Stitch modals (camera edit, alert popup) sit outside <main>.
    main = document.body;
    // demo pagination: "previous" buttons ship disabled, which would swallow clicks
    main.querySelectorAll('button[disabled]').forEach(function (b) {
      if (/^(trước|trang trước)$/i.test(labelOf(b))) b.removeAttribute('disabled');
    });
    document.addEventListener('click', onClick, true);
    wireSearch();
    wireAlertWorkflow();
  });
})();
