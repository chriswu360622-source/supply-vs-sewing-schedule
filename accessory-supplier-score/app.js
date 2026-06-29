const rows = (window.DASHBOARD_DATA && window.DASHBOARD_DATA.rows) || [];

const state = {
  month: "All",
  factory: "All",
  supplier: "All",
  material: "All",
  issueGroup: "All",
};

const colors = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  lime: "#7ad10c",
  blue: "#2563eb",
  slate: "#64748b",
  paleBar: "#cbd5e1",
};

const $ = (id) => document.getElementById(id);
const fmtInt = (value) => Math.round(value || 0).toLocaleString("en-US");
const pct = (value, digits = 2) => `${(Number.isFinite(value) ? value : 0).toFixed(digits)}%`;

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function fillSelect(select, values) {
  const current = select.value || "All";
  select.innerHTML = ["All", ...values].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = [...values, "All"].includes(current) ? current : "All";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function filteredRows(options = {}) {
  return rows.filter((row) => {
    if (state.month !== "All" && row.Month !== state.month) return false;
    if (state.factory !== "All" && row.Factory !== state.factory) return false;
    if (!options.ignoreSupplier && state.supplier !== "All" && row.Supplier !== state.supplier) return false;
    if (state.material !== "All" && row["Material Type"] !== state.material) return false;
    if (state.issueGroup !== "All" && row["Issue Group"] !== state.issueGroup) return false;
    return true;
  });
}

function groupBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || "Unspecified";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

function sum(items, field) {
  return items.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function initControls() {
  const months = uniq(rows.map((row) => row.Month));
  $("monthPills").innerHTML = ["All", ...months]
    .map((month) => `<button type="button" data-month="${escapeHtml(month)}">${month === "All" ? "All" : month.replace("2026-", "")}</button>`)
    .join("");

  $("monthPills").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-month]");
    if (!button) return;
    state.month = button.dataset.month;
    render();
  });

  fillSelect($("factoryFilter"), uniq(rows.map((row) => row.Factory)));
  fillSelect($("supplierFilter"), uniq(rows.map((row) => row.Supplier)));
  fillSelect($("materialFilter"), uniq(rows.map((row) => row["Material Type"])));

  $("factoryFilter").addEventListener("change", (event) => {
    state.factory = event.target.value;
    render();
  });
  $("supplierFilter").addEventListener("change", (event) => {
    state.supplier = event.target.value;
    render();
  });
  $("materialFilter").addEventListener("change", (event) => {
    state.material = event.target.value;
    render();
  });
  $("supplierScores").addEventListener("click", (event) => {
    const row = event.target.closest("[data-supplier]");
    if (!row) return;
    state.supplier = state.supplier === row.dataset.supplier ? "All" : row.dataset.supplier;
    $("supplierFilter").value = state.supplier;
    render();
  });
  $("issueLegend").addEventListener("click", (event) => {
    const row = event.target.closest("[data-issue-group]");
    if (!row) return;
    state.issueGroup = state.issueGroup === row.dataset.issueGroup ? "All" : row.dataset.issueGroup;
    render();
  });
  $("issueDonut").addEventListener("click", (event) => {
    const segment = event.target.closest("[data-issue-group]");
    if (!segment) return;
    state.issueGroup = state.issueGroup === segment.dataset.issueGroup ? "All" : segment.dataset.issueGroup;
    render();
  });
  $("materialLegend").addEventListener("click", (event) => {
    const row = event.target.closest("[data-material]");
    if (!row || row.dataset.material === "Other") return;
    state.material = state.material === row.dataset.material ? "All" : row.dataset.material;
    $("materialFilter").value = state.material;
    render();
  });
  $("materialDonut").addEventListener("click", (event) => {
    const segment = event.target.closest("[data-material]");
    if (!segment || segment.dataset.material === "Other") return;
    state.material = state.material === segment.dataset.material ? "All" : segment.dataset.material;
    $("materialFilter").value = state.material;
    render();
  });
  $("trendChart").addEventListener("click", (event) => {
    const monthPoint = event.target.closest("[data-month]");
    if (!monthPoint) return;
    state.month = state.month === monthPoint.dataset.month ? "All" : monthPoint.dataset.month;
    render();
  });
  $("resetFilters").addEventListener("click", () => {
    state.month = "All";
    state.factory = "All";
    state.supplier = "All";
    state.material = "All";
    state.issueGroup = "All";
    $("factoryFilter").value = "All";
    $("supplierFilter").value = "All";
    $("materialFilter").value = "All";
    render();
  });

  if (months.length) state.month = months[months.length - 1];
}

function renderKpis(data) {
  const total = data.length;
  const fails = data.filter((row) => row["Inspection Result"] === "Fail").length;
  const passRate = total ? ((total - fails) / total) * 100 : 0;
  const failRate = total ? (fails / total) * 100 : 0;
  $("kpiTotal").textContent = fmtInt(total);
  $("kpiFail").textContent = fmtInt(fails);
  $("kpiPassRate").textContent = pct(passRate, 2);
  $("kpiFailRate").textContent = pct(failRate, 2);
}

function renderSupplierScores(data) {
  const groups = [...groupBy(data, (row) => row.Supplier).entries()].map(([supplier, items]) => {
    const fails = items.filter((row) => row["Inspection Result"] === "Fail").length;
    const score = items.length ? ((items.length - fails) / items.length) * 100 : 0;
    return { supplier, rows: items.length, fails, score };
  });
  const risky = groups
    .filter((row) => row.rows > 0)
    .sort((a, b) => a.score - b.score || b.fails - a.fails || b.rows - a.rows);

  $("supplierCount").textContent = `${fmtInt(risky.length)} suppliers`;
  $("supplierScores").style.gridTemplateColumns = "";
  $("supplierScores").innerHTML = risky
    .map((row, index) => {
      const width = Math.max(3, Math.min(100, row.score));
      const color = row.score < 99 ? colors.red : row.fails > 0 ? colors.orange : colors.green;
      const active = state.supplier === row.supplier ? " active" : "";
      return `
        <button class="score-row${active}" type="button" data-supplier="${escapeHtml(row.supplier)}" aria-pressed="${state.supplier === row.supplier}">
          <span class="supplier-name">${index + 1}. ${escapeHtml(row.supplier)}</span>
          <span class="supplier-score">${pct(row.score, 2)} (${fmtInt(row.fails)} fails)</span>
          <div class="track"><div class="bar" style="width:${width}%; background:${color}"></div></div>
        </button>
      `;
    })
    .join("");
  requestAnimationFrame(sizeSupplierList);
}

function sizeSupplierList() {
  const panel = document.querySelector(".supplier-panel");
  const list = $("supplierScores");
  if (!panel || !list) return;
  const panelBox = panel.getBoundingClientRect();
  const listBox = list.getBoundingClientRect();
  const available = Math.max(220, panelBox.bottom - listBox.top - 2);
  list.style.maxHeight = `${Math.floor(available)}px`;
}

function renderIssueMix(data) {
  const failures = data.filter((row) => row["Inspection Result"] === "Fail");
  const buckets = [
    ["Quality Defect", failures.filter((row) => row["Issue Group"] === "Quality Defect").length, colors.red],
    ["Operational Exception", failures.filter((row) => row["Issue Group"] === "Operational Exception").length, colors.amber],
    ["Unspecified", failures.filter((row) => row["Issue Group"] === "Unspecified").length, colors.slate],
  ];
  const total = buckets.reduce((value, [, count]) => value + count, 0);
  let offset = 25;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const circles = buckets
    .map(([label, count, color]) => {
      const length = total ? (count / total) * circumference : 0;
      const activeClass = state.issueGroup === label ? " active" : "";
      const circle = `<circle class="donut-segment${activeClass}" data-issue-group="${escapeHtml(label)}" r="${radius}" cx="75" cy="75" fill="transparent" stroke="${color}" stroke-width="28" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="-${offset}" transform="rotate(-90 75 75)"></circle>`;
      offset += length;
      return circle;
    })
    .join("");
  $("issueDonut").innerHTML = `
    <svg viewBox="0 0 150 150" role="img" aria-label="Failure reason mix">
      <circle r="${radius}" cx="75" cy="75" fill="transparent" stroke="#e2e8f0" stroke-width="28"></circle>
      ${circles}
      <text x="75" y="79" text-anchor="middle" font-size="18" font-weight="800" fill="#0f172a">${fmtInt(total)}</text>
    </svg>
  `;
  $("issueLegend").innerHTML = buckets
    .map(([label, count, color]) => {
      const active = state.issueGroup === label ? " active" : "";
      return `<button class="legend-row${active}" type="button" data-issue-group="${escapeHtml(label)}" style="--dot:${color}" aria-pressed="${state.issueGroup === label}"><span>${escapeHtml(label)}</span><strong>${fmtInt(count)}</strong></button>`;
    })
    .join("");

  const reasons = [...groupBy(failures, (row) => row.Reason).entries()].map(([reason, items]) => ({ reason, count: items.length }));
  reasons.sort((a, b) => b.count - a.count);
  $("topReason").textContent = reasons.length ? `Top raw reason: ${reasons[0].reason}` : "Top raw reason: none";
}

function renderDonut(targetId, legendId, items, options = {}) {
  const total = items.reduce((sumValue, item) => sumValue + item.count, 0);
  let offset = 25;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const circles = items
    .map((item) => {
      const length = total ? (item.count / total) * circumference : 0;
      const active = options.activeValue === item.key ? " active" : "";
      const attr = options.dataAttr ? `${options.dataAttr}="${escapeHtml(item.key)}"` : "";
      const circle = `<circle class="donut-segment${active}" ${attr} r="${radius}" cx="75" cy="75" fill="transparent" stroke="${item.color}" stroke-width="28" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="-${offset}" transform="rotate(-90 75 75)"></circle>`;
      offset += length;
      return circle;
    })
    .join("");
  $(targetId).innerHTML = `
    <svg viewBox="0 0 150 150" role="img" aria-label="${escapeHtml(options.label || "Donut chart")}">
      <circle r="${radius}" cx="75" cy="75" fill="transparent" stroke="#e2e8f0" stroke-width="28"></circle>
      ${circles}
      <text x="75" y="79" text-anchor="middle" font-size="18" font-weight="800" fill="#0f172a">${fmtInt(total)}</text>
    </svg>
  `;
  $(legendId).innerHTML = items
    .map((item) => {
      const active = options.activeValue === item.key ? " active" : "";
      const attr = options.dataAttr ? `${options.dataAttr}="${escapeHtml(item.key)}"` : "";
      return `<button class="legend-row${active}" type="button" ${attr} style="--dot:${item.color}" aria-pressed="${options.activeValue === item.key}"><span>${escapeHtml(item.label)}</span><strong>${fmtInt(item.count)}</strong></button>`;
    })
    .join("");
}

function renderMaterialMix(data) {
  const failures = data.filter((row) => row["Inspection Result"] === "Fail");
  const palette = [colors.red, colors.orange, colors.amber, colors.blue, colors.green, colors.slate];
  const groups = [...groupBy(failures, (row) => row["Material Type"] || "Unspecified").entries()]
    .map(([material, items]) => ({ key: material, label: material, count: items.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const top = groups.slice(0, 5);
  const otherCount = groups.slice(5).reduce((sumValue, item) => sumValue + item.count, 0);
  const items = [...top, ...(otherCount ? [{ key: "Other", label: "Other", count: otherCount }] : [])].map((item, index) => ({
    ...item,
    color: palette[index % palette.length],
  }));
  renderDonut("materialDonut", "materialLegend", items, {
    label: "Fail by material type",
    dataAttr: "data-material",
    activeValue: state.material,
  });
  $("topMaterial").textContent = groups.length ? `Top fail material: ${groups[0].label}` : "Top fail material: none";
}

function monthlySummary() {
  const months = uniq(rows.map((row) => row.Month));
  return months.map((month) => {
    const items = rows.filter((row) => row.Month === month);
    const fails = items.filter((row) => row["Inspection Result"] === "Fail").length;
    return {
      month,
      rows: items.length,
      fails,
      failRate: items.length ? (fails / items.length) * 100 : 0,
      passRate: items.length ? ((items.length - fails) / items.length) * 100 : 0,
    };
  });
}

function renderTrend() {
  const monthly = monthlySummary();
  const width = 900;
  const height = 310;
  const pad = { left: 38, right: 22, top: 24, bottom: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxRows = Math.max(1, ...monthly.map((row) => row.rows));
  const minRate = Math.min(...monthly.map((row) => row.passRate));
  const maxRate = Math.max(...monthly.map((row) => row.passRate));
  const rateFloor = Math.max(0, Math.floor(minRate - 0.3));
  const rateCeiling = Math.min(100, Math.ceil(maxRate + 0.3));
  const rateRange = Math.max(0.1, rateCeiling - rateFloor);
  const gap = chartW / Math.max(1, monthly.length);
  const barW = Math.max(20, gap * 0.28);
  const points = monthly.map((row, index) => {
    const x = pad.left + gap * index + gap / 2;
    const y = pad.top + chartH - ((row.passRate - rateFloor) / rateRange) * chartH;
    return { x, y, row };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const bars = points
    .map((point) => {
      const h = (point.row.rows / maxRows) * chartH;
      const y = pad.top + chartH - h;
      const active = state.month === point.row.month ? " active" : "";
      return `
        <rect class="trend-hit${active}" data-month="${escapeHtml(point.row.month)}" x="${point.x - gap / 2 + 6}" y="${pad.top}" width="${gap - 12}" height="${chartH}" rx="10" fill="transparent"></rect>
        <rect class="trend-bar${active}" data-month="${escapeHtml(point.row.month)}" x="${point.x - barW / 2}" y="${y}" width="${barW}" height="${h}" rx="8" fill="${colors.paleBar}"></rect>
        <text x="${point.x}" y="${height - 14}" text-anchor="middle" font-size="11" fill="#64748b">${point.row.month.replace("2026-", "2026/")}</text>
      `;
    })
    .join("");
  const dots = points.map((point) => `<circle class="trend-dot${state.month === point.row.month ? " active" : ""}" data-month="${escapeHtml(point.row.month)}" cx="${point.x}" cy="${point.y}" r="6" fill="${colors.red}"></circle>`).join("");
  const labels = points
    .map((point) => {
      const h = (point.row.rows / maxRows) * chartH;
      const barTop = pad.top + chartH - h;
      const failY = h > 24 ? barTop + 16 : Math.max(14, barTop - 6);
      const rateY = Math.max(14, point.y - 14);
      const labelStroke = `stroke="#ffffff" stroke-width="4" paint-order="stroke"`;
      return `
        <text x="${point.x}" y="${rateY}" text-anchor="middle" font-size="11" font-weight="800" fill="#475569" ${labelStroke}>${pct(point.row.passRate, 2)}</text>
        <text x="${point.x}" y="${failY}" text-anchor="middle" font-size="10" font-weight="800" fill="${colors.red}" ${labelStroke}>${fmtInt(point.row.fails)}</text>
      `;
    })
    .join("");

  $("trendChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none">
      <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${width - pad.right}" y2="${pad.top + chartH}" stroke="#cbd5e1" stroke-width="2"></line>
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#cbd5e1" stroke-width="2"></line>
      ${bars}
      <polyline points="${line}" fill="none" stroke="${colors.red}" stroke-width="3"></polyline>
      ${dots}
      ${labels}
    </svg>
  `;
}

function renderDetail(data) {
  const failures = data.filter((row) => row["Inspection Result"] === "Fail");
  $("detailCount").textContent = `${fmtInt(failures.length)} fail rows`;
  $("detailRows").innerHTML = failures
    .slice(0, 80)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row["SP#"])}</td>
          <td>${escapeHtml(row.Supplier)}</td>
          <td>${escapeHtml(row.Month)}</td>
          <td>${escapeHtml(row["Material Type"])}</td>
          <td>${escapeHtml(row["Issue Group"])} / ${escapeHtml(row.Reason)}</td>
          <td>${fmtInt(Number(row["Arrive Qty"]))}</td>
          <td>${escapeHtml(row.Inspector)}</td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  $("monthPills").querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.month === state.month);
  });
  const data = filteredRows();
  const supplierData = filteredRows({ ignoreSupplier: true });
  renderKpis(data);
  renderSupplierScores(supplierData);
  renderIssueMix(data);
  renderMaterialMix(data);
  renderTrend();
  renderDetail(data);
}

function init() {
  $("rowCount").textContent = `Rows: ${fmtInt(rows.length)}`;
  const months = uniq(rows.map((row) => row.Month));
  $("latestMonth").textContent = `Latest month: ${months[months.length - 1] || "--"}`;
  initControls();
  window.addEventListener("resize", sizeSupplierList);
  render();
}

init();
