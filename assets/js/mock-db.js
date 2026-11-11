/*
 * Mock database for the Binh An Smart CCTV demo (Hang muc A - Muc 3).
 * Mirrors the SQL Server schema in "Tai lieu ky thuat.md" section 4.1:
 * Cameras, CameraRules, AI_Alerts, RegisteredVehicles, ANPR_Logs.
 * Data lives in memory and is persisted to localStorage so status changes
 * survive page navigation during a demo. Call MockDB.reset() to start over.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'binhan-cctv-mockdb-v1';

  var seed = {
    cameras: [
      { id: 'CAM-EV-01', name: 'Trạm sạc Xe máy 01', ip: '192.168.10.101', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 42.5, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-scooter-heat.jpg' },
      { id: 'CAM-EV-02', name: 'Trụ sạc Ô tô 02', ip: '192.168.10.102', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 47.0, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-car-charging.jpg' },
      { id: 'CAM-EV-03', name: 'Ô sạc Ô tô 03', ip: '192.168.10.103', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 51.5, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-ice-car.jpg' },
      { id: 'CAM-EV-04', name: 'Trạm sạc Xe máy 04', ip: '192.168.10.104', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 56.0, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-fallen-bike.jpg' },
      { id: 'CAM-EV-05', name: 'Trụ sạc Ô tô 05', ip: '192.168.10.105', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 60.5, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-car-finished.jpg' },
      { id: 'CAM-EV-06', name: 'Trạm sạc Xe máy 06', ip: '192.168.10.106', zone: 'EV_CHARGING', type: 'THERMAL_HYBRID', mapX: 65.0, mapY: 61.0, active: true, status: 'ONLINE', image: 'ev-bike-shelter.jpg' },
      { id: 'CAM-ANPR-01', name: 'Cổng vào', ip: '192.168.20.11', zone: 'GROUND_AREA', type: 'ANPR', mapX: 12.0, mapY: 88.0, active: true, status: 'ONLINE', image: 'gr-anpr-gate.jpg' },
      { id: 'CAM-ANPR-02', name: 'Cổng ra', ip: '192.168.20.12', zone: 'GROUND_AREA', type: 'ANPR', mapX: 18.0, mapY: 88.0, active: true, status: 'ONLINE', image: 'gr-anpr-gate.jpg' },
      { id: 'CAM-GR-01', name: 'Lối PCCC Đông', ip: '192.168.20.21', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 82.0, mapY: 40.0, active: true, status: 'ONLINE', image: 'gr-firelane.jpg' },
      { id: 'CAM-GR-02', name: 'Sảnh đón khách A', ip: '192.168.20.22', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 30.0, mapY: 45.0, active: true, status: 'ONLINE', image: 'gr-lobby.jpg' },
      { id: 'CAM-GR-03', name: 'Công viên sân nền', ip: '192.168.20.23', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 50.0, mapY: 30.0, active: true, status: 'ONLINE', image: 'gr-suitcase.jpg' },
      { id: 'CAM-GR-04', name: 'Sân trung tâm', ip: '192.168.20.24', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 50.0, mapY: 48.0, active: true, status: 'ONLINE', image: 'gr-crowd-dusk.jpg' },
      { id: 'CAM-GR-05', name: 'Góc khuất hàng rào Tây', ip: '192.168.20.25', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 6.0, mapY: 35.0, active: true, status: 'ONLINE', image: 'gr-west-fence.jpg' },
      { id: 'CAM-GR-06', name: 'Lối đi bộ Bắc', ip: '192.168.20.26', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 40.0, mapY: 10.0, active: true, status: 'ONLINE', image: 'gr-lobby.jpg' },
      { id: 'CAM-GR-07', name: 'Lối đi bộ Đông', ip: '192.168.20.27', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 90.0, mapY: 70.0, active: true, status: 'OFFLINE', image: null },
      { id: 'CAM-GR-08', name: 'Bãi đỗ khách', ip: '192.168.20.28', zone: 'GROUND_AREA', type: 'STANDARD_AI', mapX: 25.0, mapY: 75.0, active: true, status: 'ONLINE', image: 'ev-empty-bay.jpg' }
    ],
    rules: [
      { id: 1, cameraId: 'CAM-EV-01', name: 'Quá nhiệt trụ sạc 01', type: 'OVERHEAT', maxTemp: 60, enabled: true },
      { id: 2, cameraId: 'CAM-EV-01', name: 'Xe ngã đổ trụ 01', type: 'VEHICLE_FALL', seconds: 5, enabled: true },
      { id: 3, cameraId: 'CAM-EV-03', name: 'Chiếm dụng ô sạc 03', type: 'EV_SLOT_MISUSE', seconds: 900, chargingPoleId: 'CP-EV-03', enabled: true },
      { id: 4, cameraId: 'CAM-GR-01', name: 'Cấm đỗ lối PCCC Đông', type: 'ILLEGAL_PARKING', seconds: 180, enabled: true },
      { id: 5, cameraId: 'CAM-GR-01', name: 'Đồ vật bỏ rơi lối PCCC', type: 'ABANDONED_OBJECT', seconds: 120, enabled: true },
      { id: 6, cameraId: 'CAM-GR-04', name: 'Tụ tập sân trung tâm', type: 'CROWD_DETECTION', maxCrowd: 8, enabled: true },
      { id: 7, cameraId: 'CAM-GR-05', name: 'Lảng vảng hàng rào Tây', type: 'NIGHT_LOITERING', seconds: 300, start: '22:00', end: '05:30', enabled: true }
    ],
    alerts: [
      { id: 1042, cameraId: 'CAM-EV-01', ruleType: 'OVERHEAT', severity: 'CRITICAL', title: 'Quá nhiệt pin 68.5°C (ngưỡng 60°C)', meta: { temp: 68.5 }, status: 'NEW', createdAt: '2026-11-11T18:13:00+07:00' },
      { id: 1043, cameraId: 'CAM-GR-01', ruleType: 'ILLEGAL_PARKING', severity: 'WARNING', title: 'Đỗ xe lấn lối PCCC quá 3 phút', meta: { plate: '51H-123.45', duration: 195 }, status: 'NEW', createdAt: '2026-11-11T18:13:05+07:00' },
      { id: 1044, cameraId: 'CAM-EV-03', ruleType: 'EV_SLOT_MISUSE', severity: 'WARNING', title: 'Xe xăng chiếm ô sạc 14 phút', meta: { plate: '59A-456.78', duration: 840 }, status: 'NEW', createdAt: '2026-11-11T18:02:00+07:00' },
      { id: 1045, cameraId: 'CAM-GR-03', ruleType: 'ABANDONED_OBJECT', severity: 'WARNING', title: 'Vali bỏ quên quá 2 phút', meta: { duration: 160 }, status: 'NEW', createdAt: '2026-11-11T17:55:00+07:00' },
      { id: 1046, cameraId: 'CAM-EV-04', ruleType: 'VEHICLE_FALL', severity: 'WARNING', title: 'Xe máy ngã đổ tại trụ sạc', meta: {}, status: 'NEW', createdAt: '2026-11-11T17:48:00+07:00' }
    ],
    vehicles: [
      { plate: '51K88899', display: '51K-888.99', apartment: 'A-12.05', owner: 'Nguyễn Văn An', vehicleType: 'CAR', engine: 'EV', active: true },
      { plate: '51K67812', display: '51K-678.12', apartment: 'B-03.07', owner: 'Trần Thị Bình', vehicleType: 'CAR', engine: 'EV', active: true },
      { plate: '59A45678', display: '59A-456.78', apartment: 'B-08.12', owner: 'Phạm Quốc Huy', vehicleType: 'CAR', engine: 'ICE', active: true },
      { plate: '59X234567', display: '59X2-345.67', apartment: 'A-07.11', owner: 'Lê Minh Tâm', vehicleType: 'MOTORBIKE', engine: 'EV', active: true },
      { plate: '51G24680', display: '51G-246.80', apartment: 'A-15.02', owner: 'Võ Thanh Hà', vehicleType: 'CAR', engine: 'ICE', active: false }
    ],
    anprLogs: [
      { id: 8821, cameraId: 'CAM-ANPR-01', plate: '51K-888.99', vehicleType: 'CAR', engine: 'EV', direction: 'IN', detectedAt: '2026-11-11T10:42:15+07:00' },
      { id: 8822, cameraId: 'CAM-ANPR-01', plate: '59A-456.78', vehicleType: 'CAR', engine: 'ICE', direction: 'IN', detectedAt: '2026-11-11T10:47:02+07:00' },
      { id: 8823, cameraId: 'CAM-ANPR-01', plate: '51H-123.45', vehicleType: 'CAR', engine: 'VISITOR', direction: 'IN', detectedAt: '2026-11-11T18:09:40+07:00' },
      { id: 8824, cameraId: 'CAM-ANPR-02', plate: '51K-678.12', vehicleType: 'CAR', engine: 'EV', direction: 'OUT', detectedAt: '2026-11-11T18:20:11+07:00' }
    ]
  };

  // Events the demo "AI Core" pushes over time to simulate SignalR ReceiveNewAlert.
  var liveFeed = [
    { cameraId: 'CAM-GR-04', ruleType: 'CROWD_DETECTION', severity: 'WARNING', title: 'Tụ tập 9 người (ngưỡng ≥ 8)', meta: { count: 9 } },
    { cameraId: 'CAM-EV-06', ruleType: 'SMOKE_FIRE', severity: 'CRITICAL', title: 'Phát hiện khói sớm tại trạm sạc', meta: {} },
    { cameraId: 'CAM-GR-05', ruleType: 'NIGHT_LOITERING', severity: 'WARNING', title: 'Lảng vảng ban đêm quá 5 phút', meta: { duration: 330 } },
    { cameraId: 'CAM-EV-05', ruleType: 'EV_SLOT_MISUSE', severity: 'WARNING', title: 'Sạc xong chưa rời ô 45 phút (OCPP: Finishing)', meta: { duration: 2700 } }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable: fall back to seed */ }
    return clone(seed);
  }

  var db = load();
  var listeners = [];

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
    listeners.forEach(function (fn) { try { fn(db); } catch (e) { /* ignore */ } });
  }

  var MockDB = {
    all: function (table) { return clone(db[table] || []); },
    camera: function (id) { return clone(db.cameras.find(function (c) { return c.id === id; }) || null); },
    alert: function (id) { return clone(db.alerts.find(function (a) { return a.id === Number(id); }) || null); },
    openAlerts: function () {
      return clone(db.alerts.filter(function (a) { return a.status === 'NEW' || a.status === 'PROCESSING'; }));
    },
    /* Alert workflow from section 5.2: NEW -> PROCESSING -> RESOLVED | FALSE_ALARM */
    acknowledge: function (id, user) { return this._setStatus(id, 'PROCESSING', { processedBy: user || 'Trực ban BQL' }); },
    resolve: function (id, note) { return this._setStatus(id, 'RESOLVED', { note: note || '', resolvedAt: new Date().toISOString() }); },
    falseAlarm: function (id, note) { return this._setStatus(id, 'FALSE_ALARM', { note: note || '', resolvedAt: new Date().toISOString() }); },
    _setStatus: function (id, status, extra) {
      var a = db.alerts.find(function (x) { return x.id === Number(id); });
      if (!a) return null;
      a.status = status;
      Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
      save();
      return clone(a);
    },
    /* Pushes the next scripted alert; returns null once every scripted alert has been shown. */
    pushNextLiveAlert: function () {
      var pushed = db.alerts.length - seed.alerts.length;
      if (pushed >= liveFeed.length) return null;
      var next = liveFeed[pushed];
      var maxId = db.alerts.reduce(function (m, a) { return Math.max(m, a.id); }, 0);
      var a = Object.assign(clone(next), { id: maxId + 1, status: 'NEW', createdAt: new Date().toISOString() });
      db.alerts.unshift(a);
      save();
      return clone(a);
    },
    onChange: function (fn) { listeners.push(fn); },
    /* Re-read from localStorage, e.g. after another frame changed the data. */
    reload: function () { db = load(); },
    reset: function () { db = clone(seed); save(); }
  };

  window.MockDB = MockDB;
})();
