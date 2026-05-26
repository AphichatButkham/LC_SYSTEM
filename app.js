let device = null;
let server = null;
let service = null;
let characteristic = null;

// =====================================================
// UUID
// =====================================================

const SERVICE_UUID =
  "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CHARACTERISTIC_UUID =
  "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// =====================================================
// DOM
// =====================================================

const connectBtn =
  document.getElementById("connectBtn");

const statusEl =
  document.getElementById("bleStatus");

const statusText =
  document.getElementById("statusText");

const logsEl =
  document.getElementById("logs");

const alertBar =
  document.getElementById("alertBar");

// =====================================================
// CONNECT BUTTON
// =====================================================

connectBtn.addEventListener("click", async () => {

  if (device && device.gatt.connected) {
    device.gatt.disconnect();
    return;
  }

  await connectBLE();
});

// =====================================================
// CONNECT BLE
// =====================================================

async function connectBLE() {

  try {

    addLog("Scanning for BLE device...");

    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "LC" }],
      optionalServices: [SERVICE_UUID]
    });

    addLog("Selected: " + (device.name || "Unknown"));

    device.addEventListener(
      "gattserverdisconnected",
      onDisconnected
    );

    server = await device.gatt.connect();
    addLog("GATT connected");

    service = await server.getPrimaryService(SERVICE_UUID);
    addLog("Service acquired");

    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    addLog("Characteristic acquired");

    await characteristic.startNotifications();
    characteristic.addEventListener(
      "characteristicvaluechanged",
      handleData
    );

    addLog("Notification stream active", "ok");
    setConnectedUI(true);
  }

  catch (error) {
    console.error(error);
    addLog("Connection failed: " + error.message, "err");
    setConnectedUI(false);
  }
}

// =====================================================
// HANDLE BLE DATA
// =====================================================

function handleData(event) {

  try {

    const raw = new TextDecoder().decode(event.target.value);
    const data = JSON.parse(raw);

    const v1 = sanitize(data.lc1);
    const v2 = sanitize(data.lc2);
    const v3 = sanitize(data.lc3);
    const v4 = sanitize(data.lc4);

    let total = 0;

    if (data.total !== undefined) {
      total = data.total;
    } else {
      total = v1 + v2 + v3 + v4;
    }

    // ==========================================
    // Update values
    // ==========================================

    updateCard("lc1", v1);
    updateCard("lc2", v2);
    updateCard("lc3", v3);
    updateCard("lc4", v4);

    document.getElementById("totalWeight").textContent =
      total.toFixed(1);

    // ==========================================
    // Distribution bars
    // ==========================================

    updateDistribution(v1, v2, v3, v4, total);

    // ==========================================
    // SVG diagram values
    // ==========================================

    updateSVG(v1, v2, v3, v4, total);

    // ==========================================
    // Imbalance alert
    // ==========================================

    checkImbalance(v1, v2, v3, v4, total);
  }

  catch (error) {
    console.error("Parse error:", error);
  }
}

// =====================================================
// UPDATE CARD
// =====================================================

function updateCard(id, value) {

  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = value.toFixed(1);
}

// =====================================================
// UPDATE DISTRIBUTION
// =====================================================

function updateDistribution(v1, v2, v3, v4, total) {

  if (total <= 0) {

    // Zero state
    ["bar1","bar2","bar3","bar4","dbar1","dbar2","dbar3","dbar4","dbar-front","dbar-rear"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.width = "0%";
    });

    ["pct1","pct2","pct3","pct4","dpct1","dpct2","dpct3","dpct4","dpct-front","dpct-rear"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "0.0%";
    });

    return;
  }

  const vals = [v1, v2, v3, v4];
  const pcts = vals.map(v => (v / total) * 100);

  // Per-card
  ["bar1","bar2","bar3","bar4"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, pcts[i]).toFixed(1) + "%";
    const pt = document.getElementById("pct" + (i+1));
    if (pt) pt.textContent = Math.max(0, pcts[i]).toFixed(1) + "%";
  });

  // Distribution overview bars
  ["dbar1","dbar2","dbar3","dbar4"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, pcts[i]).toFixed(1) + "%";
    const dp = document.getElementById("dpct" + (i+1));
    if (dp) dp.textContent = Math.max(0, pcts[i]).toFixed(0) + "%";
  });

  // F/R split
  const frontPct = ((v1 + v2) / total * 100);
  const rearPct  = ((v3 + v4) / total * 100);

  const dbarFront = document.getElementById("dbar-front");
  const dbarRear  = document.getElementById("dbar-rear");
  const dpctFront = document.getElementById("dpct-front");
  const dpctRear  = document.getElementById("dpct-rear");

  if (dbarFront) dbarFront.style.width = Math.max(0, frontPct).toFixed(1) + "%";
  if (dbarRear)  dbarRear.style.width  = Math.max(0, rearPct).toFixed(1) + "%";
  if (dpctFront) dpctFront.textContent = Math.max(0, frontPct).toFixed(0) + "%";
  if (dpctRear)  dpctRear.textContent  = Math.max(0, rearPct).toFixed(0) + "%";
}

// =====================================================
// UPDATE SVG DIAGRAM
// =====================================================

function updateSVG(v1, v2, v3, v4, total) {

  // Update text in SVG circles
  const s1 = document.getElementById("svg-lc1");
  const s2 = document.getElementById("svg-lc2");
  const s3 = document.getElementById("svg-lc3");
  const s4 = document.getElementById("svg-lc4");

  if (s1) s1.textContent = v1.toFixed(1);
  if (s2) s2.textContent = v2.toFixed(1);
  if (s3) s3.textContent = v3.toFixed(1);
  if (s4) s4.textContent = v4.toFixed(1);

  // Scale outer rings by load share
  if (total > 0) {

    const legs = [
      { id: "leg-fl", val: v1, cx: 118, cy: 100 },
      { id: "leg-fr", val: v2, cx: 322, cy: 100 },
      { id: "leg-rl", val: v3, cx: 118, cy: 280 },
      { id: "leg-rr", val: v4, cx: 322, cy: 280 },
    ];

    legs.forEach(leg => {
      const pct = leg.val / total;
      const g = document.getElementById(leg.id);
      if (!g) return;
      const outerCircle = g.querySelector("circle:first-child");
      if (outerCircle) {
        const r = 16 + pct * 40;
        outerCircle.setAttribute("r", r.toFixed(1));
      }
    });

    // Move CG dot
    const totalX = v1 * 118 + v2 * 322 + v3 * 118 + v4 * 322;
    const totalY = v1 * 100 + v2 * 100 + v3 * 280 + v4 * 280;

    const cgX = totalX / total;
    const cgY = totalY / total;

    const cgDot  = document.getElementById("cg-dot");
    const cgRing = document.getElementById("cg-ring");

    if (cgDot) {
      cgDot.setAttribute("cx", cgX.toFixed(1));
      cgDot.setAttribute("cy", cgY.toFixed(1));
    }
    if (cgRing) {
      cgRing.setAttribute("cx", cgX.toFixed(1));
      cgRing.setAttribute("cy", cgY.toFixed(1));
    }
  }
}

// =====================================================
// IMBALANCE ALERT
// =====================================================

function checkImbalance(v1, v2, v3, v4, total) {

  if (total < 50) {
    if (alertBar) alertBar.classList.remove("show");
    return;
  }

  const vals = [v1, v2, v3, v4];
  const pcts = vals.map(v => v / total * 100);

  // Alert if any leg differs by more than 20% from 25% ideal
  const maxDeviation = Math.max(...pcts.map(p => Math.abs(p - 25)));

  // Also alert if any leg reads near-zero while others are loaded (3-point contact)
  const zeroLegs = vals.filter(v => v < total * 0.05).length;

  if (maxDeviation > 20 || zeroLegs > 0) {

    if (alertBar) {
      alertBar.classList.add("show");
      const alertText = document.getElementById("alertText");
      if (alertText) {
        if (zeroLegs > 0) {
          alertText.textContent =
            zeroLegs + "-LEG DEAD ZONE DETECTED — " +
            zeroLegs + " CONTACT POINT(S) NEAR ZERO";
        } else {
          alertText.textContent =
            "LOAD IMBALANCE +" + maxDeviation.toFixed(0) +
            "% FROM IDEAL — CHECK SURFACE LEVEL";
        }
      }
    }

  } else {
    if (alertBar) alertBar.classList.remove("show");
  }
}

// =====================================================
// SANITIZE VALUE
// =====================================================

function sanitize(value) {

  if (value === undefined || value === null) return 0;
  if (isNaN(value)) return 0;

  return Number(value);
}

// =====================================================
// SEND COMMAND
// =====================================================

async function tareSensor(cmd) {

  try {

    if (!characteristic) {
      addLog("BLE not connected", "err");
      return;
    }

    const encoder = new TextEncoder();
    await characteristic.writeValue(encoder.encode(cmd));
    addLog("CMD → " + cmd, "cmd");
  }

  catch (error) {
    console.error(error);
    addLog("Write failed: " + error.message, "err");
  }
}

// =====================================================
// TARE ALL
// =====================================================

async function tareAll() {
  await tareSensor("tare_all");
}

// =====================================================
// DISCONNECT
// =====================================================

function onDisconnected() {
  addLog("BLE link lost", "err");
  setConnectedUI(false);
  characteristic = null;
  server = null;
  service = null;
}

// =====================================================
// UI STATE
// =====================================================

function setConnectedUI(state) {

  if (state) {

    statusEl.classList.remove("disconnected");
    statusEl.classList.add("connected");

    if (statusText) statusText.textContent = "ONLINE";

    connectBtn.innerHTML =
      '<svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M3 8h10M8 3l5 5-5 5"/></svg>' +
      "DISCONNECT";

    connectBtn.classList.remove("btn-primary");
    connectBtn.classList.add("btn-danger");

  } else {

    statusEl.classList.remove("connected");
    statusEl.classList.add("disconnected");

    if (statusText) statusText.textContent = "OFFLINE";

    connectBtn.innerHTML =
      '<svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M9.5 1.5L6 5H3a1 1 0 00-1 1v4a1 1 0 001 1h3l3.5 3.5"/>' +
      '<circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>' +
      "CONNECT BLE";

    connectBtn.classList.remove("btn-danger");
    connectBtn.classList.add("btn-primary");

    if (alertBar) alertBar.classList.remove("show");
  }
}

// =====================================================
// LOG SYSTEM
// =====================================================

function addLog(message, type) {

  if (!logsEl) return;

  const time = new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const line = document.createElement("div");
  line.className = "log-line" + (type ? " " + type : "");
  line.textContent = "[" + time + "] " + message;

  logsEl.appendChild(line);
  logsEl.scrollTop = logsEl.scrollHeight;
}

// =====================================================
// CLEAR LOGS
// =====================================================

function clearLogs() {
  if (logsEl) logsEl.innerHTML = "";
}