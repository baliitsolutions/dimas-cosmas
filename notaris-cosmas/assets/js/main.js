/* ==========================================================
   Notaris & PPAT Cosmas Dimas Darmoyo Danisworo, S.H., M.Kn.
   Tanpa library. Ubah PENGATURAN di bawah sesuai data kantor.
   ========================================================== */

// ---------- PENGATURAN ----------
// Nomor WhatsApp kantor dalam format internasional tanpa + dan tanpa 0 di depan.
// Contoh: 0812-3456-7890 → "6281234567890"
const OFFICE_WA = "620000000000";

// Jam kantor. 0 = Minggu ... 6 = Sabtu. null = tutup. Format 24 jam "JJ:MM".
const OFFICE_HOURS = {
  1: ["08:00", "16:00"], // Senin
  2: ["08:00", "16:00"], // Selasa
  3: ["08:00", "16:00"], // Rabu
  4: ["08:00", "16:00"], // Kamis
  5: ["08:00", "16:00"], // Jumat
  6: ["08:00", "12:00"], // Sabtu
  0: null                // Minggu
};

// Jarak antarpilihan jam janji temu (menit), dan batas janji terakhir sebelum tutup (menit).
const SLOT_MINUTES = 30;
const LAST_SLOT_BEFORE_CLOSE = 60;

// Zona waktu kantor yang ditampilkan di pilihan jam: "WIB", "WITA", atau "WIT".
const TIMEZONE_LABEL = "WITA";
// --------------------------------

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}.${String(n % 60).padStart(2, "0")}`;
const fmt = (t) => t.replace(":", ".");
const range = (h) => (h ? `${fmt(h[0])}–${fmt(h[1])}` : "Tutup");
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const now = new Date();
const today = now.getDay();
const nowMin = now.getHours() * 60 + now.getMinutes();

/* ---------- Menu ponsel ---------- */
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); }
  });
}

/* ---------- Status buka / tutup ---------- */
const card = document.querySelector("[data-hours]");
if (card) {
  const h = OFFICE_HOURS[today];
  const open = h && nowMin >= toMin(h[0]) && nowMin < toMin(h[1]);
  card.classList.toggle("is-open", Boolean(open));
  card.querySelector("[data-status]").textContent = open ? "Kantor sedang buka" : "Kantor sedang tutup";
  let line = `Hari ini: ${range(h)}`;
  if (!open) {
    if (h && nowMin < toMin(h[0])) {
      line = `Buka hari ini pukul ${fmt(h[0])}`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const d = (today + i) % 7;
        if (OFFICE_HOURS[d]) { line = `Buka ${i === 1 ? "besok" : DAYS[d]} pukul ${fmt(OFFICE_HOURS[d][0])}`; break; }
      }
    }
  }
  card.querySelector("[data-today]").textContent = line;
}

/* ---------- Tabel jam kantor ---------- */
const tbody = document.querySelector("[data-hours-table] tbody");
if (tbody) {
  WEEK_ORDER.forEach((d) => {
    const tr = document.createElement("tr");
    if (d === today) tr.className = "today";
    tr.innerHTML = `<th scope="row">${DAYS[d]}</th><td>${range(OFFICE_HOURS[d])}</td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- Tab persyaratan ---------- */
const tabs = [...document.querySelectorAll(".req-tabs [role=tab]")];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!k) return;
    const next = tabs[(i + k + tabs.length) % tabs.length];
    selectTab(next); next.focus();
  });
});

/* ---------- Formulir janji temu ---------- */
const form = document.querySelector("[data-book-form]");
if (form) {
  const dateInput = form.elements.date;
  const timeSelect = form.elements.time;
  dateInput.min = isoDate(now);
  const max = new Date(now); max.setDate(max.getDate() + 60);
  dateInput.max = isoDate(max);

  const parseDate = (v) => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); };

  function slotsFor(value) {
    if (!value) return [];
    const date = parseDate(value);
    const h = OFFICE_HOURS[date.getDay()];
    if (!h || value < dateInput.min || value > dateInput.max) return [];
    const isToday = value === isoDate(now);
    const out = [];
    for (let t = toMin(h[0]); t <= toMin(h[1]) - LAST_SLOT_BEFORE_CLOSE; t += SLOT_MINUTES) {
      if (!isToday || t > nowMin + 30) out.push(t);
    }
    return out;
  }

  function fillTimes() {
    const slots = slotsFor(dateInput.value);
    timeSelect.innerHTML = "";
    if (!slots.length) {
      timeSelect.disabled = true;
      timeSelect.innerHTML = `<option value="">${dateInput.value ? "Tidak ada jam tersedia" : "Pilih tanggal dulu"}</option>`;
      return;
    }
    timeSelect.disabled = false;
    timeSelect.innerHTML = `<option value="">Pilih jam</option>` +
      slots.map((t) => `<option value="${fromMin(t)}">${fromMin(t)} ${TIMEZONE_LABEL}</option>`).join("");
  }

  const rules = {
    name: (v) => v.trim().length >= 3,
    phone: (v) => v.replace(/\D/g, "").length >= 9,
    email: (v) => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    date: (v) => slotsFor(v).length > 0,
    time: (v) => v !== ""
  };
  const check = (name) => {
    const el = form.elements[name];
    const ok = rules[name](el.value);
    el.closest(".field").classList.toggle("invalid", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  };

  dateInput.addEventListener("change", () => {
    fillTimes();
    if (dateInput.value) {
      const ok = check("date");
      const d = parseDate(dateInput.value);
      form.querySelector("[data-date-error]").textContent = OFFICE_HOURS[d.getDay()]
        ? "Tidak ada jam tersedia pada tanggal ini. Pilih tanggal lain."
        : `Kantor tutup pada hari ${DAYS[d.getDay()]}. Pilih hari kerja.`;
      if (ok) form.elements.time.closest(".field").classList.remove("invalid");
    }
  });
  ["name", "phone", "email"].forEach((n) => {
    const el = form.elements[n];
    el.addEventListener("blur", () => check(n));
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("invalid")) check(n); });
  });
  timeSelect.addEventListener("change", () => check("time"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const order = ["name", "phone", "email", "date", "time"];
    const results = order.map((n) => [n, check(n)]);
    const bad = results.find(([, ok]) => !ok);
    if (bad) { form.elements[bad[0]].focus(); return; }

    const d = parseDate(dateInput.value);
    const tanggal = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const f = form.elements;
    const lines = [
      "Selamat pagi/siang, saya ingin membuat janji temu.",
      "",
      `Nama: ${f.name.value.trim()}`,
      `No. WhatsApp: ${f.phone.value.trim()}`,
      f.email.value.trim() ? `Email: ${f.email.value.trim()}` : null,
      `Keperluan: ${f.need.value}`,
      `Tanggal: ${tanggal}`,
      `Jam: ${f.time.value} ${TIMEZONE_LABEL}`,
      f.notes.value.trim() ? `Keterangan: ${f.notes.value.trim()}` : null,
      "",
      "Mohon konfirmasinya. Terima kasih."
    ].filter((l) => l !== null);

    window.open(`https://wa.me/${OFFICE_WA}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
    form.querySelector(".form-success").hidden = false;
  });
}

/* ---------- Tautan WhatsApp dan tahun ---------- */
document.querySelectorAll("[data-wa-link]").forEach((a) => (a.href = `https://wa.me/${OFFICE_WA}`));
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = now.getFullYear()));
