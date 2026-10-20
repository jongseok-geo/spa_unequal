"use strict";
const COLORS = ["#fff2cc", "#fedb8a", "#f7a45a", "#e76839", "#a9262b"];
const MISSING_COLOR = "#cbd1d8";
const map = L.map("map", { zoomControl: true, preferCanvas: true });
map.setView([36.2, 127.8], 7);
L.control.scale({ imperial: false }).addTo(map);
let shapes = null;
let stats = null;
let current = null;
const buttonGroup = document.getElementById("indicator-buttons");
let selectedIndicator = "YOUTH_RATE_2025";
const fmt = (number) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(number);
function classIndex(value, breaks) {
  if (value === null || value === undefined || !Number.isFinite(value)) return -1;
  const i = breaks.findIndex(boundary => value <= boundary);
  return i === -1 ? breaks.length - 1 : i;
}
function drawLegend(indicator) {
  const legend = document.getElementById("legend");
  legend.replaceChildren();
  const b = indicator.breaks;
  for (let i = 0; i < b.length; i++) {
    const item = document.createElement("div");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = COLORS[i];
    const label = document.createElement("span");
    label.textContent = i === 0 ? `≤ ${fmt(b[i])}` : `${fmt(b[i-1])} 초과 ~ ${fmt(b[i])} 이하`;
    item.append(swatch, label);
    legend.append(item);
  }
  const missing = document.createElement("div");
  missing.className = "legend-item";
  missing.innerHTML = `<span class="swatch" style="background:${MISSING_COLOR}"></span><span>자료 없음 (NULL)</span>`;
  legend.append(missing);
}
function draw() {
  current = stats.indicators.find(item => item.key === selectedIndicator);
  if (!current) return;
  document.getElementById("meta").textContent = `${current.year} · ${current.unit}`;
  document.getElementById("coverage").textContent = `자료 있음 ${current.available}개 / 결측 ${current.missing}개` + ((selectedIndicator === "GRDP_2022" || selectedIndicator === "EMPLOYEES_2024") ? " (시 단위 통합 기준)" : "");
  drawLegend(current);
  if (shapes) map.removeLayer(shapes);
  const displayFeatures = (selectedIndicator === "GRDP_2022" || selectedIndicator === "EMPLOYEES_2024") ? window.cityFeatures : window.geoFeatures;
  shapes = L.geoJSON(displayFeatures, {
    style(feature) {
      const record = feature.properties.CITY_GROUP ? stats.city_records[String(feature.properties.SIGUNGU_CD)] : stats.records[String(feature.properties.SIGUNGU_CD)];
      const value = record ? record[current.key] : null;
      const index = classIndex(value, current.breaks);
      return { color: "#ffffff", weight: 0.75, fillOpacity: 0.88, fillColor: index < 0 ? MISSING_COLOR : COLORS[index] };
    },
    onEachFeature(feature, layer) {
      layer.on("click", event => {
        const p = feature.properties;
        const record = p.CITY_GROUP ? stats.city_records[String(p.SIGUNGU_CD)] : stats.records[String(p.SIGUNGU_CD)];
        const value = record ? record[current.key] : null;
        const name = `${p.SIDO_NM} ${p.SIGUNGU_NM}`;
        const valText = value === null || value === undefined ? "자료 없음 (NULL)" : `${fmt(value)} ${current.unit}`;
        const scopeText = p.CITY_GROUP ? "<div>시 전체 기준 (일반구 통합)</div>" : "";
        L.popup().setLatLng(event.latlng).setContent(`<strong>${name}</strong><div>${current.name}</div><strong>${valText}</strong>${scopeText}<div>${current.year} 기준</div>`).openOn(map);
      });
      layer.on("mouseover", () => layer.setStyle({ weight: 1.7, color: "#34475c" }));
      layer.on("mouseout", () => shapes.resetStyle(layer));
    }
  }).addTo(map);
}
Promise.all([
  fetch("data/korea_50m.geojson").then(r => { if (!r.ok) throw Error("GeoJSON 파일을 찾을 수 없습니다."); return r.json(); }),
  fetch("data/korea_city_merged.geojson").then(r => { if (!r.ok) throw Error("통합 경계 파일을 찾을 수 없습니다."); return r.json(); }),
  fetch("data/statistics_map.json").then(r => { if (!r.ok) throw Error("통계 파일을 찾을 수 없습니다."); return r.json(); })
]).then(([geo, cityGeo, stat]) => {
  window.cityFeatures = cityGeo;
  window.geoFeatures = geo;
  stats = stat;
  stats.indicators.forEach(indicator => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "indicator-button";
    button.dataset.indicator = indicator.key;
    button.textContent = `${indicator.name} (${indicator.year})`;
    button.setAttribute("aria-pressed", String(indicator.key === selectedIndicator));
    button.classList.toggle("active", indicator.key === selectedIndicator);
    button.addEventListener("click", () => {
      selectedIndicator = indicator.key;
      buttonGroup.querySelectorAll("button").forEach(item => {
        const active = item.dataset.indicator === selectedIndicator;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      draw();
    });
    buttonGroup.append(button);
  });

  draw();
  map.fitBounds(shapes.getBounds(), { padding: [12, 12] });
  document.getElementById("loading").remove();
}).catch(error => { document.getElementById("loading").textContent = `불러오기 실패: ${error.message} · Live Server로 실행해 주세요.`; });
document.getElementById("reset").addEventListener("click", () => { if (shapes) map.fitBounds(shapes.getBounds(), { padding: [12, 12] }); });
