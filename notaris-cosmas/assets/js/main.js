/* ==========================================================
   Notaris & PPAT Cosmas Dimas Darmoyo Danisworo, S.H., M.Kn.
   Tanpa library. Ubah PENGATURAN di bawah sesuai data kantor.
   ========================================================== */

// ---------- PENGATURAN ----------
// Kota/kabupaten kedudukan kantor. Otomatis tampil di semua bagian bertanda data-city.
const CITY = "[Kota/Kabupaten]";

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

// Zona waktu kantor: "WIB", "WITA", atau "WIT".
const TIMEZONE_LABEL = "WITA";

// Bahasa awal bila pengunjung belum pernah memilih: "id" atau "en".
const DEFAULT_LANG = "id";
// --------------------------------

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const D = window.I18N_DYNAMIC;
const EN = window.I18N_EN || {};
let lang = DEFAULT_LANG;
const t = (key, vars = {}) => (D[lang][key] || "").replace(/\{(\w)\}/g, (_, k) => vars[k] ?? "");

const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}.${String(n % 60).padStart(2, "0")}`;
const fmt = (s) => s.replace(":", ".");
const range = (h) => (h ? `${fmt(h[0])}–${fmt(h[1])}` : t("closed"));
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const now = new Date();
const today = now.getDay();
const nowMin = now.getHours() * 60 + now.getMinutes();

/* ---------- Teks statis: simpan versi Indonesia, tukar ke Inggris ---------- */
const textEls = [...document.querySelectorAll("[data-i18n]")];
const phEls = [...document.querySelectorAll("[data-i18n-placeholder]")];
textEls.forEach((el) => (el.dataset.id = el.innerHTML));
phEls.forEach((el) => (el.dataset.idPh = el.placeholder));

function fillCity() {
  document.querySelectorAll("[data-city]").forEach((el) => (el.textContent = CITY));
}

function applyStatic() {
  textEls.forEach((el) => {
    const key = el.dataset.i18n;
    el.innerHTML = lang === "en" && EN[key] ? EN[key] : el.dataset.id;
  });
  phEls.forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = lang === "en" && EN[key] ? EN[key] : el.dataset.idPh;
  });
  fillCity();
}

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

/* ---------- Status buka / tutup dan tabel jam ---------- */
function renderHours() {
  const card = document.querySelector("[data-hours]");
  if (card) {
    const h = OFFICE_HOURS[today];
    const open = h && nowMin >= toMin(h[0]) && nowMin < toMin(h[1]);
    card.classList.toggle("is-open", Boolean(open));
    card.querySelector("[data-status]").textContent = open ? t("open") : t("closedNow");
    let line = t("today", { r: range(h) });
    if (!open) {
      if (h && nowMin < toMin(h[0])) {
        line = t("opensToday", { t: fmt(h[0]) });
      } else {
        for (let i = 1; i <= 7; i++) {
          const d = (today + i) % 7;
          if (OFFICE_HOURS[d]) {
            line = i === 1 ? t("opensTomorrow", { t: fmt(OFFICE_HOURS[d][0]) })
                           : t("opensDay", { d: D[lang].days[d], t: fmt(OFFICE_HOURS[d][0]) });
            break;
          }
        }
      }
    }
    card.querySelector("[data-today]").textContent = line;
  }

  const tbody = document.querySelector("[data-hours-table] tbody");
  if (tbody) {
    tbody.innerHTML = "";
    WEEK_ORDER.forEach((d) => {
      const tr = document.createElement("tr");
      if (d === today) tr.className = "today";
      tr.innerHTML = `<th scope="row">${D[lang].days[d]}</th><td>${range(OFFICE_HOURS[d])}</td>`;
      tbody.appendChild(tr);
    });
  }
}

/* ---------- Tab persyaratan ---------- */
const tabs = [...document.querySelectorAll(".req-tabs [role=tab]")];
function selectTab(tab) {
  tabs.forEach((x) => {
    const on = x === tab;
    x.setAttribute("aria-selected", String(on));
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
  });
}
tabs.forEach((x, i) => {
  x.addEventListener("click", () => selectTab(x));
  x.addEventListener("keydown", (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!k) return;
    const next = tabs[(i + k + tabs.length) % tabs.length];
    selectTab(next); next.focus();
  });
});

/* ---------- Formulir janji temu ---------- */
const form = document.querySelector("[data-book-form]");
const dateInput = form && form.elements.date;
const timeSelect = form && form.elements.time;
const parseDate = (v) => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); };

function slotsFor(value) {
  if (!value) return [];
  const h = OFFICE_HOURS[parseDate(value).getDay()];
  if (!h || value < dateInput.min || value > dateInput.max) return [];
  const isToday = value === isoDate(now);
  const out = [];
  for (let m = toMin(h[0]); m <= toMin(h[1]) - LAST_SLOT_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (!isToday || m > nowMin + 30) out.push(m);
  }
  return out;
}

function fillTimes() {
  const keep = timeSelect.value;
  const slots = slotsFor(dateInput.value);
  if (!slots.length) {
    timeSelect.disabled = true;
    timeSelect.innerHTML = `<option value="">${dateInput.value ? t("noSlots") : t("pickDate")}</option>`;
    return;
  }
  timeSelect.disabled = false;
  timeSelect.innerHTML = `<option value="">${t("pickTime")}</option>` +
    slots.map((m) => `<option value="${fromMin(m)}">${fromMin(m)} ${TIMEZONE_LABEL}</option>`).join("");
  if (keep && slots.some((m) => fromMin(m) === keep)) timeSelect.value = keep;
}

function dateError() {
  const v = dateInput.value;
  if (!v) return t("dateErrEmpty");
  const d = parseDate(v).getDay();
  return OFFICE_HOURS[d] ? t("dateErrNoSlots") : t("dateErrClosed", { d: D[lang].days[d] });
}

if (form) {
  dateInput.min = isoDate(now);
  const max = new Date(now); max.setDate(max.getDate() + 60);
  dateInput.max = isoDate(max);

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
    if (name === "date") form.querySelector("[data-date-error]").textContent = dateError();
    return ok;
  };

  dateInput.addEventListener("change", () => {
    fillTimes();
    if (dateInput.value) check("date");
  });
  ["name", "phone", "email"].forEach((n) => {
    const el = form.elements[n];
    el.addEventListener("blur", () => check(n));
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("invalid")) check(n); });
  });
  timeSelect.addEventListener("change", () => check("time"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = ["name", "phone", "email", "date", "time"].map((n) => [n, check(n)]).find(([, ok]) => !ok);
    if (bad) { form.elements[bad[0]].focus(); return; }

    const f = form.elements;
    const L = D[lang].msg;
    const tanggal = parseDate(dateInput.value).toLocaleDateString(D[lang].locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const lines = [
      L[0], "",
      `${L[1]}: ${f.name.value.trim()}`,
      `${L[2]}: ${f.phone.value.trim()}`,
      f.email.value.trim() ? `${L[3]}: ${f.email.value.trim()}` : null,
      `${L[4]}: ${f.need.options[f.need.selectedIndex].text}`,
      `${L[5]}: ${tanggal}`,
      `${L[6]}: ${f.time.value} ${TIMEZONE_LABEL}`,
      f.notes.value.trim() ? `${L[7]}: ${f.notes.value.trim()}` : null,
      "", L[8]
    ].filter((l) => l !== null);

    window.open(`https://wa.me/${OFFICE_WA}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
    form.querySelector(".form-success").hidden = false;
  });
}

/* ---------- Pilihan bahasa ---------- */
const switcher = document.querySelector("[data-lang-switch]");
function setLang(next, remember) {
  lang = next === "en" ? "en" : "id";
  document.documentElement.lang = lang;
  applyStatic();
  renderHours();
  if (form) {
    fillTimes();
    form.querySelector("[data-date-error]").textContent = dateError();
  }
  if (switcher) switcher.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  if (remember) { try { localStorage.setItem("lang", lang); } catch (e) { /* abaikan */ } }
}
if (switcher) switcher.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) setLang(b.dataset.lang, true);
});

// Urutan: ?lang=en di alamat → pilihan tersimpan → DEFAULT_LANG
let initial = DEFAULT_LANG;
try { initial = localStorage.getItem("lang") || initial; } catch (e) { /* abaikan */ }
const param = new URLSearchParams(location.search).get("lang");
if (param) initial = param;
setLang(initial, false);

/* ---------- Tautan WhatsApp dan tahun ---------- */
document.querySelectorAll("[data-wa-link]").forEach((a) => (a.href = `https://wa.me/${OFFICE_WA}`));
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = now.getFullYear()));
