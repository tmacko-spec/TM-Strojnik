const KEYS={m:'tm3-machines',s:'tm3-service',i:'tm3-inspections',l:'tm3-logbook',j:'tm6-jobs',f:'tm6-fuel'};
const defaults=[
 {id:'jcb',brand:'JCB',model:'3CX Contractor',type:'Rypadlo-nakladač',year:'2011',hours:'',serial:'',note:'Motor Dieselmax'},
 {id:'takeuchi',brand:'Takeuchi',model:'TB230',type:'Minirypadlo',year:'2018',hours:'',serial:'',note:''},
 {id:'hamm',brand:'HAMM',model:'HD 10',type:'Vibrační válec',year:'2005',hours:'',serial:'',note:'Motor Deutz'}
];
const state={route:'home',selected:'',machines:load(KEYS.m,defaults),service:load(KEYS.s,[]),inspections:load(KEYS.i,[]),logbook:load(KEYS.l,[]),jobs:load(KEYS.j,[]),fuel:load(KEYS.f,[])};

function load(k,f){try{return JSON.parse(localStorage.getItem(k))||structuredClone(f)}catch{return structuredClone(f)}}
function save(){localStorage.setItem(KEYS.m,JSON.stringify(state.machines));localStorage.setItem(KEYS.s,JSON.stringify(state.service));localStorage.setItem(KEYS.i,JSON.stringify(state.inspections));localStorage.setItem(KEYS.l,JSON.stringify(state.logbook));localStorage.setItem(KEYS.j,JSON.stringify(state.jobs));localStorage.setItem(KEYS.f,JSON.stringify(state.fuel))}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function go(route,id=''){state.route=route;if(id)state.selected=id;render();scrollTo(0,0)}
function title(){return({home:'TM-Strojník',machines:'Moje stroje',machineDetail:'Karta stroje',machineForm:'Stroj',service:'Servisní kniha',inspections:'Prohlídky',inspectionForm:'Nová prohlídka',backup:'Záloha dat',logbook:'Provozní deník',logForm:'Nový záznam',logReport:'Výstup pro kontrolu',jobs:'Zakázky',jobForm:'Nová zakázka',fuel:'PHM a tankování',fuelForm:'Nové tankování'})[state.route]||'TM-Strojník'}

function shell(content){
  const head=state.route==='home'
    ? `<header class=header>
      <div class=brand-redesign>
        <div class=app-mark><span>TM</span><small>STROJNÍK</small></div>
        <div class=company-logo-wrap>
          <img src="logo.png" alt="Tomáš Macko">
        </div>
      </div>
      <p class=header-subtitle>Evidence stavebních strojů</p>
    </header>`
    : `<header class=topbar><button data-go=home>← Domů</button><h2>${title()}</h2><span></span></header>`;
  return `<main class=app>${head}<section class=content>${content}</section></main>`;
}

function tile(cls,icon,t,s,r){return `<button class="tile ${cls}" data-go="${r}"><span class=icon>${icon}</span><span><b>${t}</b><br><small>${s}</small></span></button>`}

function home(){
 const due=state.inspections.filter(x=>x.date&&new Date(x.date)<=new Date(Date.now()+30*86400000)).length;
 return `<div class=stats><div class=stat><strong>${state.machines.length}</strong><span>Stroje</span></div><div class=stat><strong>${state.service.length}</strong><span>Servisní záznamy</span></div><div class=stat><strong>${due}</strong><span>Blízké termíny</span></div></div>
 <div class=tiles>
  ${tile('orange','🚜','Moje stroje','Seznam a motohodiny','machines')}
  ${tile('blue','🔧','Servisní kniha','Opravy a údržba','service')}
  ${tile('green','📅','Prohlídky','STK, revize, termíny','inspections')}
  <button class="tile red" data-new-machine><span class=icon>➕</span><span><b>Přidat stroj</b><br><small>Nový stroj do evidence</small></span></button>
  ${tile('purple','📘','Provozní deník','Denní záznamy a tisk','logbook')}
  ${tile('orange','📋','Zakázky','Zákazník, místo a MTH','jobs')}
  ${tile('gray','💾','Záloha dat','Export a obnovení','backup')}
  ${tile('gray','⚙️','Nastavení','Připravujeme','home')}
 </div><div class=footer>TM-Strojník v0.7</div>`;
}

function machineCard(m){return `<article class="card machine"><div class=head><div class=badge>🚜</div><div><h3>${esc(m.brand)} ${esc(m.model)}</h3><p>${esc(m.type||'Stavební stroj')}</p></div></div><div class=grid><div class=info><small>Rok</small><b>${esc(m.year||'—')}</b></div><div class=info><small>Motohodiny</small><b>${esc(m.hours||'—')}</b></div></div>${m.serial?`<p class=muted><b>Výrobní číslo:</b> ${esc(m.serial)}</p>`:''}${m.note?`<p class=muted>${esc(m.note)}</p>`:''}<div class=actions><button class=dark data-machine-detail="${m.id}">Otevřít kartu</button><button class=secondary data-edit="${m.id}">Upravit</button><button class=danger data-delete="${m.id}">Odstranit</button></div></article>`}
function machines(){return `<button class=primary data-new-machine>＋ Přidat nový stroj</button><h2 class=section-title>Moje stroje</h2>${state.machines.length?state.machines.map(machineCard).join(''):'<div class="card empty">Zatím nejsou žádné stroje.</div>'}`}

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
  <button class="tile red" data-edit="${m.id}"><span class=icon>✏️</span><span><b>Upravit údaje</b><br><small>Rok, MTH, výrobní číslo</small></span></button>
 </div>`;
}

function field(n,l,p,t='text',v=''){return `<div class=group><label>${l}</label><input name="${n}" type="${t}" placeholder="${p}" value="${esc(v)}"></div>`}
function machineForm(){
 const m=state.machines.find(x=>x.id===state.selected)||{};
 return `<form id=machineForm><input type=hidden name=id value="${esc(m.id||'')}">${field('brand','Značka *','např. Takeuchi','text',m.brand||'')}${field('model','Model *','např. TB230','text',m.model||'')}${field('type','Typ stroje','např. Minirypadlo','text',m.type||'')}${field('year','Rok výroby','2018','number',m.year||'')}${field('hours','Motohodiny','0','number',m.hours||'')}${field('serial','Výrobní číslo / VIN','volitelné','text',m.serial||'')}<div class=group><label>Poznámka</label><textarea name=note>${esc(m.note||'')}</textarea></div><button class=primary>Uložit změny</button></form>`;
}

function service(){
 const selected=state.machines.find(x=>x.id===state.selected);
 const visible=selected?state.service.filter(x=>x.machineId===selected.id):state.service;
 return `<h2 class=section-title>Vyber stroj</h2><div class=chips>${state.machines.map(m=>`<button class="chip ${selected?.id===m.id?'on':''}" data-select="${m.id}">${esc(m.brand)} ${esc(m.model)}</button>`).join('')}</div><form id=serviceForm><div class=group><label>Datum</label><input name=date type=date value="${new Date().toISOString().slice(0,10)}"></div><div class=group><label>Motohodiny při servisu</label><input name=hours type=number></div><div class=group><label>Popis servisního zásahu</label><textarea name=description required></textarea></div><button class=primary>Přidat servisní záznam</button></form><h2 class=section-title>Historie servisu</h2>${visible.length?visible.map(s=>{const m=state.machines.find(x=>x.id===s.machineId);return `<article class="card service"><small>${esc(s.date)}</small><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3>${s.hours?`<p><b>Motohodiny:</b> ${esc(s.hours)}</p>`:''}<p>${esc(s.description)}</p></article>`}).join(''):'<div class="card empty">Žádné servisní záznamy.</div>'}`;
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
 ${visible.length?visible.map(f=>{const m=state.machines.find(x=>x.id===f.machineId);return `<article class="card fuel-card"><span class=pill>${esc(f.date)}</span><h3>${m?esc(m.brand+' '+m.model):'Neznámý stroj'}</h3><div class=grid><div class=info><small>Litry</small><b>${esc(f.liters)} l</b></div><div class=info><small>Cena</small><b class=money>${Number(f.total||0).toLocaleString('cs-CZ')} Kč</b></div></div><p><b>Stav MTH:</b> ${esc(f.hours||'—')}</p>${f.note?`<p class=muted>${esc(f.note)}</p>`:''}<button class=danger data-delete-fuel="${f.id}">Odstranit</button></article>`}).join(''):'<div class="card empty">Zatím nejsou žádná tankování.</div>'}`;
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


function backup(){return `<div class=notice><h3>💾 Záloha dat</h3><p>Stáhni všechna data do souboru a později je můžeš obnovit.</p></div><button class=primary id=exportBtn style="margin-top:12px">Stáhnout zálohu</button><div class=group style="margin-top:16px"><label>Obnovit ze zálohy</label><input id=importFile type=file accept=".json,application/json"></div><button class=danger id=clearBtn>Vymazat všechna data</button>`}

function bind(){
 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
 document.querySelectorAll('[data-new-machine]').forEach(x=>x.onclick=()=>{state.selected='';go('machineForm')});
 document.querySelectorAll('[data-machine-detail]').forEach(x=>x.onclick=()=>go('machineDetail',x.dataset.machineDetail));
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>go('machineForm',x.dataset.edit));
 document.querySelectorAll('[data-service]').forEach(x=>x.onclick=()=>go('service',x.dataset.service));
 document.querySelectorAll('[data-fuel]').forEach(x=>x.onclick=()=>go('fuel',x.dataset.fuel));
 document.querySelectorAll('[data-inspections]').forEach(x=>x.onclick=()=>go('inspections',x.dataset.inspections));
 document.querySelectorAll('[data-jobs]').forEach(x=>x.onclick=()=>go('jobs',x.dataset.jobs));
 document.querySelectorAll('[data-log]').forEach(x=>x.onclick=()=>go('logbook',x.dataset.log));
 document.querySelectorAll('[data-log-select]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.logSelect;render()});
 document.querySelectorAll('[data-new-log]').forEach(x=>x.onclick=()=>{if(!state.selected)return alert('Nejdříve vyber stroj.');go('logForm')});
 document.querySelectorAll('[data-select]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.select;render()});
 document.querySelectorAll('[data-delete]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit stroj a jeho záznamy?')){const id=x.dataset.delete;state.machines=state.machines.filter(m=>m.id!==id);state.service=state.service.filter(s=>s.machineId!==id);state.inspections=state.inspections.filter(i=>i.machineId!==id);state.logbook=state.logbook.filter(l=>l.machineId!==id);state.jobs=state.jobs.filter(j=>j.machineId!==id);state.fuel=state.fuel.filter(f=>f.machineId!==id);save();render()}});
 document.querySelectorAll('[data-delete-inspection]').forEach(x=>x.onclick=()=>{state.inspections=state.inspections.filter(i=>i.id!==x.dataset.deleteInspection);save();render()});
 document.querySelectorAll('[data-delete-log]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit tento záznam?')){state.logbook=state.logbook.filter(l=>l.id!==x.dataset.deleteLog);save();render()}});
 document.querySelectorAll('[data-delete-job]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit zakázku?')){state.jobs=state.jobs.filter(j=>j.id!==x.dataset.deleteJob);save();render()}});
 document.querySelectorAll('[data-delete-fuel]').forEach(x=>x.onclick=()=>{if(confirm('Odstranit záznam tankování?')){state.fuel=state.fuel.filter(f=>f.id!==x.dataset.deleteFuel);save();render()}});
 document.querySelector('#machineForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);if(!f.get('brand').trim()||!f.get('model').trim())return alert('Vyplň značku a model.');const obj={id:f.get('id')||crypto.randomUUID(),brand:f.get('brand').trim(),model:f.get('model').trim(),type:f.get('type').trim(),year:f.get('year').trim(),hours:f.get('hours').trim(),serial:f.get('serial').trim(),note:f.get('note').trim()};state.machines=f.get('id')?state.machines.map(m=>m.id===obj.id?obj:m):[obj,...state.machines];save();go('machines')});
 document.querySelector('#serviceForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);state.service.unshift({id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),hours:f.get('hours'),description:f.get('description').trim()});const m=state.machines.find(x=>x.id===state.selected);if(m&&f.get('hours'))m.hours=f.get('hours');save();render()});
 document.querySelector('#inspectionForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.inspections.unshift({id:crypto.randomUUID(),machineId:f.get('machineId'),type:f.get('type').trim(),date:f.get('date'),note:f.get('note').trim()});save();go('inspections')});
 document.querySelector('#logForm')?.addEventListener('submit',e=>{e.preventDefault();if(!state.selected)return alert('Nejdříve vyber stroj.');const f=new FormData(e.target);const entry={id:crypto.randomUUID(),machineId:state.selected,date:f.get('date'),operator:f.get('operator').trim(),job:f.get('job').trim(),work:f.get('work').trim(),startHours:f.get('startHours'),endHours:f.get('endHours'),fluids:f.get('fluids')==='on',hydraulics:f.get('hydraulics')==='on',brakes:f.get('brakes')==='on',lights:f.get('lights')==='on',guards:f.get('guards')==='on',site:f.get('site')==='on',defect:f.get('defect').trim(),maintenance:f.get('maintenance').trim(),note:f.get('note').trim(),outOfService:f.get('outOfService')==='on'};state.logbook.unshift(entry);const m=state.machines.find(x=>x.id===state.selected);if(m&&entry.endHours)m.hours=entry.endHours;save();go('logbook')});
 document.querySelector('#printBtn')?.addEventListener('click',()=>window.print());
 document.querySelector('#jobForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.jobs.unshift({id:crypto.randomUUID(),date:f.get('date'),customer:f.get('customer').trim(),place:f.get('place').trim(),machineId:f.get('machineId'),work:f.get('work').trim(),hours:f.get('hours'),price:f.get('price'),note:f.get('note').trim()});save();go('jobs')});
 document.querySelector('#fuelForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const liters=Number(f.get('liters'))||0;const pricePerLiter=Number(f.get('pricePerLiter'))||0;const hours=f.get('hours');state.fuel.unshift({id:crypto.randomUUID(),date:f.get('date'),machineId:f.get('machineId'),liters:String(liters),pricePerLiter:String(pricePerLiter),total:String(liters*pricePerLiter),hours,station:f.get('station').trim(),fuelType:f.get('fuelType'),note:f.get('note').trim()});const m=state.machines.find(x=>x.id===f.get('machineId'));if(m&&hours)m.hours=hours;save();go('fuel')});
 document.querySelector('#exportBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:'0.6',machines:state.machines,service:state.service,inspections:state.inspections,logbook:state.logbook,jobs:state.jobs,fuel:state.fuel},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tm-strojnik-zaloha.json';a.click();URL.revokeObjectURL(a.href)});
 document.querySelector('#importFile')?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state.machines=d.machines||[];state.service=d.service||[];state.inspections=d.inspections||[];state.logbook=d.logbook||[];state.jobs=d.jobs||[];state.fuel=d.fuel||[];save();alert('Záloha byla obnovena.');go('home')}catch{alert('Soubor není platný.')}};r.readAsText(file)});
 document.querySelector('#clearBtn')?.addEventListener('click',()=>{if(confirm('Opravdu vymazat všechna data?')){state.machines=[];state.service=[];state.inspections=[];state.logbook=[];state.jobs=[];state.fuel=[];save();go('home')}});
}
function render(){const view={home,machines,machineDetail,machineForm,service,inspections,inspectionForm,logbook,logForm,logReport,jobs,jobForm,fuel,fuelForm,backup}[state.route]||home;document.getElementById('app').innerHTML=shell(view());bind()}
render();