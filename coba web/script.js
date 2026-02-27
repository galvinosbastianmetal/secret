/* ============================================================
   Ramadan Mubarak 1447 H - script.js
   Features:
   1. Starfield canvas
   2. Countdown to Ramadan / during Ramadan
   3. Prayer times via Aladhan API (free, CORS ok)
   4. Tasbih / Dzikir counter
   5. Doa tabs (berbuka & sahur)
   6. Greeting card generator + download
   ============================================================ */

/* ---- UTILS ---- */
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");

/* ============================================================
   1. STARFIELD
   ============================================================ */
(function initStars() {
  const canvas = $("stars");
  const ctx = canvas.getContext("2d");
  let W,
    H,
    stars = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    const count = Math.floor((W * H) / 3000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4,
        alpha: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.phase += s.speed;
      const a = 0.3 + 0.7 * Math.abs(Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,204,147,${a * s.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }

  resize();
  createStars();
  requestAnimationFrame(drawStars);
  window.addEventListener("resize", () => {
    resize();
    createStars();
  });
})();

/* ============================================================
   2. COUNTDOWN
   ============================================================ */
(function initCountdown() {
  // Ramadan 1447 H diperkirakan mulai 18 Februari 2026; berakhir ~19 Maret 2026
  const RAMADAN_START = new Date("2026-02-18T00:00:00");
  const RAMADAN_END = new Date("2026-03-20T00:00:00");

  const dEl = $("cd-days");
  const hEl = $("cd-hours");
  const mEl = $("cd-mins");
  const sEl = $("cd-secs");
  const msgEl = $("countdown-msg");

  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 150);
  }

  let prevSec = -1;

  function tick() {
    const now = new Date();
    let diff;

    if (now < RAMADAN_START) {
      diff = RAMADAN_START - now;
      msgEl.textContent = "✨ Menuju bulan suci Ramadan 1447 H";
    } else if (now >= RAMADAN_START && now < RAMADAN_END) {
      diff = RAMADAN_END - now;
      msgEl.textContent =
        "🌙 Ramadan sedang berlangsung — semoga penuh berkah!";
    } else {
      dEl.textContent =
        hEl.textContent =
        mEl.textContent =
        sEl.textContent =
          "00";
      msgEl.textContent =
        "Ramadan 1447 H telah selesai. Sampai jumpa di Ramadan berikutnya 🌙";
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    dEl.textContent = pad(days);
    hEl.textContent = pad(hours);
    mEl.textContent = pad(mins);
    if (secs !== prevSec) {
      pop(sEl);
      prevSec = secs;
    }
    sEl.textContent = pad(secs);
  }

  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   3. PRAYER TIMES — Aladhan API
   ============================================================ */
(function initPrayer() {
  const btn = $("get-prayer-btn");
  const input = $("city-input");
  const grid = $("prayer-times");
  const errEl = $("prayer-error");

  const PRAYER_NAMES = {
    Fajr: "Subuh",
    Dhuhr: "Dzuhur",
    Asr: "Ashar",
    Maghrib: "Maghrib",
    Isha: "Isya",
    Imsak: "Imsak",
  };

  async function fetchPrayer(city) {
    const today = new Date();
    const d = today.getDate(),
      m = today.getMonth() + 1,
      y = today.getFullYear();
    const url = `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=${encodeURIComponent(city)}&country=ID&method=11`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kota tidak ditemukan");
    const json = await res.json();
    if (json.code !== 200) throw new Error("Kota tidak ditemukan");
    return json.data.timings;
  }

  function getNextPrayer(timings) {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const keys = ["Imsak", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    for (const key of keys) {
      const [h, min] = timings[key].split(":").map(Number);
      if (current < h * 60 + min) return key;
    }
    return "Imsak"; // next day
  }

  function render(timings, city) {
    grid.innerHTML = "";
    const keys = ["Imsak", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const nextP = getNextPrayer(timings);

    keys.forEach((key) => {
      const div = document.createElement("div");
      div.className = "prayer-item" + (key === nextP ? " next-prayer" : "");
      div.innerHTML = `
        <span class="prayer-name">${PRAYER_NAMES[key] || key}${key === nextP ? " ⏱" : ""}</span>
        <span class="prayer-time">${timings[key]}</span>
      `;
      grid.appendChild(div);
    });

    grid.classList.remove("hidden");
    errEl.textContent = "";
  }

  async function handleSearch() {
    const city = input.value.trim();
    if (!city) return;
    btn.textContent = "...";
    btn.disabled = true;
    errEl.textContent = "";
    grid.classList.add("hidden");

    try {
      const timings = await fetchPrayer(city);
      render(timings, city);
    } catch (e) {
      errEl.textContent = "❌ " + e.message + ". Coba nama kota lain.";
    } finally {
      btn.textContent = "Cari";
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", handleSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });
})();

/* ============================================================
   4. TASBIH
   ============================================================ */
(function initTasbih() {
  const DZIKIR = [
    { text: "SubhanAllah", target: 33 },
    { text: "Alhamdulillah", target: 33 },
    { text: "Allahu Akbar", target: 34 },
    { text: "Astaghfirullah", target: 100 },
    { text: "Laa ilaaha illAllah", target: 100 },
  ];

  let current = 0;
  let count = 0;

  const countEl = $("tasbih-count");
  const labelEl = $("tasbih-label");
  const progEl = $("tasbih-progress");

  function updateUI() {
    const dz = DZIKIR[current];
    countEl.textContent = count;
    labelEl.textContent = dz.text;
    progEl.textContent = `${count} / ${dz.target}`;
    if (count >= dz.target) {
      progEl.textContent += " ✅";
    }
  }

  function switchDzikir(dir) {
    current = (current + dir + DZIKIR.length) % DZIKIR.length;
    count = 0;
    updateUI();
  }

  $("tasbih-btn").addEventListener("click", () => {
    count++;
    countEl.classList.remove("tap");
    void countEl.offsetWidth;
    countEl.classList.add("tap");
    setTimeout(() => countEl.classList.remove("tap"), 100);
    updateUI();

    // subtle haptic if available
    if (navigator.vibrate) navigator.vibrate(30);
  });

  $("tasbih-reset").addEventListener("click", () => {
    count = 0;
    updateUI();
  });

  $("tasbih-prev").addEventListener("click", () => switchDzikir(-1));
  $("tasbih-next").addEventListener("click", () => switchDzikir(1));

  updateUI();
})();

/* ============================================================
   5. DOA TABS
   ============================================================ */
(function initDoa() {
  const DOA = {
    buka: {
      arabic:
        "اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
      latin: "Allāhumma laka ṣumtu wa bika āmantu wa 'alā rizqika afṭartu.",
      arti: '"Ya Allah, karena-Mu aku berpuasa, kepada-Mu aku beriman, dan dengan rezeki-Mu aku berbuka."',
    },
    sahur: {
      arabic:
        "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى",
      latin:
        "Nawaitu ṣauma ghadin 'an adā'i farḍi syahri Ramaḍāna hāẑihis-sanati lillāhi ta'ālā.",
      arti: '"Aku niat berpuasa esok hari untuk menunaikan kewajiban puasa bulan Ramadan tahun ini karena Allah Ta\'ala."',
    },
  };

  const contentEl = $("doa-content");
  const tabs = document.querySelectorAll(".doa-tab");

  function renderDoa(key) {
    const d = DOA[key];
    contentEl.style.opacity = "0";
    setTimeout(() => {
      contentEl.innerHTML = `
        <p class="doa-arabic">${d.arabic}</p>
        <p class="doa-latin"><em>${d.latin}</em></p>
        <p class="doa-arti">${d.arti}</p>
      `;
      contentEl.style.opacity = "1";
    }, 200);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      renderDoa(tab.dataset.doa);
    });
  });
})();

/* ============================================================
   6. GREETING CARD GENERATOR
   ============================================================ */
(function initGreetingCard() {
  const canvas = $("greeting-canvas");
  const ctx = canvas.getContext("2d");
  const nameInput = $("greeting-name");
  const downloadBtn = $("download-btn");

  function drawCard() {
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = "#0d1322";
    ctx.fillRect(0, 0, W, H);

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(26,17,6,0.9)");
    grad.addColorStop(0.5, "rgba(13,19,34,0.95)");
    grad.addColorStop(1, "rgba(20,30,20,0.9)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw stars
    ctx.fillStyle = "rgba(232,204,147,0.5)";
    for (let i = 0; i < 70; i++) {
      const sx = (Math.sin(i * 137.508) * 0.5 + 0.5) * W;
      const sy = (Math.sin(i * 251.3) * 0.5 + 0.5) * H;
      const sr = 0.5 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon
    ctx.save();
    const moonGrad = ctx.createRadialGradient(W - 80, 60, 10, W - 80, 60, 60);
    moonGrad.addColorStop(0, "#e8cc93");
    moonGrad.addColorStop(0.5, "#c9a96e");
    moonGrad.addColorStop(1, "rgba(122,92,46,0)");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(W - 80, 60, 55, 0, Math.PI * 2);
    ctx.fill();
    // Crescent mask
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(W - 55, 48, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top label
    ctx.fillStyle = "rgba(201,169,110,0.8)";
    ctx.font = '500 11px "DM Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("MARHABAN YA", W / 2, 70);

    // Main Title
    ctx.font = '300 80px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = "#e8cc93";
    ctx.textAlign = "center";
    ctx.fillText("Ramadan", W / 2, 155);

    // Year
    ctx.font = '300 13px "DM Sans", sans-serif';
    ctx.fillStyle = "rgba(201,169,110,0.6)";
    ctx.fillText("1447 H / 2026 M", W / 2, 182);

    // Divider
    ctx.strokeStyle = "rgba(201,169,110,0.3)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 100, 198);
    ctx.lineTo(W / 2 + 100, 198);
    ctx.stroke();

    // Recipient name
    const name = nameInput.value.trim();
    if (name) {
      ctx.font = 'italic 18px "Cormorant Garamond", Georgia, serif';
      ctx.fillStyle = "rgba(232,224,208,0.9)";
      ctx.fillText("Untuk: " + name, W / 2, 225);
    }

    // Message
    ctx.font = 'italic 300 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = "rgba(232,224,208,0.7)";
    const lines = [
      "Semoga Ramadan ini membawa keberkahan,",
      "ampunan, dan kebahagiaan yang berlimpah.",
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, (name ? 256 : 230) + i * 22);
    });

    // Bottom ornament
    ctx.fillStyle = "rgba(201,169,110,0.5)";
    ctx.font = "16px serif";
    ctx.fillText("🌙 ✦ 🌙", W / 2, H - 30);
  }

  nameInput.addEventListener("input", drawCard);
  drawCard();

  downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "ramadan-mubarak.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  canvas.addEventListener("click", drawCard);
})();

// ============================================================
// BGM - Auto play saat pertama kali user interaksi
// ============================================================
document.addEventListener(
  "click",
  function startBGM() {
    const audio = document.getElementById("bgm");
    if (audio.paused) audio.play();
    document.removeEventListener("click", startBGM);
  },
  { once: true },
);
