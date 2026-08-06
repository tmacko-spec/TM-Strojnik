const KEYS={m:'tm3-machines',s:'tm3-service',i:'tm3-inspections',l:'tm3-logbook',j:'tm6-jobs',f:'tm6-fuel',q:'tm10-shifts',c:'tm11-consumables',sec:'tm13-security',op:'tm22-operators',wt:'tm22-worktypes',lp:'tm22-lastprefs',cu:'tm24-customers'};
const defaults=[
 {id:'jcb',category:'machine',brand:'JCB',model:'3CX Contractor',type:'Rypadlo-nakladač',year:'2011',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:'Motor Dieselmax'},
 {id:'takeuchi',category:'machine',brand:'Takeuchi',model:'TB230',type:'Minirypadlo',year:'2018',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:''},
 {id:'hamm',category:'machine',brand:'HAMM',model:'HD 10',type:'Vibrační válec',year:'2005',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:'Motor Deutz'}
];
const state={route:'home',selected:'',machineSearch:'',machines:load(KEYS.m,defaults),service:load(KEYS.s,[]),inspections:load(KEYS.i,[]),logbook:load(KEYS.l,[]),jobs:load(KEYS.j,[]),fuel:load(KEYS.f,[]),shifts:load(KEYS.q,[]),consumables:load(KEYS.c,[]),security:load(KEYS.sec,{enabled:false,pinHash:'',locked:false}),operators:load(KEYS.op,[]),workTypes:load(KEYS.wt,['Výkopové práce','Nakládání','Hutnění','Demolice','Doprava','Údržba']),lastPrefs:load(KEYS.lp,{}),customers:load(KEYS.cu,[]),ocrDraft:null};

function load(k,f){try{return JSON.parse(localStorage.getItem(k))||structuredClone(f)}catch{return structuredClone(f)}}
function save(){localStorage.setItem(KEYS.m,JSON.stringify(state.machines));localStorage.setItem(KEYS.s,JSON.stringify(state.service));localStorage.setItem(KEYS.i,JSON.stringify(state.inspections));localStorage.setItem(KEYS.l,JSON.stringify(state.logbook));localStorage.setItem(KEYS.j,JSON.stringify(state.jobs));localStorage.setItem(KEYS.f,JSON.stringify(state.fuel));localStorage.setItem(KEYS.q,JSON.stringify(state.shifts));localStorage.setItem(KEYS.c,JSON.stringify(state.consumables));localStorage.setItem(KEYS.sec,JSON.stringify(state.security));localStorage.setItem(KEYS.op,JSON.stringify(state.operators));localStorage.setItem(KEYS.wt,JSON.stringify(state.workTypes));localStorage.setItem(KEYS.lp,JSON.stringify(state.lastPrefs));localStorage.setItem(KEYS.cu,JSON.stringify(state.customers))}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function formatDateCs(value){
  if(!value)return '—';
  const d=new Date(value+'T00:00:00');
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString('cs-CZ');
}
function daysSince(value){
  if(!value)return null;
  const d=new Date(value+'T00:00:00');
  if(Number.isNaN(d.getTime()))return null;
  return Math.floor((Date.now()-d.getTime())/86400000);
}


function isVehicle(machine){
  if(machine.category==='vehicle')return true;
  if(machine.category==='machine')return false;
  const text=`${machine.type||''} ${machine.brand||''} ${machine.model||''}`.toLocaleLowerCase('cs-CZ');
  return /(auto|automobil|dodáv|dodav|vozid|osobní|osobni|náklad|naklad|truck|van|boxer|ranger|mondeo|man)/.test(text);
}
function homeMachineCard(m){
  const status=machineStatus(m);
  const isAuto=isVehicle(m);
  const unit=isAuto?'km':'MTH';
  const icon=isAuto?'🚐':'🚜';
  return `<article class="home-machine-card ${status.level}">
    <div class=home-machine-head>
      <div class=home-machine-icon>${icon}</div>
      <div><h3>${esc(m.brand)} ${esc(m.model)}</h3><p>${esc(m.type|| (isAuto?'Automobil':'Stavební stroj'))}</p></div>
    </div>
    <div class="machine-status ${status.level}"><span class=status-dot></span><b>${status.label}</b></div>
    <div class=home-machine-meter><small>${isAuto?'Kilometry':'Motohodiny'}</small><strong>${esc(m.hours||'—')} ${unit}</strong></div>
    <div class=home-machine-actions>
      <button class=shift-start-small data-shift-machine="${m.id}">▶ Začít směnu</button>
      <button class=dark data-machine-detail="${m.id}">📖 Otevřít kartu</button>
      <button class=fuel-button data-fuel-form="${m.id}">⛽ Tankování</button>
    </div>
  </article>`;
}

function hasRealDefect(value){
  const text=String(value||'').trim().toLocaleLowerCase('cs-CZ');
  if(!text)return false;
  const noDefectPhrases=[
    'bez závad','bez zavád','bez zavad','bez závady','bez zavady',
    'žádná závada','zadna zavada','žádné závady','zadne zavady',
    'v pořádku','v poradku','ok','není závada','neni zavada'
  ];
  return !noDefectPhrases.includes(text);
}

function machineStatus(machine){
  const logs=state.logbook.filter(x=>x.machineId===machine.id);
  const latestDefect=logs.find(x=>x.outOfService||hasRealDefect(x.defect));
  const future=state.inspections.filter(x=>x.machineId===machine.id&&x.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const today=new Date();today.setHours(0,0,0,0);
  const currentHours=Number(machine.hours)||0;
  const interval=Number(machine.serviceInterval)||0;
  const lastService=Number(machine.lastServiceHours)||0;
  const serviceRemaining=interval>0&&currentHours>0?(lastService+interval-currentHours):null;
  let level='ok',label='Stroj v pořádku';
  if(latestDefect?.outOfService){level='bad';label='Stroj mimo provoz';}
  else if(hasRealDefect(latestDefect?.defect)){level='warn';label='Nahlášená závada';}
  if(serviceRemaining!==null){
    if(serviceRemaining<0){level='bad';label='Servis po termínu';}
    else if(serviceRemaining<=50&&level==='ok'){level='warn';label='Blíží se servis';}
  }
  if(future){
    const date=new Date(future.date+'T00:00:00');
    const diff=Math.ceil((date-today)/86400000);
    if(diff<0){level='bad';label='Prohlídka po termínu';}
    else if(diff<=30&&level==='ok'){level='warn';label='Blíží se prohlídka';}
  }
  return {level,label,nextInspection:future,serviceRemaining};
}

async function hashPin(pin){const d=new TextEncoder().encode(String(pin));const h=await crypto.subtle.digest('SHA-256',d);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function lockApp(){if(state.security.enabled){state.security.locked=true;save();render()}}
function activeShift(){return state.shifts.find(s=>s.status==='active')||null}
function go(route,id=''){state.route=route;if(id)state.selected=id;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state.security.enabled){state.security.locked=true;save();}});
render();scrollTo(0,0)}
function title(){return({home:'TM-Strojník',machines:'Moje stroje',machineDetail:'Karta stroje',machineForm:'Stroj',service:'Servisní kniha',inspections:'Prohlídky',inspectionForm:'Nová prohlídka',backup:'Záloha dat',logbook:'Provozní deník',logForm:'Nový záznam',logReport:'Výstup pro kontrolu',jobs:'Zakázky',jobForm:'Nová zakázka',fuel:'PHM a tankování',fuelForm:'Nové tankování',shiftStart:'Začít směnu',shiftActive:'Probíhající směna',shiftEnd:'Ukončit směnu',shifts:'Směny',serviceSupplies:'Filtry a kapaliny',supplyForm:'Přidat položku',alerts:'Upozornění',security:'Zabezpečení',machineSettings:'Nastavení stroje'})[state.route]||'TM-Strojník'}

function shell(content){
  const head=state.route==='home'
    ? `<header class=header>
      <div class=brand-redesign>
        <div class=app-mark><span>TM</span><small>STROJNÍK</small></div>
        <div class=company-logo-wrap>
          <img src="logo.png" alt="Tomáš Macko">
        </div>
      </div>
      <p class=header-subtitle>Evidence stavebních strojů a automobilů</p>
    </header>`
    : `<header class=topbar><button data-go=home>← Domů</button><h2>${title()}</h2><span></span></header>`;
  return `<main class=app>${head}<section class=content>${content}</section></main>`;
}

function tile(cls,icon,t,s,r){return `<button class="tile ${cls}" data-go="${r}"><span class=icon>${icon}</span><span><b>${t}</b><br><small>${s}</small></span></button>`}


function parseOcrNumber(text){
 const cleaned=String(text||'').replace(/\s/g,'').replace(/,/g,'.');
 const candidates=cleaned.match(/\d{2,}(?:\.\d+)?/g)||[];
 if(!candidates.length)return '';
 return candidates.sort((a,b)=>b.replace(/\D/g,'').length-a.replace(/\D/g,'').length)[0];
}
function parseReceiptText(text){
 const raw=String(text||'');
 const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const upper=raw.toLocaleUpperCase('cs-CZ');

 const dateMatch=raw.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/);
 let date='';
 if(dateMatch){
   let year=dateMatch[3]; if(year.length===2)year='20'+year;
   date=`${year}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`;
 }

 const litersPatterns=[
   /(\d+[.,]\d+)\s*(?:L|LITR|LITRY|LITRŮ)\b/i,
   /MNO[ŽZ]STV[IÍ]\s*[:\-]?\s*(\d+[.,]\d+)/i
 ];
 let liters='';
 for(const p of litersPatterns){const m=raw.match(p);if(m){liters=m[1].replace(',','.');break;}}

 const totalPatterns=[
   /(?:CELKEM|TOTAL|K\s*ÚHRADĚ|K UHRADE)\s*[:\-]?\s*(\d[\d\s]*[.,]?\d*)\s*(?:KČ|CZK)?/i,
   /(\d[\d\s]*[.,]\d{2})\s*(?:KČ|CZK)\b/i
 ];
 let total='';
 for(const p of totalPatterns){const m=raw.match(p);if(m){total=m[1].replace(/\s/g,'').replace(',','.');break;}}

 const stationCandidates=['ORLEN','BENZINA','MOL','SHELL','OMV','EUROWAG','TANK ONO','ONO','EUROOIL','ROBIN OIL','KM-PRONA'];
 let station=stationCandidates.find(s=>upper.includes(s))||lines[0]||'';

 let pricePerLiter='';
 if(liters&&total&&Number(liters)>0)pricePerLiter=(Number(total)/Number(liters)).toFixed(2);

 return {date,liters,total,pricePerLiter,station,text:raw};
}
async function runTesseract(file,mode,progressEl){
 if(!window.Tesseract)throw new Error('OCR knihovna se nenačetla. Zkontroluj internetové připojení.');
 const options={
   logger:m=>{
     if(progressEl&&m.status){
       const pct=m.progress?` ${Math.round(m.progress*100)} %`:'';
       progressEl.textContent=`${m.status}${pct}`;
     }
   }
 };
 if(mode==='meter'){
   options.tessedit_char_whitelist='0123456789.,';
 }
 const result=await Tesseract.recognize(file,'eng',options);
 return result.data.text||'';
}

function home(){
 const due=state.inspections.filter(x=>x.date&&new Date(x.date)<=new Date(Date.now()+30*86400000)).length;
 const alertsCount=state.machines.filter(m=>machineStatus(m).level!=='ok').length;
 const active=activeShift();
 const machines=state.machines.filter(m=>!isVehicle(m));
 const vehicles=state.machines.filter(m=>isVehicle(m));
 const securityText=state.security.enabled?'Zapnuto':'Vypnuto';
 return `${active?`<div class=active-shift-banner><div><small>Probíhající směna</small><b>${esc((state.machines.find(m=>m.id===active.machineId)?.brand||'')+' '+(state.machines.find(m=>m.id===active.machineId)?.model||''))}</b><span>${esc(active.operator)} · ${esc(active.job||'Bez zakázky')}</span></div><button class=shift-stop data-go=shiftEnd>Ukončit směnu</button></div>`:''}
 <div class=home-quick>
   <button data-go=alerts><span>⚠️</span><b>${alertsCount}</b><small>Upozornění</small></button>
   <button data-go=inspections><span>📅</span><b>${due}</b><small>Prohlídky</small></button>
   <button data-go=security><span>🔒</span><b>${securityText}</b><small>Zabezpečení</small></button>
 </div>
 <div class=ocr-home-actions><button data-go=ocrMeter>📷 Načíst MTH / km z fotografie</button><button data-go=ocrReceipt>🧾 Načíst účtenku za tankování</button></div><div class=home-toolbar><button class=secondary data-new-machine>＋ Přidat techniku</button><button class=secondary data-go=shifts>🕒 Historie směn</button><button class=secondary data-go=backup>💾 Záloha</button></div>
 <div class=machine-search><input id=homeMachineSearch type=search placeholder="Hledat stroj nebo automobil…" value="${esc(state.machineSearch)}"></div>
 <section class=home-section><h2>🚜 Stavební stroje</h2><div class=home-machine-grid>${(state.machineSearch?machines.filter(m=>`${m.brand} ${m.model} ${m.type} ${m.serial}`.toLocaleLowerCase('cs-CZ').includes(state.machineSearch.toLocaleLowerCase('cs-CZ'))):machines).map(homeMachineCard).join('')||'<div class="card empty">Žádné stavební stroje.</div>'}</div></section>
 <section class=home-section><h2>🚐 Automobily</h2><div class=home-machine-grid>${(state.machineSearch?vehicles.filter(m=>`${m.brand} ${m.model} ${m.type} ${m.serial}`.toLocaleLowerCase('cs-CZ').includes(state.machineSearch.toLocaleLowerCase('cs-CZ'))):vehicles).map(homeMachineCard).join('')||'<div class="card empty">Žádné automobily.</div>'}</div></section>
 <div class=home-links><button data-go=jobs>📋 Zakázky</button><button data-go=logbook>📘 Provozní deník</button><button data-go=lists>👷 Číselníky</button><button data-go=reports>📊 Náklady</button></div>
 <div class=footer>TM-Strojník v2.6.1</div>`;
}


function ocrMeter(){
 return `<div class=notice><h3>📷 Načíst MTH nebo km</h3><p>Vyber techniku, vyfoť displej co nejrovněji a číslice vyplň celý záběr. Po rozpoznání hodnotu zkontroluj.</p></div>
 <form id=ocrMeterForm>
  <div class=group><label>Technika</label><select name=machineId required><option value="">Vyber techniku</option>${state.machines.map(m=>`<option value="${m.id}" ${state.selected===m.id?'selected':''}>${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>
  <div class=group><label>Fotografie displeje</label><input name=image id=meterImage type=file accept="image/*" capture=environment required></div>
  <button class=primary type=submit>Rozpoznat hodnotu</button>
 </form>
 <div id=ocrProgress class=ocr-progress></div>
 <div id=ocrMeterResult></div>`;
}

function ocrReceipt(){
 return `<div class=notice><h3>🧾 Načíst účtenku</h3><p>Vyfoť celou účtenku na rovném podkladu a v dobrém světle. Rozpoznané údaje vždy zkontroluj.</p></div>
 <form id=ocrReceiptForm>
  <div class=group><label>Technika</label><select name=machineId required><option value="">Vyber techniku</option>${state.machines.map(m=>`<option value="${m.id}" ${state.selected===m.id?'selected':''}>${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>
  <div class=group><label>Fotografie účtenky</label><input name=image id=receiptImage type=file accept="image/*" capture=environment required></div>
  <button class=primary type=submit>Rozpoznat účtenku</button>
 </form>
 <div id=ocrProgress class=ocr-progress></div>
 <div id=ocrReceiptResult></div>`;
}


function machineCard(m){
 const status=machineStatus(m);
 const fuelEntries=state.fuel.filter(x=>x.machineId===m.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const lastFuel=fuelEntries[0];
 const lastFuelDays=lastFuel?daysSince(lastFuel.date):null;
 const fuelCost=fuelEntries.reduce((s,f)=>s+(Number(f.total)||0),0);
 return `<article class="card machine"><div class=head><div class=badge>🚜</div><div><h3>${esc(m.brand)} ${esc(m.model)}</h3><p>${esc(m.type||'Stavební stroj')}</p></div></div>
 <div class=grid><div class=info><small>Rok</small><b>${esc(m.year||'—')}</b></div><div class=info><small>Motohodiny</small><b>${esc(m.hours||'—')}</b></div></div>
 <div class="machine-status ${status.level}"><span class=status-dot></span><b>${status.label}</b></div>
 <div class=machine-overview>
  <div><small>Poslední tankování</small><b>${lastFuelDays===null?'—':lastFuelDays===0?'dnes':lastFuelDays===1?'včera':`před ${lastFuelDays} dny`}</b></div>
  <div><small>Do servisu</small><b>${status.serviceRemaining===null?'—':status.serviceRemaining<0?`${Math.abs(status.serviceRemaining)} MTH po termínu`:`${status.serviceRemaining} MTH`}</b></div>
  <div><small>Další prohlídka</small><b>${status.nextInspection?formatDateCs(status.nextInspection.date):'—'}</b></div>
 </div>
 ${m.serial?`<p class=muted><b>Výrobní číslo:</b> ${esc(m.serial)}</p>`:''}${m.note?`<p class=muted>${esc(m.note)}</p>`:''}
 <div class=actions><button class=dark data-machine-detail="${m.id}">Otevřít kartu</button><button class=fuel-button data-fuel-form="${m.id}">⛽ Tankování</button><button class=service-button data-service="${m.id}">🔧 Servis</button><button class=secondary data-machine-settings="${m.id}">⚙️ Nastavení</button></div></article>`;
}
function machines(){
 const q=state.machineSearch.trim().toLocaleLowerCase('cs-CZ');
 const visible=q?state.machines.filter(m=>`${m.brand} ${m.model} ${m.type} ${m.serial}`.toLocaleLowerCase('cs-CZ').includes(q)):state.machines;
 return `<button class=primary data-new-machine>＋ Přidat nový stroj</button>
 <div class=machine-search><input id=machineSearch type=search placeholder="Hledat značku, model nebo výrobní číslo…" value="${esc(state.machineSearch)}"></div>
 <h2 class=section-title>Moje stroje</h2>${visible.length?visible.map(machineCard).join(''):'<div class="card empty">Nenalezen žádný stroj.</div>'}`;
}


function machineTimeline(machineId){
 const events=[];

 state.shifts.filter(x=>x.machineId===machineId).forEach(s=>{
   events.push({
     date:s.endedAt||s.startedAt||s.date,
     icon:s.status==='active'?'▶️':'⏹️',
     type:s.status==='active'?'Probíhající směna':'Ukončená směna',
     title:s.operator||'Obsluha neuvedena',
     text:[s.customer,s.job,s.work,`${formatClock(s.startTime||s.startedAt)}–${formatClock(s.endTime||s.endedAt)}`,s.workedHours?`${s.workedHours} MTH`:null].filter(Boolean).join(' · '),
     level:s.status==='active'?'info':'ok'
   });
 });

 state.fuel.filter(x=>x.machineId===machineId).forEach(f=>{
   events.push({
     date:f.date,
     icon:'⛽',
     type:'Tankování',
     title:`${Number(f.liters||0).toLocaleString('cs-CZ')} l ${f.fuelType||''}`.trim(),
     text:[f.station,Number(f.total||0)?`${Number(f.total).toLocaleString('cs-CZ')} Kč`:null,f.hours?`${f.hours} MTH`:null].filter(Boolean).join(' · '),
     level:'fuel'
   });
 });

 state.service.filter(x=>x.machineId===machineId).forEach(s=>{
   events.push({
     date:s.date,
     icon:'🔧',
     type:s.category||'Servis',
     title:s.description||'Servisní zásah',
     text:[s.parts,s.cost?`${Number(s.cost).toLocaleString('cs-CZ')} Kč`:null,s.hours?`${s.hours} MTH`:null].filter(Boolean).join(' · '),
     level:'service'
   });
 });

 state.inspections.filter(x=>x.machineId===machineId).forEach(i=>{
   events.push({
     date:i.date,
     icon:'📅',
     type:'Prohlídka / termín',
     title:i.type||'Prohlídka',
     text:i.note||'',
     level:new Date(i.date+'T00:00:00')<new Date()?'bad':'info'
   });
 });

 state.logbook.filter(x=>x.machineId===machineId&&(hasRealDefect(x.defect)||x.outOfService||x.maintenance)).forEach(l=>{
   if(hasRealDefect(l.defect)||l.outOfService){
     events.push({
       date:l.date,
       icon:'⚠️',
       type:l.outOfService?'Stroj mimo provoz':'Nahlášená závada',
       title:l.defect||'Stroj byl odstaven',
       text:l.note||'',
       level:'bad'
     });
   }else if(l.maintenance){
     events.push({
       date:l.date,
       icon:'🧰',
       type:'Provozní údržba',
       title:l.maintenance,
       text:l.note||'',
       level:'service'
     });
   }
 });

 return events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}

function timelineDate(value){
 if(!value)return 'Bez data';
 const d=new Date(value.length===10?value+'T12:00:00':value);
 if(Number.isNaN(d.getTime()))return value;
 const today=new Date();today.setHours(0,0,0,0);
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 const day=new Date(d);day.setHours(0,0,0,0);
 if(day.getTime()===today.getTime())return 'Dnes';
 if(day.getTime()===yesterday.getTime())return 'Včera';
 return d.toLocaleDateString('cs-CZ');
}


function monthKey(value){
 const d=String(value||'');
 return /^\d{4}-\d{2}/.test(d)?d.slice(0,7):'';
}
function monthLabel(key){
 if(!key)return 'Bez data';
 const [y,m]=key.split('-');
 return new Date(Number(y),Number(m)-1,1).toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});
}
function machineCostSummary(machineId){
 const fuel=state.fuel.filter(x=>x.machineId===machineId);
 const service=state.service.filter(x=>x.machineId===machineId);
 const shifts=state.shifts.filter(x=>x.machineId===machineId&&x.status==='closed');
 const fuelCost=fuel.reduce((s,x)=>s+(Number(x.total)||0),0);
 const serviceCost=service.reduce((s,x)=>s+(Number(x.cost)||0),0);
 const worked=shifts.reduce((s,x)=>s+(Number(x.workedHours)||0),0);
 const total=fuelCost+serviceCost;
 return {fuelCost,serviceCost,total,worked,costPerHour:worked>0?total/worked:0};
}
function monthlyMachineStats(machineId){
 const rows={};
 const ensure=k=>rows[k]||(rows[k]={fuel:0,service:0,hours:0});
 state.fuel.filter(x=>x.machineId===machineId).forEach(x=>{const k=monthKey(x.date);ensure(k).fuel+=Number(x.total)||0});
 state.service.filter(x=>x.machineId===machineId).forEach(x=>{const k=monthKey(x.date);ensure(k).service+=Number(x.cost)||0});
 state.shifts.filter(x=>x.machineId===machineId&&x.status==='closed').forEach(x=>{const k=monthKey(x.date);ensure(k).hours+=Number(x.workedHours)||0});
 return Object.entries(rows).sort((a,b)=>b[0].localeCompare(a[0]));
}

function machineDetail(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Stroj nebyl nalezen.</div>`;
 const status=machineStatus(m);
 const machineFuel=state.fuel.filter(x=>x.machineId===m.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const machineService=state.service.filter(x=>x.machineId===m.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const machineLogs=state.logbook.filter(x=>x.machineId===m.id);
 const lastFuel=machineFuel[0];
 const lastShift=[...state.shifts].filter(x=>x.machineId===m.id&&x.status==='closed').sort((a,b)=>String(b.endedAt||b.date).localeCompare(String(a.endedAt||a.date)))[0];
 const openFaults=machineLogs.filter(x=>x.outOfService||hasRealDefect(x.defect)).length;
 const timeline=machineTimeline(m.id);
 const grouped={};
 timeline.forEach(e=>{const key=timelineDate(e.date);(grouped[key] ||= []).push(e)});

 return `<article class="machine-hero ${status.level}">
   <div class=machine-hero-main><div class=machine-hero-icon>${isVehicle(m)?'🚐':'🚜'}</div><div><small>${esc(m.type||'Technika')}</small><h2>${esc(m.brand)} ${esc(m.model)}</h2><span class="machine-status ${status.level}"><span class=status-dot></span><b>${status.label}</b></span></div></div>
   <div class=machine-hero-meter><small>${isVehicle(m)?'Aktuální km':'Aktuální MTH'}</small><strong>${esc(m.hours||'—')}</strong></div>
 </article>

 <div class=detail-indicators>
   <div><span>🔧</span><small>Do servisu</small><b>${status.serviceRemaining===null?'—':status.serviceRemaining<0?`${Math.abs(status.serviceRemaining)} po termínu`:`${status.serviceRemaining} MTH`}</b></div>
   <div><span>⛽</span><small>Poslední tankování</small><b>${lastFuel?formatDateCs(lastFuel.date):'—'}</b></div>
   <div><span>🕒</span><small>Poslední směna</small><b>${lastShift?formatDateCs(lastShift.date):'—'}</b></div>
   <div><span>⚠️</span><small>Záznamy závad</small><b>${openFaults}</b></div>
 </div>

 <div class=detail-quick-actions>
   <button class=shift-start-small data-shift-machine="${m.id}">▶ Začít směnu</button>
   <button class=fuel-button data-fuel-form="${m.id}">⛽ Tankování</button>
   <button class=service-button data-service="${m.id}">🔧 Servis</button>
   <button class=fault-button data-fault="${m.id}">⚠️ Závada</button>
 </div>

 <div class=detail-links>
   <button data-log="${m.id}">📘 Provozní deník</button>
   <button data-inspections="${m.id}">📅 Prohlídky</button>
   <button data-go=serviceSupplies>🧰 Filtry a kapaliny</button>
   <button data-go=machineStats>📊 Náklady a statistiky</button><button data-machine-settings="${m.id}">⚙️ Nastavení</button>
 </div>

 <h2 class=section-title>Časová osa stroje</h2>
 <div class=timeline>${timeline.length?Object.entries(grouped).map(([date,items])=>`<section class=timeline-day><h3>${esc(date)}</h3>${items.map(e=>`<article class="timeline-event ${e.level}"><div class=timeline-icon>${e.icon}</div><div><small>${esc(e.type)}</small><h4>${esc(e.title)}</h4>${e.text?`<p>${esc(e.text)}</p>`:''}</div></article>`).join('')}</section>`).join(''):'<div class="card empty">Zatím nejsou žádné události.</div>'}</div>`;
}

function faultForm(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Nejdříve vyber techniku.</div>`;
 return `<form id=faultForm><div class=notice><b>Technika:</b> ${esc(m.brand)} ${esc(m.model)}</div>
 <div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}" required></div>
 <div class=group><label>Popis závady</label><textarea name=defect placeholder="Popiš závadu co nejpřesněji" required></textarea></div>
 <div class=group><label>Poznámka</label><textarea name=note placeholder="Kdy se závada projevuje, co bylo zkontrolováno…"></textarea></div>
 <label class=check><input type=checkbox name=outOfService><span><b>Odstavit stroj mimo provoz</b></span></label>
 <button class=fault-button type=submit style="width:100%;margin-top:12px">⚠️ Uložit závadu</button></form>`;
}

function field(n,l,p,t='text',v=''){return `<div class=group><label>${l}</label><input name="${n}" type="${t}" placeholder="${p}" value="${esc(v)}"></div>`}

function machineSettings(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Stroj nebyl nalezen.</div>`;
 return `<div class=notice><h3>⚙️ Nastavení stroje</h3><p><b>${esc(m.brand)} ${esc(m.model)}</b></p><p>Zde můžeš upravit údaje nebo stroj odstranit. Odstranění smaže také jeho servis, provozní deník, tankování, zakázky, prohlídky a katalog filtrů.</p></div>
 <button class=primary data-edit="${m.id}" style="margin-top:12px">✏️ Upravit údaje stroje</button>
 <div class="card danger-zone"><h3>Nebezpečná zóna</h3><p>Odstranění stroje je nevratné. Před odstraněním doporučuji stáhnout zálohu.</p><button class=danger data-delete="${m.id}">🗑️ Odstranit stroj</button></div>`;
}

function machineForm(){
 const m=state.machines.find(x=>x.id===state.selected)||{};
 const category=m.category||(isVehicle(m)?'vehicle':'machine');
 const vehicle=category==='vehicle';
 return `<form id=machineForm><input type=hidden name=id value="${esc(m.id||'')}">
 <div class=group>
  <label>Je to stavební stroj, nebo automobil? *</label>
  <div class=category-picker>
   <label class="category-option ${category==='machine'?'selected':''}">
    <input type=radio name=category value=machine ${category==='machine'?'checked':''} required>
    <span class=category-icon>🚜</span><b>Stavební stroj</b>
   </label>
   <label class="category-option ${category==='vehicle'?'selected':''}">
    <input type=radio name=category value=vehicle ${category==='vehicle'?'checked':''} required>
    <span class=category-icon>🚐</span><b>Automobil</b>
   </label>
  </div>
 </div>
 ${field('brand','Značka *',vehicle?'např. Peugeot':'např. Takeuchi','text',m.brand||'')}
 ${field('model','Model *',vehicle?'např. Boxer':'např. TB230','text',m.model||'')}
 ${field('type',vehicle?'Typ automobilu':'Typ stavebního stroje',vehicle?'např. Dodávka':'např. Minirypadlo','text',m.type||'')}
 ${field('year','Rok výroby','2018','number',m.year||'')}
 ${field('hours',vehicle?'Kilometry':'Motohodiny','0','number',m.hours||'')}
 ${field('serial',vehicle?'VIN / SPZ':'Výrobní číslo / VIN','volitelné','text',m.serial||'')}
 <div class=grid>${field('serviceInterval',vehicle?'Servisní interval km':'Servisní interval MTH',vehicle?'20000':'500','number',m.serviceInterval||'')}${field('lastServiceHours',vehicle?'Poslední servis při km':'Poslední servis při MTH','0','number',m.lastServiceHours||'')}</div>
 <div class=group><label>Poznámka</label><textarea name=note>${esc(m.note||'')}</textarea></div>
 <button class=primary>Uložit změny</button></form>`;
}


function lockScreen(){return `<main class=lock-screen><section class=lock-card><div class=lock-logo>TM</div><h1>TM-Strojník</h1><p>Evidence stavebních strojů a automobilů</p><form id=unlockForm><div class=group><label>PIN</label><input name=pin type=password inputmode=numeric maxlength=8 required autofocus></div><button class=primary>Odemknout</button></form><small>Základní ochrana zařízení. Plné zabezpečení bude řešit Firebase.</small></section></main>`}
function security(){const e=state.security.enabled;return `<div class=notice><h3>🔒 Zabezpečení aplikace</h3><p>PIN chrání aplikaci na tomto zařízení.</p></div>${e?`<div class="card security-card"><span class="security-state on">PIN je zapnutý</span><p>Aplikace se po přepnutí na pozadí zamkne.</p><button class=dark id=lockNow>🔒 Zamknout nyní</button></div><form id=changePinForm class="card security-card"><h3>Změnit PIN</h3><div class=group><label>Současný PIN</label><input name=currentPin type=password inputmode=numeric maxlength=8 required></div><div class=group><label>Nový PIN</label><input name=newPin type=password inputmode=numeric maxlength=8 required></div><div class=group><label>Nový PIN znovu</label><input name=newPin2 type=password inputmode=numeric maxlength=8 required></div><button class=primary>Změnit PIN</button></form><button class=danger id=disablePin>Vypnout ochranu PINem</button>`:`<form id=enablePinForm class="card security-card"><h3>Nastavit PIN</h3><div class=group><label>Nový PIN</label><input name=pin type=password inputmode=numeric maxlength=8 required></div><div class=group><label>PIN znovu</label><input name=pin2 type=password inputmode=numeric maxlength=8 required></div><button class=primary>Zapnout ochranu PINem</button></form>`}`}

function alerts(){
 const items=[];
 const today=new Date();today.setHours(0,0,0,0);
 state.machines.forEach(machine=>{
   const status=machineStatus(machine);
   if(status.serviceRemaining!==null){
     if(status.serviceRemaining<0)items.push({level:'bad',icon:'🔧',title:`${machine.brand} ${machine.model}`,text:`Servis překročen o ${Math.abs(status.serviceRemaining)} MTH`});
     else if(status.serviceRemaining<=50)items.push({level:'warn',icon:'🔧',title:`${machine.brand} ${machine.model}`,text:`Servis za ${status.serviceRemaining} MTH`});
   }
 });
 state.inspections.forEach(item=>{
   if(!item.date)return;
   const machine=state.machines.find(m=>m.id===item.machineId);
   const diff=Math.ceil((new Date(item.date+'T00:00:00')-today)/86400000);
   if(diff<0)items.push({level:'bad',icon:'📅',title:machine?`${machine.brand} ${machine.model}`:'Neznámý stroj',text:`${item.type} je ${Math.abs(diff)} dní po termínu`});
   else if(diff<=30)items.push({level:'warn',icon:'📅',title:machine?`${machine.brand} ${machine.model}`:'Neznámý stroj',text:`${item.type} za ${diff} dní`});
 });
 state.logbook.forEach(log=>{
   if(log.outOfService||hasRealDefect(log.defect)){
     const machine=state.machines.find(m=>m.id===log.machineId);
     items.push({level:log.outOfService?'bad':'warn',icon:'⚠️',title:machine?`${machine.brand} ${machine.model}`:'Neznámý stroj',text:log.outOfService?'Stroj je označen jako mimo provoz':`Závada: ${log.defect}`});
   }
 });
 const active=activeShift();
 if(active){
   const machine=state.machines.find(m=>m.id===active.machineId);
   items.push({level:'info',icon:'🕒',title:machine?`${machine.brand} ${machine.model}`:'Probíhající směna',text:`Aktivní směna – ${active.operator}`});
 }
 return `<div class=alerts-summary><div><strong>${items.filter(x=>x.level==='bad').length}</strong><span>Kritická</span></div><div><strong>${items.filter(x=>x.level==='warn').length}</strong><span>Blízká</span></div><div><strong>${items.filter(x=>x.level==='info').length}</strong><span>Informace</span></div></div><h2 class=section-title>Aktuální upozornění</h2>${items.length?items.map(item=>`<article class="card alert-card ${item.level}"><div class=alert-icon>${item.icon}</div><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join(''):'<div class="card empty">Momentálně nejsou žádná upozornění.</div>'}`;
}

function serviceTabs(active){
 return `<div class=service-tabs><button class="${active==='history'?'active':''}" data-go=service>🔧 Historie servisu</button><button class="${active==='supplies'?'active':''}" data-go=serviceSupplies>🧰 Filtry a kapaliny</button></div>`;
}

function service(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.service.filter(x=>x.machineId===selected.id):state.service;
 const totalCost=visible.reduce((s,x)=>s+(Number(x.cost)||0),0);
 return `${serviceTabs('history')}<h2 class=section-title>Vyber stroj</h2><div class=chips>${state.machines.map(m=>`<button class="chip ${selected?.id===m.id?'on':''}" data-select="${m.id}">${esc(m.brand)} ${esc(m.model)}</button>`).join('')}</div>
 ${selected?`<div class=summary-grid><div class=summary-box><small>Servisní záznamy</small><strong>${visible.length}</strong></div><div class=summary-box><small>Náklady na servis</small><strong>${totalCost.toLocaleString('cs-CZ')} Kč</strong></div></div>`:''}
 <form id=serviceForm><div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}"></div>
 <div class=grid><div class=group><label>Motohodiny při servisu</label><input name=hours type=number></div><div class=group><label>Náklady v Kč</label><input name=cost type=number></div></div>
 <div class=group><label>Typ servisu</label><select name=category><option>Pravidelný servis</option><option>Oprava</option><option>Výměna oleje a filtrů</option><option>Hydraulika</option><option>Elektro</option><option>Pneumatiky / podvozek</option><option>Jiné</option></select></div>
 <div class=group><label>Použité díly / materiál</label><textarea name=parts placeholder="Filtry, olej, hadice, těsnění…"></textarea></div>
 <div class=group><label>Popis servisního zásahu</label><textarea name=description required></textarea></div>
 <label class=check><input type=checkbox name=resetInterval checked><span>Nastavit tyto motohodiny jako poslední pravidelný servis</span></label>
 <button class=primary style="margin-top:12px">Přidat servisní záznam</button></form>
 <h2 class=section-title>Historie servisu</h2>${visible.length?visible.map(s=>{const m=state.machines.find(x=>x.id===s.machineId);return `<article class="card service"><span class=pill>${esc(s.date)}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><p><b>${esc(s.category||'Servis')}</b></p>${s.hours?`<p><b>Motohodiny:</b> ${esc(s.hours)}</p>`:''}${s.cost?`<p><b>Náklady:</b> <span class=money>${Number(s.cost).toLocaleString('cs-CZ')} Kč</span></p>`:''}${s.parts?`<p><b>Díly / materiál:</b> ${esc(s.parts)}</p>`:''}<p>${esc(s.description)}</p></article>`}).join(''):'<div class="card empty">Žádné servisní záznamy.</div>'}`;
}

function serviceSupplies(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.consumables.filter(x=>x.machineId===selected.id):state.consumables;
 const filters=visible.filter(x=>x.kind==='Filtr');
 const fluids=visible.filter(x=>x.kind==='Kapalina');
 const renderItem=x=>`<article class="card supply-card"><span class="supply-kind ${x.kind==='Filtr'?'filter':'fluid'}">${x.kind==='Filtr'?'🧰 Filtr':'🛢️ Kapalina'}</span><h3>${esc(x.name||x.system||'Položka')}</h3><p><b>Systém / použití:</b> ${esc(x.system||'—')}</p>${x.partNumber?`<p><b>Číslo dílu:</b> <code>${esc(x.partNumber)}</code></p>`:''}${x.manufacturer?`<p><b>Výrobce:</b> ${esc(x.manufacturer)}</p>`:''}${x.specification?`<p><b>Specifikace:</b> ${esc(x.specification)}</p>`:''}${x.quantity?`<p><b>Množství / náplň:</b> ${esc(x.quantity)}</p>`:''}${x.note?`<p class=muted>${esc(x.note)}</p>`:''}<button class=danger data-delete-supply="${x.id}">Odstranit</button></article>`;
 return `${serviceTabs('supplies')}
 <h2 class=section-title>Vyber stroj</h2><div class=chips>${state.machines.map(m=>`<button class="chip ${selected?.id===m.id?'on':''}" data-select-supply="${m.id}">${esc(m.brand)} ${esc(m.model)}</button>`).join('')}</div>
 ${selected?`<div class=notice><b>Stroj:</b> ${esc(selected.brand)} ${esc(selected.model)}<br><span class=muted>Ulož sem katalogová čísla filtrů, typy olejů, chladicí kapaliny a objemy náplní.</span></div>`:'<div class=notice>Nejdříve vyber stroj.</div>'}
 <button class=primary data-go=supplyForm style="margin-top:12px" ${selected?'':'disabled'}>＋ Přidat filtr nebo kapalinu</button>
 <div class=summary-grid><div class=summary-box><small>Filtry</small><strong>${filters.length}</strong></div><div class=summary-box><small>Kapaliny</small><strong>${fluids.length}</strong></div></div>
 <h2 class=section-title>Filtry</h2>${filters.length?filters.map(renderItem).join(''):'<div class="card empty">Nejsou uložená žádná čísla filtrů.</div>'}
 <h2 class=section-title>Kapaliny a náplně</h2>${fluids.length?fluids.map(renderItem).join(''):'<div class="card empty">Nejsou uložené žádné kapaliny.</div>'}`;
}

function supplyForm(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Nejdříve vyber stroj v záložce Filtry a kapaliny.</div>`;
 return `<form id=supplyForm><div class=notice><b>Stroj:</b> ${esc(m.brand)} ${esc(m.model)}</div>
 <div class=group><label>Druh položky</label><select name=kind id=supplyKind><option>Filtr</option><option>Kapalina</option></select></div>
 <div class=group><label>Systém / použití</label><select name=system><option>Motor</option><option>Palivová soustava</option><option>Vzduch</option><option>Hydraulika</option><option>Převodovka</option><option>Nápravy / diferenciál</option><option>Chladicí soustava</option><option>Brzdy</option><option>Kabina</option><option>Jiné</option></select></div>
 ${field('name','Název položky','např. Motorový olej nebo olejový filtr')}
 ${field('partNumber','Číslo filtru / dílu','např. 32/925346')}
 ${field('manufacturer','Výrobce / značka','např. JCB, Mann, Fleetguard, Shell')}
 ${field('specification','Specifikace kapaliny','např. 15W-40 API CK-4, JCB HP46')}
 ${field('quantity','Množství / objem náplně','např. 14 l nebo 1 ks')}
 <div class=group><label>Poznámka</label><textarea name=note placeholder="Alternativní čísla, poznámka k výměně…"></textarea></div>
 <button class=primary>Uložit položku</button></form>`;
}


function inspections(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.inspections.filter(i=>i.machineId===selected.id):state.inspections;
 return `<button class=primary data-go=inspectionForm>＋ Přidat prohlídku</button>${selected?`<div class=notice style="margin-top:12px"><b>Stroj:</b> ${esc(selected.brand)} ${esc(selected.model)}</div>`:''}<h2 class=section-title>Termíny</h2>${visible.length?visible.map(i=>{const m=state.machines.find(x=>x.id===i.machineId);const near=new Date(i.date)<=new Date(Date.now()+30*86400000);return `<article class="card inspection"><small class="${near?'due':'ok'}">${near?'Blízký termín':'Naplánováno'} · ${esc(i.date)}</small><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><p><b>${esc(i.type)}</b></p>${i.note?`<p>${esc(i.note)}</p>`:''}<button class=danger data-delete-inspection="${i.id}">Odstranit</button></article>`}).join(''):'<div class="card empty">Žádné prohlídky.</div>'}`;
}

function inspectionForm(){return `<form id=inspectionForm><div class=group><label>Stroj</label><select name=machineId required><option value="">Vyber stroj</option>${state.machines.map(m=>`<option value="${m.id}" ${state.selected===m.id?'selected':''}>${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>${field('type','Typ prohlídky','např. STK, revize')}<div class=group><label>Datum</label><input name=date type=date required></div><div class=group><label>Poznámka</label><textarea name=note></textarea></div><button class=primary>Uložit prohlídku</button></form>`}


function logbook(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.logbook.filter(x=>x.machineId===selected.id):state.logbook;
 return `<div class=no-print><h2 class=section-title>Vyber stroj</h2><div class=chips>${state.machines.map(m=>`<button class="chip ${selected?.id===m.id?'on':''}" data-log-select="${m.id}">${esc(m.brand)} ${esc(m.model)}</button>`).join('')}</div>
 <div class=actions><button class=primary data-new-log>＋ Nový denní záznam</button><button class=secondary data-go=logReport>🖨️ Výstup k tisku / PDF</button></div>
 <div class=notice style="margin-top:12px"><b>Právní poznámka:</b> Deník je podpůrná provozní evidence. Rozsah kontrol je nutné přizpůsobit návodu výrobce a místnímu provoznímu bezpečnostnímu předpisu.</div></div>
 <h2 class=section-title>Historie provozu</h2>
 ${visible.length?visible.map(l=>{const m=state.machines.find(x=>x.id===l.machineId);const bad=l.defect||l.outOfService;return `<article class="card log-card"><span class="log-status ${bad?'bad':'ok'}">${bad?'Závada / omezení':'Bez závady'}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><div class=log-meta><div><small>Datum</small><br><b>${esc(l.date)}</b></div><div><small>Obsluha</small><br><b>${esc(l.operator||'—')}</b></div><div><small>Začátek MTH</small><br><b>${esc(l.startHours||'—')}</b></div><div><small>Konec MTH</small><br><b>${esc(l.endHours||'—')}</b></div></div><p><b>Zakázka / místo:</b> ${esc(l.job||'—')}</p><p><b>Práce:</b> ${esc(l.work||'—')}</p>${l.defect?`<p class=due><b>Závada:</b> ${esc(l.defect)}</p>`:''}${l.maintenance?`<p><b>Údržba:</b> ${esc(l.maintenance)}</p>`:''}${l.note?`<p><b>Poznámka:</b> ${esc(l.note)}</p>`:''}<button class=danger data-delete-log="${l.id}">Odstranit záznam</button></article>`}).join(''):'<div class="card empty">Zatím nejsou žádné záznamy v provozním deníku.</div>'}`;
}

function logForm(){
 const m=state.machines.find(x=>x.id===state.selected);
 return `<form id=logForm><div class=notice><b>Stroj:</b> ${m?esc(m.brand+' '+m.model):'Nejdříve vyber stroj'}</div>
 <div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}" required></div>
 ${field('operator','Jméno obsluhy','např. Tomáš Macko')}
 ${field('job','Zakázka / místo práce','např. Novák – výkop přípojky')}
 ${field('work','Druh prováděné práce','např. výkop, nakládání, hutnění')}
 <div class=grid>${field('startHours','Počáteční MTH','0','number')}${field('endHours','Konečné MTH','0','number')}</div>
 <h3>Kontrola před zahájením práce</h3>
 <div class=check-grid>
  <label class=check><input type=checkbox name=fluids><span>Provozní kapaliny a palivo</span></label>
  <label class=check><input type=checkbox name=hydraulics><span>Hydraulika a úniky</span></label>
  <label class=check><input type=checkbox name=brakes><span>Brzdy, řízení a ovládání</span></label>
  <label class=check><input type=checkbox name=lights><span>Osvětlení a výstražná zařízení</span></label>
  <label class=check><input type=checkbox name=guards><span>Kryty, bezpečnostní prvky a příslušenství</span></label>
  <label class=check><input type=checkbox name=site><span>Obsluha seznámena s podmínkami pracoviště</span></label>
 </div>
 <div class=group><label>Zjištěné závady</label><textarea name=defect placeholder="Při bezvadném stavu nechej prázdné; jinak popiš závadu"></textarea></div>
 <div class=group><label>Provedená údržba / tankování</label><textarea name=maintenance placeholder="Doplnění PHM, mazání, drobná údržba…"></textarea></div>
 <div class=group><label>Poznámka</label><textarea name=note></textarea></div>
 <label class=check><input type=checkbox name=outOfService><span><b>Stroj odstaven mimo provoz</b></span></label>
 <button class=primary style="margin-top:12px">Uložit záznam</button></form>`;
}

function logReport(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const rows=(selected?state.logbook.filter(x=>x.machineId===selected.id):state.logbook);
 const machineName=selected?`${esc(selected.brand)} ${esc(selected.model)}`:'Všechny stroje';
 return `<div class=no-print><div class=notice><b>Výstup pro případnou kontrolu</b><p>Vyber stroj v provozním deníku a poté zde použij tisk. Na iPhonu/iPadu zvol Sdílet → Tisk → náhled zvětši dvěma prsty → Sdílet → Uložit do Souborů jako PDF.</p></div><button class=primary id=printBtn style="margin-top:12px">🖨️ Tisk / Uložit jako PDF</button></div>
 <div class=print-only><h1>TM-Strojník – Provozní deník stroje</h1><p><b>Stroj:</b> ${machineName}</p><p><b>Datum vytvoření výstupu:</b> ${new Date().toLocaleDateString('cs-CZ')}</p></div>
 <table class=report-table><thead><tr><th>Datum</th><th>Stroj</th><th>Obsluha</th><th>Zakázka / místo</th><th>Práce</th><th>MTH od–do</th><th>Kontrola před prací</th><th>Závady / odstavení</th><th>Údržba / poznámka</th></tr></thead><tbody>${rows.map(l=>{const m=state.machines.find(x=>x.id===l.machineId);const checks=[l.fluids&&'kapaliny',l.hydraulics&&'hydraulika',l.brakes&&'brzdy/řízení',l.lights&&'osvětlení',l.guards&&'kryty',l.site&&'pracoviště'].filter(Boolean).join(', ');return `<tr><td>${esc(l.date)}</td><td>${m?esc(m.brand+' '+m.model):'—'}</td><td>${esc(l.operator||'—')}</td><td>${esc(l.job||'—')}</td><td>${esc(l.work||'—')}</td><td>${esc(l.startHours||'—')}–${esc(l.endHours||'—')}</td><td>${esc(checks||'neuvedeno')}</td><td>${esc(l.defect||'Bez závad')}${l.outOfService?' / MIMO PROVOZ':''}</td><td>${esc([l.maintenance,l.note].filter(Boolean).join(' / ')||'—')}</td></tr>`}).join('')}</tbody></table>
 <p class=muted style="margin-top:12px">Tento výstup nenahrazuje návod výrobce, revizní zprávy ani další povinnou provozní dokumentaci.</p>`;
}



function jobs(){
 const visible=state.selected?state.jobs.filter(j=>j.machineId===state.selected):state.jobs;
 const totalHours=visible.reduce((sum,j)=>sum+(Number(j.hours)||0),0);
 const totalRevenue=visible.reduce((sum,j)=>sum+(Number(j.price)||0),0);
 return `<button class=primary data-go=jobForm>＋ Přidat zakázku</button>
 <div class=summary-grid><div class=summary-box><small>Počet zakázek</small><strong>${state.jobs.length}</strong></div><div class=summary-box><small>Odpracováno</small><strong>${totalHours.toFixed(1)} h</strong></div><div class=summary-box><small>Vyúčtováno</small><strong>${totalRevenue.toLocaleString('cs-CZ')} Kč</strong></div><div class=summary-box><small>Aktivní stroje</small><strong>${new Set(visible.map(j=>j.machineId)).size}</strong></div></div>
 <h2 class=section-title>Historie zakázek</h2>
 ${visible.length?visible.map(j=>{const m=state.machines.find(x=>x.id===j.machineId);return `<article class="card job-card"><span class=pill>${esc(j.date)}</span><h3>${esc(j.customer||'Bez zákazníka')}</h3><p><b>Místo:</b> ${esc(j.place||'—')}</p><p><b>Stroj:</b> ${m?esc(m.brand+' '+m.model):'—'}</p><p><b>Práce:</b> ${esc(j.work||'—')}</p><div class=grid><div class=info><small>Hodiny</small><b>${esc(j.hours||'—')}</b></div><div class=info><small>Cena</small><b class=money>${Number(j.price||0).toLocaleString('cs-CZ')} Kč</b></div></div>${j.note?`<p class=muted>${esc(j.note)}</p>`:''}<button class=danger data-delete-job="${j.id}">Odstranit</button></article>`}).join(''):'<div class="card empty">Zatím nejsou žádné zakázky.</div>'}`;
}

function jobForm(){
 return `<form id=jobForm><div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}" required></div>
 ${field('customer','Zákazník','např. Novák')}
 ${field('place','Místo zakázky','obec, ulice nebo popis')}
 <div class=group><label>Stroj</label><select name=machineId required><option value="">Vyber stroj</option>${state.machines.map(m=>`<option value="${m.id}" ${state.selected===m.id?'selected':''}>${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>
 ${field('work','Druh práce','např. výkop základů')}
 <div class=grid>${field('hours','Odpracované hodiny','0','number')}${field('price','Cena v Kč','0','number')}</div>
 <div class=group><label>Poznámka</label><textarea name=note></textarea></div><button class=primary>Uložit zakázku</button></form>`;
}

function fuel(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.fuel.filter(f=>f.machineId===selected.id):state.fuel;
 const liters=visible.reduce((s,f)=>s+(Number(f.liters)||0),0);
 const cost=visible.reduce((s,f)=>s+(Number(f.total)||0),0);
 return `<button class=primary data-go=fuelForm>＋ Přidat tankování</button>${selected?`<div class=notice style="margin-top:12px"><b>Stroj:</b> ${esc(selected.brand)} ${esc(selected.model)}</div>`:''}
 <div class=summary-grid><div class=summary-box><small>Celkem litrů</small><strong>${liters.toFixed(1)} l</strong></div><div class=summary-box><small>Celkové náklady</small><strong>${cost.toLocaleString('cs-CZ')} Kč</strong></div></div>
 <h2 class=section-title>Historie tankování</h2>
 ${visible.length?visible.map(f=>{const m=state.machines.find(x=>x.id===f.machineId);return `<article class="card fuel-card"><span class=pill>${esc(f.date)}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><div class=grid><div class=info><small>Litry</small><b>${esc(f.liters)} l</b></div><div class=info><small>Cena</small><b class=money>${Number(f.total||0).toLocaleString('cs-CZ')} Kč</b></div></div><p><b>Stav MTH:</b> ${esc(f.hours||'—')}</p>${f.station?`<p><b>Čerpací stanice:</b> ${esc(f.station)}</p>`:''}${f.fuelType?`<p><b>Palivo:</b> ${esc(f.fuelType)}</p>`:''}${f.note?`<p class=muted>${esc(f.note)}</p>`:''}<button class=danger data-delete-fuel="${f.id}">Odstranit</button></article>`}).join(''):'<div class="card empty">Zatím nejsou žádná tankování.</div>'}`;
}

function fuelForm(){
 const selected=state.machines.find(x=>x.id===state.selected);
 return `<form id=fuelForm><div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}" required></div>
 ${selected?`<input type=hidden name=machineId value="${selected.id}"><div class=notice><b>Stroj:</b> ${esc(selected.brand)} ${esc(selected.model)}</div>`:`<div class=group><label>Stroj</label><select name=machineId required><option value="">Vyber stroj</option>${state.machines.map(m=>`<option value="${m.id}">${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>`}
 <div class=grid>${field('liters','Litry','0','number')}${field('pricePerLiter','Cena za litr','0','number')}</div>
 ${field('hours','Stav motohodin','0','number')}
 ${field('station','Čerpací stanice','např. ORLEN')}
 <div class=group><label>Druh paliva</label><select name=fuelType><option>Nafta</option><option>Benzín</option><option>AdBlue</option><option>Jiné</option></select></div>
 <div class=group><label>Poznámka</label><textarea name=note></textarea></div><button class=primary>Uložit tankování</button></form>`;
}





function currentTimeValue(){
 const d=new Date();
 return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatClock(value){
 if(!value)return '—';
 if(/^\d{2}:\d{2}$/.test(value))return value;
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'});
}

function optionList(items,selected=''){
 return items.map(item=>`<option value="${esc(item)}" ${item===selected?'selected':''}>${esc(item)}</option>`).join('');
}
function lastPreference(machineId){
 return state.lastPrefs[machineId]||{};
}
function rememberListItem(listName,value){
 const v=String(value||'').trim();
 if(!v)return;
 const list=state[listName];
 if(!list.includes(v))list.unshift(v);
}

function shiftStart(){
 const active=activeShift();
 if(active)return `<div class=notice><h3>Směna už probíhá</h3><p>Nejdříve ukonči současnou směnu.</p></div><button class=primary data-go=shiftActive style="margin-top:12px">Otevřít směnu</button>`;
 const selected=state.machines.find(m=>m.id===state.selected);
 const prefs=selected?lastPreference(selected.id):{};
 const initialHours=selected?.hours||'';
 const nowTime=currentTimeValue();
 return `<form id=shiftStartForm>
 ${selected?`<input type=hidden name=machineId value="${selected.id}"><div class=notice><b>Technika:</b> ${esc(selected.brand)} ${esc(selected.model)}</div>`:`<div class=group><label>Stroj / automobil</label><select name=machineId required><option value="">Vyber techniku</option>${state.machines.map(m=>`<option value="${m.id}">${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>`}

 <div class=grid>
  <div class=group><label>Datum zahájení</label><input name=startDate type=date value="${new Date().toISOString().slice(0,10)}" readonly></div>
  <div class=group><label>Čas zahájení</label><input name=startTime type=time value="${nowTime}" readonly></div>
 </div>

 <div class=group><label>Obsluha</label><select name=operator id=operatorSelect required><option value="">Vyber obsluhu</option>${optionList(state.operators,prefs.operator||'')}<option value="__new__">＋ Přidat novou obsluhu</option></select></div>
 <div id=newOperatorWrap class=hidden-fields>${field('newOperator','Nová obsluha','např. Tomáš Macko')}</div>

 <div class=group><label>Zákazník</label><select name=customer id=customerSelect required><option value="">Vyber zákazníka</option>${optionList(state.customers,prefs.customer||'')}<option value="__new__">＋ Přidat nového zákazníka</option></select></div>
 <div id=newCustomerWrap class=hidden-fields>${field('newCustomer','Nový zákazník','např. Novák nebo Firma s.r.o.')}</div>

 ${field('job','Zakázka / označení práce','např. RD Novák – přípojka','text',prefs.job||'')}

 <div class=group><label>Druh práce</label><select name=work id=workSelect required><option value="">Vyber druh práce</option>${optionList(state.workTypes,prefs.work||'')}<option value="__new__">＋ Přidat nový druh práce</option></select></div>
 <div id=newWorkWrap class=hidden-fields>${field('newWork','Nový druh práce','např. Výkop přípojky')}</div>

 ${field('place','Místo práce','obec, ulice nebo popis','text',prefs.place||'')}
 ${field('startHours',isVehicle(selected||{})?'Počáteční km':'Počáteční MTH','0','number',initialHours)}

 <div class=notice auto-fill-note><b>Automatické doplnění:</b> datum, čas zahájení a počáteční stav jsou vyplněné automaticky. Čas se uloží při stisknutí tlačítka Zahájit směnu.</div>

 <h3>Kontrola před zahájením</h3>
 <div class=check-grid>
  <label class=check><input type=checkbox name=fluids required><span>Kapaliny a palivo</span></label>
  <label class=check><input type=checkbox name=hydraulics required><span>Hydraulika a úniky</span></label>
  <label class=check><input type=checkbox name=brakes required><span>Brzdy, řízení a ovládání</span></label>
  <label class=check><input type=checkbox name=lights required><span>Osvětlení a výstražná zařízení</span></label>
  <label class=check><input type=checkbox name=guards required><span>Kryty a bezpečnostní prvky</span></label>
  <label class=check><input type=checkbox name=site required><span>Seznámení s pracovištěm</span></label>
 </div>
 <button class=shift-start type=submit>▶ Zahájit směnu</button></form>`;
}

function shiftActive(){
 const s=activeShift();
 if(!s)return `<div class="card empty">Žádná směna právě neprobíhá.</div><button class=primary data-go=shiftStart>Začít směnu</button>`;
 const m=state.machines.find(x=>x.id===s.machineId);
 return `<div class=active-shift-detail><span class=live-dot></span><small>SMĚNA PROBÍHÁ</small><h2>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h2><p><b>Obsluha:</b> ${esc(s.operator)}</p><p><b>Zákazník:</b> ${esc(s.customer||'—')}</p><p><b>Zakázka:</b> ${esc(s.job||'—')}</p><p><b>Místo:</b> ${esc(s.place||'—')}</p><p><b>Práce:</b> ${esc(s.work||'—')}</p><div class=grid><div class=info><small>Začátek směny</small><b>${formatClock(s.startTime||s.startedAt)}</b></div><div class=info><small>Počáteční MTH/km</small><b>${esc(s.startHours||'—')}</b></div></div></div>
 <button class=shift-stop data-go=shiftEnd>⏹ Ukončit směnu</button>`;
}

function shiftEnd(){
 const s=activeShift();
 if(!s)return `<div class="card empty">Žádná směna právě neprobíhá.</div>`;
 const m=state.machines.find(x=>x.id===s.machineId);
 const nowTime=currentTimeValue();
 return `<form id=shiftEndForm><div class=notice><b>Stroj:</b> ${m?esc(m.brand+' '+m.model):'—'}<br><b>Obsluha:</b> ${esc(s.operator)}<br><b>Zákazník:</b> ${esc(s.customer||'—')}</div>
 <div class=grid>
  <div class=group><label>Datum ukončení</label><input name=endDate type=date value="${new Date().toISOString().slice(0,10)}" readonly></div>
  <div class=group><label>Čas ukončení</label><input name=endTime type=time value="${nowTime}" readonly></div>
 </div>
 ${field('endHours',isVehicle(m||{})?'Konečné km':'Konečné MTH','0','number')}
 <div class=notice auto-fill-note><b>Automatické ukončení:</b> konečný čas se uloží při stisknutí tlačítka Uložit a ukončit směnu.</div>
 <div class=group><label>Zjištěné závady</label><textarea name=defect placeholder="Při bezvadném stavu nechej prázdné; jinak popiš závadu"></textarea></div>
 <div class=group><label>Provedená údržba</label><textarea name=maintenance placeholder="Mazání, doplnění kapalin…"></textarea></div>
 <label class=check><input type=checkbox id=didFuel name=didFuel><span>Během směny proběhlo tankování</span></label>
 <div id=fuelFields class=hidden-fields>
  <div class=grid>${field('liters','Litry','0','number')}${field('pricePerLiter','Cena za litr','0','number')}</div>
  ${field('station','Čerpací stanice','např. ORLEN')}
 </div>
 <label class=check><input type=checkbox name=outOfService><span><b>Stroj odstavit mimo provoz</b></span></label>
 <div class=group><label>Poznámka</label><textarea name=note></textarea></div>
 <button class=shift-stop type=submit>⏹ Uložit a ukončit směnu</button></form>`;
}

function shifts(){
 const history=[...state.shifts].sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)));
 return `${activeShift()?`<button class=shift-stop data-go=shiftEnd>Ukončit probíhající směnu</button>`:`<button class=shift-start data-go=shiftStart>▶ Začít směnu</button>`}<h2 class=section-title>Historie směn</h2>${history.length?history.map(s=>{const m=state.machines.find(x=>x.id===s.machineId);const duration=s.workedHours||'—';return `<article class="card shift-card"><span class="pill ${s.status==='active'?'active-pill':''}">${s.status==='active'?'Probíhá':formatDateCs(s.date)}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><p><b>Obsluha:</b> ${esc(s.operator||'—')}</p><p><b>Zákazník:</b> ${esc(s.customer||'—')}</p><p><b>Zakázka:</b> ${esc(s.job||'—')}</p><div class=grid><div class=info><small>Čas směny</small><b>${formatClock(s.startTime||s.startedAt)}–${formatClock(s.endTime||s.endedAt)}</b></div><div class=info><small>MTH/km od–do</small><b>${esc(s.startHours||'—')}–${esc(s.endHours||'—')}</b></div><div class=info><small>Odpracováno</small><b>${esc(duration)}</b></div></div>${s.defect?`<p class=due><b>Závada:</b> ${esc(s.defect)}</p>`:''}</article>`}).join(''):'<div class="card empty">Zatím nejsou žádné směny.</div>'}`;
}




function machineStats(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Nejdříve vyber techniku.</div>`;
 const s=machineCostSummary(m.id);
 const months=monthlyMachineStats(m.id);
 const max=Math.max(1,...months.map(([,r])=>r.fuel+r.service));
 return `<div class=notice><h3>📊 ${esc(m.brand)} ${esc(m.model)}</h3><p>Náklady vycházejí z uložených tankování a servisních záznamů.</p></div>
 <div class=cost-summary>
  <div><small>PHM</small><strong>${s.fuelCost.toLocaleString('cs-CZ')} Kč</strong></div>
  <div><small>Servis</small><strong>${s.serviceCost.toLocaleString('cs-CZ')} Kč</strong></div>
  <div><small>Celkem</small><strong>${s.total.toLocaleString('cs-CZ')} Kč</strong></div>
  <div><small>Odpracováno</small><strong>${s.worked.toFixed(1)} ${isVehicle(m)?'km/h':'MTH'}</strong></div>
  <div><small>Náklad na MTH</small><strong>${s.costPerHour?s.costPerHour.toLocaleString('cs-CZ',{maximumFractionDigits:0}):'—'} Kč</strong></div>
 </div>
 <h2 class=section-title>Měsíční přehled</h2>
 ${months.length?months.map(([key,row])=>{const total=row.fuel+row.service;return `<article class="card month-stat"><div class=month-stat-head><h3>${esc(monthLabel(key))}</h3><b>${total.toLocaleString('cs-CZ')} Kč</b></div><div class=bar-track><span style="width:${Math.max(3,total/max*100)}%"></span></div><div class=month-stat-grid><span>⛽ ${row.fuel.toLocaleString('cs-CZ')} Kč</span><span>🔧 ${row.service.toLocaleString('cs-CZ')} Kč</span><span>🕒 ${row.hours.toFixed(1)} MTH</span></div></article>`}).join(''):'<div class="card empty">Zatím nejsou data pro statistiku.</div>'}`;
}

function reports(){
 const rows=state.machines.map(m=>({m,s:machineCostSummary(m.id)})).sort((a,b)=>b.s.total-a.s.total);
 const totalFuel=rows.reduce((sum,x)=>sum+x.s.fuelCost,0);
 const totalService=rows.reduce((sum,x)=>sum+x.s.serviceCost,0);
 return `<div class=cost-summary global>
  <div><small>PHM celkem</small><strong>${totalFuel.toLocaleString('cs-CZ')} Kč</strong></div>
  <div><small>Servis celkem</small><strong>${totalService.toLocaleString('cs-CZ')} Kč</strong></div>
  <div><small>Celkové náklady</small><strong>${(totalFuel+totalService).toLocaleString('cs-CZ')} Kč</strong></div>
 </div>
 <h2 class=section-title>Náklady podle techniky</h2>
 ${rows.length?rows.map(({m,s})=>`<article class="card report-machine"><div><h3>${esc(m.brand)} ${esc(m.model)}</h3><p>${esc(m.type||'Technika')}</p></div><div class=report-values><span>⛽ ${s.fuelCost.toLocaleString('cs-CZ')} Kč</span><span>🔧 ${s.serviceCost.toLocaleString('cs-CZ')} Kč</span><b>${s.total.toLocaleString('cs-CZ')} Kč</b></div><button class=secondary data-machine-stats="${m.id}">Otevřít statistiku</button></article>`).join(''):'<div class="card empty">Nejsou uložené žádné stroje.</div>'}`;
}

function lists(){
 const renderList=(items,type)=>items.length?items.map(item=>`<div class=list-row><span>${esc(item)}</span><button class=danger data-delete-list="${type}" data-value="${encodeURIComponent(item)}">Odstranit</button></div>`).join(''):'<div class="card empty">Zatím žádné položky.</div>';
 return `<div class=notice><h3>👷 Číselníky</h3><p>Správa údajů, které se opakovaně používají při zahájení směny.</p></div>
 <section class=list-section><h2>Obsluha</h2><form id=addOperatorForm class=inline-form><input name=value placeholder="Nové jméno obsluhy" required><button class=primary>Přidat</button></form>${renderList(state.operators,'operators')}</section>
 <section class=list-section><h2>Zákazníci</h2><form id=addCustomerForm class=inline-form><input name=value placeholder="Nový zákazník" required><button class=primary>Přidat</button></form>${renderList(state.customers,'customers')}</section>
 <section class=list-section><h2>Druhy práce</h2><form id=addWorkForm class=inline-form><input name=value placeholder="Nový druh práce" required><button class=primary>Přidat</button></form>${renderList(state.workTypes,'workTypes')}</section>`;
}

function backup(){return `<div class=notice><h3>💾 Záloha dat</h3><p>Stáhni všechna data do souboru a později je můžeš obnovit.</p></div><button class=primary id=exportBtn style="margin-top:12px">Stáhnout zálohu</button><div class=group style="margin-top:16px"><label>Obnovit ze zálohy</label><input id=importFile type=file accept=".json,application/json"></div><button class=danger id=clearBtn>Vymazat všechna data</button>`}

function bind(){
 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
 const didFuel=document.querySelector('#didFuel');if(didFuel){didFuel.onchange=()=>document.querySelector('#fuelFields').classList.toggle('open',didFuel.checked);}
 const operatorSelect=document.querySelector('#operatorSelect');if(operatorSelect){operatorSelect.onchange=()=>document.querySelector('#newOperatorWrap').classList.toggle('open',operatorSelect.value==='__new__');}
 const workSelect=document.querySelector('#workSelect');if(workSelect){workSelect.onchange=()=>document.querySelector('#newWorkWrap').classList.toggle('open',workSelect.value==='__new__');}
 const customerSelect=document.querySelector('#customerSelect');if(customerSelect){customerSelect.onchange=()=>document.querySelector('#newCustomerWrap').classList.toggle('open',customerSelect.value==='__new__');}
 const lockNow=document.querySelector('#lockNow');if(lockNow)lockNow.onclick=lockApp;
 document.querySelectorAll('input[name="category"]').forEach(r=>r.onchange=()=>{const form=r.form;const vehicle=r.value==='vehicle';document.querySelectorAll('.category-option').forEach(o=>o.classList.toggle('selected',o.contains(r)));const typeLabel=form.elements.type?.closest('.group')?.querySelector('label');if(typeLabel)typeLabel.textContent=vehicle?'Typ automobilu':'Typ stavebního stroje';const hoursLabel=form.elements.hours?.closest('.group')?.querySelector('label');if(hoursLabel)hoursLabel.textContent=vehicle?'Kilometry':'Motohodiny';const serialLabel=form.elements.serial?.closest('.group')?.querySelector('label');if(serialLabel)serialLabel.textContent=vehicle?'VIN / SPZ':'Výrobní číslo / VIN';const intervalLabel=form.elements.serviceInterval?.closest('.group')?.querySelector('label');if(intervalLabel)intervalLabel.textContent=vehicle?'Servisní interval km':'Servisní interval MTH';const lastLabel=form.elements.lastServiceHours?.closest('.group')?.querySelector('label');if(lastLabel)lastLabel.textContent=vehicle?'Poslední servis při km':'Poslední servis při MTH';});
 document.querySelectorAll('[data-new-machine]').forEach(x=>x.onclick=()=>{state.selected='';go('machineForm')});
 const machineSearch=document.querySelector('#machineSearch');if(machineSearch){machineSearch.oninput=e=>{state.machineSearch=e.target.value;render()};machineSearch.focus();machineSearch.setSelectionRange(machineSearch.value.length,machineSearch.value.length);}
 const homeMachineSearch=document.querySelector('#homeMachineSearch');if(homeMachineSearch){homeMachineSearch.oninput=e=>{state.machineSearch=e.target.value;render()};homeMachineSearch.focus();homeMachineSearch.setSelectionRange(homeMachineSearch.value.length,homeMachineSearch.value.length);}
 document.querySelectorAll('[data-shift-machine]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.shiftMachine;go('shiftStart')});
 document.querySelectorAll('[data-machine-detail]').forEach(x=>x.onclick=()=>go('machineDetail',x.dataset.machineDetail));
 document.querySelectorAll('[data-machine-settings]').forEach(x=>x.onclick=()=>go('machineSettings',x.dataset.machineSettings));
 document.querySelectorAll('[data-machine-stats]').forEach(x=>x.onclick=()=>go('machineStats',x.dataset.machineStats));
 document.querySelectorAll('[data-fault]').forEach(x=>x.onclick=()=>go('faultForm',x.dataset.fault));
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>go('machineForm',x.dataset.edit));
 document.querySelectorAll('[data-service]').forEach(x=>x.onclick=()=>go('service',x.dataset.service));
 document.querySelectorAll('[data-fuel]').forEach(x=>x.onclick=()=>go('fuel',x.dataset.fuel));
 document.querySelectorAll('[data-fuel-form]').forEach(x=>x.onclick=()=>go('fuelForm',x.dataset.fuelForm));
 document.querySelectorAll('[data-inspections]').forEach(x=>x.onclick=()=>go('inspections',x.dataset.inspections));
 document.querySelectorAll('[data-jobs]').forEach(x=>x.onclick=()=>go('jobs',x.dataset.jobs));
 document.querySelectorAll('[data-log]').forEach(x=>x.onclick=()=>go('logbook',x.dataset.log));
 document.querySelectorAll('[data-log-select]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.logSelect;render()});
 document.querySelectorAll('[data-new-log]').forEach(x=>x.onclick=()=>{if(!state.selected)return alert('Nejdříve vyber stroj.');go('logForm')});
 document.querySelectorAll('[data-select]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.select;render()});
 document.querySelectorAll('[data-select-supply]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.selectSupply;render()});
 document.querySelectorAll('[data-delete]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit stroj a všechny jeho záznamy?')){const id=x.dataset.delete;state.machines=state.machines.filter(m=>m.id!==id);state.service=state.service.filter(s=>s.machineId!==id);state.inspections=state.inspections.filter(i=>i.machineId!==id);state.logbook=state.logbook.filter(l=>l.machineId!==id);state.jobs=state.jobs.filter(j=>j.machineId!==id);state.fuel=state.fuel.filter(f=>f.machineId!==id);state.consumables=state.consumables.filter(c=>c.machineId!==id);state.selected='';save();go('machines')}});
 document.querySelectorAll('[data-delete-inspection]').forEach(x=>x.onclick=()=>{state.inspections=state.inspections.filter(i=>i.id!==x.dataset.deleteInspection);save();render()});
 document.querySelectorAll('[data-delete-log]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit tento záznam?')){state.logbook=state.logbook.filter(l=>l.id!==x.dataset.deleteLog);save();render()}});
 document.querySelectorAll('[data-delete-job]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit zakázku?')){state.jobs=state.jobs.filter(j=>j.id!==x.dataset.deleteJob);save();render()}});
 document.querySelectorAll('[data-delete-fuel]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit záznam tankování?')){state.fuel=state.fuel.filter(f=>f.id!==x.dataset.deleteFuel);save();render()}});
 document.querySelectorAll('[data-delete-supply]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit tuto položku?')){state.consumables=state.consumables.filter(c=>c.id!==x.dataset.deleteSupply);save();render()}});
 document.querySelectorAll('[data-delete-list]').forEach(x=>x.onclick=()=>{const type=x.dataset.deleteList;const value=decodeURIComponent(x.dataset.value);state[type]=state[type].filter(v=>v!==value);save();render()});
 document.querySelector('#unlockForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);if(await hashPin(f.get('pin'))===state.security.pinHash){state.security.locked=false;save();render()}else alert('Nesprávný PIN.')});
 document.querySelector('#enablePinForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),p=String(f.get('pin'));if(p.length<4)return alert('PIN musí mít alespoň 4 číslice.');if(p!==String(f.get('pin2')))return alert('PINy se neshodují.');state.security={enabled:true,pinHash:await hashPin(p),locked:false};save();render()});
 document.querySelector('#changePinForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);if(await hashPin(f.get('currentPin'))!==state.security.pinHash)return alert('Současný PIN není správný.');const p=String(f.get('newPin'));if(p.length<4)return alert('PIN musí mít alespoň 4 číslice.');if(p!==String(f.get('newPin2')))return alert('Nové PINy se neshodují.');state.security.pinHash=await hashPin(p);save();render()});
 const disablePin=document.querySelector('#disablePin');if(disablePin)disablePin.onclick=async()=>{const p=prompt('Zadej současný PIN:');if(p===null)return;if(await hashPin(p)!==state.security.pinHash)return alert('Nesprávný PIN.');state.security={enabled:false,pinHash:'',locked:false};state.operators=[];state.workTypes=[];state.lastPrefs={};state.customers=[];save();render()};
 document.querySelector('#addOperatorForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);rememberListItem('operators',f.get('value'));save();render()});
 document.querySelector('#addCustomerForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);rememberListItem('customers',f.get('value'));save();render()});
 document.querySelector('#addWorkForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);rememberListItem('workTypes',f.get('value'));save();render()});
 document.querySelector('#faultForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.logbook.unshift({id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),operator:'',job:'',work:'',startHours:'',endHours:'',fluids:false,hydraulics:false,brakes:false,lights:false,guards:false,site:false,defect:f.get('defect').trim(),maintenance:'',note:f.get('note').trim(),outOfService:f.get('outOfService')==='on'});save();go('machineDetail')});
 document.querySelector('#ocrMeterForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const file=f.get('image');const progress=document.querySelector('#ocrProgress');const result=document.querySelector('#ocrMeterResult');progress.textContent='Připravuji OCR…';result.innerHTML='';try{const text=await runTesseract(file,'meter',progress);const value=parseOcrNumber(text);if(!value){result.innerHTML='<div class="notice bad-note">Hodnotu se nepodařilo spolehlivě rozpoznat. Zkus bližší a ostřejší fotografii.</div>';return;}result.innerHTML=`<form id=applyMeterForm class="card ocr-result"><input type=hidden name=machineId value="${esc(f.get('machineId'))}"><h3>Rozpoznaná hodnota</h3><div class=group><label>MTH / km</label><input name=value type=number step=0.1 value="${esc(value)}" required></div><details><summary>Zobrazit rozpoznaný text</summary><pre>${esc(text)}</pre></details><button class=primary>Uložit jako aktuální stav</button></form>`;bind();}catch(err){progress.textContent='';result.innerHTML=`<div class="notice bad-note">${esc(err.message)}</div>`;}});
 document.querySelector('#applyMeterForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const m=state.machines.find(x=>x.id===f.get('machineId'));if(!m)return alert('Technika nebyla nalezena.');m.hours=f.get('value');save();state.selected=m.id;go('machineDetail')});
 document.querySelector('#ocrReceiptForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const file=f.get('image');const progress=document.querySelector('#ocrProgress');const result=document.querySelector('#ocrReceiptResult');progress.textContent='Připravuji OCR…';result.innerHTML='';try{const text=await runTesseract(file,'receipt',progress);const p=parseReceiptText(text);result.innerHTML=`<form id=applyReceiptForm class="card ocr-result"><input type=hidden name=machineId value="${esc(f.get('machineId'))}"><h3>Zkontroluj rozpoznané údaje</h3><div class=group><label>Datum</label><input name=date type=date value="${esc(p.date||new Date().toISOString().slice(0,10))}" required></div><div class=grid><div class=group><label>Litry</label><input name=liters type=number step=0.01 value="${esc(p.liters)}"></div><div class=group><label>Celková cena Kč</label><input name=total type=number step=0.01 value="${esc(p.total)}"></div></div><div class=group><label>Cena za litr</label><input name=pricePerLiter type=number step=0.01 value="${esc(p.pricePerLiter)}"></div><div class=group><label>Čerpací stanice</label><input name=station value="${esc(p.station)}"></div><details><summary>Zobrazit celý rozpoznaný text</summary><pre>${esc(text)}</pre></details><button class=primary>Uložit tankování</button></form>`;bind();}catch(err){progress.textContent='';result.innerHTML=`<div class="notice bad-note">${esc(err.message)}</div>`;}});
 document.querySelector('#applyReceiptForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const liters=Number(f.get('liters'))||0;let total=Number(f.get('total'))||0;let price=Number(f.get('pricePerLiter'))||0;if(!total&&liters&&price)total=liters*price;if(!price&&liters&&total)price=total/liters;const m=state.machines.find(x=>x.id===f.get('machineId'));state.fuel.unshift({id:crypto.randomUUID(),date:f.get('date'),machineId:f.get('machineId'),liters:String(liters),pricePerLiter:String(price.toFixed(2)),total:String(total.toFixed(2)),hours:m?.hours||'',station:f.get('station').trim(),fuelType:'Nafta',note:'Načteno z fotografie účtenky'});save();state.selected=f.get('machineId');go('fuel')});
 document.querySelector('#machineForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);if(!f.get('brand').trim()||!f.get('model').trim())return alert('Vyplň značku a model.');if(!f.get('category'))return alert('Vyber, zda jde o stavební stroj nebo automobil.');const obj={id:f.get('id')||crypto.randomUUID(),category:f.get('category'),brand:f.get('brand').trim(),model:f.get('model').trim(),type:f.get('type').trim(),year:f.get('year').trim(),hours:f.get('hours').trim(),serial:f.get('serial').trim(),serviceInterval:f.get('serviceInterval'),lastServiceHours:f.get('lastServiceHours'),note:f.get('note').trim()};state.machines=f.get('id')?state.machines.map(m=>m.id===obj.id?obj:m):[obj,...state.machines];save();go('machines')});
 document.querySelector('#serviceForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);const entry={id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),hours:f.get('hours'),cost:f.get('cost'),category:f.get('category'),parts:f.get('parts').trim(),description:f.get('description').trim()};state.service.unshift(entry);const m=state.machines.find(x=>x.id===state.selected);if(m&&entry.hours){m.hours=entry.hours;if(f.get('resetInterval')==='on')m.lastServiceHours=entry.hours;}save();render()});
 document.querySelector('#inspectionForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.inspections.unshift({id:crypto.randomUUID(),machineId:f.get('machineId'),type:f.get('type').trim(),date:f.get('date'),note:f.get('note').trim()});save();go('inspections')});
 document.querySelector('#logForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);const entry={id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),operator:f.get('operator').trim(),job:f.get('job').trim(),work:f.get('work').trim(),startHours:f.get('startHours'),endHours:f.get('endHours'),fluids:f.get('fluids')==='on',hydraulics:f.get('hydraulics')==='on',brakes:f.get('brakes')==='on',lights:f.get('lights')==='on',guards:f.get('guards')==='on',site:f.get('site')==='on',defect:f.get('defect').trim(),maintenance:f.get('maintenance').trim(),note:f.get('note').trim(),outOfService:f.get('outOfService')==='on'};state.logbook.unshift(entry);const m=state.machines.find(x=>x.id===state.selected);if(m&&entry.endHours)m.hours=entry.endHours;save();go('logbook')});
 document.querySelector('#printBtn')?.addEventListener('click',()=>window.print());
 document.querySelector('#jobForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.jobs.unshift({id:crypto.randomUUID(),date:f.get('date'),customer:f.get('customer').trim(),place:f.get('place').trim(),machineId:f.get('machineId'),work:f.get('work').trim(),hours:f.get('hours'),price:f.get('price'),note:f.get('note').trim()});save();go('jobs')});
 document.querySelector('#fuelForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const liters=Number(f.get('liters'))||0;const pricePerLiter=Number(f.get('pricePerLiter'))||0;const hours=f.get('hours');state.fuel.unshift({id:crypto.randomUUID(),date:f.get('date'),machineId:f.get('machineId'),liters:String(liters),pricePerLiter:String(pricePerLiter),total:String(liters*pricePerLiter),hours,station:f.get('station').trim(),fuelType:f.get('fuelType'),note:f.get('note').trim()});const m=state.machines.find(x=>x.id===f.get('machineId'));if(m&&hours)m.hours=hours;save();go('fuel')});
 document.querySelector('#supplyForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);state.consumables.unshift({id:crypto.randomUUID(),machineId:state.selected,kind:f.get('kind'),system:f.get('system'),name:f.get('name').trim(),partNumber:f.get('partNumber').trim(),manufacturer:f.get('manufacturer').trim(),specification:f.get('specification').trim(),quantity:f.get('quantity').trim(),note:f.get('note').trim()});save();go('serviceSupplies')});
 document.querySelector('#shiftStartForm')?.addEventListener('submit',e=>{e.preventDefault();if(activeShift())return alert('Směna už probíhá.');const f=new FormData(e.target);const machineId=f.get('machineId');const machine=state.machines.find(m=>m.id===machineId);let operator=f.get('operator');if(operator==='__new__')operator=f.get('newOperator').trim();let work=f.get('work');if(work==='__new__')work=f.get('newWork').trim();let customer=f.get('customer');if(customer==='__new__')customer=f.get('newCustomer').trim();if(!operator)return alert('Vyber nebo zadej obsluhu.');if(!customer)return alert('Vyber nebo zadej zákazníka.');if(!work)return alert('Vyber nebo zadej druh práce.');rememberListItem('operators',operator);rememberListItem('customers',customer);rememberListItem('workTypes',work);const now=new Date();const startHours=f.get('startHours')||machine?.hours||'';state.lastPrefs[machineId]={operator,customer,work,job:f.get('job').trim(),place:f.get('place').trim()};state.shifts.unshift({id:crypto.randomUUID(),status:'active',machineId,operator,customer,job:f.get('job').trim(),place:f.get('place').trim(),work,startHours,date:now.toISOString().slice(0,10),startDate:now.toISOString().slice(0,10),startTime:currentTimeValue(),startedAt:now.toISOString(),checks:{fluids:true,hydraulics:true,brakes:true,lights:true,guards:true,site:true}});save();go('shiftActive')});
 document.querySelector('#shiftEndForm')?.addEventListener('submit',e=>{e.preventDefault();const current=activeShift();if(!current)return alert('Žádná směna neprobíhá.');const f=new FormData(e.target);const endHours=f.get('endHours');const worked=(Number(endHours)&&Number(current.startHours))?Math.max(0,Number(endHours)-Number(current.startHours)).toFixed(1):'';const now=new Date();current.status='closed';current.endHours=endHours;current.workedHours=worked;current.endDate=now.toISOString().slice(0,10);current.endTime=currentTimeValue();current.endedAt=now.toISOString();current.defect=f.get('defect').trim();current.maintenance=f.get('maintenance').trim();current.note=f.get('note').trim();current.outOfService=f.get('outOfService')==='on';
 state.logbook.unshift({id:crypto.randomUUID(),machineId:current.machineId,date:current.date,operator:current.operator,customer:current.customer||'',job:current.job,work:current.work,startTime:current.startTime||'',endTime:current.endTime||'',startHours:current.startHours,endHours,fluids:true,hydraulics:true,brakes:true,lights:true,guards:true,site:true,defect:current.defect,maintenance:current.maintenance,note:current.note,outOfService:current.outOfService});
 const m=state.machines.find(x=>x.id===current.machineId);if(m&&endHours)m.hours=endHours;
 if(f.get('didFuel')==='on'){const liters=Number(f.get('liters'))||0;const price=Number(f.get('pricePerLiter'))||0;state.fuel.unshift({id:crypto.randomUUID(),date:current.date,machineId:current.machineId,liters:String(liters),pricePerLiter:String(price),total:String(liters*price),hours:endHours,station:f.get('station').trim(),fuelType:'Nafta',note:'Tankování při ukončení směny'});}
 save();go('shifts')});
 document.querySelector('#exportBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:'0.6',machines:state.machines,service:state.service,inspections:state.inspections,logbook:state.logbook,jobs:state.jobs,fuel:state.fuel,shifts:state.shifts,consumables:state.consumables,security:state.security,operators:state.operators,workTypes:state.workTypes,lastPrefs:state.lastPrefs,customers:state.customers},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tm-strojnik-zaloha.json';a.click();URL.revokeObjectURL(a.href)});
 document.querySelector('#importFile')?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state.machines=d.machines||[];state.service=d.service||[];state.inspections=d.inspections||[];state.logbook=d.logbook||[];state.jobs=d.jobs||[];state.fuel=d.fuel||[];state.shifts=d.shifts||[];state.consumables=d.consumables||[];state.security=d.security||{enabled:false,pinHash:'',locked:false};state.operators=d.operators||[];state.workTypes=d.workTypes||[];state.lastPrefs=d.lastPrefs||{};state.customers=d.customers||[];save();alert('Záloha byla obnovena.');go('home')}catch{alert('Soubor není platný.')}};r.readAsText(file)});
 document.querySelector('#clearBtn')?.addEventListener('click',()=>{if(confirm('Opravdu vymazat všechna data?')){state.machines=[];state.service=[];state.inspections=[];state.logbook=[];state.jobs=[];state.fuel=[];state.shifts=[];state.consumables=[];state.security={enabled:false,pinHash:'',locked:false};state.operators=[];state.workTypes=[];state.lastPrefs={};state.customers=[];save();go('home')}});
}
function render(){if(state.security.enabled&&state.security.locked){document.getElementById('app').innerHTML=lockScreen();bind();return;}const view={home,machines,machineDetail,machineSettings,machineForm,service,inspections,inspectionForm,logbook,logForm,logReport,jobs,jobForm,fuel,fuelForm,shiftStart,shiftActive,shiftEnd,shifts,serviceSupplies,supplyForm,alerts,security,faultForm,lists,machineStats,reports,ocrMeter,ocrReceipt,backup}[state.route]||home;document.getElementById('app').innerHTML=shell(view());bind()}
render();