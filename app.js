/*MP-APP*/
document.getElementById('root').innerHTML=`<header><button id="back" style="display:none">←</button><h1 id="title">Mes Prières</h1><button id="menu">⋮</button></header>
<main id="main"></main>
<button class="fab" id="fab">+</button>
<input type="file" id="fi" accept="image/*" multiple style="display:none">
<input type="file" id="fimp" accept="application/json,.json" style="display:none">`;
const KEY='mesprieres_v1';
const DEFAULT={cats:[
 {id:'c1',name:'Vierge Marie',prayers:[{id:'p1',title:'Je vous salue Marie',text:"Je vous salue, Marie, pleine de grâce ;\nle Seigneur est avec vous.\nVous êtes bénie entre toutes les femmes\net Jésus, le fruit de vos entrailles, est béni.\n\nSainte Marie, Mère de Dieu,\npriez pour nous, pauvres pécheurs,\nmaintenant et à l'heure de notre mort.\nAmen."}]},
 {id:'c2',name:'Sainte Thérèse',prayers:[]},
 {id:'c3',name:'Saint Joseph',prayers:[]},
 {id:'c4',name:'Saint François',prayers:[]}
]};
let db;
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!db||!db.cats)db=JSON.parse(JSON.stringify(DEFAULT));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){info('Sauvegarde impossible')}};
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);

/* ---- Fenêtres de dialogue en français ---- */
function dlg({msg,input,def,okText='OK',cancel=true}){return new Promise(res=>{
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="dlg"><p>${esc(msg)}</p>${input?'<input class="f" id="dl" style="margin-bottom:10px">':''}<div class="row">${cancel?'<button class="btn sec" id="dc">Annuler</button>':''}<button class="btn" id="dk">${okText}</button></div></div>`;
  document.body.appendChild(o);
  const inp=o.querySelector('#dl');
  if(inp){inp.value=def||'';setTimeout(()=>inp.focus(),80)}
  const close=v=>{o.remove();res(v)};
  o.querySelector('#dk').onclick=()=>close(inp?inp.value:true);
  const c=o.querySelector('#dc');if(c)c.onclick=()=>close(inp?null:false);
  o.dismiss=()=>close(inp||cancel?(inp?null:false):true);
});}
const ask=(m,d)=>dlg({msg:m,input:true,def:d});
const conf=m=>dlg({msg:m,okText:'Oui'});
const info=m=>dlg({msg:m,cancel:false});
function choose(msg,opts){return new Promise(res=>{
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="dlg"><p>${esc(msg)}</p><div class="col">${opts.map((t,i)=>`<button class="btn ${t.cls||''}" data-i="${i}">${esc(t.label)}</button>`).join('')}<button class="btn sec" data-i="-1">Fermer</button></div></div>`;
  document.body.appendChild(o);
  const close=v=>{o.remove();res(v)};
  o.querySelectorAll('button').forEach(b=>b.onclick=()=>close(+b.dataset.i));
  o.dismiss=()=>close(-1);
});}

let view={n:'home'};
const stack=[];
function go(v){stack.push(view);view=v;render()}
function back(){
  const os=document.querySelectorAll('.ov');
  if(os.length){os[os.length-1].dismiss();return true}
  if(stack.length){view=stack.pop();render();return true}
  return false;
}
window.appBack=()=>back();

const az=(a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base',numeric:true});
const sorted=()=>[...db.cats].sort(az);
function catCard(c){
  const np=c.prayers.length;
  return `<div class="cat" data-c="${c.id}"><b>${esc(c.name)}</b><span class="cnt">${np} prière${np>1?'s':''} ›<small class="ph" data-c="${c.id}"></small></span></div>`;
}
function render(){
  galTok++;galUrls.forEach(u=>URL.revokeObjectURL(u));galUrls=[];
  const m=$('main'),fab=$('fab'),bk=$('back'),t=$('title');
  bk.style.display=view.n==='home'?'none':'block';
  fab.style.display=(view.n==='home'||view.n==='cat'||view.n==='album')?'block':'none';
  if(view.n==='home'){
    t.textContent='Mes Prières';
    m.innerHTML='<input class="search" id="q" placeholder="Rechercher une prière…">'+
      '<div id="list">'+sorted().map(catCard).join('')+'</div>'+
      (db.cats.length?'':'<div class="empty">Aucune catégorie.<br>Appuyez sur + pour en créer une.</div>');
    m.querySelectorAll('.cat').forEach(e=>e.onclick=()=>go({n:'cat',id:e.dataset.c}));
    $('q').oninput=e=>search(e.target.value);
    fillCounts();
  }else if(view.n==='cat'){
    const c=db.cats.find(x=>x.id===view.id);if(!c){back();return}
    t.textContent=c.name;
    const tab=view.tab||'p';
    const tabs=`<div class="tabs"><button data-t="p" class="${tab==='p'?'on':''}">Prières</button><button data-t="g" class="${tab==='g'?'on':''}">Galerie</button></div>`;
    if(tab==='p'){
      m.innerHTML=tabs+(c.prayers.length?c.prayers.map(p=>prayerHTML(p)).join(''):'<div class="empty">Aucune prière ici.<br>Appuyez sur + pour en ajouter une.</div>');
      bindPrayers(m,c.id);
    }else{
      m.innerHTML=tabs+'<div id="albs"></div><div id="gal" class="grid"></div>';
      loadGallery(c.id,'');
    }
    m.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{view.tab=b.dataset.t;render()});
  }else if(view.n==='album'){
    const c=db.cats.find(x=>x.id===view.cid);
    const a=c&&(c.albums||[]).find(x=>x.id===view.aid);
    if(!a){back();return}
    t.textContent=a.name;
    m.innerHTML='<div id="gal" class="grid"></div>';
    loadGallery(c.id,a.id);
  }else if(view.n==='edit'){
    const c=db.cats.find(x=>x.id===view.cid);
    const p=view.pid?c.prayers.find(x=>x.id===view.pid):{title:'',text:''};
    t.textContent=view.pid?'Modifier la prière':'Nouvelle prière';
    m.innerHTML=`<label>Titre</label><input class="f" id="pt" value="${esc(p.title)}" placeholder="Ex. : Litanies, Neuvaine…"><label>Texte de la prière (sélectionnez des mots puis G, I ou S)</label><div class="tb"><button type="button" data-c="bold" title="Gras"><b>G</b></button><button type="button" data-c="italic" title="Italique"><i>I</i></button><button type="button" data-c="underline" title="Souligné"><u>S</u></button><button type="button" data-c="removeFormat" title="Effacer la mise en forme">✕</button></div><div class="ed" id="px" contenteditable="true"></div><div class="row"><button class="btn" id="ok">Enregistrer</button><button class="btn sec" id="no">Annuler</button></div>`;
    const ed=$('px');
    ed.innerHTML=p.html?sanitizeHtml(p.html):esc(p.text).replace(/\n/g,'<br>');
    initToolbar(ed);
    $('no').onclick=back;
    $('ok').onclick=()=>{
      const ti=$('pt').value.trim(),{h,t}=serialize(ed),tx=t;
      if(!ti&&!tx){info('Écrivez au moins un titre ou un texte.');return}
      const html=/<[biu]>/.test(h)?h:'';
      if(view.pid){p.title=ti||'Sans titre';p.text=tx;p.html=html}else c.prayers.push({id:uid(),title:ti||'Sans titre',text:tx,html});
      save();back();
    };
  }else if(view.n==='update'){
    t.textContent='Mise à jour';
    const M=window.MP||{version:'?',source:'',url:()=>''};
    m.innerHTML=`<p class="hint">Version installée : <b>${esc(M.version)}</b> (${esc(M.source||'')})${M.notes?'<br>'+esc(M.notes):''}</p><label>Adresse des mises à jour (https://…)</label><input class="f" id="uu" value="${esc(M.url?M.url():'')}" placeholder="https://moncompte.github.io/mesprieres/" autocapitalize="off" autocorrect="off" spellcheck="false"><div class="row"><button class="btn" id="uc">Vérifier maintenant</button><button class="btn sec" id="ur" style="display:none">Redémarrer</button></div><p class="hint" id="us"></p><hr class="sep"><p class="hint">Seuls l'affichage et les fonctions de l'application sont mis à jour. Vos prières et vos photos ne sont jamais touchées. L'application vérifie toute seule au démarrage quand une adresse est renseignée.</p><div class="row"><button class="btn del" id="uo">Revenir à la version d'origine</button></div>`;
    $('uc').onclick=async()=>{
      MP.setUrl($('uu').value);
      $('us').textContent='Vérification…';
      const r=await MP.check();
      const txt={nourl:'Indiquez d\'abord l\'adresse des mises à jour.',uptodate:'Vous avez la dernière version ('+r.version+').',downloaded:'Version '+r.remote+' téléchargée'+(r.notes?' : '+r.notes:'')+'. Redémarrez pour l\'appliquer.',error:'Impossible de vérifier : '+r.error}[r.status]||'';
      $('us').textContent=txt;
      if(r.status==='downloaded')$('ur').style.display='inline-block';
    };
    $('ur').onclick=()=>MP.reload();
    $('uo').onclick=async()=>{if(await conf('Revenir à la version d\'origine de l\'APK ? Vos données ne sont pas touchées.'))MP.reset()};
  }else if(view.n==='backup'){
    t.textContent='Exporter / importer';
    m.innerHTML=`<h2 class="sec">Sauvegarde complète (prières + photos)</h2><p class="hint">Un seul fichier contenant tout : catégories, prières avec leur mise en forme, galeries et dossiers. Dans la fenêtre Android qui s'ouvre, appuyez sur le menu ≡ (en haut à gauche), choisissez <b>Drive</b>, puis un dossier.</p><div class="row"><button class="btn" id="ex">Exporter vers Drive</button><button class="btn sec" id="im">Importer depuis Drive</button></div><hr class="sep"><h2 class="sec">Sauvegarde texte seulement</h2><p class="hint">Copier-coller de vos prières, sans les photos.</p><textarea class="f" id="bk" style="min-height:140px;font-size:13px"></textarea><div class="row"><button class="btn sec" id="cp">Copier</button><button class="btn sec" id="rs">Restaurer</button></div>`;
    $('bk').value=JSON.stringify(db);
    $('ex').onclick=exportAll;
    $('im').onclick=()=>$('fimp').click();
    $('cp').onclick=()=>{$('bk').select();try{navigator.clipboard.writeText($('bk').value)}catch(e){document.execCommand('copy')}info('Sauvegarde copiée.')};
    $('rs').onclick=async()=>{
      let d;
      try{d=JSON.parse($('bk').value);if(!d.cats)throw 0}catch(e){info('Texte de sauvegarde invalide.');return}
      if(!await conf('Remplacer toutes vos prières actuelles par cette sauvegarde ?'))return;
      cleanDb(d);db=d;save();stack.length=0;view={n:'home'};render();
    };
  }
  window.scrollTo(0,0);
}
function prayerHTML(p,cn){return `<div class="pr" data-p="${p.id}" ${cn!==undefined?`data-c="${cn.id}"`:''}><div class="t"><span>${esc(p.title)}${cn?`<br><small>${esc(cn.name)}</small>`:''}</span><span>⌄</span></div><div class="body">${p.html||esc(p.text)}</div><div class="acts"><button class="btn sec" data-a="e">Modifier</button><button class="btn del" data-a="d">Supprimer</button></div></div>`}
function bindPrayers(root,defaultCid){
  root.querySelectorAll('.pr').forEach(el=>{
    const cid=el.dataset.c||defaultCid,pid=el.dataset.p;
    el.querySelector('.t').onclick=()=>el.classList.toggle('open');
    el.querySelector('[data-a=e]').onclick=()=>go({n:'edit',cid,pid});
    el.querySelector('[data-a=d]').onclick=async()=>{
      if(!await conf('Supprimer cette prière ?'))return;
      const c=db.cats.find(x=>x.id===cid);c.prayers=c.prayers.filter(x=>x.id!==pid);save();render();
    };
  });
}
function search(q){
  q=q.trim().toLowerCase();const l=$('list');
  if(!q){render();return}
  const res=[];db.cats.forEach(c=>c.prayers.forEach(p=>{if((p.title+' '+p.text+' '+c.name).toLowerCase().includes(q))res.push([c,p])}));
  l.innerHTML=res.length?res.map(([c,p])=>prayerHTML(p,c)).join(''):'<div class="empty">Aucun résultat.</div>';
  bindPrayers(l);
}
/* ---- Galerie (stockage IndexedDB, séparé de vos prières) ---- */
let idb,galTok=0,galUrls=[];
function openDB(){return new Promise((res,rej)=>{
  if(idb)return res(idb);
  const r=indexedDB.open('mesprieres_photos',1);
  r.onupgradeneeded=()=>{const s=r.result.createObjectStore('photos',{keyPath:'id'});s.createIndex('cat','cat')};
  r.onsuccess=()=>{idb=r.result;res(idb)};
  r.onerror=()=>rej(r.error);
});}
const store=async mode=>(await openDB()).transaction('photos',mode).objectStore('photos');
const reqP=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function photosOf(cid){const s=await store('readonly');return(await reqP(s.index('cat').getAll(cid))).sort((a,b)=>a.t-b.t)}
async function addPhoto(p){return reqP((await store('readwrite')).put(p))}
async function delPhoto(id){return reqP((await store('readwrite')).delete(id))}
async function delCatPhotos(cid){for(const p of await photosOf(cid))await delPhoto(p.id)}
function shrink(file,max=1600){return new Promise((res,rej)=>{
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{
    const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
    const w=Math.round(im.naturalWidth*k),h=Math.round(im.naturalHeight*k);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(im,0,0,w,h);
    c.toBlob(b=>{URL.revokeObjectURL(url);b?res(b):rej()},'image/jpeg',0.85);
  };
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('image illisible'))};
  setTimeout(()=>rej(new Error('délai dépassé')),60000);
  im.src=url;
});}
async function prep(file){
  try{return await shrink(file)}
  catch(e){if(file.size<20e6)return file;throw e}
}
async function fillCounts(){
  const my=galTok;
  for(const el of [...document.querySelectorAll('.ph[data-c]')]){
    try{
      const n=await reqP((await store('readonly')).index('cat').count(el.dataset.c));
      if(my!==galTok)return;
      el.textContent=n+' photo'+(n>1?'s':'');
    }catch(e){return}
  }
}
async function loadGallery(cid,aid){
  const my=galTok,box=$('gal'),abox=$('albs');
  const c=db.cats.find(x=>x.id===cid),albs=c.albums||[];
  let all;
  try{all=await photosOf(cid)}catch(e){box.className='';box.innerHTML='<div class="empty">Galerie indisponible sur cet appareil.</div>';return}
  if(my!==galTok)return;
  const ids=new Set(albs.map(a=>a.id));
  const albOf=p=>ids.has(p.album)?p.album:'';
  const url=p=>{if(!p.url){p.url=URL.createObjectURL(p.blob);galUrls.push(p.url)}return p.url};
  const list=all.filter(p=>albOf(p)===(aid||''));
  if(abox&&albs.length){
    abox.innerHTML='<div class="albums">'+albs.map(a=>{
      const ph=all.filter(p=>albOf(p)===a.id);
      return `<div class="alb" data-a="${a.id}"><div class="cv">${ph.length?`<img src="${url(ph[0])}">`:'📁'}</div><b>${esc(a.name)}</b><small>${ph.length} photo${ph.length>1?'s':''}</small></div>`;
    }).join('')+'</div>'+(list.length?'<div class="sub">Photos sans dossier</div>':'');
    abox.querySelectorAll('.alb').forEach(e=>e.onclick=()=>go({n:'album',cid,aid:e.dataset.a}));
  }
  if(!list.length){
    box.className='';
    box.innerHTML=aid?'<div class="empty">Ce dossier est vide.<br>Appuyez sur + pour ajouter des photos.</div>':(albs.length?'':'<div class="empty">Aucune photo ici.<br>Appuyez sur + pour ajouter des photos<br>ou créer un dossier.</div>');
    return;
  }
  list.forEach(url);
  box.innerHTML=list.map((p,i)=>`<img src="${p.url}" data-i="${i}">`).join('');
  box.querySelectorAll('img').forEach(im=>im.onclick=()=>openViewer(list,+im.dataset.i,cid));
}
function openViewer(list,i,cid){
  const o=document.createElement('div');o.className='ov viewer';
  o.innerHTML='<img id="vi"><div class="vbar"><button id="vx">✕</button><span id="vc"></span><div class="g"><button id="vm">📁</button><button id="vd">🗑</button></div></div><button class="nav l" id="vp">‹</button><button class="nav r" id="vn">›</button>';
  document.body.appendChild(o);
  const img=o.querySelector('#vi');
  const show=()=>{img.src=list[i].url;o.querySelector('#vc').textContent=(i+1)+' / '+list.length;o.querySelector('#vp').style.display=i>0?'block':'none';o.querySelector('#vn').style.display=i<list.length-1?'block':'none'};
  const step=d=>{const n=i+d;if(n>=0&&n<list.length){i=n;show()}};
  o.dismiss=()=>o.remove();
  o.querySelector('#vx').onclick=()=>o.dismiss();
  o.querySelector('#vp').onclick=()=>step(-1);
  o.querySelector('#vn').onclick=()=>step(1);
  o.querySelector('#vm').onclick=async()=>{
    const albs=db.cats.find(x=>x.id===cid).albums||[];
    if(!albs.length){info('Créez d\'abord un dossier : dans la galerie, appuyez sur + puis « Nouveau dossier ».');return}
    const r=await choose('Déplacer cette photo vers…',[{label:'Sans dossier'},...albs.map(a=>({label:'📁 '+a.name}))]);
    if(r<0)return;
    const ph=list[i];
    try{await addPhoto({id:ph.id,cat:ph.cat,t:ph.t,album:r===0?'':albs[r-1].id,blob:ph.blob})}catch(e){info('Déplacement impossible.');return}
    o.remove();render();
  };
  o.querySelector('#vd').onclick=async()=>{
    if(!await conf('Supprimer cette photo ?'))return;
    try{await delPhoto(list[i].id)}catch(e){}
    o.remove();render();
  };
  let x0=null;
  o.addEventListener('touchstart',e=>{x0=e.touches.length===1?e.touches[0].clientX:null},{passive:true});
  o.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>60)step(dx<0?1:-1);x0=null});
  show();
}
$('fi').onchange=async e=>{
  const files=[...(e.target.files||[])];
  if(!files.length){info('Aucune photo reçue du sélecteur de fichiers.');return}
  let cid,album='';
  if(view.n==='cat')cid=view.id;else if(view.n==='album'){cid=view.cid;album=view.aid}else{info('Ouvrez d\'abord la galerie d\'un saint.');return}
  const w=document.createElement('div');w.className='ov';w.innerHTML='<div class="dlg"><p id="wp"></p></div>';
  w.dismiss=()=>{};document.body.appendChild(w);
  let ok=0,lastErr='';
  try{
    for(let i=0;i<files.length;i++){
      w.querySelector('#wp').textContent='Ajout des photos… '+(i+1)+' / '+files.length;
      try{const b=await prep(files[i]);await addPhoto({id:uid(),cat:cid,t:Date.now()+i,album,blob:b});ok++}
      catch(err){lastErr=(err&&(err.name||'')+' '+(err.message||''))||String(err)}
    }
  }finally{w.remove();try{e.target.value=''}catch(x){}}
  if(ok<files.length)await info(ok+' photo(s) ajoutée(s) sur '+files.length+'.'+(lastErr?' Erreur : '+lastErr.trim():''));
  render();
};

/* ---- Mise en forme du texte (gras, italique, souligné) ---- */
function serialize(root){
  let h='',t='';
  const nl=()=>{h+='<br>';t+='\n'};
  const wrap=(x,f)=>(f.b?'<b>':'')+(f.i?'<i>':'')+(f.u?'<u>':'')+x+(f.u?'</u>':'')+(f.i?'</i>':'')+(f.b?'</b>':'');
  const BLOCK=new Set(['div','p','li','ul','ol','h1','h2','h3','h4','h5','h6','blockquote','pre','tr']);
  (function walk(n,f){
    for(const c of n.childNodes){
      if(c.nodeType===3){
        const x=c.textContent.replace(/ /g,' ');
        if(x){h+=wrap(esc(x).replace(/\n/g,'<br>'),f);t+=x}
      }else if(c.nodeType===1){
        const tag=c.tagName.toLowerCase();
        if(tag==='br'){nl();continue}
        if(tag==='script'||tag==='style')continue;
        const g={...f},st=c.style||{};
        if(tag==='b'||tag==='strong')g.b=1;
        if(tag==='i'||tag==='em')g.i=1;
        if(tag==='u')g.u=1;
        if(st.fontWeight==='bold'||+st.fontWeight>=600)g.b=1;
        if(st.fontStyle==='italic')g.i=1;
        if(String(st.textDecorationLine||st.textDecoration||'').includes('underline'))g.u=1;
        const blk=BLOCK.has(tag);
        if(blk&&t&&!t.endsWith('\n'))nl();
        walk(c,g);
        if(blk&&t&&!t.endsWith('\n'))nl();
      }
    }
  })(root,{});
  return{h:h.replace(/^(<br>)+|(<br>)+$/g,''),t:t.replace(/^\n+|\n+$/g,'')};
}
function sanitizeHtml(h){return serialize(new DOMParser().parseFromString('<body>'+h+'</body>','text/html').body).h}
function cleanDb(d){
  d.cats=(d.cats||[]).filter(c=>c&&c.id&&c.name);
  d.cats.forEach(c=>{c.prayers=c.prayers||[];c.prayers.forEach(p=>{if(p.html)p.html=sanitizeHtml(p.html)})});
}
function syncTb(){
  const tb=document.querySelector('.tb');if(!tb)return;
  tb.querySelectorAll('button').forEach(b=>{
    let on=false;
    if(b.dataset.c!=='removeFormat'){try{on=document.queryCommandState(b.dataset.c)}catch(e){}}
    b.classList.toggle('on',on);
  });
}
document.addEventListener('selectionchange',syncTb);
function initToolbar(ed){
  document.querySelectorAll('.tb button').forEach(b=>{
    b.onpointerdown=e=>e.preventDefault();
    b.onmousedown=e=>e.preventDefault();
    b.onclick=()=>{ed.focus();document.execCommand(b.dataset.c,false,null);syncTb()};
  });
  ed.addEventListener('paste',e=>{
    e.preventDefault();
    const x=(e.clipboardData||window.clipboardData).getData('text/plain');
    document.execCommand('insertText',false,x);
  });
}

/* ---- Export / import complet (prières + photos) ---- */
function busy(txt){
  const w=document.createElement('div');w.className='ov';w.innerHTML='<div class="dlg"><p></p></div>';
  w.querySelector('p').textContent=txt;w.dismiss=()=>{};document.body.appendChild(w);
  return{set:x=>{w.querySelector('p').textContent=x},close:()=>w.remove()};
}
const toDataUrl=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
function dataUrlToBlob(u){
  const i=u.indexOf(','),mime=(u.slice(5,u.indexOf(';'))||'image/jpeg');
  const bin=atob(u.slice(i+1)),a=new Uint8Array(bin.length);
  for(let k=0;k<bin.length;k++)a[k]=bin.charCodeAt(k);
  return new Blob([a],{type:mime});
}
async function makeWriter(name){
  if(window.Android&&Android.exportStart){
    const ok=await new Promise(res=>{window.onExportReady=res;Android.exportStart(name)});
    if(!ok)return null;
    return{write:x=>{if(!Android.exportWrite(x))throw new Error('écriture impossible')},close:()=>Android.exportEnd()};
  }
  const parts=[];
  return{write:x=>{parts.push(x)},close:()=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(parts,{type:'application/json'}));
    a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},3000);
  }};
}
async function exportAll(){
  const name='MesPrieres-'+new Date().toISOString().slice(0,10)+'.json';
  let w;
  try{w=await makeWriter(name)}catch(e){await info('Export impossible : '+(e&&e.message||e));return}
  if(!w)return;
  const bz=busy('Export en cours…');
  try{
    let all=[];
    try{all=await reqP((await store('readonly')).getAll())}catch(e){}
    all.sort((a,b)=>a.t-b.t);
    w.write('{"app":"mesprieres","version":2,"exported":'+JSON.stringify(new Date().toISOString())+',"db":'+JSON.stringify(db)+',"photos":[\n');
    for(let i=0;i<all.length;i++){
      bz.set('Export des photos… '+(i+1)+' / '+all.length);
      const p=all[i];
      w.write((i?',\n':'')+JSON.stringify({id:p.id,cat:p.cat,album:p.album||'',t:p.t,data:await toDataUrl(p.blob)}));
    }
    w.write('\n]}\n');
    w.close();bz.close();
    await info('Export terminé ('+all.length+' photo'+(all.length>1?'s':'')+').');
  }catch(e){
    try{w.close()}catch(x){}
    bz.close();await info('Export interrompu : '+(e&&e.message||e));
  }
}
async function readLines(file,cb){
  const dec=new TextDecoder('utf-8'),CH=2*1024*1024;
  let buf='',off=0,n=0;
  const slice=(a,b)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsArrayBuffer(file.slice(a,b))});
  while(off<file.size){
    buf+=dec.decode(await slice(off,off+CH),{stream:true});off+=CH;
    let k,st=0;
    while((k=buf.indexOf('\n',st))>=0){const line=buf.slice(st,k);st=k+1;await cb(line,n++)}
    buf=buf.slice(st);
  }
  buf+=dec.decode();
  if(buf.length)await cb(buf,n++);
}
function parseLine(line,i){
  line=line.trim();
  if(i===0){
    if(!line.endsWith('"photos":['))throw new Error('format');
    const h=JSON.parse(line+']}');
    if(h.app!=='mesprieres'||!h.db||!Array.isArray(h.db.cats))throw new Error('format');
    return{head:h};
  }
  if(!line||line===']}'||line===']')return null;
  if(line.endsWith(','))line=line.slice(0,-1);
  const p=JSON.parse(line);
  if(!p.id||!p.cat||!p.data)throw new Error('photo');
  return{photo:p};
}
async function importFile(file){
  let head=null,n=0;
  const b1=busy('Vérification du fichier…');
  try{
    await readLines(file,(line,i)=>{const r=parseLine(line,i);if(r&&r.head)head=r.head;else if(r&&r.photo)n++});
    if(!head)throw new Error('vide');
  }catch(e){b1.close();await info('Ce fichier n\'est pas une sauvegarde Mes Prières valide.');return}
  b1.close();
  const nc=head.db.cats.length,np=head.db.cats.reduce((s,c)=>s+((c&&c.prayers)||[]).length,0);
  if(!await conf('Cette sauvegarde contient '+nc+' catégorie(s), '+np+' prière(s) et '+n+' photo(s). Elle va REMPLACER toutes vos données actuelles. Continuer ?'))return;
  const b2=busy('Import en cours…');
  try{
    await reqP((await store('readwrite')).clear());
    let k=0;
    await readLines(file,async(line,i)=>{
      const r=parseLine(line,i);if(!r||!r.photo)return;
      const p=r.photo;
      await addPhoto({id:p.id,cat:p.cat,t:p.t||Date.now(),album:p.album||'',blob:dataUrlToBlob(p.data)});
      b2.set('Import des photos… '+(++k)+' / '+n);
    });
    const d=head.db;cleanDb(d);db=d;save();
    b2.close();stack.length=0;view={n:'home'};render();
    await info('Import terminé.');
  }catch(e){b2.close();await info('Import interrompu : '+(e&&e.message||e)+'. Réessayez.')}
}
$('fimp').onchange=async e=>{
  const f=e.target.files&&e.target.files[0];
  if(!f){info('Aucun fichier reçu.');return}
  try{await importFile(f)}finally{try{e.target.value=''}catch(x){}}
};

$('back').onclick=back;
$('fab').onclick=async()=>{
  if(view.n==='home'){
    const n=await ask('Nom de la nouvelle catégorie (ex. Saint Antoine) :');
    if(n&&n.trim()){db.cats.push({id:uid(),name:n.trim(),prayers:[]});save();render()}
  }else if(view.n==='cat'){
    if(view.tab==='g'){
      const r=await choose('Galerie',[{label:'Ajouter des photos'},{label:'Nouveau dossier'}]);
      if(r===0)$('fi').click();
      else if(r===1){
        const n=await ask('Nom du dossier (ex. Statues, Pèlerinage) :');
        if(n&&n.trim()){const c=db.cats.find(x=>x.id===view.id);(c.albums=c.albums||[]).push({id:uid(),name:n.trim()});save();render()}
      }
    }else go({n:'edit',cid:view.id});
  }else if(view.n==='album')$('fi').click();
};
$('menu').onclick=async()=>{
  if(view.n==='cat'){
    const c=db.cats.find(x=>x.id===view.id);
    const a=await choose(c.name,[{label:'Renommer la catégorie'},{label:'Supprimer la catégorie',cls:'del'}]);
    if(a===0){const n=await ask('Nouveau nom :',c.name);if(n&&n.trim()){c.name=n.trim();save();render()}}
    else if(a===1&&await conf('Supprimer « '+c.name+' » avec toutes ses prières et ses photos ?')){try{await delCatPhotos(c.id)}catch(e){}db.cats=db.cats.filter(x=>x.id!==c.id);save();stack.length=0;view={n:'home'};render()}
  }else if(view.n==='album'){
    const c=db.cats.find(x=>x.id===view.cid),a=(c.albums||[]).find(x=>x.id===view.aid);
    const r=await choose(a.name,[{label:'Renommer le dossier'},{label:'Supprimer le dossier',cls:'del'}]);
    if(r===0){const n=await ask('Nouveau nom :',a.name);if(n&&n.trim()){a.name=n.trim();save();render()}}
    else if(r===1&&await conf('Supprimer le dossier « '+a.name+' » et toutes ses photos ?')){
      try{for(const p of await photosOf(c.id))if(p.album===a.id)await delPhoto(p.id)}catch(e){}
      c.albums=c.albums.filter(x=>x.id!==a.id);save();back();
    }
  }else if(view.n==='home'){
    const a=await choose('Menu',[{label:'Exporter / importer'},{label:'Mise à jour de l\'application'}]);
    if(a===0)go({n:'backup'});
    else if(a===1)go({n:'update'});
  }
};
render();

/* ---- Mises à jour à distance (le chargeur loader.js fournit window.MP) ---- */
function showUpdateBanner(r){
  if(document.querySelector('.upd'))return;
  const d=document.createElement('div');d.className='upd';
  d.innerHTML='<span>Nouvelle version '+esc(r.remote)+' prête'+(r.notes?' : '+esc(r.notes):'')+'</span><button class="btn" id="updgo">Redémarrer</button><button class="btn sec" id="updx">✕</button>';
  document.body.appendChild(d);
  d.querySelector('#updgo').onclick=()=>MP.reload();
  d.querySelector('#updx').onclick=()=>d.remove();
}
if(window.__mpReady)window.__mpReady();
if(window.MP){
  const nt=MP.notice();
  if(nt)setTimeout(()=>info(nt),400);
  if(MP.url())setTimeout(()=>MP.check().then(r=>{if(r.status==='downloaded')showUpdateBanner(r)}),2000);
}

