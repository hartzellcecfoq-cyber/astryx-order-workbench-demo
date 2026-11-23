const observations = [
  { id: "OBS-2481", target: "土星环 · 外缘视场", station: "阿塔卡马站", type: "光谱峰值", priority: true, done: false, time: "22:46", notes: "外缘窄带光谱出现瞬时峰值。复查相邻曝光的信号，并与同一视场的背景谱线对照。" },
  { id: "OBS-2480", target: "M31 · 仙女座星系", station: "莫纳克亚站", type: "图像配准", priority: false, done: false, time: "21:32", notes: "第二组图像的星点配准存在轻微偏移。可用同夜的参考星图重新匹配。" },
  { id: "OBS-2479", target: "NGC 1300 · 棒旋星系", station: "加纳利站", type: "设备校准", priority: true, done: false, time: "20:58", notes: "跟踪镜的校准偏差高于本次观测阈值。核对定标帧与重新对星后的结果。" },
  { id: "OBS-2478", target: "M42 · 猎户座大星云", station: "阿塔卡马站", type: "帧间噪声", priority: false, done: true, time: "19:21", notes: "连续两帧发现固定像素噪声。已用同曝光条件的暗场帧复核。" },
  { id: "OBS-2477", target: "月面 · 北部撞击坑", station: "莫纳克亚站", type: "曝光核对", priority: false, done: false, time: "18:42", notes: "高亮边缘接近饱和。请并排查看短曝光对照帧。" },
  { id: "OBS-2476", target: "M45 · 昴星团", station: "加纳利站", type: "帧间噪声", priority: false, done: true, time: "17:26", notes: "孤立亮点未在相邻曝光中出现，已标记为瞬态噪声。" },
  { id: "OBS-2475", target: "木星 · 大红斑区域", station: "阿塔卡马站", type: "时间校验", priority: true, done: false, time: "16:08", notes: "仪器时间戳与测站时钟存在偏差。请核对该批次的 UTC 校准记录。" },
  { id: "OBS-2474", target: "M51 · 涡状星系", station: "加纳利站", type: "观测重采", priority: false, done: false, time: "14:55", notes: "短时云层遮挡导致两张观测帧有效区域不足。可与下一观测窗口的图像拼接复核。" },
];

const recordedStates = "nightwatch-observations-v1";
try {
  const saved = JSON.parse(localStorage.getItem(recordedStates)) ?? {};
  for (const entry of observations) if (typeof saved[entry.id] === "boolean") entry.done = saved[entry.id];
} catch {
  // Browsers that disable storage still support in-page interactions.
}

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const element = (name, text, className) => {
  const node = document.createElement(name);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const rows = $("#order-rows");
const search = $("#search");
const station = $("#channel-filter");
const drawer = $("#detail");
const exportButton = $("#export");
const statusText = entry => entry.done ? "已核验" : "待核验";
const stateFilter = {
  all: () => true,
  pending: entry => !entry.done,
  urgent: entry => entry.priority && !entry.done,
  done: entry => entry.done,
};
let filter = "all";
let opened;
let noticeTimeout;

function matches() {
  const query = search.value.trim().toLowerCase();
  return observations.filter(entry => stateFilter[filter](entry)
    && (!station.value || entry.station === station.value)
    && [entry.id, entry.target, entry.type].some(value => value.toLowerCase().includes(query)));
}

function renderLog() {
  const shown = matches();
  rows.replaceChildren(...shown.map(entry => {
    const row = element("tr");
    const identity = element("td", null, "identity");
    identity.append(element("strong", entry.id), element("span", entry.target));
    const state = element("td", null, "status-cell");
    state.append(element("span", statusText(entry), entry.done ? "status done" : "status"));
    const action = element("button", "查看详情", "row-action");
    action.type = "button";
    action.dataset.id = entry.id;
    action.setAttribute("aria-label", `查看 ${entry.id} 详情`);
    const controls = element("td", null, "row-controls");
    controls.append(action);
    row.append(identity, element("td", entry.station), element("td", entry.type),
      element("td", entry.priority ? "高" : "普通", entry.priority ? "priority high" : "priority"), state,
      element("td", `${entry.time} UTC`, "queue-time"), controls);
    return row;
  }));
  const pending = observations.filter(stateFilter.pending).length;
  $("#nav-count").textContent = pending;
  $("#pending-value").textContent = pending;
  $("#urgent-value").textContent = `${observations.filter(stateFilter.urgent).length} 条高优先级`;
  $("#queue-count").textContent = shown.length;
  $("#empty").hidden = shown.length > 0;
  exportButton.disabled = !shown.length;
  for (const button of $$("[data-filter]")) button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  for (const button of $$("[data-channel]")) button.setAttribute("aria-pressed", String(button.dataset.channel === station.value));
}

function updateDrawer(entry) {
  $("#detail-code").textContent = entry.id;
  $("#detail-title").textContent = entry.target;
  $("#detail-meta").replaceChildren(...[["测站", entry.station], ["事件类型", entry.type], ["记录时间", `${entry.time} UTC`], ["状态", statusText(entry)]].map(([title, value]) => {
    const container = element("div");
    container.append(element("dt", title), element("dd", value));
    return container;
  }));
  $("#detail-reason").textContent = entry.notes;
  $("#change-status").textContent = entry.done ? "恢复待核验" : "标记为已核验";
}

function announce(message) {
  const notice = $("#notice");
  clearTimeout(noticeTimeout);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimeout = setTimeout(() => { notice.hidden = true; }, 2300);
}

function navigate() {
  const target = location.hash === "#channels" || location.hash === "#exceptions" ? location.hash : "#overview";
  for (const link of $$(".nav-link")) {
    if (link.hash === target) {
      link.setAttribute("aria-current", "location");
      $("#section-label").textContent = link.textContent.trim().replace(/\d+$/, "");
    } else link.removeAttribute("aria-current");
  }
}

rows.addEventListener("click", event => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  opened = observations.find(entry => entry.id === button.dataset.id);
  updateDrawer(opened);
  drawer.showModal();
});
$("#close-detail").addEventListener("click", () => drawer.close());
drawer.addEventListener("click", event => { if (event.target === drawer) drawer.close(); });
drawer.addEventListener("close", () => {
  if (opened) ($(`[data-id="${opened.id}"]`) ?? search).focus({ preventScroll: true });
  opened = undefined;
});
$("#change-status").addEventListener("click", () => {
  if (!opened) return;
  opened.done = !opened.done;
  try {
    localStorage.setItem(recordedStates, JSON.stringify(Object.fromEntries(observations.map(entry => [entry.id, entry.done]))));
  } catch {
    // The current view still reflects the change when persistence is unavailable.
  }
  updateDrawer(opened);
  renderLog();
  announce(`${opened.id} ${statusText(opened)}`);
});

search.addEventListener("input", renderLog);
station.addEventListener("change", renderLog);
for (const button of $$("[data-filter]")) button.addEventListener("click", () => { filter = button.dataset.filter; renderLog(); });
for (const button of $$("[data-channel]")) button.addEventListener("click", () => {
  station.value = station.value === button.dataset.channel ? "" : button.dataset.channel;
  filter = "all";
  renderLog();
  location.hash = "exceptions";
});
window.addEventListener("hashchange", navigate);
document.addEventListener("keydown", event => {
  if (event.key !== "/" || drawer.open || event.target.matches("input, textarea, select, [contenteditable]")) return;
  event.preventDefault();
  search.focus();
});

exportButton.addEventListener("click", () => {
  const rows = [["编号", "目标", "测站", "事件类型", "优先级", "状态", "时间 UTC"], ...matches().map(entry => [
    entry.id, entry.target, entry.station, entry.type, entry.priority ? "高" : "普通", statusText(entry), `2026-11-23 ${entry.time}`,
  ])];
  const csv = rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = element("a");
  link.href = url;
  link.download = "深空观测日志.csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`已导出 ${rows.length - 1} 条观测记录`);
});

const weekly = [4740, 6180, 5270, 6990, 6510, 7470, 8426];
const monthly = [3560, 4100, 3900, 5050, 4640, 5440, 4990, 6020, 5650, 6400, 6090, 6750, 6210, 7650, 7080, 8060, 7110, 8060, 7000, 7910, 6950, 7670, 6910, ...weekly];
const number = new Intl.NumberFormat("zh-CN");
const plot = $("#trend-canvas");
const tooltip = $("#trend-tooltip");
const color = { frames: "#d0fb72", valid: "#6baaff", grid: "#2a3748", muted: "#a3b1c4" };
let range = 7;
let hover = null;

function canvasContext(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function trace(ctx, points) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) {
    const [x, y] = points[index];
    const [beforeX, beforeY] = points[index - 1];
    const mid = (x + beforeX) / 2;
    ctx.bezierCurveTo(mid, beforeY, mid, y, x, y);
  }
}

function drawPlot() {
  const { context: ctx, width, height } = canvasContext(plot);
  if (width < 70) return;
  const frames = range === 7 ? weekly : monthly;
  const valid = frames.map((value, index) => {
    const rate = index === frames.length - 1 ? .976 : index === frames.length - 2 ? .962 : .84 + (index % 3) * .035;
    return Math.round(value * rate);
  });
  const edges = { left: 35, right: width - 14, top: 13, bottom: height - 22 };
  const x = index => edges.left + index * (edges.right - edges.left) / (frames.length - 1);
  const y = value => edges.bottom - value / 10000 * (edges.bottom - edges.top);
  const date = index => new Date(Date.UTC(2026, 10, 24 - frames.length + index)).toISOString().slice(5, 10);
  ctx.font = "11px Segoe UI, sans-serif";
  ctx.fillStyle = color.muted;
  ctx.textAlign = "right";
  for (const value of [0, 2500, 5000, 7500, 10000]) {
    const at = y(value);
    ctx.fillText(value ? `${value / 1000}k` : "0", 26, at + 3);
    ctx.strokeStyle = color.grid;
    ctx.beginPath(); ctx.moveTo(edges.left, at); ctx.lineTo(edges.right, at); ctx.stroke();
  }
  const indexes = range === 7 && width >= 425 ? [0, 1, 2, 3, 4, 5, 6] : [0, Math.round((frames.length - 1) / 3), Math.round((frames.length - 1) * 2 / 3), frames.length - 1];
  for (const index of indexes) {
    ctx.textAlign = index === 0 ? "left" : index === frames.length - 1 ? "right" : "center";
    ctx.fillText(date(index), x(index), height - 5);
  }
  const points = frames.map((value, index) => [x(index), y(value)]);
  const fill = ctx.createLinearGradient(0, edges.top, 0, edges.bottom);
  fill.addColorStop(0, "#cfff7835");
  fill.addColorStop(1, "#cfff7800");
  ctx.beginPath(); trace(ctx, points); ctx.lineTo(edges.right, edges.bottom); ctx.lineTo(edges.left, edges.bottom); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.valid; ctx.beginPath(); trace(ctx, valid.map((value, index) => [x(index), y(value)])); ctx.stroke();
  ctx.strokeStyle = color.frames; ctx.beginPath(); trace(ctx, points); ctx.stroke();
  ctx.fillStyle = color.frames; ctx.beginPath(); ctx.arc(edges.right, y(frames.at(-1)), 3, 0, Math.PI * 2); ctx.fill();
  plot.setAttribute("aria-label", `近 ${range} 天观测趋势。${date(frames.length - 1)} 采集 ${number.format(frames.at(-1))} 帧，有效 ${number.format(valid.at(-1))} 帧。`);

  if (hover == null) { tooltip.hidden = true; return; }
  const index = Math.max(0, Math.min(frames.length - 1, Math.round((hover - edges.left) / (edges.right - edges.left) * (frames.length - 1))));
  ctx.strokeStyle = "#8d9fba"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath();
  ctx.moveTo(x(index), edges.top); ctx.lineTo(x(index), edges.bottom); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = color.frames; ctx.beginPath(); ctx.arc(x(index), y(frames[index]), 4, 0, Math.PI * 2); ctx.fill();
  tooltip.replaceChildren(element("strong", date(index)), element("div", `采集 ${number.format(frames[index])}`), element("div", `有效 ${number.format(valid[index])}`));
  tooltip.style.left = `${Math.max(0, Math.min(x(index) + 7, width - 122))}px`;
  tooltip.hidden = false;
}

function drawSparks() {
  const values = { volume: [4, 5, 4.7, 5.8, 5.5, 6.4, 7.4], quality: [4, 4.5, 4.2, 5.8, 5.2, 6.4, 6.7], speed: [8, 7.1, 7.8, 5.8, 6.3, 4.9, 4.2] };
  for (const canvas of $$(".spark")) {
    const { context, width, height } = canvasContext(canvas);
    const data = values[canvas.dataset.trend];
    context.lineWidth = 1.55;
    context.strokeStyle = canvas.dataset.trend === "speed" ? color.valid : color.frames;
    context.beginPath();
    trace(context, data.map((value, index) => [2 + index / (data.length - 1) * (width - 4), height - value * height / 10]));
    context.stroke();
  }
}

for (const button of $$("[data-range]")) button.addEventListener("click", () => {
  range = Number(button.dataset.range);
  for (const item of $$("[data-range]")) item.setAttribute("aria-pressed", String(button === item));
  hover = null;
  drawPlot();
});
plot.addEventListener("pointermove", event => { hover = event.clientX - plot.getBoundingClientRect().left; drawPlot(); });
plot.addEventListener("pointerleave", () => { hover = null; drawPlot(); });
const resize = new ResizeObserver(() => { drawPlot(); drawSparks(); });
resize.observe(plot.parentElement);
resize.observe($(".metrics"));
renderLog();
navigate();
