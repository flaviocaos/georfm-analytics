import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";

// ── Paleta ──
const C = {
  bg:"#0a0f1e",bg2:"#0f1729",bg3:"#131d2e",panel:"#111827",
  border:"#1e3050",border2:"#243a5e",
  blue:"#2563eb",blue2:"#3b82f6",cyan:"#06b6d4",
  green:"#10b981",yellow:"#f59e0b",red:"#ef4444",
  purple:"#8b5cf6",teal:"#14b8a6",orange:"#f97316",
  text:"#e2eeff",text2:"#8ba3c7",text3:"#4a6a9a",
};

// ── Áreas ──
const AREAS = [
  {
    id:"urbana",icon:"🏙️",label:"Análise Urbana",
    desc:"Segmentação de bairros, setores e regiões por ocorrências urbanas",
    color:C.purple,
    rfm:{r:"Dias desde última ocorrência",f:"Número de ocorrências",m:"Intensidade média do impacto"},
    segmentos:["Crítica","Alta Demanda","Moderada","Estável","Baixa Demanda"],
    csvCols:"area_id, data_ocorrencia, intensidade [, latitude, longitude]",
    aplicacoes:["Gestão de riscos urbanos","Planejamento de infraestrutura","Segurança pública","Mobilidade urbana"],
  },
  {
    id:"ambiental",icon:"🌿",label:"Monitoramento Ambiental",
    desc:"Análise de áreas por índices ambientais e frequência de monitoramento",
    color:C.green,
    rfm:{r:"Dias desde última análise",f:"Número de análises realizadas",m:"Valor médio do índice ambiental"},
    segmentos:["Preservada","Monitorada","Em Alerta","Degradada","Crítica"],
    csvCols:"area_id, data_analise, indice [, latitude, longitude]",
    aplicacoes:["Monitoramento de desmatamento","Análise de NDVI","Gestão de UCs","Compensação ambiental"],
  },
  {
    id:"agricultura",icon:"🚜",label:"Agricultura de Precisão",
    desc:"Segmentação de talhões e fazendas por produtividade histórica",
    color:C.yellow,
    rfm:{r:"Dias desde última colheita",f:"Número de ciclos analisados",m:"Produtividade média (ton/ha)"},
    segmentos:["Alta Performance","Boa Produção","Média","Abaixo do Esperado","Crítica"],
    csvCols:"talhao_id, data_colheita, produtividade [, latitude, longitude]",
    aplicacoes:["Gestão de lavouras","Análise de solo","Planejamento de safra","Crédito rural"],
  },
  {
    id:"saude",icon:"🏥",label:"Saúde Pública Espacial",
    desc:"Segmentação de municípios e regiões por indicadores epidemiológicos",
    color:C.red,
    rfm:{r:"Dias desde última notificação",f:"Número de notificações",m:"Taxa de incidência média"},
    segmentos:["Surto Ativo","Alto Risco","Risco Moderado","Controlado","Sem Casos"],
    csvCols:"municipio_id, data_notificacao, casos [, latitude, longitude]",
    aplicacoes:["Vigilância epidemiológica","Alocação de recursos","Campanhas de vacinação","Análise de endemias"],
  },
  {
    id:"sensoriamento",icon:"🛰️",label:"Sensoriamento Remoto",
    desc:"Análise de cenas e passagens de satélite por área de interesse",
    color:C.cyan,
    rfm:{r:"Dias desde última cena",f:"Número de passagens",m:"Valor médio do índice espectral"},
    segmentos:["Cobertura Total","Alta Frequência","Frequência Média","Baixa Cobertura","Sem Dados"],
    csvCols:"aoi_id, data_passagem, indice [, latitude, longitude]",
    aplicacoes:["Mapeamento de uso do solo","Análise multitemporal","Detecção de mudanças","Inventário florestal"],
  },
  {
    id:"hidrico",icon:"🌊",label:"Recursos Hídricos",
    desc:"Monitoramento de corpos d'água, bacias e estações hidrológicas",
    color:C.blue2,
    rfm:{r:"Dias desde última medição",f:"Número de coletas",m:"Valor médio de vazão/qualidade"},
    segmentos:["Excelente","Boa","Aceitável","Ruim","Péssima"],
    csvCols:"estacao_id, data_medicao, vazao [, latitude, longitude]",
    aplicacoes:["Gestão de bacias","Monitoramento de secas","Qualidade da água","Outorgas hídricas"],
  },
  {
    id:"infraestrutura",icon:"⚡",label:"Infraestrutura",
    desc:"Gestão e manutenção de ativos de infraestrutura por localização",
    color:C.orange,
    rfm:{r:"Dias desde última manutenção",f:"Número de ocorrências",m:"Custo médio de manutenção"},
    segmentos:["Crítica","Alta Prioridade","Média Prioridade","Baixa Prioridade","Estável"],
    csvCols:"ativo_id, data_ocorrencia, custo [, latitude, longitude]",
    aplicacoes:["Manutenção preditiva","Gestão de rodovias","Redes de energia","Saneamento básico"],
  },
  {
    id:"habitacao",icon:"🏘️",label:"Habitação Social",
    desc:"Análise de vulnerabilidade habitacional por setor e região",
    color:C.teal,
    rfm:{r:"Dias desde último atendimento",f:"Número de atendimentos",m:"Índice de vulnerabilidade médio"},
    segmentos:["Alta Vulnerabilidade","Vulnerável","Risco Moderado","Baixo Risco","Adequada"],
    csvCols:"setor_id, data_atendimento, vulnerabilidade [, latitude, longitude]",
    aplicacoes:["Programas habitacionais","PLHIS","Regularização fundiária","Assistência social"],
  },
];

// ── Parsers ──
function parseCSV(txt) {
  const lines = txt.trim().split(/\r?\n/);
  const h = lines[0].split(",").map(x => x.trim().toLowerCase().replace(/\s+/g,"_").replace(/['"]/g,""));
  return lines.slice(1).filter(l=>l.trim()).map(l => {
    const v = l.split(","), o = {};
    h.forEach((k,i) => o[k] = (v[i]||"").trim().replace(/['"]/g,""));
    return o;
  });
}

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type:"array", cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { raw:false, dateNF:"yyyy-mm-dd" });
  // Normalizar chaves
  return rows.map(r => {
    const o = {};
    Object.keys(r).forEach(k => {
      o[k.toLowerCase().trim().replace(/\s+/g,"_")] = String(r[k]||"").trim();
    });
    return o;
  });
}

function detectCols(rows) {
  if (!rows.length) return {};
  const keys = Object.keys(rows[0]);
  const idCol = keys.find(k => k.includes("id") || k.includes("area") || k.includes("setor") || k.includes("municipio") || k.includes("talhao") || k.includes("estacao") || k.includes("aoi") || k.includes("ativo")) || keys[0];
  const dateCol = keys.find(k => k.includes("data") || k.includes("date") || k.includes("dt")) || keys[1];
  const valCol = keys.find(k => !k.includes("id") && !k.includes("data") && !k.includes("date") && !k.includes("lat") && !k.includes("lon") && !k.includes("lng") && k !== idCol && k !== dateCol) || keys[2];
  const latCol = keys.find(k => k.includes("lat"));
  const lonCol = keys.find(k => k.includes("lon") || k.includes("lng"));
  return { idCol, dateCol, valCol, latCol, lonCol };
}

function buildClients(rows, cols, k=5) {
  const { idCol, dateCol, valCol, latCol, lonCol } = cols;
  const map = {}, now = new Date("2024-12-31");
  rows.forEach(r => {
    const id = r[idCol];
    const dStr = r[dateCol];
    if (!id || !dStr) return;
    const d = new Date(dStr);
    if (isNaN(d)) return;
    if (!map[id]) map[id] = { id, last:d, freq:0, mon:0, lat:null, lon:null };
    if (d > map[id].last) map[id].last = d;
    map[id].freq++;
    map[id].mon += parseFloat(r[valCol])||0;
    if (latCol && r[latCol]) map[id].lat = parseFloat(r[latCol]);
    if (lonCol && r[lonCol]) map[id].lon = parseFloat(r[lonCol]);
  });
  let arr = Object.values(map).map(c => ({
    ...c, rec:Math.floor((now-c.last)/864e5), mon:parseFloat(c.mon.toFixed(4))
  }));
  if (!arr.length) return [];
  const nm=(a,key)=>{const vs=a.map(x=>x[key]),mn=Math.min(...vs),mx=Math.max(...vs);return a.map(x=>({...x,[key+"_n"]:mx===mn?.5:(x[key]-mn)/(mx-mn)}));};
  arr=nm(arr,"rec");arr=nm(arr,"freq");arr=nm(arr,"mon");
  arr=arr.map(c=>({...c,rn:1-c.rec_n,fn:c.freq_n,mn2:c.mon_n}));
  arr=nm(arr,"rn");arr=nm(arr,"fn");arr=nm(arr,"mn2");
  const nk=Math.min(k,arr.length);
  let cents=arr.slice(0,nk).map(d=>({r:d.rn_n,f:d.fn_n,m:d.mn2_n})),asgn=arr.map(()=>0);
  for(let it=0;it<50;it++){
    asgn=arr.map(d=>{let b=0,bd=Infinity;cents.forEach((c,ci)=>{const dist=(d.rn_n-c.r)**2+(d.fn_n-c.f)**2+(d.mn2_n-c.m)**2;if(dist<bd){bd=dist;b=ci;}});return b;});
    cents=Array.from({length:nk},(_,ci)=>{const pts=arr.filter((_,i)=>asgn[i]===ci);if(!pts.length)return cents[ci];return{r:pts.reduce((s,p)=>s+p.rn_n,0)/pts.length,f:pts.reduce((s,p)=>s+p.fn_n,0)/pts.length,m:pts.reduce((s,p)=>s+p.mn2_n,0)/pts.length};});
  }
  const sc=v=>v>=.75?5:v>=.5?4:v>=.35?3:v>=.2?2:1;
  return arr.map((c,i)=>{
    const rs=sc(c.rn_n),fs=sc(c.fn_n),ms=sc(c.mn2_n);
    const score=(rs+fs+ms)/3;
    const segIdx=score>=4.2?0:score>=3.4?1:score>=2.5?2:score>=1.8?3:4;
    return{...c,cluster:asgn[i],rs,fs,ms,segIdx,rn_n:c.rn_n,fn_n:c.fn_n,mn2_n:c.mn2_n};
  });
}

function exportCSV(clients, area) {
  const segs = area.segmentos;
  const hdr = "id,segmento,recencia,frequencia,valor_medio,r_score,f_score,m_score,latitude,longitude";
  const rows = clients.map(c=>`${c.id},${segs[c.segIdx]},${c.rec},${c.freq},${c.mon.toFixed(4)},${c.rs},${c.fs},${c.ms},${c.lat||""},${c.lon||""}`);
  const blob=new Blob([[hdr,...rows].join("\n")],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`georfm_${area.id}.csv`;a.click();
}

function exportExcel(clients, area) {
  const segs = area.segmentos;
  const data = clients.map(c=>({
    ID: c.id,
    Segmento: segs[c.segIdx],
    Recência: c.rec,
    Frequência: c.freq,
    Valor_Médio: parseFloat(c.mon.toFixed(4)),
    R_Score: c.rs,
    F_Score: c.fs,
    M_Score: c.ms,
    Latitude: c.lat||"",
    Longitude: c.lon||"",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GeoRFM");
  XLSX.writeFile(wb, `georfm_${area.id}.xlsx`);
}

const fK=v=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(1)}k`:String(parseFloat((v||0).toFixed(2)));
const fN=v=>(v||0).toLocaleString("pt-BR");

// ── Componentes visuais ──
function ScoreBar({v,color}){
  return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:14,height:5,borderRadius:2,background:i<=v?color:C.border2}}/>)}</div>;
}
function MiniBar({value,max,color}){
  return <div style={{flex:1,height:6,borderRadius:3,background:C.border,overflow:"hidden"}}><div style={{width:`${Math.min((value/max)*100,100)}%`,height:"100%",background:color,borderRadius:3,transition:"width .3s"}}/></div>;
}

// ── Canvas Charts ──
function HistogramCanvas({data,keyName,label,color,bins=12}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current;if(!cv||!data.length)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height,P={t:20,r:12,b:32,l:44};
    ctx.clearRect(0,0,W,H);
    const vals=data.map(d=>d[keyName]);
    const mn=Math.min(...vals),mx=Math.max(...vals),range=mx-mn||1;
    const bw=range/bins,counts=new Array(bins).fill(0);
    vals.forEach(v=>{const bi=Math.min(Math.floor((v-mn)/bw),bins-1);counts[bi]++;});
    const maxC=Math.max(...counts,1);
    const cW=(W-P.l-P.r)/bins,cH=H-P.t-P.b;
    ctx.strokeStyle=`${color}22`;ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=P.t+cH-(cH/4)*i;ctx.beginPath();ctx.moveTo(P.l,y);ctx.lineTo(W-P.r,y);ctx.stroke();ctx.fillStyle=C.text3;ctx.font="9px system-ui";ctx.textAlign="right";ctx.fillText(Math.round(maxC/4*i),P.l-3,y+3);}
    counts.forEach((c,i)=>{
      const x=P.l+i*cW,bH=(c/maxC)*cH,y=P.t+cH-bH;
      const grad=ctx.createLinearGradient(0,y,0,y+bH);
      grad.addColorStop(0,color);grad.addColorStop(1,color+"44");
      ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(x+1,y,cW-2,bH,2);ctx.fill();
    });
    ctx.fillStyle=C.text3;ctx.font="9px system-ui";ctx.textAlign="center";
    [0,.5,1].forEach(t=>{const v=mn+t*range,x=P.l+t*(W-P.l-P.r);ctx.fillText(v>=1000?`${(v/1000).toFixed(1)}k`:parseFloat(v.toFixed(2)),x,H-4);});
    ctx.fillStyle=C.text2;ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(label,W/2,13);
  },[data,keyName]);
  return <canvas ref={ref} width={260} height={160} style={{width:"100%",height:"auto",display:"block"}}/>;
}

function ElbowCanvas({clients,color}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current;if(!cv||!clients.length)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height,P={t:28,r:20,b:36,l:48};
    ctx.clearRect(0,0,W,H);
    const pts=clients.map(c=>[c.rn_n||0,c.fn_n||0,c.mn2_n||0]);
    const ks=[2,3,4,5,6,7,8];
    const inertias=ks.map(k=>{
      const sample=pts.slice(0,Math.min(pts.length,100));
      if(sample.length<k)return 0;
      let cents=sample.slice(0,k).map(p=>[...p]),labels=new Array(sample.length).fill(0);
      for(let it=0;it<12;it++){labels=sample.map(p=>{let b=0,bd=Infinity;cents.forEach((c,ci)=>{const d=p.reduce((s,v,i)=>s+(v-c[i])**2,0);if(d<bd){bd=d;b=ci;}});return b;});cents=Array.from({length:k},(_,ci)=>{const ps=sample.filter((_,i)=>labels[i]===ci);if(!ps.length)return cents[ci];return ps[0].map((_,j)=>ps.reduce((s,p)=>s+p[j],0)/ps.length);});}
      return sample.reduce((s,p,i)=>s+p.reduce((ss,v,j)=>ss+(v-cents[labels[i]][j])**2,0),0);
    });
    const maxI=Math.max(...inertias),minI=Math.min(...inertias),range=maxI-minI||1;
    const cH=H-P.t-P.b,xW=(W-P.l-P.r)/(ks.length-1);
    ctx.strokeStyle=`${color}22`;ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=P.t+cH/4*i;ctx.beginPath();ctx.moveTo(P.l,y);ctx.lineTo(W-P.r,y);ctx.stroke();}
    ctx.beginPath();
    inertias.forEach((v,i)=>{const x=P.l+i*xW,y=P.t+cH*(1-(v-minI)/range);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.lineTo(P.l+(ks.length-1)*xW,P.t+cH);ctx.lineTo(P.l,P.t+cH);ctx.closePath();
    const grad=ctx.createLinearGradient(0,P.t,0,P.t+cH);
    grad.addColorStop(0,color+"44");grad.addColorStop(1,color+"08");
    ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin="round";
    inertias.forEach((v,i)=>{const x=P.l+i*xW,y=P.t+cH*(1-(v-minI)/range);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
    inertias.forEach((v,i)=>{
      const x=P.l+i*xW,y=P.t+cH*(1-(v-minI)/range);
      ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);
      ctx.fillStyle=i===3?C.yellow:color;ctx.fill();ctx.strokeStyle=C.bg;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=C.text2;ctx.font="9px system-ui";ctx.textAlign="center";ctx.fillText(`k=${ks[i]}`,x,H-4);
    });
    const ex=P.l+3*xW,ey=P.t+cH*(1-(inertias[3]-minI)/range);
    ctx.strokeStyle=C.yellow+"66";ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(ex,ey-8);ctx.lineTo(ex,P.t+cH);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=C.yellow;ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText("⬆ Cotovelo",ex,ey-12);
    ctx.fillStyle=C.text;ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("Método do Cotovelo",W/2,14);
  },[clients]);
  return <canvas ref={ref} width={440} height={200} style={{width:"100%",height:"auto",display:"block"}}/>;
}

function LatentCanvas({clients,color}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current;if(!cv||!clients.length)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height,P=40;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle=`${color}15`;ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ctx.beginPath();ctx.moveTo(P+i*(W-P*2)/5,P*.5);ctx.lineTo(P+i*(W-P*2)/5,H-P);ctx.stroke();ctx.beginPath();ctx.moveTo(P,P*.5+i*(H-P*1.5)/5);ctx.lineTo(W-P,P*.5+i*(H-P*1.5)/5);ctx.stroke();}
    const colors=[color,color+"cc",color+"99",color+"66",color+"44"];
    clients.forEach(c=>{
      const x=P+(c.rn_n||0)*(W-P*2),y=H-P-(c.mn2_n||0)*(H-P*1.5);
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=colors[c.segIdx]||color;ctx.fill();
    });
    for(let ci=0;ci<5;ci++){
      const pts=clients.filter(c=>c.segIdx===ci);if(!pts.length)continue;
      const cx=P+pts.reduce((s,c)=>s+(c.rn_n||0),0)/pts.length*(W-P*2);
      const cy=H-P-pts.reduce((s,c)=>s+(c.mn2_n||0),0)/pts.length*(H-P*1.5);
      ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.fillStyle=(colors[ci]||color)+"22";ctx.fill();ctx.strokeStyle=colors[ci]||color;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=colors[ci]||color;ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(`C${ci+1}`,cx,cy+4);
    }
    ctx.fillStyle=C.text3;ctx.font="9px system-ui";ctx.textAlign="center";ctx.fillText("← Recência Norm. →",W/2,H-4);
    ctx.save();ctx.translate(12,H/2);ctx.rotate(-Math.PI/2);ctx.fillText("Valor",0,0);ctx.restore();
    ctx.fillStyle=C.text;ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("Espaço Latente 2D",W/2,13);
  },[clients]);
  return <canvas ref={ref} width={480} height={240} style={{width:"100%",height:"auto",display:"block"}}/>;
}

function ScatterCanvas({data,area,hovId,setHov}){
  const ref=useRef();
  const colors=[area.color,area.color+"cc",area.color+"99",area.color+"77",area.color+"55"];
  useEffect(()=>{
    const cv=ref.current;if(!cv||!data.length)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height,P=44;
    ctx.clearRect(0,0,W,H);
    const xs=data.map(c=>c.rec),ys=data.map(c=>c.mon),zM=Math.max(...data.map(c=>c.freq));
    const xn=Math.min(...xs),xx=Math.max(...xs),yn=Math.min(...ys),yx=Math.max(...ys);
    const tx=v=>P+(v-xn)/(xx-xn||1)*(W-P*2),ty=v=>H-P-(v-yn)/(yx-yn||1)*(H-P*1.7);
    ctx.strokeStyle=`${area.color}15`;ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ctx.beginPath();ctx.moveTo(P+i*(W-P*2)/5,P*.4);ctx.lineTo(P+i*(W-P*2)/5,H-P);ctx.stroke();ctx.beginPath();ctx.moveTo(P,P*.4+i*(H-P*1.7)/5);ctx.lineTo(W-P,P*.4+i*(H-P*1.7)/5);ctx.stroke();}
    ctx.fillStyle=C.text3;ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillText("← mais recente   Recência   mais antigo →",W/2,H-6);
    ctx.save();ctx.translate(14,H/2);ctx.rotate(-Math.PI/2);ctx.fillText("Valor médio",0,0);ctx.restore();
    data.forEach(c=>{
      const x=tx(c.rec),y=ty(c.mon),r=3+c.freq/zM*10,hov=c.id===hovId;
      ctx.beginPath();ctx.arc(x,y,hov?r+4:r,0,Math.PI*2);
      if(hov){ctx.shadowBlur=16;ctx.shadowColor=area.color;}
      ctx.fillStyle=colors[c.segIdx]||area.color;ctx.fill();ctx.shadowBlur=0;
      if(hov){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}
    });
  },[data,hovId]);
  const onMove=e=>{
    const cv=ref.current;if(!cv)return;
    const rect=cv.getBoundingClientRect(),mx=(e.clientX-rect.left)*(cv.width/rect.width),my=(e.clientY-rect.top)*(cv.height/rect.height);
    const P=44,W=cv.width,H=cv.height;
    const xs=data.map(c=>c.rec),ys=data.map(c=>c.mon);
    const xn=Math.min(...xs),xx=Math.max(...xs),yn=Math.min(...ys),yx=Math.max(...ys);
    const tx=v=>P+(v-xn)/(xx-xn||1)*(W-P*2),ty=v=>H-P-(v-yn)/(yx-yn||1)*(H-P*1.7);
    let found=null,best=Infinity;
    data.forEach(c=>{const dx=tx(c.rec)-mx,dy=ty(c.mon)-my,d=dx*dx+dy*dy;if(d<best&&d<600){best=d;found=c;}});
    setHov(found||null);
  };
  return <canvas ref={ref} width={680} height={260} style={{width:"100%",height:"auto",cursor:"crosshair",display:"block"}} onMouseMove={onMove} onMouseLeave={()=>setHov(null)}/>;
}

// ── Mapa Leaflet ──
function GeoMap({clients,area}){
  const colors=[area.color,area.color+"cc",area.color+"99",area.color+"77",area.color+"55"];
  const withCoords=clients.filter(c=>c.lat&&c.lon&&!isNaN(c.lat)&&!isNaN(c.lon));
  if(!withCoords.length){
    return(
      <div style={{background:C.bg3,borderRadius:10,padding:32,textAlign:"center",border:`1px dashed ${C.border2}`}}>
        <div style={{fontSize:32,marginBottom:12}}>🗺️</div>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Mapa não disponível</div>
        <div style={{fontSize:11,color:C.text2,lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>
          Seu arquivo não contém colunas de coordenadas geográficas.<br/>
          Adicione as colunas <strong style={{color:area.color}}>latitude</strong> e <strong style={{color:area.color}}>longitude</strong> para visualizar no mapa.
        </div>
        <div style={{marginTop:16,background:C.bg2,borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:11,color:C.text2,display:"inline-block"}}>
          {area.csvCols}
        </div>
      </div>
    );
  }
  const centerLat=withCoords.reduce((s,c)=>s+c.lat,0)/withCoords.length;
  const centerLon=withCoords.reduce((s,c)=>s+c.lon,0)/withCoords.length;
  return(
    <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <MapContainer center={[centerLat,centerLon]} zoom={5} style={{height:420,width:"100%"}} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO'/>
        <ZoomControl position="bottomright"/>
        {withCoords.map(c=>(
          <CircleMarker key={c.id} center={[c.lat,c.lon]} radius={6+c.freq*0.5}
            fillColor={colors[c.segIdx]||area.color} color={colors[c.segIdx]||area.color}
            weight={2} opacity={0.9} fillOpacity={0.7}>
            <Popup>
              <div style={{fontFamily:"system-ui",fontSize:12,minWidth:160}}>
                <div style={{fontWeight:700,marginBottom:6,color:colors[c.segIdx]||area.color}}>{c.id}</div>
                <div><strong>Segmento:</strong> {area.segmentos[c.segIdx]}</div>
                <div><strong>Recência:</strong> {c.rec} dias</div>
                <div><strong>Frequência:</strong> {c.freq}x</div>
                <div><strong>Valor:</strong> {fK(c.mon)}</div>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  {[["R",c.rs],["F",c.fs],["M",c.ms]].map(([l,v])=>(
                    <span key={l} style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:colors[c.segIdx]+"33",color:colors[c.segIdx]||area.color,fontWeight:700}}>{l}:{v}</span>
                  ))}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div style={{padding:"8px 12px",background:C.bg3,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.text3}}>{withCoords.length} áreas no mapa</span>
        {area.segmentos.map((s,i)=>(
          <span key={s} style={{fontSize:10,display:"flex",alignItems:"center",gap:4,color:C.text2}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:colors[i],display:"inline-block"}}/>{s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Upload Screen ──
function UploadScreen({area,onFile,onBack}){
  const [drag,setDrag]=useState(false);
  const fileRef=useRef();

  const handle=f=>{
    if(!f)return;
    const ext=f.name.split(".").pop().toLowerCase();
    if(ext==="csv"){
      const r=new FileReader();
      r.onload=ev=>onFile(ev.target.result,"csv",f.name);
      r.readAsText(f);
    } else if(ext==="xlsx"||ext==="xls"){
      const r=new FileReader();
      r.onload=ev=>onFile(ev.target.result,"excel",f.name);
      r.readAsArrayBuffer(f);
    } else {
      alert("Formato não suportado. Use CSV ou Excel (.xlsx)");
    }
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      <div style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.blue},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🌍</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800}}>Geo<span style={{color:C.cyan}}>RFM</span> Analytics</div>
          <div style={{fontSize:10,color:C.text3}}>{area.icon} {area.label}</div>
        </div>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text2,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:11}}>← Voltar</button>
      </div>

      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:600,display:"flex",flexDirection:"column",gap:16}}>
          {/* Info área */}
          <div style={{background:C.panel,border:`1px solid ${area.color}44`,borderRadius:14,padding:"16px 20px",borderLeft:`4px solid ${area.color}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{fontSize:26}}>{area.icon}</div>
              <div><div style={{fontSize:14,fontWeight:700}}>{area.label}</div><div style={{fontSize:11,color:C.text2}}>{area.desc}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[["🕐 Recência",area.rfm.r],["📊 Frequência",area.rfm.f],["💰 Valor",area.rfm.m]].map(([k,v])=>(
                <div key={k} style={{background:C.bg3,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:area.color,fontWeight:700,marginBottom:3}}>{k}</div>
                  <div style={{fontSize:10,color:C.text2,lineHeight:1.4}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
            onClick={()=>fileRef.current.click()}
            style={{border:`2px dashed ${drag?area.color:C.border2}`,borderRadius:14,padding:"36px 24px",textAlign:"center",cursor:"pointer",background:drag?`${area.color}08`:C.panel,transition:".2s"}}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
            <div style={{fontSize:36,marginBottom:10}}>📁</div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>Arraste seu arquivo aqui ou clique</div>
            {/* Formatos suportados */}
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              {[
                {ext:"CSV",icon:"📄",color:C.green,desc:"Valores separados por vírgula"},
                {ext:"XLSX",icon:"📊",color:"#1D6F42",desc:"Microsoft Excel"},
                {ext:"XLS",icon:"📊",color:"#1D6F42",desc:"Excel legado"},
              ].map(f=>(
                <div key={f.ext} style={{background:C.bg3,border:`1px solid ${f.color}44`,borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{f.icon}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:f.color}}>{f.ext}</div>
                    <div style={{fontSize:9,color:C.text3}}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:area.color,marginBottom:6}}>📋 Colunas esperadas:</div>
            <div style={{fontFamily:"monospace",fontSize:11,color:C.text2,background:C.bg3,borderRadius:8,padding:"8px 12px",marginBottom:8}}>
              {area.csvCols}
            </div>
            <div style={{fontSize:10,color:C.text3}}>
              ✅ Detecção automática de colunas · ✅ Com ou sem coordenadas · ✅ Qualquer quantidade de registros
            </div>
          </div>

          {/* Segmentos */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text2,marginBottom:8}}>🎯 Segmentos gerados automaticamente:</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {area.segmentos.map((s,i)=>(
                <span key={s} style={{padding:"3px 10px",borderRadius:12,fontSize:11,background:`${area.color}18`,border:`1px solid ${area.color}44`,color:area.color,fontWeight:600}}>
                  {["⭐","✅","📊","⚠️","🔴"][i]} {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Area Selector ──
function AreaSelector({onSelect}){
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",color:C.text}}>
      <div style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:58,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌍</div>
        <div>
          <div style={{fontSize:16,fontWeight:800}}>Geo<span style={{background:`linear-gradient(90deg,${C.blue2},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RFM</span> Analytics</div>
          <div style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:1}}>Segmentação Geoespacial com Deep Learning</div>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"40px 24px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${C.blue}08 1px,transparent 1px),linear-gradient(90deg,${C.blue}08 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:`rgba(37,99,235,.1)`,border:`1px solid rgba(37,99,235,.3)`,borderRadius:20,padding:"5px 16px",fontSize:11,color:C.cyan,marginBottom:16}}>
            🛰️ Deep Learning · Leaflet.js · CSV · Excel · 100% no Navegador
          </div>
          <h1 style={{fontSize:"clamp(22px,4vw,38px)",fontWeight:800,marginBottom:10,lineHeight:1.2}}>
            <span style={{color:C.text}}>Análise Geoespacial</span><br/>
            <span style={{background:`linear-gradient(90deg,${C.blue2},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>por Segmentação RFM</span>
          </h1>
          <p style={{fontSize:13,color:C.text2,maxWidth:520,margin:"0 auto 28px",lineHeight:1.8}}>
            Selecione a área, faça upload do seu CSV ou Excel e obtenha segmentação automática com gráficos e mapa interativo.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
            {[["📄","CSV"],["📊","Excel .xlsx"],["🗺️","Mapa Interativo"],["🤖","KMeans JS"],["📈","7 Gráficos"]].map(([ic,lb])=>(
              <span key={lb} style={{fontSize:11,color:C.text2,display:"flex",alignItems:"center",gap:4,background:C.panel,border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 12px"}}>
                <span>{ic}</span>{lb}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px 48px"}}>
        <div style={{fontSize:11,color:C.cyan,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,textAlign:"center"}}>SELECIONE A ÁREA DE ANÁLISE</div>
        <div style={{fontSize:12,color:C.text2,textAlign:"center",marginBottom:20}}>Cada área adapta automaticamente os campos RFM e os segmentos</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {AREAS.map(area=>(
            <div key={area.id} onClick={()=>onSelect(area)}
              style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:18,cursor:"pointer",transition:".15s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.border=`1px solid ${area.color}66`;e.currentTarget.style.background=`${area.color}08`;}}
              onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${C.border}`;e.currentTarget.style.background=C.panel;}}>
              <div style={{position:"absolute",top:0,right:0,width:70,height:70,background:`radial-gradient(circle,${area.color}15,transparent)`,borderRadius:"0 14px 0 0"}}/>
              <div style={{fontSize:26,marginBottom:8}}>{area.icon}</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{area.label}</div>
              <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginBottom:10}}>{area.desc}</div>
              <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:10}}>
                {[["R",area.rfm.r],["F",area.rfm.f],["M",area.rfm.m]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:6,fontSize:10,color:C.text3}}>
                    <span style={{color:area.color,fontWeight:700,minWidth:12}}>{k}</span><span>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {area.aplicacoes.slice(0,2).map(a=>(
                  <span key={a} style={{padding:"2px 8px",borderRadius:10,fontSize:9,background:`${area.color}18`,border:`1px solid ${area.color}33`,color:area.color}}>{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,padding:"14px 24px",textAlign:"center"}}>
        <div style={{fontSize:10,color:C.text3}}>GeoRFM Analytics · Flávio Antonio Oliveira da Silva · Engenheiro Cartógrafo · Zero Backend · Open Source</div>
      </div>
    </div>
  );
}

// ── Dashboard ──
function Dashboard({clients,area,csvName,fileType,hasCoords,onNewFile,onBack}){
  const [filter,setFilter]=useState(-1);
  const [page,setPage]=useState("overview");
  const [hov,setHov]=useState(null);
  const [sort,setSort]=useState({col:"mon",asc:false});
  const [tpage,setTpage]=useState(0);
  const [sideOpen,setSideOpen]=useState(true);
  const PAGE=12;

  const segs=area.segmentos;
  const colors=[area.color,area.color+"cc",area.color+"99",area.color+"77",area.color+"55"];
  const filtered=filter===-1?clients:clients.filter(c=>c.segIdx===filter);
  const segCounts=segs.map((_,i)=>clients.filter(c=>c.segIdx===i).length);
  const segVals=segs.map((_,i)=>clients.filter(c=>c.segIdx===i).reduce((a,c)=>a+c.mon,0));
  const totalVal=clients.reduce((a,c)=>a+c.mon,0);
  const srtd=[...filtered].sort((a,b)=>sort.asc?a[sort.col]-b[sort.col]:b[sort.col]-a[sort.col]);
  const tPages=Math.ceil(srtd.length/PAGE),pageD=srtd.slice(tpage*PAGE,(tpage+1)*PAGE);

  const navItems=[
    {id:"overview",icon:"◉",label:"Visão Geral"},
    {id:"mapa",icon:"🗺️",label:"Mapa"},
    {id:"analytics",icon:"📊",label:"Análise Gráfica"},
    {id:"scatter",icon:"⬡",label:"Dispersão"},
    {id:"tabela",icon:"≡",label:"Dados"},
  ];

  const card={background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"};
  const fileIcon=fileType==="excel"?"📊":"📄";

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"system-ui,sans-serif",background:C.bg,color:C.text,fontSize:13}}>
      {/* Sidebar */}
      <div style={{width:sideOpen?220:60,flexShrink:0,background:C.bg2,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width .25s",overflow:"hidden"}}>
        <div style={{padding:"14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.blue},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🌍</div>
          {sideOpen&&<div><div style={{fontSize:13,fontWeight:800}}>Geo<span style={{color:C.cyan}}>RFM</span></div><div style={{fontSize:9,color:C.text3}}>Analytics</div></div>}
        </div>
        {sideOpen&&<div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:`${area.color}10`}}>
          <div style={{fontSize:9,color:area.color,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Área Ativa</div>
          <div style={{fontSize:11,fontWeight:700}}>{area.icon} {area.label}</div>
          <div style={{fontSize:9,color:C.text3,marginTop:2}}>{fileIcon} {csvName}</div>
          <div style={{fontSize:9,color:C.text3,marginTop:1}}>{clients.length} registros · {hasCoords?"🗺️ com mapa":"📋 sem coordenadas"}</div>
        </div>}
        <div style={{flex:1,padding:"8px 0"}}>
          {navItems.map(item=>{
            const act=page===item.id;
            return <div key={item.id} onClick={()=>setPage(item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",borderRadius:8,margin:"2px 6px",background:act?`${area.color}22`:"transparent",color:act?area.color:C.text2,transition:"all .15s",whiteSpace:"nowrap"}}>
              <span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>
              {sideOpen&&<span style={{fontSize:11,fontWeight:500}}>{item.label}</span>}
            </div>;
          })}
        </div>
        {sideOpen&&<div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:6}}>
          <button onClick={onNewFile} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.cyan})`,border:"none",color:"#fff",padding:"8px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>↑ Novo Arquivo</button>
          <button onClick={onBack} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,color:C.text2,padding:"7px",borderRadius:8,cursor:"pointer",fontSize:11}}>← Trocar Área</button>
        </div>}
        <div style={{padding:10,borderTop:`1px solid ${C.border}`}}>
          <div onClick={()=>setSideOpen(!sideOpen)} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",cursor:"pointer",borderRadius:7,color:C.text3}}>
            <span style={{fontSize:12}}>{sideOpen?"◀":"▶"}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"0 18px",height:52,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}>{navItems.find(n=>n.id===page)?.label}</div>
            <div style={{fontSize:10,color:C.text3}}>{clients.length} registros · {area.label}</div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            <button onClick={()=>{setFilter(-1);setTpage(0);}} style={{padding:"4px 10px",borderRadius:14,border:filter===-1?`1.5px solid ${area.color}`:`1px solid ${C.border}`,background:filter===-1?`${area.color}18`:"transparent",color:filter===-1?area.color:C.text2,fontSize:10,cursor:"pointer",fontWeight:filter===-1?700:400}}>Todos ({clients.length})</button>
            {segs.map((s,i)=>(
              <button key={s} onClick={()=>{setFilter(i);setTpage(0);}} style={{padding:"4px 10px",borderRadius:14,border:filter===i?`1.5px solid ${colors[i]}`:`1px solid ${C.border}`,background:filter===i?`${colors[i]}18`:"transparent",color:filter===i?colors[i]:C.text2,fontSize:10,cursor:"pointer",fontWeight:filter===i?700:400}}>
                {["⭐","✅","📊","⚠️","🔴"][i]} {s} ({segCounts[i]})
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>exportCSV(clients,area)} style={{padding:"5px 10px",borderRadius:7,fontSize:10,cursor:"pointer",border:`1px solid ${C.border}`,background:"transparent",color:C.text2}}>↓ CSV</button>
            <button onClick={()=>exportExcel(clients,area)} style={{padding:"5px 10px",borderRadius:7,fontSize:10,cursor:"pointer",border:`1px solid #1D6F4244`,background:"#1D6F4212",color:"#4CAF50"}}>↓ Excel</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>

          {/* Overview */}
          {page==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
              {[
                {label:"Total de Registros",value:fN(clients.length),color:area.color,icon:area.icon},
                {label:"Valor Total",value:fK(totalVal),color:C.cyan,icon:"📊"},
                {label:"Valor Médio",value:fK(clients.length?totalVal/clients.length:0),color:C.green,icon:"📈"},
                {label:segs[0],value:fN(segCounts[0]),color:colors[0],icon:"⭐"},
                {label:segs[4],value:fN(segCounts[4]),color:colors[4],icon:"🔴"},
              ].map(k=>(
                <div key={k.label} style={{...card,borderLeft:`3px solid ${k.color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:.4}}>{k.label}</div>
                    <div style={{fontSize:16}}>{k.icon}</div>
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
              {segs.map((s,i)=>{
                const cnt=segCounts[i],val=segVals[i],pct=clients.length?cnt/clients.length*100:0,act=filter===i;
                return <div key={s} onClick={()=>setFilter(act?-1:i)} style={{...card,cursor:"pointer",border:`1px solid ${act?colors[i]+"66":C.border}`,background:act?`${colors[i]}12`:C.panel,transition:".15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:16}}>{["⭐","✅","📊","⚠️","🔴"][i]}</span>
                    <span style={{fontSize:11,fontWeight:700,color:colors[i]}}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{s}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <MiniBar value={cnt} max={clients.length||1} color={colors[i]}/>
                    <span style={{fontSize:10,color:C.text2}}>{cnt}</span>
                  </div>
                  <div style={{fontSize:10,color:C.text3}}>Valor: <strong style={{color:colors[i]}}>{fK(val)}</strong></div>
                </div>;
              })}
            </div>
            <div style={card}>
              <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:12}}>🏆 Top 5 — por valor médio</div>
              {[...clients].sort((a,b)=>b.mon-a.mon).slice(0,5).map((c,i)=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:22,height:22,borderRadius:6,background:i===0?"#f59e0b22":C.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:i===0?C.yellow:C.text3,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,fontFamily:"monospace",color:C.text}}>{c.id}</div>
                    <span style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:`${colors[c.segIdx]}22`,color:colors[c.segIdx],fontWeight:600}}>{segs[c.segIdx]}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:area.color}}>{fK(c.mon)}</div>
                </div>
              ))}
            </div>
          </div>}

          {/* Mapa */}
          {page==="mapa"&&<div style={card}>
            <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:4}}>🗺️ Mapa de Clusters — {area.label}</div>
            <div style={{fontSize:10,color:C.text3,marginBottom:12}}>{hasCoords?`${clients.filter(c=>c.lat&&c.lon).length} registros com coordenadas`:"Sem coordenadas no arquivo"}</div>
            <GeoMap clients={filtered} area={area}/>
          </div>}

          {/* Analytics */}
          {page==="analytics"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={card}>
              <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:12}}>📈 Distribuição RFM</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[["rec","Recência (dias)",C.blue2],["freq","Frequência",C.green],["mon","Valor médio",area.color]].map(([k,l,c])=>(
                  <div key={k} style={{background:C.bg3,borderRadius:8,padding:10}}>
                    <HistogramCanvas data={filtered} keyName={k} label={l} color={c}/>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={card}>
                <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:10}}>🔵 Método do Cotovelo</div>
                <div style={{background:C.bg3,borderRadius:8,padding:10}}><ElbowCanvas clients={filtered} color={area.color}/></div>
              </div>
              <div style={card}>
                <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:10}}>🌐 Espaço Latente 2D</div>
                <div style={{background:C.bg3,borderRadius:8,padding:10}}><LatentCanvas clients={filtered} color={area.color}/></div>
              </div>
            </div>
            <div style={card}>
              <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:12}}>📋 Estatísticas Descritivas</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["Métrica","N","Mín","Máx","Média","Mediana","Desv. Padrão"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:C.text3}}>{h}</th>)}</tr></thead>
                  <tbody>{[["Recência (dias)","rec"],["Frequência","freq"],["Valor médio","mon"]].map(([label,key],ri)=>{
                    const vals=filtered.map(c=>c[key]).filter(v=>v!=null).sort((a,b)=>a-b);
                    if(!vals.length)return null;
                    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
                    const median=vals.length%2===0?(vals[vals.length/2-1]+vals[vals.length/2])/2:vals[Math.floor(vals.length/2)];
                    const std=Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
                    const fmt=v=>v>=1000?fK(v):parseFloat(v.toFixed(2));
                    return <tr key={label} style={{background:ri%2?`${C.bg3}`:"transparent",borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:"7px 10px",fontWeight:600,color:C.text2}}>{label}</td>
                      <td style={{padding:"7px 10px",color:C.text3}}>{vals.length}</td>
                      <td style={{padding:"7px 10px"}}>{fmt(vals[0])}</td>
                      <td style={{padding:"7px 10px"}}>{fmt(vals[vals.length-1])}</td>
                      <td style={{padding:"7px 10px",fontWeight:600,color:area.color}}>{fmt(mean)}</td>
                      <td style={{padding:"7px 10px"}}>{fmt(median)}</td>
                      <td style={{padding:"7px 10px",color:C.text3}}>{fmt(std)}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
          </div>}

          {/* Scatter */}
          {page==="scatter"&&<div style={card}>
            <div style={{fontSize:12,fontWeight:700,color:area.color,marginBottom:6}}>🔵 Dispersão RFM Interativa</div>
            <div style={{fontSize:10,color:C.text3,marginBottom:10}}>Passe o mouse · X = Recência · Y = Valor · Tamanho = Frequência</div>
            <div style={{background:C.bg3,borderRadius:8,padding:10}}>
              <ScatterCanvas data={filtered} area={area} hovId={hov?.id} setHov={setHov}/>
            </div>
            {hov&&<div style={{marginTop:10,padding:"10px 14px",borderRadius:8,background:`${area.color}12`,border:`1px solid ${area.color}33`,display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:area.color}}>{hov.id}</span>
              <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${colors[hov.segIdx]}22`,color:colors[hov.segIdx],fontWeight:600}}>{segs[hov.segIdx]}</span>
              {[["Recência",`${hov.rec}d`],["Frequência",`${hov.freq}x`],["Valor",fK(hov.mon)]].map(([l,v])=><span key={l} style={{fontSize:11,color:C.text2}}><strong style={{color:C.text}}>{l}:</strong> {v}</span>)}
            </div>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:10}}>
              {segs.map((s,i)=><span key={s} style={{fontSize:10,display:"flex",alignItems:"center",gap:4,color:C.text3}}><span style={{width:8,height:8,borderRadius:"50%",background:colors[i],display:"inline-block"}}/>{s}</span>)}
            </div>
          </div>}

          {/* Tabela */}
          {page==="tabela"&&<div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><div style={{fontSize:12,fontWeight:700}}>Dados Segmentados</div><div style={{fontSize:10,color:C.text3}}>{filtered.length} registros</div></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>exportCSV(clients,area)} style={{padding:"6px 12px",borderRadius:7,fontSize:11,cursor:"pointer",border:`1px solid ${C.border}`,background:"transparent",color:C.text2}}>↓ CSV</button>
                <button onClick={()=>exportExcel(clients,area)} style={{padding:"6px 12px",borderRadius:7,fontSize:11,cursor:"pointer",background:"#1D6F4222",border:`1px solid #1D6F4244`,color:"#4CAF50",fontWeight:600}}>↓ Excel</button>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                  {[["id","ID"],["seg","Segmento"],["rec","Recência"],["freq","Frequência"],["mon","Valor"],["rs","R"],["fs","F"],["ms","M"]].map(([col,lb])=>(
                    <th key={col} onClick={()=>{if(col==="seg")return;setSort(st=>({col,asc:st.col===col?!st.asc:false}));setTpage(0);}}
                      style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:C.text3,cursor:col!=="seg"?"pointer":"default",whiteSpace:"nowrap",background:sort.col===col?`${area.color}12`:"transparent"}}>
                      {lb}{sort.col===col?(sort.asc?" ↑":" ↓"):""}
                    </th>
                  ))}
                </tr></thead>
                <tbody>{pageD.map((c,i)=>(
                  <tr key={c.id} style={{background:i%2?`${C.bg3}`:"transparent",borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:11,color:C.text2}}>{c.id}</td>
                    <td style={{padding:"8px 10px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:`${colors[c.segIdx]}22`,color:colors[c.segIdx],fontWeight:600}}>{segs[c.segIdx]}</span></td>
                    <td style={{padding:"8px 10px"}}>{c.rec}d</td>
                    <td style={{padding:"8px 10px"}}>{c.freq}x</td>
                    <td style={{padding:"8px 10px",fontWeight:600,color:area.color}}>{fK(c.mon)}</td>
                    <td style={{padding:"8px 10px"}}><ScoreBar v={c.rs} color={area.color}/></td>
                    <td style={{padding:"8px 10px"}}><ScoreBar v={c.fs} color={area.color}/></td>
                    <td style={{padding:"8px 10px"}}><ScoreBar v={c.ms} color={area.color}/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,fontSize:11,color:C.text3}}>
              <span>Página {tpage+1} de {tPages||1} · {filtered.length} registros</span>
              <div style={{display:"flex",gap:6}}>{["← Anterior","Próxima →"].map((lb,di)=>{const dis=di===0?tpage===0:tpage>=tPages-1;return <button key={lb} onClick={()=>setTpage(p=>di===0?Math.max(0,p-1):Math.min(tPages-1,p+1))} disabled={dis} style={{padding:"5px 10px",border:`1px solid ${C.border}`,borderRadius:7,background:"transparent",cursor:dis?"not-allowed":"pointer",opacity:dis?.4:1,fontSize:11,color:C.text2}}>{lb}</button>;})}</div>
            </div>
          </div>}

        </div>
      </div>
    </div>
  );
}

// ── APP ──
export default function App(){
  const [area,setArea]=useState(null);
  const [clients,setClients]=useState([]);
  const [csvName,setCsvName]=useState("");
  const [fileType,setFileType]=useState("csv");
  const [hasCoords,setHasCoords]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleFile=(data,type,name)=>{
    setLoading(true);setError("");
    try{
      let rows=[];
      if(type==="csv"){
        rows=parseCSV(data);
      } else if(type==="excel"){
        rows=parseExcel(new Uint8Array(data));
      }
      if(!rows.length){setError("Arquivo sem dados válidos.");setLoading(false);return;}
      const cols=detectCols(rows);
      if(!cols.idCol||!cols.dateCol||!cols.valCol){setError("Não foi possível identificar as colunas. Verifique o formato.");setLoading(false);return;}
      const built=buildClients(rows,cols,5);
      if(!built.length){setError("Nenhum dado válido encontrado.");setLoading(false);return;}
      const coords=built.some(c=>c.lat&&c.lon);
      setClients(built);setCsvName(name);setFileType(type);setHasCoords(coords);
    }catch(e){setError("Erro ao processar arquivo: "+e.message);}
    setLoading(false);
  };

  if(loading)return(
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"system-ui,sans-serif",background:C.bg,color:C.text}}>
      <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${C.blue},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🌍</div>
      <div style={{fontSize:15,fontWeight:600}}>Processando arquivo...</div>
      <div style={{width:200,height:4,borderRadius:2,background:C.border,overflow:"hidden"}}><div style={{width:"70%",height:"100%",background:`linear-gradient(90deg,${C.blue},${C.cyan})`,borderRadius:2}}/></div>
    </div>
  );

  if(!area)return <AreaSelector onSelect={setArea}/>;
  if(!clients.length)return(
    <>
      <UploadScreen area={area} onFile={handleFile} onBack={()=>setArea(null)}/>
      {error&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.red,color:"#fff",padding:"10px 20px",borderRadius:10,fontSize:12,fontWeight:600,zIndex:9999}}>{error}</div>}
    </>
  );
  return <Dashboard clients={clients} area={area} csvName={csvName} fileType={fileType} hasCoords={hasCoords}
    onNewFile={()=>setClients([])}
    onBack={()=>{setArea(null);setClients([]);setCsvName("");setHasCoords(false);}}/>;
}
