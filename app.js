import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const $=s=>document.querySelector(s), appEl=$("#app");
const configured=!Object.values(firebaseConfig).some(v=>String(v).includes("PASTE_"));
let fb,auth,db,user=null,role=null,room=null,teamId=null,teamName="",soundId=1,roomData=null,unsub=null,countTimer=null;
let mediaDataUrl=null, selectedAvatar="🦁";
const DRAFT_KEY="pq_join_draft";
function saveDraft(){if(room)localStorage.setItem(DRAFT_KEY,JSON.stringify({room,teamName,soundId,selectedAvatar}))}
function loadDraft(){try{let d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");if(d?.room===room){teamName=d.teamName||teamName;soundId=+d.soundId||soundId;selectedAvatar=d.selectedAvatar||selectedAvatar}}catch{}}
function clearDraft(){localStorage.removeItem(DRAFT_KEY)}
const AVATARS=[
  ["🦁","Singa"],["🐯","Harimau"],["🐆","Macan Tutul"],["🐱","Kucing"],["🐺","Serigala"],
  ["🦊","Rubah"],["🐼","Panda"],["🐻","Beruang"],["🐨","Koala"],["🦌","Rusa"],
  ["🐘","Gajah"],["🦏","Badak"],["🐴","Kuda"],["🐮","Sapi"],["🐃","Kerbau"],
  ["🐐","Kambing"],["🐑","Domba"],["🐰","Kelinci"],["🐿️","Tupai"],["🦔","Landak"],
  ["🦉","Burung Hantu"],["🦅","Elang"],["🐦","Burung"],["🦩","Flamingo"],["🦆","Bebek"],
  ["🦢","Angsa"],["🐔","Ayam"],["🐧","Penguin"],["🐢","Penyu"],["🐠","Ikan"]
];
const COLORS=["violet","cyan","amber","emerald","rose","blue"];
const SOUNDS=[
  [1,"Classic Bell","🔔"],[2,"Game Show","🎙️"],[3,"School Bell","🏫"],[4,"Ding Dong","🛎️"],[5,"Gong","🥁"],[6,"Bright Bell","✨"],[7,"Buzzer","⚡"],
  [8,"Arcade Coin","🪙"],[9,"Laser","🚀"],[10,"Robot","🤖"],[11,"Retro Jump","🕹️"],[12,"Power Up","🎮"],[13,"Digital Ping","📡"],[14,"Glitch","💾"],
  [15,"Boing","🫧"],[16,"Pop","🎈"],[17,"Squeak","🐤"],[18,"Whistle","📣"],[19,"Magic","🪄"],[20,"Bubble","🫧"],[21,"Spring","🌀"],
  [22,"Epic Hit","💥"],[23,"Drum Hit","🥁"],[24,"Bass Drop","🔊"],[25,"Trumpet","🎺"],[26,"Victory Ping","🏆"],[27,"Space Zap","🛸"],[28,"Crystal","💎"],
  [29,"QuizZap","⚡"],[30,"PakKom Pulse","PQ"]
];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const newCode=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const net=s=>$("#net").textContent=s;
let toastTimer=null;
function clearToast(){let x=$("#toast");if(!x)return;clearTimeout(toastTimer);x.classList.remove("show");x.textContent=""}
function toast(s){let x=$("#toast");clearTimeout(toastTimer);x.textContent=s;x.classList.add("show");toastTimer=setTimeout(()=>{x.classList.remove("show");x.textContent=""},2500)}
function askConfirm({title,message,confirmText="Ya, lanjutkan",cancelText="Batal",danger=false}={}){return new Promise(resolve=>{document.querySelector("#pqConfirm")?.remove();let el=document.createElement("div");el.id="pqConfirm";el.className="modal pq-confirm";el.innerHTML=`<section class="confirm-sheet"><button class="confirm-close" aria-label="Tutup">×</button><div class="confirm-symbol">↗</div><h2>${esc(title||"Konfirmasi")}</h2><p>${esc(message||"")}</p><div class="confirm-actions"><button class="secondary confirm-cancel">${esc(cancelText)}</button><button class="${danger?"bad":""} confirm-ok">${esc(confirmText)}</button></div></section>`;document.body.appendChild(el);let done=v=>{el.remove();resolve(v)};el.querySelector(".confirm-close").onclick=()=>done(false);el.querySelector(".confirm-cancel").onclick=()=>done(false);el.querySelector(".confirm-ok").onclick=()=>done(true);el.addEventListener("click",e=>{if(e.target===el)done(false)})})}
const audioCache=new Map();
let audioCtx=null, audioQueue=Promise.resolve(), audioGeneration=0, currentUtterance=null;
let cachedVoices=[];
function refreshVoices(){try{cachedVoices=speechSynthesis.getVoices()||[]}catch{cachedVoices=[]}}
if("speechSynthesis" in window){refreshVoices();speechSynthesis.onvoiceschanged=refreshVoices;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function unlockAudio(){
 try{
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended") await audioCtx.resume();
  // Memanggil voices setelah interaksi membantu beberapa browser Android memuat TTS.
  if("speechSynthesis" in window) speechSynthesis.getVoices();
 }catch{}
}
document.addEventListener("pointerdown",unlockAudio,{once:true,capture:true});
function stopAudioQueue(){
 audioGeneration++;
 try{speechSynthesis.cancel()}catch{}
 for(const a of audioCache.values()){try{a.pause();a.currentTime=0}catch{}}
 audioQueue=Promise.resolve();
}
function enqueueAudio(task,{replace=false}={}){
 if(replace) stopAudioQueue();
 const gen=audioGeneration;
 audioQueue=audioQueue.then(async()=>{if(gen!==audioGeneration)return;await unlockAudio();if(gen!==audioGeneration)return;await task(gen)}).catch(e=>console.warn("AUDIO_QUEUE",e));
 return audioQueue;
}
function synthTone(kind="open"){
 return new Promise(resolve=>{
  try{
   audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
   const ctx=audioCtx, now=ctx.currentTime, master=ctx.createGain();master.connect(ctx.destination);master.gain.setValueAtTime(.16,now);
   const notes={
    open:[[740,0,.09],[990,.11,.12]],
    correct:[[523,0,.12],[659,.13,.12],[784,.27,.22]],
    wrong:[[330,0,.16],[220,.17,.28]],
    rebuzz:[[880,0,.09],[880,.17,.09]],
    cancel:[[440,0,.08],[440,.12,.08]]
   }[kind]||[[660,0,.12]];
   let total=0;
   for(const [freq,delay,dur] of notes){const o=ctx.createOscillator(),g=ctx.createGain();o.type=kind==="wrong"?"triangle":"sine";o.frequency.value=freq;o.connect(g);g.connect(master);g.gain.setValueAtTime(.8,now+delay);g.gain.exponentialRampToValueAtTime(.001,now+delay+dur);o.start(now+delay);o.stop(now+delay+dur+.02);total=Math.max(total,delay+dur)}
   setTimeout(resolve,total*1000+60);
  }catch{resolve()}
 })
}
function synthSound(id){
 return new Promise(resolve=>{try{
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  const ctx=audioCtx, now=ctx.currentTime, master=ctx.createGain(); master.connect(ctx.destination); master.gain.setValueAtTime(.18,now);
  const profiles={8:[880,1320,.12,"square"],9:[1400,320,.22,"sawtooth"],10:[180,520,.28,"square"],11:[330,660,.18,"square"],12:[440,880,.3,"triangle"],13:[1200,900,.16,"sine"],14:[180,1500,.18,"sawtooth"],15:[180,520,.32,"sine"],16:[700,250,.08,"sine"],17:[1500,1100,.12,"square"],18:[900,1200,.3,"sine"],19:[660,1320,.38,"sine"],20:[420,780,.18,"sine"],21:[240,720,.32,"triangle"],22:[120,55,.3,"sawtooth"],23:[160,70,.18,"triangle"],24:[90,42,.45,"sine"],25:[520,780,.4,"sawtooth"],26:[660,990,.42,"triangle"],27:[1200,180,.3,"sawtooth"],28:[1100,1760,.38,"sine"],29:[880,220,.2,"square"],30:[392,784,.45,"triangle"]};
  const [f1,f2,d,type]=profiles[id]||profiles[29], o=ctx.createOscillator(), g=ctx.createGain(); o.type=type;o.connect(g);g.connect(master);o.frequency.setValueAtTime(f1,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),now+d);g.gain.setValueAtTime(.9,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.start(now);o.stop(now+d+.02);setTimeout(resolve,d*1000+60);
 }catch{resolve()}})
}
function playTeamBell(id=1){
 return new Promise(resolve=>{try{let n=Math.max(1,Math.min(30,+id||1));if(n>7){synthSound(n).then(resolve);return}let a=audioCache.get(n);if(!a){a=new Audio(`sounds/Sound ${n}.mp3`);a.preload="auto";audioCache.set(n,a)}a.pause();a.currentTime=0;let done=false,finish=()=>{if(done)return;done=true;a.removeEventListener("ended",finish);a.removeEventListener("error",finish);resolve()};a.addEventListener("ended",finish,{once:true});a.addEventListener("error",finish,{once:true});let pr=a.play();if(pr?.catch)pr.catch(()=>finish());setTimeout(finish,1800)}catch{resolve()}})
}
function beep(id=1){enqueueAudio(()=>playTeamBell(id),{replace:true})}
function speakText(text){
 return new Promise(resolve=>{
  try{
   if(!("speechSynthesis" in window)){resolve();return}
   refreshVoices();
   const u=new SpeechSynthesisUtterance(String(text));
   currentUtterance=u;
   const idVoice=cachedVoices.find(v=>/^id(-|_)/i.test(v.lang)) || cachedVoices.find(v=>/indonesia/i.test(v.name));
   if(idVoice)u.voice=idVoice;
   u.lang=idVoice?.lang||"id-ID";u.rate=.9;u.pitch=1;u.volume=1;
   let done=false; const finish=()=>{if(done)return;done=true;if(currentUtterance===u)currentUtterance=null;resolve()};
   u.onend=finish;u.onerror=finish;
   speechSynthesis.resume();
   speechSynthesis.speak(u);
   setTimeout(finish,5000);
  }catch{resolve()}
 })
}
function announceWinner(t){enqueueAudio(async()=>{await playTeamBell(t.soundId);await sleep(220);await speakText(`Tim ${t.name}, menekan bel.`)},{replace:true})}
function announceFeedback(f){enqueueAudio(async()=>{await synthTone(f.ok?"correct":"wrong");await sleep(220);await speakText(f.ok?`Benar. Tim ${f.teamName}, mendapat ${Math.abs(f.points||0)} poin.`:`Salah. Tim ${f.teamName}.`)},{replace:true})}
function announceRebuzz(){enqueueAudio(async()=>{await synthTone("rebuzz");await sleep(100);await speakText("Rebutan dibuka kembali.")})}
function announceOpen(){enqueueAudio(()=>synthTone("open"),{replace:true})}
function announceCancel(){enqueueAudio(()=>synthTone("cancel"),{replace:true})}
function teams(){return Object.entries(roomData?.teams||{}).map(([id,t])=>({id,...t})).sort((a,b)=>(b.score||0)-(a.score||0)||String(a.name).localeCompare(String(b.name)))}
function rounds(){return Object.entries(roomData?.rounds||{}).map(([id,r])=>({id,...r})).sort((a,b)=>a.number-b.number)}
function winner(){return teams().find(t=>t.id===roomData?.buzzer?.winnerTeamId)}
function myTeam(){return teams().find(t=>t.id===teamId)}
function storeSession(){if(room&&teamId)localStorage.setItem("pq_team",JSON.stringify({room,teamId,teamName}));}
function storeHostSession(){if(room)localStorage.setItem("pq_host",JSON.stringify({room}));}
function clearSession(){localStorage.removeItem("pq_team")}
function clearHostSession(){localStorage.removeItem("pq_host")}
function exitToHome(kind){if(unsub){unsub();unsub=null}if(kind==="host")clearHostSession();else clearSession();role=null;room=null;teamId=null;teamName="";roomData=null;history.replaceState({},"",location.pathname);home()}

async function init(){
 if(!configured){net("● PERLU FIREBASE");home();toast("Isi firebase-config.js terlebih dahulu.");return}
 try{fb=initializeApp(firebaseConfig);auth=getAuth(fb);db=getDatabase(fb);net("● AUTENTIKASI...");await setPersistence(auth,browserLocalPersistence);await signInAnonymously(auth);onAuthStateChanged(auth,u=>{user=u;if(u){net("● ONLINE");route()}})}catch(e){console.error(e);net("● ERROR");home();toast("Firebase belum tersambung: "+e.message)}
}
function watchRoom(){if(unsub)unsub();let oldWinner=null,oldFeedbackAt=null,oldOpen=false;unsub=onValue(ref(db,`rooms/${room}`),snap=>{let prevWinner=oldWinner,prevFeedback=oldFeedbackAt,prevOpen=oldOpen;roomData=snap.val();if(!roomData){toast("Room sudah tidak tersedia.");return home()}oldWinner=roomData.buzzer?.winnerTeamId||null;oldFeedbackAt=roomData.feedback?.at||null;oldOpen=roomData.buzzer?.open===true;if((role==="host"||role==="display")&&oldWinner&&oldWinner!==prevWinner){let t=roomData.teams?.[oldWinner];if(t)announceWinner(t)}if((role==="host"||role==="display")&&oldFeedbackAt&&oldFeedbackAt!==prevFeedback)announceFeedback(roomData.feedback);if((role==="host"||role==="display")&&oldOpen&&!prevOpen&&!oldWinner)announceOpen();render()})}
function route(){let p=new URLSearchParams(location.search),display=p.get("display"),join=p.get("room");if(display){role="display";room=display.toUpperCase();watchRoom();return}if(join){room=join.toUpperCase();role="player";checkRoom(true);return}let s=JSON.parse(localStorage.getItem("pq_team")||"null");if(s?.room&&s?.teamId){room=s.room;teamId=s.teamId;teamName=s.teamName||"";role="player";get(ref(db,`rooms/${room}/teams/${teamId}`)).then(x=>x.exists()?watchRoom():(clearSession(),home()));return}let h=JSON.parse(localStorage.getItem("pq_host")||"null");if(h?.room){room=h.room;get(ref(db,`rooms/${room}`)).then(x=>{if(x.exists()&&x.val().hostUid===user.uid){role="host";watchRoom()}else{localStorage.removeItem("pq_host");home()}});return}home()}
function home(){if(unsub){unsub();unsub=null}clearToast();role=null;room=null;teamId=null;roomData=null;appEl.innerHTML=`<div class="wrap home-wrap"><section class="home-hero"><div class="home-copy"><div class="home-logo"><span>PQ</span><b>QuizBuzz</b></div><h1>Bel cerdas cermat.<br>Siapa cepat, dia menjawab.</h1><p>Buat room, kumpulkan tim, lalu mulai rebutan secara real-time.</p></div><div class="home-actions"><button id="make" class="home-action primary-action"><span class="line-icon">◉</span><span><b>Buat Permainan</b><small>Jadi host dan kendalikan pertandingan</small></span><i>→</i></button><button id="join" class="home-action join-action"><span class="line-icon users-icon">↪</span><span><b>Gabung Permainan</b><small>Masukkan kode room untuk ikut bermain</small></span><i>→</i></button></div></section></div>`;$("#make").onclick=makePage;$("#join").onclick=joinPage}
function makePage(){if(!user)return toast("Menunggu Firebase...");appEl.innerHTML=`<div class="wrap create-competition"><section class="create-head"><button id="back" class="back-circle" aria-label="Kembali">←</button><div><b>PakKom QuizBuzz</b><small>BUAT ROOM BARU</small></div></section><section class="create-intro"><span>IDENTITAS PERTANDINGAN</span><h1>Siapkan kompetisimu.</h1><p>Berikan nama kompetisi sebelum tim bergabung.</p></section><section class="create-form"><label class="title-field">Nama Kompetisi <em>*</em><input id="ctitle" maxlength="50" placeholder="Contoh: Math Challenge 2026" autocomplete="off"></label><div class="competition-preview"><small>PREVIEW KOMPETISI</small><div class="preview-screen"><span>PAKKOM QUIZBUZZ</span><h2 id="titlePreview">NAMA KOMPETISI</h2><div><b id="roundPreview">Babak 1</b><i>SIAP</i></div></div></div><div class="create-grid"><label>Nama Babak<input id="rn" value="Babak 1" maxlength="30"></label><label>Maksimal Tim<input id="max" type="number" min="2" max="50" value="5"></label></div><label>Mode Pertandingan<select id="mode"><option value="classic">Klasik</option><option value="nominus">Tanpa Minus</option><option value="elimination">Eliminasi</option><option value="final">Final Round ×2</option></select></label><div class="score-setup"><label>Jawaban Benar<input id="yes" type="number" value="10"></label><label>Jawaban Salah<input id="no" type="number" value="5"></label></div><button id="go" class="create-room-btn"><span>BUAT ROOM</span><b>→</b></button><p class="create-note">Kode room dibuat otomatis dan siap dibagikan.</p></section></div>`;const sync=()=>{$("#titlePreview").textContent=$("#ctitle").value.trim().toUpperCase()||"NAMA KOMPETISI";$("#roundPreview").textContent=$("#rn").value.trim()||"Babak 1"};$("#ctitle").oninput=sync;$("#rn").oninput=sync;$("#go").onclick=createRoom;$("#back").onclick=home}
async function createRoom(){
  if(!user){ toast("Autentikasi belum siap. Tunggu sebentar lalu coba lagi."); net("● ONLINE"); return; }
  const btn=$("#go");
  if(btn){btn.disabled=true;btn.textContent="Membuat room…"}
  net("● MEMBUAT ROOM...");
  const max=Math.max(2,Math.min(50,+$("#max").value||5));
  const yes=+$("#yes").value||10, no=+$("#no").value||5;
  const title=$("#ctitle").value.trim();
  if(!title){ toast("Nama kompetisi wajib diisi."); $("#ctitle").focus(); return; }
  const name=$("#rn").value.trim()||"Babak 1", mode=$("#mode").value||"classic";
  try{
    for(let i=0;i<20;i++){
      const c=newCode(), roomRef=ref(db,`rooms/${c}`), snap=await get(roomRef);
      if(snap.exists()) continue;
      // Buat kepemilikan room terlebih dahulu. Cara bertahap ini kompatibel
      // dengan rules lama maupun rules V5.3.1 dan menghindari parent-write denial.
      await set(ref(db,`rooms/${c}/hostUid`),user.uid);
      const writes=[
        set(ref(db,`rooms/${c}/title`),title),
        set(ref(db,`rooms/${c}/createdAt`),Date.now()),
        set(ref(db,`rooms/${c}/maxTeams`),max),
        set(ref(db,`rooms/${c}/locked`),false),
        set(ref(db,`rooms/${c}/status`),"lobby"),
        set(ref(db,`rooms/${c}/round`),{number:1,name,correct:yes,wrong:no,mode}),
        set(ref(db,`rooms/${c}/rounds/r1`),{number:1,name,correct:yes,wrong:no,mode}),
        set(ref(db,`rooms/${c}/buzzer`),{open:false,winnerTeamId:null,countdown:0,question:0,blocked:{}})
      ];
      await Promise.all(writes);
      room=c; role="host"; storeHostSession(); net("● ONLINE"); watchRoom(); return;
    }
    throw new Error("Tidak berhasil mendapatkan kode room unik.");
  }catch(e){
    console.error("createRoom",e);
    net("● ONLINE");
    if(btn){btn.disabled=false;btn.textContent="Buat Room"}
    const msg=(e?.code==="PERMISSION_DENIED"||/permission/i.test(e?.message||""))
      ? "Room ditolak Firebase. Publish database.rules.json V5.3.1 di Realtime Database → Rules, lalu coba lagi."
      : "Gagal membuat room: "+(e?.message||"koneksi bermasalah");
    toast(msg);
  }
}
function joinPage(){clearToast();appEl.innerHTML=`<div class="wrap narrow"><section class="card flow-card"><button id="back" class="icon-back" aria-label="Kembali">←</button><h2>Gabung Permainan</h2><p class="muted">Masukkan kode room dari guru.</p><label class="field-label">Kode Room<input id="code" class="room-input" maxlength="6" placeholder="8K4P2A" style="text-transform:uppercase"></label><button id="go" class="full primary-next">Lanjut →</button></section></div>`;$("#go").onclick=()=>{room=$("#code").value.trim().toUpperCase();checkRoom(false)};$("#back").onclick=home}
async function checkRoom(fromLink=false){if(!/^[A-Z0-9]{6}$/.test(room||"")){if(fromLink)return home();return toast("Kode harus 6 karakter.")}let s=await get(ref(db,`rooms/${room}`));if(!s.exists())return toast("Room tidak ditemukan.");roomData=s.val();if(roomData.locked)return toast("Room sedang dikunci host.");role="player";loadDraft();teamPage()}
function teamPage(){
 loadDraft(); clearToast();
 appEl.innerHTML=`<div class="wrap join-setup"><section class="card setup-card"><div class="setup-head"><button id="backJoin" class="icon-back inline-back" aria-label="Kembali">←</button><div><span class="eyebrow">ROOM ${room}</span><h2>Siapkan Tim</h2><p class="muted">Pilih nama, avatar hewan, dan suara bel timmu.</p></div></div><label class="field-label">Nama Tim<input id="name" maxlength="25" placeholder="Contoh: ALPHA" autocomplete="off" value="${esc(teamName)}"></label><h3 class="section-title">Pilih Avatar <span>30 karakter hewan</span></h3><div id="avatars" class="avatar-grid"></div><div class="sound-row"><div><h3 class="section-title">Suara Bel</h3><p class="muted small">30 pilihan suara · boleh sama dengan tim lain</p></div><div class="sound-actions"><button id="randomSound" class="secondary compact">Acak</button><button id="preview" class="secondary compact">▶ Preview</button></div></div><div id="sounds" class="soundgrid compact-sounds"></div><button id="go" class="full join-now">GABUNG PERMAINAN →</button></section></div>`;
 const nameEl=$("#name"); nameEl.oninput=()=>{teamName=nameEl.value;saveDraft();clearToast()};
 const ag=$("#avatars"); const drawAv=()=>{ag.innerHTML=AVATARS.map(([ico,name])=>`<button type="button" class="animal-avatar ${ico===selectedAvatar?"active":""}" data-avatar="${ico}" title="${name}"><span>${ico}</span><small>${name}</small></button>`).join("");ag.querySelectorAll(".animal-avatar").forEach(b=>b.onclick=()=>{selectedAvatar=b.dataset.avatar;saveDraft();drawAv()})}; drawAv();
 const sg=$("#sounds"); const draw=()=>{sg.innerHTML=SOUNDS.map(([id,name])=>`<button class="sound ${id===soundId?"active":""}" data-id="${id}"><span><b>${name}</b></span></button>`).join("");sg.querySelectorAll(".sound").forEach(b=>b.onclick=()=>{soundId=+b.dataset.id;saveDraft();draw();beep(soundId)})}; draw();
 $("#randomSound").onclick=()=>{soundId=SOUNDS[Math.floor(Math.random()*SOUNDS.length)][0];saveDraft();draw();beep(soundId)}; $("#preview").onclick=()=>beep(soundId); $("#go").onclick=()=>joinTeam(false); $("#backJoin").onclick=joinPage;
}
function resetMedia(){mediaDataUrl=null}
async function prepareMedia(){teamName=($("#name")?.value??teamName).trim();saveDraft();if(!teamName)return toast("Nama tim wajib diisi.");let snap=await get(ref(db,`rooms/${room}`));roomData=snap.val();if(!roomData)return toast("Room tidak ditemukan.");if(roomData.locked)return toast("Room sudah dikunci.");let ts=teams();if(ts.length>=roomData.maxTeams)return toast("Room sudah penuh.");if(ts.some(t=>t.name.toLowerCase()===teamName.toLowerCase()))return toast("Nama tim sudah dipakai.");mediaPage()}
function mediaPage(){loadDraft();clearToast();appEl.innerHTML=`<div class="wrap narrow"><section class="card media-card v5-media"><button id="backMedia" class="icon-back" aria-label="Kembali">←</button><div class="step-row"><h2>Foto Tim</h2><span class="optional-chip">Opsional</span></div><p class="muted">Foto akan menjadi identitas tim di lobby dan tampil saat tim paling cepat.</p><div class="avatar-stage"><div class="draft-avatar">${esc((teamName[0]||"T").toUpperCase())}</div><span class="camera-badge">◉</span></div><div class="media-actions photo-only"><label class="media-action"><span class="media-line-icon">◉</span><b>Ambil Selfie</b><small>Kamera depan</small><input id="photoFile" type="file" accept="image/*" capture="user" hidden></label><label class="media-action"><span class="media-line-icon">▧</span><b>Pilih Foto</b><small>Dari galeri</small><input id="galleryFile" type="file" accept="image/*" hidden></label></div><button id="skip" class="full primary-next">Gabung tanpa foto →</button></section></div>`;const pick=id=>{$(id).onchange=e=>handlePickedPhoto(e.target.files?.[0])};pick("#photoFile");pick("#galleryFile");$("#skip").onclick=()=>{resetMedia();joinTeam(false)};$("#backMedia").onclick=()=>{resetMedia();teamPage()}}
async function compressPhoto(file){
  if(!file?.type?.startsWith("image/")) throw new Error("File bukan foto.");
  if(file.size>15*1024*1024) throw new Error("Foto terlalu besar. Maksimal 15 MB sebelum diproses.");
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("Foto tidak dapat dibaca pada perangkat ini."));im.src=url});
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, side=Math.min(iw,ih);
    const canvas=document.createElement("canvas"); canvas.width=200; canvas.height=200;
    const ctx=canvas.getContext("2d",{alpha:false}); ctx.drawImage(img,(iw-side)/2,(ih-side)/2,side,side,0,0,200,200);
    let quality=.68, format="image/webp", data=canvas.toDataURL(format,quality);
    if(!data.startsWith("data:image/webp")){format="image/jpeg";data=canvas.toDataURL(format,quality)}
    while(data.length>60000 && quality>.34){quality-=.08;data=canvas.toDataURL(format,quality)}
    if(data.length>70000) throw new Error("Foto masih terlalu besar setelah dikompres. Coba foto lain.");
    return data;
  } finally { URL.revokeObjectURL(url) }
}
async function handlePickedPhoto(file){if(!file)return;clearToast();try{toast("Menyiapkan foto...");mediaDataUrl=await compressPhoto(file);previewMedia();clearToast()}catch(e){console.error(e);toast(e.message||"Foto tidak dapat diproses.")}}
function previewMedia(){appEl.innerHTML=`<div class="wrap narrow"><section class="card media-card"><div class="step">PREVIEW FOTO</div><h2>${esc(teamName)}</h2><div class="media-preview"><img src="${mediaDataUrl}" alt="Foto tim"></div><div id="mediaState" class="upload-state success"><b>Foto siap ✓</b><span>Foto disimpan sementara bersama room. Tidak memakai Firebase Storage.</span></div><div class="buttons"><button id="useMedia">Gunakan Foto & Gabung</button><button id="redo" class="secondary">Pilih Ulang</button></div><button id="skip2" class="secondary full">Gabung tanpa foto</button></section></div>`;$("#useMedia").onclick=()=>joinTeam(true);$("#redo").onclick=()=>{resetMedia();mediaPage()};$("#skip2").onclick=()=>{resetMedia();joinTeam(false)}}
async function joinTeam(usePhoto=false){loadDraft();teamName=(teamName||"").trim();if(!teamName){toast("Nama tim belum tersedia. Kembali dan isi nama tim.");return teamPage()}let snap=await get(ref(db,`rooms/${room}`));if(!snap.exists())return toast("Room tidak ditemukan.");roomData=snap.val();if(roomData.locked)return toast("Room sudah dikunci.");let ts=teams();if(ts.length>=roomData.maxTeams)return toast("Room sudah penuh.");if(ts.some(t=>t.name.toLowerCase()===teamName.toLowerCase()))return toast("Nama tim sudah dipakai.");teamId=push(ref(db,`rooms/${room}/teams`)).key;let avatar=selectedAvatar||"🦁",color=COLORS[teams().length%COLORS.length];let photo=usePhoto&&mediaDataUrl?{avatarPhoto:mediaDataUrl}:{};try{await set(ref(db,`rooms/${room}/teams/${teamId}`),{ownerUid:user.uid,name:teamName,score:0,soundId,avatar,color,...photo,stats:{buzzes:0,correct:0,wrong:0},online:true,joinedAt:Date.now()})}catch(e){console.error("JOIN_FAILED",e);teamId=null;toast("Gagal bergabung: "+(e.code||e.message||"Periksa Database Rules."));return}resetMedia();clearDraft();storeSession();watchRoom()}
function teamMedia(t,animate=false){return `<span class="animal-face">${esc(t?.avatar||"🦁")}</span>`}
function board(big=false){let ts=teams();if(!ts.length)return `<div class="empty">Belum ada tim.</div>`;return `<div class="score-list">${ts.map((t,i)=>`<div class="score-row ${t.id===roomData.buzzer?.winnerTeamId?"winner":""}"><span class="rank">${i+1}</span><span class="avatar">${teamMedia(t)}</span><b>${esc(t.name)}</b><strong>${t.score||0}</strong></div>`).join("")}</div>`}
async function countdown(){if(roomData.buzzer?.open||roomData.buzzer?.countdown)return;await update(ref(db,`rooms/${room}`),{feedback:null,"buzzer/open":false,"buzzer/winnerTeamId":null,"buzzer/countdown":3,"buzzer/blocked":{},"buzzer/question":(roomData.buzzer?.question||0)+1});let n=3;clearInterval(countTimer);countTimer=setInterval(async()=>{n--;if(n>0)await update(ref(db,`rooms/${room}/buzzer`),{countdown:n});else{clearInterval(countTimer);await update(ref(db,`rooms/${room}/buzzer`),{countdown:0,open:true,winnerTeamId:null,openedAt:serverTimestamp()})}},1000)}
async function buzz(){let me=myTeam();if(!me||roomData.buzzer?.blocked?.[teamId])return;let now=Date.now(),opened=+roomData.buzzer?.openedAt||now,elapsed=Math.max(0,now-opened);let attemptKey=push(ref(db,`rooms/${room}/attempts/${roomData.buzzer?.question||0}`)).key;set(ref(db,`rooms/${room}/attempts/${roomData.buzzer?.question||0}/${attemptKey}`),{teamId,teamName:me.name,at:now,elapsed}).catch(()=>{});let b=ref(db,`rooms/${room}/buzzer`);let result=await runTransaction(b,current=>{if(!current||current.open!==true||current.winnerTeamId)return;return {...current,open:false,winnerTeamId:teamId,winnerUid:user.uid,wonAt:now,winnerElapsed:elapsed}});if(!result.committed)toast("Bel sudah diambil tim lain.");else {let n=(myTeam()?.stats?.buzzes||0)+1;update(ref(db,`rooms/${room}/teams/${teamId}/stats`),{buzzes:n}).catch(()=>{})}}
async function judge(ok,rebuzz=false){let w=winner();if(!w)return;let mult=roomData.round.mode==="final"?2:1;let pts=ok?roomData.round.correct*mult:(roomData.round.mode==="nominus"?0:-roomData.round.wrong*mult);let histKey=push(ref(db,`rooms/${room}/history`)).key;let before=w.score||0,after=before+pts;let patch={};patch[`teams/${w.id}/score`]=after;patch[`teams/${w.id}/stats/${ok?"correct":"wrong"}`]=(w.stats?.[ok?"correct":"wrong"]||0)+1;patch[`history/${histKey}`]={type:"judge",teamId:w.id,teamName:w.name,ok,points:pts,before,after,round:roomData.round.number,question:roomData.buzzer.question,at:Date.now()};patch[`lastAction`]={historyKey:histKey,teamId:w.id,before,after,at:Date.now()};patch[`feedback`]={teamId:w.id,teamName:w.name,avatar:w.avatar||"🦁",ok,points:pts,at:Date.now()};patch[`buzzer/winnerTeamId`]=null;patch[`buzzer/open`]=rebuzz;patch[`buzzer/countdown`]=0;if(rebuzz&&!ok)patch[`buzzer/blocked/${w.id}`]=true;else patch[`buzzer/blocked`]={};await update(ref(db,`rooms/${room}`),patch);if(rebuzz&&!ok&&(role==="host"||role==="display"))setTimeout(announceRebuzz,900)}
async function cancelBuzz(){let w=winner();if(!w)return toast("Belum ada buzz yang bisa dibatalkan.");let hk=push(ref(db,`rooms/${room}/history`)).key;let patch={};patch[`history/${hk}`]={type:"cancel_buzz",teamId:w.id,teamName:w.name,round:roomData.round.number,question:roomData.buzzer.question,at:Date.now()};patch[`buzzer/winnerTeamId`]=null;patch[`buzzer/winnerUid`]=null;patch[`buzzer/wonAt`]=null;patch[`buzzer/open`]=true;await update(ref(db,`rooms/${room}`),patch);announceCancel();toast("Buzz dibatalkan. Bel dibuka kembali tanpa perubahan skor.")}
async function cancelQuestion(){let q=roomData.buzzer?.question||0;if(!q)return toast("Belum ada soal aktif.");let hk=push(ref(db,`rooms/${room}/history`)).key;let patch={};patch[`history/${hk}`]={type:"cancel_question",round:roomData.round.number,question:q,at:Date.now()};patch[`buzzer/open`]=false;patch[`buzzer/winnerTeamId`]=null;patch[`buzzer/winnerUid`]=null;patch[`buzzer/wonAt`]=null;patch[`buzzer/countdown`]=0;patch[`buzzer/blocked`]={};patch[`buzzer/cancelledQuestion`]=q;await update(ref(db,`rooms/${room}`),patch);toast(`Soal ${q} dibatalkan. Tidak ada skor yang berubah.`)}
async function undo(){let a=roomData.lastAction;if(!a)return toast("Belum ada skor yang bisa di-undo.");let h=roomData.history?.[a.historyKey];if(!h)return toast("Riwayat undo tidak ditemukan.");let patch={};patch[`teams/${a.teamId}/score`]=a.before;patch[`history/${a.historyKey}/undone`]=true;patch[`lastAction`]=null;await update(ref(db,`rooms/${room}`),patch);toast("Skor terakhir dibatalkan.")}
async function toggleLock(){await update(ref(db,`rooms/${room}`),{locked:!roomData.locked})}
async function kick(id){if(!await askConfirm({title:"Keluarkan tim?",message:"Tim ini akan dikeluarkan dari room, tetapi riwayat pertandingan tetap tersimpan.",confirmText:"Keluarkan Tim",cancelText:"Tetap di Room",danger:true}))return;await set(ref(db,`rooms/${room}/teams/${id}`),null)}
function nextRoundForm(){appEl.insertAdjacentHTML("beforeend",`<div class="modal" id="roundModal"><section class="card"><h2>Babak Berikutnya</h2><div class="grid"><label>Nama<input id="newrn" value="Babak ${roomData.round.number+1}"></label><label>Benar<input id="newyes" type="number" value="${roomData.round.correct}"></label><label>Salah<input id="newno" type="number" value="${roomData.round.wrong}"></label><label>Mode<select id="newmode"><option value="classic">Classic</option><option value="nominus">No Minus</option><option value="elimination">Elimination</option><option value="final">Final Round ×2</option></select></label></div><div class="buttons"><button id="start">Mulai Babak</button><button id="cancel" class="secondary">Batal</button></div></section></div>`);$("#cancel").onclick=()=>$("#roundModal").remove();$("#start").onclick=startRound}
async function startRound(){let n=roomData.round.number+1,name=$("#newrn").value.trim()||`Babak ${n}`,correct=+$("#newyes").value||0,wrong=+$("#newno").value||0,mode=$("#newmode").value||"classic";let patch={round:{number:n,name,correct,wrong,mode},buzzer:{open:false,winnerTeamId:null,countdown:0,question:0,blocked:{}}};patch[`rounds/r${n}`]={number:n,name,correct,wrong,mode};await update(ref(db,`rooms/${room}`),patch);$("#roundModal").remove()}
function qrUrl(){return `${location.origin}${location.pathname}?room=${room}`}
function hostRender(){
 let w=winner(),b=roomData.buzzer||{},ts=teams(),isLobby=(b.question||0)===0&&!b.open&&!b.countdown&&!w;
 if(roomData.status==="finished"){appEl.innerHTML=`<div class="wrap"><section class="card result-card">${podium()}<div class="buttons"><button id="homeEnd" class="danger-exit">Selesai & Keluar</button></div></section></div>`;$("#homeEnd").onclick=async()=>{if(await askConfirm({title:"Selesai dan keluar?",message:"Sesi pertandingan di perangkat ini akan ditutup.",confirmText:"Keluar",cancelText:"Tetap di Hasil",danger:true}))exitToHome("host")};return}
 if(isLobby){appEl.innerHTML=`<div class="competition-shell"><div class="competition-top"><div class="qb-logo">Quiz<span>Buzz</span></div><div class="top-actions"><span class="connected">● Terhubung</span><button id="leaveHost" class="ghost-icon">Keluar</button></div></div><main class="lobby-layout"><section class="lobby-main"><div class="room-title"><span>Room</span><strong>${room}</strong></div><div class="join-url">Gabung dengan kode room atau scan QR</div><h3>${ts.length} tim sudah bergabung <small>Kapasitas: ${roomData.maxTeams} tim</small></h3><div class="team-cards">${ts.map((t,i)=>`<div class="team-card"><div class="animal-card">${teamMedia(t)}</div><b>${esc(t.name)}</b><button class="mini-kick" data-id="${t.id}" aria-label="Keluarkan tim">×</button></div>`).join("")||`<div class="empty-team">Menunggu tim bergabung…</div>`}</div><button id="startbuzz" class="big-start">▶ MULAI PERTANDINGAN</button><div class="lobby-tools"><button id="display" class="tool-btn">▣ Layar Proyektor</button><button id="lock" class="tool-btn">${roomData.locked?"Buka Room":"Kunci Room"}</button><button id="settings" class="tool-btn" disabled>Pengaturan</button></div></section><aside class="qr-panel"><div id="qr" class="qr"></div><b>Scan untuk gabung</b><span>${room}</span></aside></main></div>`;loadQR();$("#display").onclick=()=>window.open(`${location.pathname}?display=${room}`,"_blank");$("#lock").onclick=toggleLock;$("#startbuzz").onclick=countdown;document.querySelectorAll(".mini-kick").forEach(x=>x.onclick=()=>kick(x.dataset.id));$("#leaveHost").onclick=async()=>{if(await askConfirm({title:"Keluar dari room?",message:"Room tetap tersimpan, tetapi sesi host di perangkat ini akan ditutup.",confirmText:"Keluar",cancelText:"Batal",danger:true}))exitToHome("host")};return}
 appEl.innerHTML=`<div class="competition-shell"><div class="competition-top"><div class="qb-logo">PakKom <span>QuizBuzz</span><small>${esc(roomData.title||"Kompetisi")}</small></div><div class="match-meta">Room ${room}<i></i>Babak ${roomData.round.number}<i></i>Soal ${b.question||0}</div><div class="top-actions"><span class="connected">● Terhubung</span><button id="finish" class="ghost-icon danger-text">Akhiri</button></div></div><main class="match-layout"><section class="control-stage">${roomData.feedback&&!w&&!b.countdown?`<div class="winner-state result-state ${roomData.feedback.ok?"result-correct":"result-wrong"}"><div class="winner-animal"><span class="animal-face">${esc(roomData.feedback.avatar||"🦁")}</span></div><div class="winner-copy"><span class="fast-label">HASIL JAWABAN</span><h1>${esc(roomData.feedback.teamName)}</h1><div class="result-badge">${roomData.feedback.ok?"✓ BENAR":"× SALAH"}</div><div class="time-chip">${roomData.feedback.points>0?"+":""}${roomData.feedback.points||0} <small>poin</small></div></div><div class="sub-actions"><button id="nextquestion" class="open-bell">▶ SOAL BERIKUTNYA</button></div></div>`:b.countdown?`<div class="ready-state"><div class="bell-orb"><span>${b.countdown}</span></div><h1>Bersiap…</h1><p>Bel akan terbuka otomatis.</p></div>`:w?`<div class="winner-state"><div class="winner-animal">${teamMedia(w)}</div><div class="winner-copy"><span class="fast-label">TERCEPAT</span><h1>${esc(w.name)}</h1><div class="time-chip">${b.winnerElapsed!=null?(b.winnerElapsed/1000).toFixed(3):"0,000"} <small>detik</small></div></div><div class="decision-grid"><button class="good" id="correct">✓ BENAR <small>+${roomData.round.correct}</small></button><button class="bad" id="wrong">× SALAH <small>-${roomData.round.wrong}</small></button></div><div class="sub-actions"><button id="cancelbuzz" class="tool-btn">↶ Batalkan buzz</button><button id="cancelquestion" class="tool-btn">▣ Batalkan soal</button><button id="wrongrebuzz" class="tool-btn">Salah & rebutan lagi</button></div></div>`:b.open?`<div class="ready-state"><div class="bell-orb ringing"><span>●</span></div><h1>BEL TERBUKA</h1><p>Menunggu tim tercepat…</p><button id="cancelquestion" class="tool-btn">Batalkan soal</button></div>`:`<div class="ready-state"><div class="bell-orb"><span>♟</span></div><h1>BEL SIAP</h1><p>${ts.length} tim menunggu</p><button id="startbuzz" class="open-bell">▶ BUKA BEL</button></div>`}<div class="bottom-controls"><button class="tool-btn" id="minusPts">− Poin</button><button class="tool-btn" id="plusPts">+ Poin</button><span class="control-chip">Soal ${String(b.question||0).padStart(2,"0")}</span><span class="control-chip">Babak ${String(roomData.round.number).padStart(2,"0")}</span><button id="undo" class="tool-btn" ${roomData.lastAction?"":"disabled"}>↶ Undo</button><button id="display" class="projector-btn">▣ Layar Proyektor</button></div></section><aside class="leader-panel"><h3>KLASEMEN</h3>${board()}</aside></main></div>`;
 $("#display").onclick=()=>window.open(`${location.pathname}?display=${room}`,"_blank");if($("#startbuzz"))$("#startbuzz").onclick=countdown;if($("#nextquestion"))$("#nextquestion").onclick=countdown;if($("#correct"))$("#correct").onclick=()=>judge(true,false);if($("#wrong"))$("#wrong").onclick=()=>judge(false,false);if($("#wrongrebuzz"))$("#wrongrebuzz").onclick=()=>judge(false,true);if($("#cancelbuzz"))$("#cancelbuzz").onclick=cancelBuzz;if($("#cancelquestion"))$("#cancelquestion").onclick=cancelQuestion;if($("#undo"))$("#undo").onclick=undo;$("#finish").onclick=finishGame;
}
async function loadQR(){let box=$("#qr");if(!box)return;box.innerHTML=`<img alt="QR Join" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl())}"><div class="small muted">Scan untuk masuk langsung ke room</div>`}
function playerRender(){let me=myTeam(),w=winner(),b=roomData.buzzer||{};if(roomData.status==="finished"){appEl.innerHTML=`<div class="wrap"><section class="card">${podium()}<div class="buttons"><button id="playerEnd" class="danger-exit">Selesai & Keluar</button></div><p class="muted small center">Pertandingan telah selesai. Tekan tombol di atas untuk kembali ke halaman awal.</p></section></div>`;$("#playerEnd").onclick=async()=>{if(await askConfirm({title:"Keluar dari permainan?",message:"Kamu akan meninggalkan hasil pertandingan ini.",confirmText:"Keluar Permainan",cancelText:"Tetap di Hasil",danger:true}))exitToHome("player")};return}if(!me){clearSession();return teamPage()}appEl.innerHTML=`<div class="wrap"><section class="card"><div class="row"><div><span class="pill">${esc(roomData.round.name)}</span><h2>${esc(me.name)}</h2></div><div class="score">${me.score||0} poin</div></div></section><section class="card center">${b.countdown?`<div class="count">${b.countdown}</div><p class="muted">Jangan tekan sebelum BEL terbuka.</p>`:w?`<div class="notice ${w.id===teamId?"win":""}"><div class="winner-media small-media">${teamMedia(w,true)}</div><div>${w.id===teamId?"⚡ KAMU TERCEPAT":"BEL SUDAH DIAMBIL"}</div><h1>${esc(w.name)}</h1><div class="buzztime">${b.winnerElapsed!=null?(b.winnerElapsed/1000).toFixed(3)+" detik":""}</div></div>`:b.blocked?.[teamId]?`<div class="notice">Jawaban timmu salah. Tim lain sedang berebut.</div>`:b.open?`<p class="muted">Sekarang!</p><button class="buzz" id="buzz">BEL</button>`:`<div class="notice">⏳ Menunggu host...</div>`}</section><section class="card"><h2>Papan Skor</h2>${board()}</section><button id="leave" class="secondary leave">Keluar dari tim</button></div>`;if($("#buzz"))$("#buzz").onclick=buzz;$("#leave").onclick=async()=>{if(!await askConfirm({title:"Keluar dari permainan?",message:`Kamu akan meninggalkan Tim ${me.name}. Pertandingan tim lain tetap berlangsung.`,confirmText:"Keluar Permainan",cancelText:"Tetap Main",danger:true}))return;try{await update(ref(db,`rooms/${room}/teams/${teamId}`),{online:false,leftAt:Date.now()})}catch(e){}exitToHome("player")}}
async function finishGame(){if(!await askConfirm({title:"Akhiri permainan?",message:"Semua tim akan diarahkan ke hasil akhir dan skor terakhir akan ditampilkan.",confirmText:"Tampilkan Hasil",cancelText:"Belum",danger:true}))return;await update(ref(db,`rooms/${room}`),{status:"finished",finishedAt:Date.now(),"buzzer/open":false,"buzzer/winnerTeamId":null})}
function podium(){let ts=teams(),top=ts.slice(0,3),fast=Object.values(roomData.history||{}).filter(x=>x.type==="judge");return `<div class="podium"><div class="trophy">🏆</div><h1>HASIL QUIZBUZZ</h1><div class="podium-grid">${top.map((t,i)=>`<div class="pod p${i+1}"><div class="medal">${["🥇","🥈","🥉"][i]}</div><div class="podavatar">${teamMedia(t,true)}</div><h2>${esc(t.name)}</h2><b>${t.score||0} PTS</b><small>${t.stats?.correct||0} benar · ${t.stats?.wrong||0} salah · ${t.stats?.buzzes||0} buzz</small></div>`).join("")}</div></div>`}
function displayRender(){let w=winner(),b=roomData.buzzer||{};if(roomData.status==="finished"){appEl.innerHTML=`<div class="projector-screen final-screen">${podium()}<div class="projector-board">${board(true)}</div></div>`;return}appEl.innerHTML=`<div class="projector-screen"><div class="projector-head"><div class="qb-logo light">PakKom <span>QuizBuzz</span><small>${esc(roomData.title||"Kompetisi")}</small></div><div>Room ${room} &nbsp; | &nbsp; Babak ${roomData.round.number} &nbsp; • &nbsp; Soal ${b.question||0}</div></div><div class="projector-center">${b.countdown?`<div class="projector-count">${b.countdown}</div>`:roomData.feedback?`<div class="projector-feedback ${roomData.feedback.ok?"ok":"no"}"><div class="projector-avatar"><span class="animal-face">${esc(roomData.feedback.avatar||"🦁")}</span></div><div><h1>${esc(roomData.feedback.teamName)}</h1><strong>${roomData.feedback.ok?"BENAR!":"SALAH!"}</strong><small>${roomData.feedback.points>0?"+":""}${roomData.feedback.points} poin</small></div></div>`:w?`<div class="projector-winner"><div class="projector-avatar">${teamMedia(w)}</div><div><h1>${esc(w.name)}</h1><strong>${b.winnerElapsed!=null?(b.winnerElapsed/1000).toFixed(3):"0,000"} <small>detik</small></strong></div></div>`:b.open?`<div class="projector-buzz">BEL TERBUKA</div>`:`<div class="projector-ready">BEL SIAP</div>`}</div><div class="projector-strip">${teams().slice(0,8).map((t,i)=>`<div><span>${i+1}</span>${teamMedia(t)}<b>${esc(t.name)}</b><strong>${t.score||0}</strong></div>`).join("")}</div></div>`}
function render(){if(!roomData)return;if(role==="host")hostRender();else if(role==="display")displayRender();else if(role==="player"&&teamId)playerRender()}
init();
