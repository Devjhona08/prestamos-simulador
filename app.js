// --- PWA register ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// --- Helpers ---
const $ = (id) => document.getElementById(id);

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    n
  );

const toNumber = (value) => {
  if (!value) return NaN;
  const v = value.toString().trim().replace(/\s/g, "").replace(/,/g, ".");
  return Number(v);
};

function loanMonthlyPayment(P, monthlyRate, n) {
  if (n <= 0) return NaN;
  if (monthlyRate === 0) return P / n;
  const pow = Math.pow(1 + monthlyRate, n);
  return (P * monthlyRate * pow) / (pow - 1);
}

function buildSchedule(P, monthlyRate, n, cuota) {
  let saldo = P;
  const rows = [];

  for (let i = 1; i <= n; i++) {
    const interes = saldo * monthlyRate;
    let amort = cuota - interes;

    // Ajuste final para evitar residuos por floating
    if (i === n) amort = saldo;

    saldo = Math.max(0, saldo - amort);

    rows.push({ mes: i, cuota, interes, amort, saldo });
  }
  return rows;
}

// --- UI ---
const btn = $("btnCalcular");
const spinner = $("btnSpinner");
const results = $("results");
const btnDetalle = $("btnDetalle");

const modalBack = $("modalBack");
const modalTitle = $("modalTitle");
const modalBody = $("modalBody");

let lastCalc = null;

// Asegura que el modal NUNCA aparezca al inicio
modalBack.classList.remove("show");

function setLoading(on) {
  spinner.style.display = on ? "inline-block" : "none";
  btn.disabled = on;
  btn.style.opacity = on ? ".85" : "1";
}

function showModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;

  modalBack.classList.add("show");
  modalBack.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // iOS fix
}

function hideModal() {
  modalBack.classList.remove("show");
  modalBack.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Eventos modal (con protección)
$("modalClose")?.addEventListener("click", hideModal);
$("modalOk")?.addEventListener("click", hideModal);

modalBack?.addEventListener("click", (e) => {
  if (e.target === modalBack) hideModal();
});

// Cerrar con ESC (desktop)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBack.classList.contains("show")) hideModal();
});

// Info
$("btnInfo")?.addEventListener("click", () => {
  showModal(
    "Cómo se calcula",
    `
    <p>Usa el método de <b>cuota fija</b> (amortización francesa).</p>
    <p><b>Cuota</b> = P · r · (1+r)^n / ((1+r)^n − 1)</p>
    <p>Si el interés es 0%, entonces cuota = P / n.</p>
  `
  );
});

// Calcular con Enter
["monto", "interes", "meses"].forEach((id) => {
  $(id)?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
});

btn?.addEventListener("click", async () => {
  const P = toNumber($("monto").value);
  const ratePct = toNumber($("interes").value);
  const n = parseInt($("meses").value, 10);

  // Validación
  if (
    !isFinite(P) ||
    P <= 0 ||
    !isFinite(ratePct) ||
    ratePct < 0 ||
    !Number.isFinite(n) ||
    n <= 0
  ) {
    showModal(
      "Datos inválidos",
      `<p>Revisa:</p>
       <ul>
         <li>Monto &gt; 0</li>
         <li>Interés mensual &ge; 0</li>
         <li>Meses &gt; 0</li>
       </ul>`
    );
    return;
  }

  setLoading(true);
  await new Promise((r) => setTimeout(r, 450));

  const r = ratePct / 100; // mensual
  const cuota = loanMonthlyPayment(P, r, n);

  const schedule = buildSchedule(P, r, n, cuota);
  const totalPagado = schedule.reduce((a, x) => a + x.cuota, 0);
  const interesTotal = schedule.reduce((a, x) => a + x.interes, 0);

  $("cuota").textContent = fmtMoney(cuota);
  $("total").textContent = fmtMoney(totalPagado);
  $("interesTotal").textContent = fmtMoney(interesTotal);

  results.hidden = false;

  lastCalc = { P, r, n, cuota, schedule, totalPagado, interesTotal };
  btnDetalle.disabled = false;

  setLoading(false);
});

// Detalle SOLO cuando hay resultados
btnDetalle?.addEventListener("click", () => {
  if (!lastCalc) {
    showModal("Aún no hay resultados", "<p>Primero calcula un préstamo.</p>");
    return;
  }

  const rows = lastCalc.schedule
    .map(
      (x) => `
      <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid rgba(230,230,238,.7)">
        <div style="color:#6b6f76; white-space:nowrap">Mes ${x.mes}</div>
        <div style="text-align:right; font-weight:800">
          ${fmtMoney(x.cuota)}<br/>
          <span style="font-weight:500; color:#6b6f76; font-size:12px">
            Int: ${fmtMoney(x.interes)} · Amort: ${fmtMoney(
        x.amort
      )} · Saldo: ${fmtMoney(x.saldo)}
          </span>
        </div>
      </div>
    `
    )
    .join("");

  showModal("Detalle por mes", rows || "<p>Sin datos</p>");
});
