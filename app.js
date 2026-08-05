const KEYS={m:'tm3-machines',s:'tm3-service',i:'tm3-inspections',l:'tm3-logbook',j:'tm6-jobs',f:'tm6-fuel',q:'tm10-shifts',c:'tm11-consumables',sec:'tm13-security'};
const defaults=[
 {id:'jcb',brand:'JCB',model:'3CX Contractor',type:'Rypadlo-nakladač',year:'2011',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:'Motor Dieselmax'},
 {id:'takeuchi',brand:'Takeuchi',model:'TB230',type:'Minirypadlo',year:'2018',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:''},
 {id:'hamm',brand:'HAMM',model:'HD 10',type:'Vibrační válec',year:'2005',hours:'',serial:'',serviceInterval:'500',lastServiceHours:'',note:'Motor Deutz'}
];
const state={route:'home',selected:'',machineSearch:'',machines:load(KEYS.m,defaults),service:load(KEYS.s,[]),inspections:load(KEYS.i,[]),logbook:load(KEYS.l,[]),jobs:load(KEYS.j,[]),fuel:load(KEYS.f,[]),shifts:load(KEYS.q,[]),consumables:load(KEYS.c,[]),security:load(KEYS.sec,{enabled:false,pinHash:'',locked:false})};

function load(k,f){try{return JSON.parse(localStorage.getItem(k))||structuredClone(f)}catch{return structuredClone(f)}}
function save(){localStorage.setItem(KEYS.m,JSON.stringify(state.machines));localStorage.setItem(KEYS.s,JSON.stringify(state.service));localStorage.setItem(KEYS.i,JSON.stringify(state.inspections));localStorage.setItem(KEYS.l,JSON.stringify(state.logbook));localStorage.setItem(KEYS.j,JSON.stringify(state.jobs));localStorage.setItem(KEYS.f,JSON.stringify(state.fuel));localStorage.setItem(KEYS.q,JSON.stringify(state.shifts));localStorage.setItem(KEYS.c,JSON.stringify(state.consumables));localStorage.setItem(KEYS.sec,JSON.stringify(state.security))}
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
function machineStatus(machine){
  const logs=state.logbook.filter(x=>x.machineId===machine.id);
  const latestDefect=logs.find(x=>x.outOfService||x.defect);
  const future=state.inspections.filter(x=>x.machineId===machine.id&&x.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const today=new Date();today.setHours(0,0,0,0);
  const currentHours=Number(machine.hours)||0;
  const interval=Number(machine.serviceInterval)||0;
  const lastService=Number(machine.lastServiceHours)||0;
  const serviceRemaining=interval>0&&currentHours>0?(lastService+interval-currentHours):null;
  let level='ok',label='Stroj v pořádku';
  if(latestDefect?.outOfService){level='bad';label='Stroj mimo provoz';}
  else if(latestDefect?.defect){level='warn';label='Nahlášená závada';}
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
 <div class=home-toolbar><button class=secondary data-new-machine>＋ Přidat techniku</button><button class=secondary data-go=shifts>🕒 Historie směn</button><button class=secondary data-go=backup>💾 Záloha</button></div>
 <div class=machine-search><input id=homeMachineSearch type=search placeholder="Hledat stroj nebo automobil…" value="${esc(state.machineSearch)}"></div>
 <section class=home-section><h2>🚜 Stavební stroje</h2><div class=home-machine-grid>${(state.machineSearch?machines.filter(m=>`${m.brand} ${m.model} ${m.type} ${m.serial}`.toLocaleLowerCase('cs-CZ').includes(state.machineSearch.toLocaleLowerCase('cs-CZ'))):machines).map(homeMachineCard).join('')||'<div class="card empty">Žádné stavební stroje.</div>'}</div></section>
 <section class=home-section><h2>🚐 Automobily</h2><div class=home-machine-grid>${(state.machineSearch?vehicles.filter(m=>`${m.brand} ${m.model} ${m.type} ${m.serial}`.toLocaleLowerCase('cs-CZ').includes(state.machineSearch.toLocaleLowerCase('cs-CZ'))):vehicles).map(homeMachineCard).join('')||'<div class="card empty">Žádné automobily.</div>'}</div></section>
 <div class=home-links><button data-go=jobs>📋 Zakázky</button><button data-go=logbook>📘 Provozní deník</button></div>
 <div class=footer>TM-Strojník v2.0</div>`;
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

function machineDetail(){
 const m=state.machines.find(x=>x.id===state.selected);
 if(!m)return `<div class="card empty">Stroj nebyl nalezen.</div>`;
 const machineFuel=state.fuel.filter(x=>x.machineId===m.id);
 const machineService=state.service.filter(x=>x.machineId===m.id);
 const machineLogs=state.logbook.filter(x=>x.machineId===m.id);
 const machineInspections=state.inspections.filter(x=>x.machineId===m.id);
 const machineJobs=state.jobs.filter(x=>x.machineId===m.id);
 const fuelCost=machineFuel.reduce((s,f)=>s+(Number(f.total)||0),0);
 return `<article class="card machine machine-profile"><div class=head><div class=badge>🚜</div><div><h3>${esc(m.brand)} ${esc(m.model)}</h3><p>${esc(m.type||'Stavební stroj')}</p></div></div><div class=grid><div class=info><small>Rok</small><b>${esc(m.year||'—')}</b></div><div class=info><small>Motohodiny</small><b>${esc(m.hours||'—')}</b></div></div>${m.serial?`<p class=muted><b>Výrobní číslo:</b> ${esc(m.serial)}</p>`:''}</article>
 <div class=summary-grid><div class=summary-box><small>Servisní záznamy</small><strong>${machineService.length}</strong></div><div class=summary-box><small>Provozní deník</small><strong>${machineLogs.length}</strong></div><div class=summary-box><small>Tankování</small><strong>${machineFuel.length}</strong></div><div class=summary-box><small>Náklady PHM</small><strong>${fuelCost.toLocaleString('cs-CZ')} Kč</strong></div></div>
 <div class=tiles>
  <button class="tile purple" data-log="${m.id}"><span class=icon>📘</span><span><b>Provozní deník</b><br><small>Denní záznamy a PDF</small></span></button>
  <button class="tile blue" data-service="${m.id}"><span class=icon>🔧</span><span><b>Servisní kniha</b><br><small>Opravy a údržba</small></span></button>
  <button class="tile orange" data-fuel="${m.id}"><span class=icon>⛽</span><span><b>Tankování</b><br><small>Litry, cena a spotřeba</small></span></button>
  <button class="tile green" data-inspections="${m.id}"><span class=icon>📅</span><span><b>Prohlídky</b><br><small>STK, revize a termíny</small></span></button>
  <button class="tile gray" data-jobs="${m.id}"><span class=icon>📋</span><span><b>Zakázky</b><br><small>Historie práce stroje</small></span></button>
  <button class="tile gray" data-machine-settings="${m.id}"><span class=icon>⚙️</span><span><b>Nastavení stroje</b><br><small>Údaje a odstranění stroje</small></span></button>
 </div>`;
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
 return `<form id=machineForm><input type=hidden name=id value="${esc(m.id||'')}">${field('brand','Značka *','např. Takeuchi','text',m.brand||'')}${field('model','Model *','např. TB230','text',m.model||'')}${field('type','Typ stroje','např. Minirypadlo','text',m.type||'')}${field('year','Rok výroby','2018','number',m.year||'')}${field('hours','Motohodiny','0','number',m.hours||'')}${field('serial','Výrobní číslo / VIN','volitelné','text',m.serial||'')}<div class=grid>${field('serviceInterval','Servisní interval MTH','500','number',m.serviceInterval||'')}${field('lastServiceHours','Poslední servis při MTH','0','number',m.lastServiceHours||'')}</div><div class=group><label>Poznámka</label><textarea name=note>${esc(m.note||'')}</textarea></div><button class=primary>Uložit změny</button></form>`;
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
   if(log.outOfService||log.defect){
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
 <div class=group><label>Zjištěné závady</label><textarea name=defect placeholder="Bez závad, nebo popis závady"></textarea></div>
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



function shiftStart(){
 const active=activeShift();
 if(active)return `<div class=notice><h3>Směna už probíhá</h3><p>Nejdříve ukonči současnou směnu.</p></div><button class=primary data-go=shiftActive style="margin-top:12px">Otevřít směnu</button>`;
 const selected=state.machines.find(m=>m.id===state.selected);
 return `<form id=shiftStartForm>
 ${selected?`<input type=hidden name=machineId value="${selected.id}"><div class=notice><b>Technika:</b> ${esc(selected.brand)} ${esc(selected.model)}</div>`:`<div class=group><label>Stroj / automobil</label><select name=machineId required><option value="">Vyber techniku</option>${state.machines.map(m=>`<option value="${m.id}">${esc(m.brand)} ${esc(m.model)}</option>`).join('')}</select></div>`}
 ${field('operator','Obsluha','např. Tomáš Macko')}
 ${field('job','Zakázka / zákazník','např. Novák – výkop')}
 ${field('place','Místo práce','obec, ulice nebo popis')}
 ${field('work','Druh práce','např. výkop základů')}
 ${field('startHours','Počáteční MTH','0','number')}
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
 const started=new Date(s.startedAt);
 return `<div class=active-shift-detail><span class=live-dot></span><small>SMĚNA PROBÍHÁ</small><h2>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h2><p><b>Obsluha:</b> ${esc(s.operator)}</p><p><b>Zakázka:</b> ${esc(s.job||'—')}</p><p><b>Místo:</b> ${esc(s.place||'—')}</p><p><b>Práce:</b> ${esc(s.work||'—')}</p><div class=grid><div class=info><small>Začátek</small><b>${started.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})}</b></div><div class=info><small>Počáteční MTH</small><b>${esc(s.startHours||'—')}</b></div></div></div>
 <button class=shift-stop data-go=shiftEnd>⏹ Ukončit směnu</button>`;
}

function shiftEnd(){
 const s=activeShift();
 if(!s)return `<div class="card empty">Žádná směna právě neprobíhá.</div>`;
 const m=state.machines.find(x=>x.id===s.machineId);
 return `<form id=shiftEndForm><div class=notice><b>Stroj:</b> ${m?esc(m.brand+' '+m.model):'—'}<br><b>Obsluha:</b> ${esc(s.operator)}</div>
 ${field('endHours','Konečné MTH','0','number')}
 <div class=group><label>Zjištěné závady</label><textarea name=defect placeholder="Bez závad, nebo popis závady"></textarea></div>
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
 return `${activeShift()?`<button class=shift-stop data-go=shiftEnd>Ukončit probíhající směnu</button>`:`<button class=shift-start data-go=shiftStart>▶ Začít směnu</button>`}<h2 class=section-title>Historie směn</h2>${history.length?history.map(s=>{const m=state.machines.find(x=>x.id===s.machineId);const duration=s.workedHours||'—';return `<article class="card shift-card"><span class="pill ${s.status==='active'?'active-pill':''}">${s.status==='active'?'Probíhá':formatDateCs(s.date)}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><p><b>Obsluha:</b> ${esc(s.operator||'—')}</p><p><b>Zakázka:</b> ${esc(s.job||'—')}</p><div class=grid><div class=info><small>MTH od–do</small><b>${esc(s.startHours||'—')}–${esc(s.endHours||'—')}</b></div><div class=info><small>Odpracováno</small><b>${esc(duration)} MTH</b></div></div>${s.defect?`<p class=due><b>Závada:</b> ${esc(s.defect)}</p>`:''}</article>`}).join(''):'<div class="card empty">Zatím nejsou žádné směny.</div>'}`;
}


function backup(){return `<div class=notice><h3>💾 Záloha dat</h3><p>Stáhni všechna data do souboru a později je můžeš obnovit.</p></div><button class=primary id=exportBtn style="margin-top:12px">Stáhnout zálohu</button><div class=group style="margin-top:16px"><label>Obnovit ze zálohy</label><input id=importFile type=file accept=".json,application/json"></div><button class=danger id=clearBtn>Vymazat všechna data</button>`}

function bind(){
 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
 const didFuel=document.querySelector('#didFuel');if(didFuel){didFuel.onchange=()=>document.querySelector('#fuelFields').classList.toggle('open',didFuel.checked);}
 const lockNow=document.querySelector('#lockNow');if(lockNow)lockNow.onclick=lockApp;
 document.querySelectorAll('[data-new-machine]').forEach(x=>x.onclick=()=>{state.selected='';go('machineForm')});
 const machineSearch=document.querySelector('#machineSearch');if(machineSearch){machineSearch.oninput=e=>{state.machineSearch=e.target.value;render()};machineSearch.focus();machineSearch.setSelectionRange(machineSearch.value.length,machineSearch.value.length);}
 const homeMachineSearch=document.querySelector('#homeMachineSearch');if(homeMachineSearch){homeMachineSearch.oninput=e=>{state.machineSearch=e.target.value;render()};homeMachineSearch.focus();homeMachineSearch.setSelectionRange(homeMachineSearch.value.length,homeMachineSearch.value.length);}
 document.querySelectorAll('[data-shift-machine]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.shiftMachine;go('shiftStart')});
 document.querySelectorAll('[data-machine-detail]').forEach(x=>x.onclick=()=>go('machineDetail',x.dataset.machineDetail));
 document.querySelectorAll('[data-machine-settings]').forEach(x=>x.onclick=()=>go('machineSettings',x.dataset.machineSettings));
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
 document.querySelector('#unlockForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);if(await hashPin(f.get('pin'))===state.security.pinHash){state.security.locked=false;save();render()}else alert('Nesprávný PIN.')});
 document.querySelector('#enablePinForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),p=String(f.get('pin'));if(p.length<4)return alert('PIN musí mít alespoň 4 číslice.');if(p!==String(f.get('pin2')))return alert('PINy se neshodují.');state.security={enabled:true,pinHash:await hashPin(p),locked:false};save();render()});
 document.querySelector('#changePinForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);if(await hashPin(f.get('currentPin'))!==state.security.pinHash)return alert('Současný PIN není správný.');const p=String(f.get('newPin'));if(p.length<4)return alert('PIN musí mít alespoň 4 číslice.');if(p!==String(f.get('newPin2')))return alert('Nové PINy se neshodují.');state.security.pinHash=await hashPin(p);save();render()});
 const disablePin=document.querySelector('#disablePin');if(disablePin)disablePin.onclick=async()=>{const p=prompt('Zadej současný PIN:');if(p===null)return;if(await hashPin(p)!==state.security.pinHash)return alert('Nesprávný PIN.');state.security={enabled:false,pinHash:'',locked:false};save();render()};
 document.querySelector('#machineForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);if(!f.get('brand').trim()||!f.get('model').trim())return alert('Vyplň značku a model.');const obj={id:f.get('id')||crypto.randomUUID(),brand:f.get('brand').trim(),model:f.get('model').trim(),type:f.get('type').trim(),year:f.get('year').trim(),hours:f.get('hours').trim(),serial:f.get('serial').trim(),serviceInterval:f.get('serviceInterval'),lastServiceHours:f.get('lastServiceHours'),note:f.get('note').trim()};state.machines=f.get('id')?state.machines.map(m=>m.id===obj.id?obj:m):[obj,...state.machines];save();go('machines')});
 document.querySelector('#serviceForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);const entry={id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),hours:f.get('hours'),cost:f.get('cost'),category:f.get('category'),parts:f.get('parts').trim(),description:f.get('description').trim()};state.service.unshift(entry);const m=state.machines.find(x=>x.id===state.selected);if(m&&entry.hours){m.hours=entry.hours;if(f.get('resetInterval')==='on')m.lastServiceHours=entry.hours;}save();render()});
 document.querySelector('#inspectionForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.inspections.unshift({id:crypto.randomUUID(),machineId:f.get('machineId'),type:f.get('type').trim(),date:f.get('date'),note:f.get('note').trim()});save();go('inspections')});
 document.querySelector('#logForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);const entry={id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),operator:f.get('operator').trim(),job:f.get('job').trim(),work:f.get('work').trim(),startHours:f.get('startHours'),endHours:f.get('endHours'),fluids:f.get('fluids')==='on',hydraulics:f.get('hydraulics')==='on',brakes:f.get('brakes')==='on',lights:f.get('lights')==='on',guards:f.get('guards')==='on',site:f.get('site')==='on',defect:f.get('defect').trim(),maintenance:f.get('maintenance').trim(),note:f.get('note').trim(),outOfService:f.get('outOfService')==='on'};state.logbook.unshift(entry);const m=state.machines.find(x=>x.id===state.selected);if(m&&entry.endHours)m.hours=entry.endHours;save();go('logbook')});
 document.querySelector('#printBtn')?.addEventListener('click',()=>window.print());
 document.querySelector('#jobForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.jobs.unshift({id:crypto.randomUUID(),date:f.get('date'),customer:f.get('customer').trim(),place:f.get('place').trim(),machineId:f.get('machineId'),work:f.get('work').trim(),hours:f.get('hours'),price:f.get('price'),note:f.get('note').trim()});save();go('jobs')});
 document.querySelector('#fuelForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const liters=Number(f.get('liters'))||0;const pricePerLiter=Number(f.get('pricePerLiter'))||0;const hours=f.get('hours');state.fuel.unshift({id:crypto.randomUUID(),date:f.get('date'),machineId:f.get('machineId'),liters:String(liters),pricePerLiter:String(pricePerLiter),total:String(liters*pricePerLiter),hours,station:f.get('station').trim(),fuelType:f.get('fuelType'),note:f.get('note').trim()});const m=state.machines.find(x=>x.id===f.get('machineId'));if(m&&hours)m.hours=hours;save();go('fuel')});
 document.querySelector('#supplyForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);state.consumables.unshift({id:crypto.randomUUID(),machineId:state.selected,kind:f.get('kind'),system:f.get('system'),name:f.get('name').trim(),partNumber:f.get('partNumber').trim(),manufacturer:f.get('manufacturer').trim(),specification:f.get('specification').trim(),quantity:f.get('quantity').trim(),note:f.get('note').trim()});save();go('serviceSupplies')});
 document.querySelector('#shiftStartForm')?.addEventListener('submit',e=>{e.preventDefault();if(activeShift())return alert('Směna už probíhá.');const f=new FormData(e.target);const machine=state.machines.find(m=>m.id===f.get('machineId'));const startHours=f.get('startHours')||machine?.hours||'';state.shifts.unshift({id:crypto.randomUUID(),status:'active',machineId:f.get('machineId'),operator:f.get('operator').trim(),job:f.get('job').trim(),place:f.get('place').trim(),work:f.get('work').trim(),startHours,date:new Date().toISOString().slice(0,10),startedAt:new Date().toISOString(),checks:{fluids:true,hydraulics:true,brakes:true,lights:true,guards:true,site:true}});save();go('shiftActive')});
 document.querySelector('#shiftEndForm')?.addEventListener('submit',e=>{e.preventDefault();const current=activeShift();if(!current)return alert('Žádná směna neprobíhá.');const f=new FormData(e.target);const endHours=f.get('endHours');const worked=(Number(endHours)&&Number(current.startHours))?Math.max(0,Number(endHours)-Number(current.startHours)).toFixed(1):'';current.status='closed';current.endHours=endHours;current.workedHours=worked;current.endedAt=new Date().toISOString();current.defect=f.get('defect').trim();current.maintenance=f.get('maintenance').trim();current.note=f.get('note').trim();current.outOfService=f.get('outOfService')==='on';
 state.logbook.unshift({id:crypto.randomUUID(),machineId:current.machineId,date:current.date,operator:current.operator,job:current.job,work:current.work,startHours:current.startHours,endHours,fluids:true,hydraulics:true,brakes:true,lights:true,guards:true,site:true,defect:current.defect,maintenance:current.maintenance,note:current.note,outOfService:current.outOfService});
 const m=state.machines.find(x=>x.id===current.machineId);if(m&&endHours)m.hours=endHours;
 if(f.get('didFuel')==='on'){const liters=Number(f.get('liters'))||0;const price=Number(f.get('pricePerLiter'))||0;state.fuel.unshift({id:crypto.randomUUID(),date:current.date,machineId:current.machineId,liters:String(liters),pricePerLiter:String(price),total:String(liters*price),hours:endHours,station:f.get('station').trim(),fuelType:'Nafta',note:'Tankování při ukončení směny'});}
 save();go('shifts')});
 document.querySelector('#exportBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:'0.6',machines:state.machines,service:state.service,inspections:state.inspections,logbook:state.logbook,jobs:state.jobs,fuel:state.fuel,shifts:state.shifts,consumables:state.consumables,security:state.security},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tm-strojnik-zaloha.json';a.click();URL.revokeObjectURL(a.href)});
 document.querySelector('#importFile')?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state.machines=d.machines||[];state.service=d.service||[];state.inspections=d.inspections||[];state.logbook=d.logbook||[];state.jobs=d.jobs||[];state.fuel=d.fuel||[];state.shifts=d.shifts||[];state.consumables=d.consumables||[];state.security=d.security||{enabled:false,pinHash:'',locked:false};save();alert('Záloha byla obnovena.');go('home')}catch{alert('Soubor není platný.')}};r.readAsText(file)});
 document.querySelector('#clearBtn')?.addEventListener('click',()=>{if(confirm('Opravdu vymazat všechna data?')){state.machines=[];state.service=[];state.inspections=[];state.logbook=[];state.jobs=[];state.fuel=[];state.shifts=[];state.consumables=[];state.security={enabled:false,pinHash:'',locked:false};save();go('home')}});
}
function render(){if(state.security.enabled&&state.security.locked){document.getElementById('app').innerHTML=lockScreen();bind();return;}const view={home,machines,machineDetail,machineSettings,machineForm,service,inspections,inspectionForm,logbook,logForm,logReport,jobs,jobForm,fuel,fuelForm,shiftStart,shiftActive,shiftEnd,shifts,serviceSupplies,supplyForm,alerts,security,backup}[state.route]||home;document.getElementById('app').innerHTML=shell(view());bind()}
render();