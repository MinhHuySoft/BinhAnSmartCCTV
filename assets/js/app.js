/*
 * Shared demo behaviour for every screen:
 *  - wires the Stitch-generated navigation (left rail, sub-tabs, action buttons) to real pages
 *  - replaces browser alert() popups with an in-page toast
 *  - adds a screen switcher for presenting the demo
 *  - simulates real-time alerts (SignalR ReceiveNewAlert) from the mock DB
 */
(function () {
  'use strict';

  var PAGES = [
    { file: 'dashboard.html', label: 'Trung tâm giám sát' },
    { file: 'live-grid.html', label: 'Lưới camera trực tiếp' },
    { file: 'incidents.html', label: 'Hàng đợi sự cố' },
    { file: 'alert-popup.html', label: 'Popup cảnh báo khẩn cấp' },
    { file: 'ev-charging.html', label: 'Khu 3.1 – Trạm sạc xe điện' },
    { file: 'ground-firelane.html', label: 'Khu 3.2 – Sân nền & Lối PCCC' },
    { file: 'anpr.html', label: 'Nhật ký biển số (ANPR)' },
    { file: 'rules.html', label: 'Cấu hình vùng & luật AI' },
    { file: 'cameras.html', label: 'Quản lý camera' },
    { file: 'camera-edit.html', label: 'Cập nhật camera' },
    { file: 'vehicles.html', label: 'Danh sách xe cư dân' },
    { file: 'reports.html', label: 'Báo cáo vận hành' },
    { file: 'server.html', label: 'Core Server (WinForms)' }
  ];

  // Order matters: the first matching keyword wins.
  var NAV_RULES = [
    [/^bình an|trung tâm giám sát|tổng quan|bảng điều khiển|dashboard|bản đồ mặt bằng/i, 'dashboard.html'],
    [/lưới camera|tất cả camera|matrix/i, 'live-grid.html'],
    [/cảnh báo sự cố|cảnh báo &|hàng đợi sự cố|cảnh báo & an ninh|an toàn nhiệt/i, 'incidents.html'],
    [/trạm sạc|sensors/i, 'ev-charging.html'],
    [/sân nền|pccc/i, 'ground-firelane.html'],
    [/biển số|anpr|kiểm soát xe|kiểm soát ra vào/i, 'anpr.html'],
    [/cấu hình vùng|vùng & luật|vùng cấm|cấu hình ai|rules|zone/i, 'rules.html'],
    [/báo cáo/i, 'reports.html'],
    [/xe cư dân|danh sách xe|phương tiện/i, 'vehicles.html'],
    [/quản lý camera|hệ thống camera|thêm camera|danh mục/i, 'cameras.html'],
    [/máy chủ|server|winforms|diagnostics|cài đặt|cấu hình hệ thống/i, 'server.html']
  ];

  // Buttons outside the navigation that should still open another screen.
  var ACTION_RULES = [
    [/^xem sự cố$/i, 'alert-popup.html'],
    [/đóng cửa sổ/i, 'incidents.html'],
    [/^sửa$/i, 'camera-edit.html'],
    [/mở cấu hình vùng|^vùng & luật$/i, 'rules.html'],
    [/^thêm camera$|quản lý camera/i, 'cameras.html'],
    [/^máy chủ server$|mở winforms/i, 'server.html']
  ];

  var here = location.pathname.split('/').pop() || 'dashboard.html';

  function labelOf(el) {
    return ((el.getAttribute('title') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function match(rules, text) {
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(text)) return rules[i][1];
    return null;
  }

  function linkify(el, target) {
    if (!target || target === here) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      location.href = target;
    }, true);
  }

  function inShell(el) { return !!el.closest('.app-sidebar, .app-header, .app-footer'); }

  function wireNavigation() {
    document.querySelectorAll('aside a, aside button, nav a, nav button').forEach(function (el) {
      if (inShell(el)) return;
      linkify(el, match(NAV_RULES, labelOf(el)));
    });
    document.querySelectorAll('main button, main a').forEach(function (el) {
      if (el.closest('nav') || inShell(el)) return;
      linkify(el, match(ACTION_RULES, labelOf(el)));
    });
  }

  // ---------- toast ----------
  var toastBox;
  function toast(message, opts) {
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
    setTimeout(function () { t.classList.add('is-leaving'); }, opts.duration || 4500);
    setTimeout(function () { t.remove(); }, (opts.duration || 4500) + 400);
  }
  window.demoToast = toast;
  window.alert = function (msg) { toast(String(msg)); };

  // ---------- screen switcher ----------
  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.className = 'demo-switcher';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-switcher__toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Màn hình demo';
    var list = document.createElement('div');
    list.className = 'demo-switcher__list';
    list.hidden = true;
    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.file;
      a.textContent = p.label;
      if (p.file === here) a.className = 'is-current';
      list.appendChild(a);
    });
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'demo-switcher__reset';
    reset.textContent = 'Đặt lại dữ liệu mẫu';
    reset.addEventListener('click', function () { window.MockDB && MockDB.reset(); toast('Đã đặt lại dữ liệu mẫu'); });
    list.appendChild(reset);
    btn.addEventListener('click', function () {
      list.hidden = !list.hidden;
      btn.setAttribute('aria-expanded', String(!list.hidden));
    });
    wrap.appendChild(list);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  // ---------- alert workflow on the popup + incident screens ----------
  function wireAlertWorkflow() {
    var alertId = here === 'incidents.html' ? 1042 : (here === 'alert-popup.html' ? 1043 : null);
    if (!alertId || !window.MockDB) return;
    document.querySelectorAll('button').forEach(function (b) {
      var text = labelOf(b);
      var noteEl = document.querySelector('textarea, #dispatch-note-input');
      if (/nhận xử lý/i.test(text)) b.addEventListener('click', function () { MockDB.acknowledge(alertId, 'Lê Văn Minh'); });
      if (/^hoàn tất/i.test(text)) b.addEventListener('click', function () { MockDB.resolve(alertId, noteEl && noteEl.value); });
      if (/báo giả/i.test(text)) b.addEventListener('click', function () { MockDB.falseAlarm(alertId, noteEl && noteEl.value); });
    });
  }

  // ---------- simulated real-time alerts ----------
  function startLiveAlerts() {
    if (!window.MockDB || here === 'alert-popup.html' || here === 'server.html') return;
    setTimeout(function tick() {
      var a = MockDB.pushNextLiveAlert();
      if (!a) return;
      var cam = MockDB.camera(a.cameraId);
      toast((a.severity === 'CRITICAL' ? 'KHẨN CẤP: ' : 'CẢNH BÁO: ') + a.title + ' • ' + a.cameraId + (cam ? ' ' + cam.name : ''), {
        level: a.severity === 'CRITICAL' ? 'critical' : 'warning',
        href: 'incidents.html',
        linkText: 'Mở hàng đợi',
        duration: 7000
      });
      setTimeout(tick, 45000);
    }, 20000);
  }

  // ---------- shell: open-alert badges, clock, collapsible sidebar ----------
  function refreshAlertBadges() {
    if (!window.MockDB) return;
    var n = MockDB.openAlerts().length;
    document.querySelectorAll('[data-open-alerts]').forEach(function (el) {
      el.textContent = n;
      if (n) el.removeAttribute('data-zero'); else el.setAttribute('data-zero', '');
    });
  }

  function wireShell() {
    var body = document.body;
    if (!body.classList.contains('app')) return;
    var KEY = 'binhan-sidebar-collapsed';
    try { if (localStorage.getItem(KEY) === '1') body.classList.add('is-collapsed'); } catch (e) { /* ignore */ }
    var btn = document.querySelector('[data-collapse]');
    if (btn) btn.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 1024px)').matches) {
        body.classList.toggle('is-expanded');
        return;
      }
      var on = body.classList.toggle('is-collapsed');
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
    });
    var clock = document.querySelector('[data-clock]');
    if (clock) {
      var tick = function () { clock.textContent = new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7'; };
      tick();
      setInterval(tick, 1000);
    }
    refreshAlertBadges();
    if (window.MockDB) MockDB.onChange(refreshAlertBadges);
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireShell();
    wireNavigation();
    wireAlertWorkflow();
    buildSwitcher();
    startLiveAlerts();
  });
})();
