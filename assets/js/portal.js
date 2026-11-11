/*
 * Persistent web shell (index.html). The sidebar, header and footer load once;
 * each screen is shown in the content frame, routed by the URL hash (#/dashboard).
 */
(function () {
  'use strict';

  var PAGES = {
    'dashboard':       { group: 'Giám sát', title: 'Trung tâm giám sát', sub: 'Bản đồ mặt bằng, camera trực tiếp và cảnh báo realtime' },
    'live-grid':       { group: 'Giám sát', title: 'Lưới camera trực tiếp', sub: '16 camera • Khu 3.1 & 3.2' },
    'incidents':       { group: 'Giám sát', title: 'Hàng đợi sự cố', sub: 'Nhận xử lý → Hoàn tất hoặc Báo giả' },
    'alert-popup':     { group: 'Giám sát', title: 'Hàng đợi sự cố', sub: 'Cảnh báo khẩn cấp', nav: 'incidents' },
    'ev-charging':     { group: 'Khu vực', title: 'Khu 3.1 · Trạm sạc xe điện', sub: 'Camera nhiệt Bi-spectrum • OCPP chỉ đọc' },
    'ground-firelane': { group: 'Khu vực', title: 'Khu 3.2 · Sân nền & Lối PCCC', sub: 'Đỗ xe trái phép, đồ bỏ rơi, tụ tập, lảng vảng đêm' },
    'anpr':            { group: 'Khu vực', title: 'Nhật ký biển số (ANPR)', sub: 'CAM-ANPR-01 Cổng vào • CAM-ANPR-02 Cổng ra' },
    'rules':           { group: 'Quản trị', title: 'Cấu hình vùng & luật AI', sub: '9 loại luật • áp dụng ngay (hot-reload)' },
    'cameras':         { group: 'Quản trị', title: 'Quản lý camera', sub: '16 camera • 6 trạm sạc • 10 sân nền' },
    'camera-edit':     { group: 'Quản trị', title: 'Quản lý camera', sub: 'Cập nhật camera', nav: 'cameras' },
    'vehicles':        { group: 'Quản trị', title: 'Danh sách xe cư dân', sub: 'Phân loại EV / ICE cho bài toán chiếm ô sạc' },
    'reports':         { group: 'Quản trị', title: 'Báo cáo vận hành', sub: 'Thống kê theo tuần / tháng • Xuất Excel' }
  };
  var DEFAULT_PAGE = 'dashboard';
  var COLLAPSE_KEY = 'binhan-sidebar-collapsed';

  var body = document.body;
  var frame = document.getElementById('app-frame');
  var crumbGroup = document.querySelector('[data-crumb-group]');
  var crumbTitle = document.querySelector('[data-crumb-title]');
  var subtitle = document.querySelector('[data-subtitle]');

  function pageFromHash() {
    var name = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return PAGES[name] ? name : DEFAULT_PAGE;
  }

  function setChrome(name) {
    var p = PAGES[name] || PAGES[DEFAULT_PAGE];
    crumbGroup.textContent = p.group;
    crumbTitle.textContent = p.title;
    subtitle.textContent = p.sub;
    document.title = p.title + ' – Bình An CCTV';
    var navName = p.nav || name;
    document.querySelectorAll('.app-nav__link[data-page]').forEach(function (a) {
      var on = a.getAttribute('data-page') === navName;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // Load a screen into the content frame without touching the shell.
  function show(name) {
    setChrome(name);
    var target = 'pages/' + name + '.html';
    var current = frame.contentWindow && frame.contentWindow.location && frame.contentWindow.location.pathname;
    if (current && current.endsWith('/' + target)) return;
    body.classList.add('is-loading');
    frame.contentWindow.location.replace(target);
  }

  window.addEventListener('hashchange', function () { show(pageFromHash()); });

  // Navigation that happens inside a screen (e.g. "Xem sự cố") is mirrored to the hash.
  frame.addEventListener('load', function () {
    var path = '';
    try { path = frame.contentWindow.location.pathname; } catch (e) { /* ignore */ }
    var m = path.match(/pages\/([\w-]+)\.html$/);
    if (m && PAGES[m[1]]) {
      if (pageFromHash() !== m[1]) history.replaceState(null, '', '#/' + m[1]);
      setChrome(m[1]);
    }
    // Tailwind's CDN build styles the screen right after load; reveal it a beat later.
    setTimeout(function () { body.classList.remove('is-loading'); }, 120);
  });

  // ---------- sidebar collapse (remembered in localStorage) ----------
  try { if (localStorage.getItem(COLLAPSE_KEY) === '1') body.classList.add('is-collapsed'); } catch (e) { /* ignore */ }
  document.querySelector('[data-collapse]').addEventListener('click', function () {
    if (window.matchMedia('(max-width: 1024px)').matches) { body.classList.toggle('is-expanded'); return; }
    var on = !(body.classList.contains('is-collapsed') || document.documentElement.classList.contains('pre-collapsed'));
    document.documentElement.classList.remove('pre-collapsed');
    body.classList.toggle('is-collapsed', on);
    try { localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  });

  // ---------- open-alert badges ----------
  function refreshBadges() {
    if (!window.MockDB) return;
    var n = MockDB.openAlerts().length;
    document.querySelectorAll('[data-open-alerts]').forEach(function (el) {
      el.textContent = n;
      if (n) el.removeAttribute('data-zero'); else el.setAttribute('data-zero', '');
    });
  }
  if (window.MockDB) {
    MockDB.onChange(refreshBadges);
    // Status changes made inside a screen arrive as storage events.
    window.addEventListener('storage', function () { MockDB.reload(); refreshBadges(); });
  }

  // ---------- clock ----------
  var clock = document.querySelector('[data-clock]');
  function tick() { clock.textContent = new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7'; }

  // ---------- reset demo data ----------
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function () {
    if (!window.MockDB) return;
    MockDB.reset();
    refreshBadges();
    frame.contentWindow.location.reload();
    if (window.demoToast) demoToast('Đã đặt lại dữ liệu mẫu');
  });

  // ---------- simulated real-time alerts (SignalR ReceiveNewAlert) ----------
  function startLiveAlerts() {
    if (!window.MockDB) return;
    setTimeout(function next() {
      var a = MockDB.pushNextLiveAlert();
      if (!a) return;
      var cam = MockDB.camera(a.cameraId);
      if (window.demoToast) demoToast((a.severity === 'CRITICAL' ? 'KHẨN CẤP: ' : 'CẢNH BÁO: ') + a.title + ' • ' + a.cameraId + (cam ? ' ' + cam.name : ''), {
        level: a.severity === 'CRITICAL' ? 'critical' : 'warning',
        href: '#/incidents',
        linkText: 'Mở hàng đợi',
        duration: 7000
      });
      setTimeout(next, 45000);
    }, 20000);
  }

  setChrome(pageFromHash());
  if (!location.hash) history.replaceState(null, '', '#/' + DEFAULT_PAGE);
  frame.src = 'pages/' + pageFromHash() + '.html';
  refreshBadges();
  tick();
  setInterval(tick, 1000);
  startLiveAlerts();
})();
