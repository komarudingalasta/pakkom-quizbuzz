import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const URL="https://lfhjbypuhomvbyvbmydq.supabase.co";
const KEY="sb_publishable_Me2YkKbzhq9cmS4N8F4FJA_bh1NONOt";
const db=createClient(URL,KEY);
const $=s=>document.querySelector(s), app=$("#app");
let role=null,room=null,teamId=null,teamName="",sub=null;
let roomData=null,teams=[],poll=null;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function toast(s){let x=$("#toast");x.textContent=s;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2400)}
function net(t){$("#net").textContent=t}
async function ensureConnection(){let {error}=await db.from("quiz_rooms").select("id").limit(1);return !error}
async function getRoom(){if(!room)return;let {data,error}=await db.from("quiz_rooms").select("*").eq("code",room).single();if(!error)roomData=data;let r=await db.from("quiz_teams").select("*").eq("room_id",roomData?.id).order("score",{ascending:false});if(!r.error)teams=r.data||[]}
async function refresh(){await getRoom();render()}
function subscribe(){
 if(sub)db.removeChannel(sub);
 sub=db.channel("room-"+room)
 .on("postgres_changes",{event:"*",schema:"public",table:"quiz_rooms",filter:"code=eq."+room},refresh)
 .on("postgres_changes",{event:"*",schema:"public",table:"quiz_teams"},async p=>{if(roomData&&p.new?.room_id===roomData.id||p.old?.room_id===roomData?.id)refresh()})
 .subscribe();
 if(poll)clearInterval(poll);poll=setInterval(refresh,1800);
}
function home(){
 role=null;room=null;teamId=null;roomData=null;teams=[];
 app.innerHTML=`<div class="wrap"><section class="card hero"><div class="mark">PB</div><h1>PAKKOM-QUIZBUZZ</h1><p>Bel cerdas cermat yang cepat, sederhana, dan real-time.</p><div class="buttons"><button id="make">Buat Permainan</button><button id="join" class="secondary">Gabung Permainan</button></div></section><section class="card"><div class="grid"><div><b>⚡ Bel cepat</b><p class="muted small">Penekan pertama langsung terkunci.</p></div><div><b>🏆 Skor otomatis</b><p class="muted small">Benar dan salah langsung dihitung.</p></div><div><b>📱 Multi-perangkat</b><p class="muted small">Pembuat dan peserta memakai perangkat masing-masing.</p></div></div></section></div>`;
 $("#make").onclick=makePage;$("#join").onclick=joinPage;
}
function makePage(){app.innerHTML=`<div class="wrap"><section class="card"><h2>Buat Permainan</h2><p class="muted">Atur permainan sebelum membagikan kode.</p><div class="grid"><label>Maksimal tim<input id="max" type="number" min="2" max="50" value="5"></label><label>Nilai benar<input id="yes" type="number" value="10"></label><label>Nilai salah<input id="no" type="number" value="5"></label></div><div class="buttons"><button id="go">Buat Room</button><button id="back" class="secondary">Kembali</button></div></section></div>`;$("#go").onclick=createRoom;$("#back").onclick=home}
async function createRoom(){
 net("● MENYIMPAN...");
 let max=Math.max(2,Math.min(50,+$("#max").value||5)),correct=+$("#yes").value||10,wrong=+$("#no").value||5;
 let c;for(let i=0;i<10;i++){c=code();let q=await db.from("quiz_rooms").insert({code:c,max_teams:max,correct_score:correct,wrong_score:wrong,open:false,winner_team_id:null}).select().single();if(!q.error){room=c;roomData=q.data;role="host";net("● REAL-TIME");subscribe();render();return}}
 net("● ERROR");toast("Gagal membuat room. Pastikan SQL Supabase sudah dijalankan.");
}
function joinPage(){app.innerHTML=`<div class="wrap"><section class="card"><h2>Gabung Permainan</h2><p class="muted">Masukkan kode dari pembuat.</p><input id="code" maxlength="6" placeholder="ABC123" style="text-transform:uppercase"><div class="buttons"><button id="go">Lanjut</button><button id="back" class="secondary">Kembali</button></div></section></div>`;$("#go").onclick=checkRoom;$("#back").onclick=home}
async function checkRoom(){room=$("#code").value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(room))return toast("Kode harus 6 karakter.");net("● MENCARI...");let q=await db.from("quiz_rooms").select("*").eq("code",room).maybeSingle();if(q.error||!q.data)return toast("Room tidak ditemukan.");roomData=q.data;role="player";net("● REAL-TIME");subscribe();teamPage()}
function teamPage(){app.innerHTML=`<div class="wrap"><section class="card center"><span class="pill">ROOM ${room}</span><h2>Nama Tim</h2><p class="muted">Nama ini akan tampil saat menekan bel.</p><input id="name" maxlength="25" placeholder="Contoh: GARUDA"><button id="go" style="width:100%;margin-top:12px">Masuk ke Permainan</button></section></div>`;$("#go").onclick=joinTeam}
async function joinTeam(){
 teamName=$("#name").value.trim();if(!teamName)return toast("Nama tim wajib diisi.");
 await refresh();
 if(!roomData)return toast("Room sudah tidak tersedia.");
 if(!roomData.open&&roomData.winner_team_id)return toast("Permainan sedang mengatur jawaban.");
 if(teams.length>=roomData.max_teams)return toast("Room sudah penuh.");
 if(teams.some(t=>t.name.toLowerCase()===teamName.toLowerCase()))return toast("Nama tim sudah dipakai.");
 let q=await db.from("quiz_teams").insert({room_id:roomData.id,name:teamName,score:0}).select().single();
 if(q.error)return toast("Gagal masuk: "+q.error.message);
 teamId=q.data.id;await refresh();render();
}
function board(){if(!teams.length)return `<div class="empty">Belum ada tim.</div>`;return teams.map((t,i)=>`<div class="team ${t.id===roomData.winner_team_id?"winner":""}"><div class="row"><div><span class="rank">${i+1}</span><b>${esc(t.name)}</b></div><span class="score">${t.score}</span></div></div>`).join("")}
async function openBell(){let q=await db.from("quiz_rooms").update({open:true,winner_team_id:null}).eq("id",roomData.id).eq("open",false);if(q.error)toast(q.error.message);await refresh()}
async function buzz(){
 if(!roomData.open||roomData.winner_team_id)return;
 // Atomic winner selection: only the first successful update can set winner.
 let q=await db.from("quiz_rooms").update({open:false,winner_team_id:teamId}).eq("id",roomData.id).eq("open",true).is("winner_team_id",null).select().single();
 if(q.error)toast("Bel sudah diambil tim lain.");else{roomData=q.data;await refresh()}
}
async function answer(ok){
 let w=teams.find(t=>t.id===roomData.winner_team_id);if(!w)return;
 let ns=w.score+(ok?roomData.correct_score:-roomData.wrong_score);
 let q=await db.from("quiz_teams").update({score:ns}).eq("id",w.id).eq("room_id",roomData.id);if(q.error)return toast(q.error.message);
 await db.from("quiz_rooms").update({open:false,winner_team_id:null}).eq("id",roomData.id);await refresh()
}
function render(){
 if(!roomData)return home();
 if(role==="host")hostRender();else playerRender();
}
function hostRender(){
 let w=teams.find(t=>t.id===roomData.winner_team_id);
 app.innerHTML=`<div class="wrap"><section class="card"><div class="row"><div><span class="pill">PEMBUAT</span><h2>Ruang Cerdas Cermat</h2></div><span class="pill">${teams.length}/${roomData.max_teams} TIM</span></div><div class="code">${room}</div><p class="center muted">Bagikan kode ini kepada semua peserta.</p></section><section class="card"><div class="row"><h2>Papan Skor</h2><span class="pill">+${roomData.correct_score} / -${roomData.wrong_score}</span></div>${board()}</section><section class="card">${w?`<div class="notice win"><div class="gold">BEL PERTAMA</div><h1>${esc(w.name)}</h1><p>Silakan tentukan hasil jawaban.</p><div class="buttons"><button class="good" id="correct">✓ BENAR +${roomData.correct_score}</button><button class="bad" id="wrong">✕ SALAH -${roomData.wrong_score}</button></div></div>`:`<div class="notice">${roomData.open?"🔔 BEL TERBUKA — menunggu peserta":"Pertanyaan berikutnya siap?"}</div><button id="open" style="width:100%;margin-top:12px" ${roomData.open?"disabled":""}>🔔 BUKA BEL</button>`}</section></div>`;
 if($("#open"))$("#open").onclick=openBell;if($("#correct"))$("#correct").onclick=()=>answer(true);if($("#wrong"))$("#wrong").onclick=()=>answer(false)
}
function playerRender(){
 let me=teams.find(t=>t.id===teamId),w=teams.find(t=>t.id===roomData.winner_team_id);
 if(!me)return teamPage();
 app.innerHTML=`<div class="wrap"><section class="card"><div class="row"><div><span class="pill">TIM</span><h2>${esc(me.name)}</h2></div><div class="score">${me.score} poin</div></div></section><section class="card center">${w?`<div class="notice ${w.id===teamId?"win":""}"><div>${w.id===teamId?"🎉 KAMU MENANGI BEL":"BEL SUDAH DIAMBIL"}</div><h1>${esc(w.name)}</h1><p>${w.id===teamId?"Tunggu penilaian pembuat.":"Tunggu hasil jawaban."}</p></div>`:roomData.open?`<p class="muted">Siap? Jadilah yang tercepat!</p><button class="buzz" id="buzz">BEL</button>`:`<div class="notice">⏳ Menunggu pembuat membuka bel...</div>`}</section><section class="card"><div class="row"><h2>Papan Skor</h2><span class="pill">${teams.length} TIM</span></div>${board()}</section></div>`;
 if($("#buzz"))$("#buzz").onclick=buzz
}
(async()=>{let ok=await ensureConnection();net(ok?"● SUPABASE SIAP":"● BELUM TERHUBUNG");home()})();
