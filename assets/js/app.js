/*
 * Shared demo behaviour.
 *  - In the shell (index.html): provides the toast used for notifications.
 *  - Inside a screen shown in the shell frame: wires the in-content buttons
 *    ("Xem sự cố", "Sửa", "Vùng & luật"...) to other screens, hooks the alert
 *    workflow to the mock DB and forwards alert() / toasts to the shell.
 *  - On a standalone page (Core Server): toast only.
 */
(function () {
  'use strict';

  var embedded = window.top !== window.self;
  var here = location.pathname.split('/').pop() || 'index.html';

  // Buttons inside a screen that open another screen (first match wins).
  var ACTION_RULES = [
    [/^xem sự cố$/i, 'alert-popup.html'],
    [/đóng cửa sổ/i, 'incidents.html'],
    [/^sửa$/i, 'camera-edit.html'],
    [/mở cấu hình vùng|^vùng & luật$/i, 'rules.html'],
    [/^thêm camera$/i, 'cameras.html']
  ];

  function labelOf(el) {
    return ((el.getAttribute('title') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function match(rules, text) {
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(text)) return rules[i][1];
    return null;
  }

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
    var d = opts.duration || 4500;
    setTimeout(function () { t.classList.add('is-leaving'); }, d);
    setTimeout(function () { t.remove(); }, d + 400);
  }

  function toast(message, opts) {
    // Screens in the frame show their toasts in the shell so they sit above everything.
    if (embedded) {
      try { if (window.parent.demoToast) return window.parent.demoToast(message, opts); } catch (e) { /* ignore */ }
    }
    localToast(message, opts);
  }
  window.demoToast = toast;
  window.alert = function (msg) { toast(String(msg)); };

  if (!embedded) return; // shell and standalone pages need nothing else

  // ---------- in-screen navigation ----------
  function wireActions() {
    document.querySelectorAll('main button, main a').forEach(function (el) {
      var target = match(ACTION_RULES, labelOf(el));
      if (!target || target === here) return;
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        location.href = target; // stays inside the frame; the shell updates its header and sidebar
      }, true);
    });
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
      if (/báo giả/i.test(text)) b.addEventListener('click', function () { MockDB.falseAlarm(alertId, noteEl && noteEl.value); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireActions();
    wireAlertWorkflow();
  });
})();
