const map=L.map('map',{zoomControl:true,attributionControl:false,preferCanvas:true,zoomSnap:.25});
const fields={region:'Regi',sido:'SIDO_NM',sigungu:'SIGUNGU_NM'};
const palette=['#197f68','#d48d47','#6a83c7','#bc6a84','#8b79bd','#77a852','#d0ae47','#5c9eb5','#b67850','#678b79','#bb839d','#95845e','#669e92','#a87cb0','#7f9a4e','#d0766e','#7083a6'];
const regionOrder=['수도권','강원권','충청권','호남권','영남권','제주권'];
let geoData,layer,mode='region',selectedLayer=null,colors=new Map(),bounds;

const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};
function getName(p){return String(p[fields[mode]]??'미분류')}
function makeColors(){const names=[...new Set(geoData.features.map(f=>getName(f.properties)))];if(mode==='region')names.sort((a,b)=>regionOrder.indexOf(a)-regionOrder.indexOf(b));else names.sort((a,b)=>a.localeCompare(b,'ko'));colors=new Map(names.map((name,i)=>[name,mode==='sigungu'?`hsl(${hash(name)%360}, 38%, 54%)`:palette[i%palette.length]]));document.getElementById('count').textContent=`${names.length}개 구분`;const el=document.getElementById('legend-items');el.replaceChildren();if(mode==='sigungu'){el.textContent='시·군·구별 색상 구분 · 지도에서 지역을 선택해 보세요';return}for(const name of names){const item=document.createElement('span');item.className='legenditem';const swatch=document.createElement('i');swatch.className='swatch';swatch.style.background=colors.get(name);const label=document.createElement('span');label.textContent=name;item.append(swatch,label);el.append(item)}}
function style(f){return{fillColor:colors.get(getName(f.properties)),fillOpacity:.94,color:'#fff',opacity:1,weight:0.85,stroke:true,lineJoin:'round'}}
function pick(f,l){
  l.on({
    mouseover(){if(l!==selectedLayer)l.setStyle({fillOpacity:.75})},
    mouseout(){if(l!==selectedLayer)l.setStyle(style(f))},
    click(e){
      if(selectedLayer&&selectedLayer!==l)selectedLayer.setStyle(style(selectedLayer.feature));
      selectedLayer=l;
      l.setStyle({color:'#173744',opacity:1,weight:2,stroke:true,fillOpacity:1});
      l.bringToFront();
      const p=f.properties;
      const popup=document.createElement('div');popup.className='region-popup';
      const heading=document.createElement('strong');heading.textContent=getName(p);
      const detail=document.createElement('span');detail.textContent=[p.Regi,p.SIDO_NM,p.SIGUNGU_NM].filter(Boolean).join(' · ');
      popup.append(heading,detail);
      L.popup({closeButton:true,autoPan:true,offset:[0,-8],maxWidth:290})
        .setLatLng(e.latlng).setContent(popup).openOn(map);
    }
  });
}
function render(){
  map.closePopup();
  if(layer)map.removeLayer(layer);
  selectedLayer=null;
  makeColors();
  layer=L.geoJSON(geoData,{style,onEachFeature:pick}).addTo(map);
  if(!bounds){bounds=layer.getBounds();map.fitBounds(bounds,{padding:[18,18]})}
}
map.on('popupclose',()=>{
  if(selectedLayer){selectedLayer.setStyle(style(selectedLayer.feature));selectedLayer=null}
});
function setMode(next){mode=next;document.querySelectorAll('.mode').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});render()}
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.getElementById('reset').addEventListener('click',()=>{map.closePopup();if(selectedLayer){selectedLayer.setStyle(style(selectedLayer.feature));selectedLayer=null}if(bounds)map.fitBounds(bounds,{padding:[18,18]})});
fetch('data/korea_50m.geojson').then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}).then(d=>{geoData=d;render();document.getElementById('loading').classList.add('hidden')}).catch(e=>{document.getElementById('loading').textContent='지도를 불러오지 못했습니다. 로컬 서버로 실행해 주세요.';console.error(e)});
