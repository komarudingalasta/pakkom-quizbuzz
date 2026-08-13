import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const URL="https://lfhjbypuhomvbyvbmydq.supabase.co";
const KEY="sb_publishable_Me2YkKbzhq9cmS4N8F4FJA_bh1NONOt";
const db=createClient(URL,KEY);
const $=s=>document.querySelector(s), app=$("#app");
let role=null,room=null,teamId=null,teamName="",soundId=1,sub=null,roomData=null,teams=[],rounds=[],lastWinner=null;

const SOUNDS=Array.from({length:7},(_,i)=>[`Sound ${i+1}`,`Sound ${i+1}`]);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function toast(s){let x=$("#toast");x.textContent=s;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2400)}
function net(s){$("#net").textContent=s}
const audioCache=new Map();
function beep(id=1){
  try{
    const n=Math.max(1,Math.min(7,Number(id)||1));
    let a=audioCache.get(n);
    if(!a){a=new Audio(`sounds/Sound ${n}.mp3`);a.preload="auto";audioCache.set(n,a);}
    a.currentTime=0;
    const p=a.play(); if(p?.catch)p.catch(()=>{});
  }catch(e){}
}
function speak(name){try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(name+" menekan bel");u.lang="id-ID";u.rate=.9;speechSynthesis.speak(u)}catch(e){}}

async function load(){
 if(!room)return;
 let q=await db.from("quiz_rooms").select("*").eq("code",room).single();
 if(q.error)return;
 roomData=q.data;
 let t=await db.from("quiz_teams").select("*").eq("room_id",roomData.id).order("score",{ascending:false});
 teams=t.data||[];
 let r=await db.from("quiz_rounds").select("*").eq("room_id",roomData.id).order("round_number");
 rounds=r.data||[];
}
async function refresh(){await load();render()}
function subscribe(){
 if(sub)db.removeChannel(sub);
 sub=db.channel("quiz-room-"+room)
 .on("postgres_changes",{event:"*",schema:"public",table:"quiz_rooms",filter:"code=eq."+room},async p=>{let old=roomData?.winner_team_id,newv=p.new?.winner_team_id;if(newv&&newv!==old){let t=(await db.from("quiz_teams").select("name,sound_id").eq("id",newv).maybeSingle()).data;if(t){beep(t.sound_id);speak(t.name)}}await refresh()})
 .on("postgres_changes",{event:"*",schema:"public",table:"quiz_teams"},async p=>{if(p.new?.room_id===roomData?.id||p.old?.room_id===roomData?.id)refresh()})
 .subscribe(()=>net("● REAL-TIME"));
}
function home(){
 role=null;room=null;teamId=null;roomData=null;teams=[];rounds=[];
 app.innerHTML=`<div class="wrap"><section class="card hero"><div class="mark">PB</div><h1>PAKKOM-QUIZBUZZ</h1><p>Bel cerdas cermat real-time dengan skor dan babak.</p><div class="buttons"><button id="make">Buat Permainan</button><button id="join" class="secondary">Gabung Permainan</button></div></section><section class="card"><div class="grid"><div><b>⚡ Bel cepat</b><p class="muted small">Peserta pertama langsung terkunci.</p></div><div><b>🎵 Suara unik</b><p class="muted small">Hingga 16 pilihan suara tim.</p></div><div><b>🏆 Babak & skor</b><p class="muted small">Skor lama tetap tersimpan.</p></div></div></section></div>`;
 $("#make").onclick=makePage;$("#join").onclick=joinPage;
}
function makePage(){
 app.innerHTML=`<div class="wrap"><section class="card"><h2>Buat Permainan</h2><p class="muted">Atur Babak 1. Babak berikutnya bisa diatur nanti.</p><div class="grid"><label>Maksimal tim<input id="max" type="number" min="2" max="50" value="5"></label><label>Nilai benar<input id="yes" type="number" value="10"></label><label>Nilai salah<input id="no" type="number" value="5"></label></div><label style="display:block;margin-top:13px">Nama babak<input id="rn" value="Babak 1" maxlength="30"></label><div class="buttons"><button id="go">Buat Room</button><button id="back" class="secondary">Kembali</button></div></section></div>`;
 $("#go").onclick=createRoom;$("#back").onclick=home;
}
async function createRoom(){
 net("● MENYIMPAN...");
 let max=Math.max(2,Math.min(50,+$("#max").value||5)),correct=+$("#yes").value||10,wrong=+$("#no").value||5,rn=$("#rn").value.trim()||"Babak 1";
 for(let i=0;i<12;i++){let c=code();let q=await db.from("quiz_rooms").insert({code:c,max_teams:max,correct_score:correct,wrong_score:wrong,round_number:1,round_name:rn,round_correct_score:correct,round_wrong_score:wrong,open:false,winner_team_id:null}).select().single();if(!q.error){room=c;roomData=q.data;role="host";let rr=await db.from("quiz_rounds").insert({room_id:roomData.id,round_number:1,round_name:rn,correct_score:correct,wrong_score:wrong}).select().single();if(rr.error)toast("Room dibuat, tetapi data babak gagal dibuat.");net("● REAL-TIME");subscribe();await refresh();return}}
 net("● ERROR");toast("Gagal membuat room. Periksa policy/tabel Supabase.");
}
function joinPage(){
 app.innerHTML=`<div class="wrap"><section class="card"><h2>Gabung Permainan</h2><p class="muted">Masukkan kode dari pembuat.</p><input id="code" maxlength="6" placeholder="ABC123" style="text-transform:uppercase"><div class="buttons"><button id="go">Lanjut</button><button id="back" class="secondary">Kembali</button></div></section></div>`;
 $("#go").onclick=checkRoom;$("#back").onclick=home;
}
async function checkRoom(){
 room=$("#code").value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(room))return toast("Kode harus 6 karakter.");
 net("● MENCARI...");let q=await db.from("quiz_rooms").select("*").eq("code",room).maybeSingle();if(q.error||!q.data)return toast("Room tidak ditemukan.");
 roomData=q.data;role="player";net("● REAL-TIME");subscribe();teamPage();
}
function teamPage(){
 app.innerHTML=`<div class="wrap"><section class="card"><span class="pill">ROOM ${room}</span><h2>Nama & Suara Tim</h2><p class="muted">Pilih suara bel untuk tim Anda.</p><input id="name" maxlength="25" placeholder="Contoh: GARUDA" autocomplete="off"><div id="sounds" class="soundgrid"></div><div class="buttons"><button id="preview" class="secondary">▶ Coba Suara</button><button id="go">Masuk ke Permainan</button></div></section></div>`;
 let sg=$("#sounds");sg.innerHTML=SOUNDS.map((s,i)=>`<button class="sound ${i+1===soundId?"active":""}" data-id="${i+1}"><b>${s[0]}</b></button>`).join("");
 sg.querySelectorAll(".sound").forEach(b=>b.onclick=()=>{soundId=+b.dataset.id;sg.querySelectorAll(".sound").forEach(x=>x.classList.remove("active"));b.classList.add("active");beep(soundId)});
 $("#preview").onclick=()=>beep(soundId);
 $("#go").onclick=joinTeam;
}
async function joinTeam(){
 teamName=$("#name").value.trim();if(!teamName)return toast("Nama tim wajib diisi.");
 await load();if(teams.length>=roomData.max_teams)return toast("Room sudah penuh.");
 if(teams.some(t=>t.name.toLowerCase()===teamName.toLowerCase()))return toast("Nama tim sudah dipakai.");
 if(teams.some(t=>t.sound_id===soundId))return toast("Suara itu sudah dipakai tim lain. Pilih suara lain.");
 let q=await db.from("quiz_teams").insert({room_id:roomData.id,name:teamName,score:0,sound_id:soundId}).select().single();
 if(q.error)return toast("Gagal masuk: "+q.error.message);
 teamId=q.data.id;await load();render();
}
function board(){
 if(!teams.length)return `<div class="empty">Belum ada tim.</div>`;
 return teams.map((t,i)=>`<div class="team ${t.id===roomData.winner_team_id?"winner":""}"><div class="row"><div><span class="rank">${i+1}</span><b>${esc(t.name)}</b> <span class="small">${SOUNDS[(t.sound_id-1)%SOUNDS.length][0]}</span></div><span class="score">${t.score}</span></div></div>`).join("");
}
async function openBell(){
 let q=await db.from("quiz_rooms").update({open:true,winner_team_id:null}).eq("id",roomData.id).eq("open",false);
 if(q.error)toast(q.error.message);await refresh();
}
async function buzz(){
 if(!roomData.open||roomData.winner_team_id)return;
 let q=await db.from("quiz_rooms").update({open:false,winner_team_id:teamId}).eq("id",roomData.id).eq("open",true).is("winner_team_id",null).select().single();
 if(q.error)toast("Bel sudah diambil tim lain.");else{await load();render();beep(soundId);speak(teamName)}
}
async function answer(ok){
 let w=teams.find(t=>t.id===roomData.winner_team_id);if(!w)return;
 let pts=ok?roomData.round_correct_score:-roomData.round_wrong_score;
 let rid=rounds.find(r=>r.round_number===roomData.round_number)?.id||null;
 let ns=w.score+pts;
 let a=await db.from("quiz_answers").insert({room_id:roomData.id,round_id:rid,team_id:w.id,result:ok?"correct":"wrong",points:pts});
 if(a.error)return toast("Gagal menyimpan jawaban.");
 let q=await db.from("quiz_teams").update({score:ns}).eq("id",w.id).eq("room_id",roomData.id);if(q.error)return toast(q.error.message);
 await db.from("quiz_rooms").update({open:false,winner_team_id:null}).eq("id",roomData.id);await refresh();
}
async function nextQuestion(){await openBell()}
async function nextRoundForm(){
 app.insertAdjacentHTML("beforeend",`<div class="modal" id="roundModal"><section class="card"><h2>Mulai Babak Berikutnya</h2><p class="muted">Skor semua tim <b>tetap dipertahankan</b>.</p><div class="grid"><label>Nama babak<input id="newrn" value="Babak ${roomData.round_number+1}"></label><label>Benar<input id="newyes" type="number" value="${roomData.round_correct_score}"></label><label>Salah<input id="newno" type="number" value="${roomData.round_wrong_score}"></label></div><div class="buttons"><button id="start">Mulai Babak</button><button id="cancel" class="secondary">Batal</button></div></section></div>`);
 $("#cancel").onclick=()=>$("#roundModal").remove();
 $("#start").onclick=startRound;
}
async function startRound(){
 let n=roomData.round_number+1,rn=$("#newrn").value.trim()||"Babak "+n,yes=+$("#newyes").value||0,no=+$("#newno").value||0;
 let rr=await db.from("quiz_rounds").insert({room_id:roomData.id,round_number:n,round_name:rn,correct_score:yes,wrong_score:no}).select().single();if(rr.error)return toast("Gagal membuat babak: "+rr.error.message);
 let q=await db.from("quiz_rooms").update({round_number:n,round_name:rn,round_correct_score:yes,round_wrong_score:no,correct_score:yes,wrong_score:no,open:false,winner_team_id:null}).eq("id",roomData.id);
 if(q.error)return toast(q.error.message);
 $("#roundModal").remove();await refresh();
}
function hostRender(){
 let w=teams.find(t=>t.id===roomData.winner_team_id);
 app.innerHTML=`<div class="wrap">
 <section class="card"><div class="row"><div><span class="pill">PEMBUAT</span><h2>${esc(roomData.round_name)}</h2><p class="muted">Babak ${roomData.round_number} · Benar +${roomData.round_correct_score} · Salah -${roomData.round_wrong_score}</p></div><span class="pill">${teams.length}/${roomData.max_teams} TIM</span></div><div class="code">${room}</div><p class="center muted">Bagikan kode ini kepada peserta.</p></section>
 <section class="card"><div class="row"><h2>Papan Skor</h2><span class="pill">SKOR AKUMULATIF</span></div>${board()}</section>
 <section class="card">${w?`<div class="notice win"><div class="gold">BEL PERTAMA</div><h1>${esc(w.name)}</h1><p>Suara ${SOUNDS[(w.sound_id-1)%SOUNDS.length][0]} · tentukan hasil jawaban.</p><div class="buttons"><button class="good" id="correct">✓ BENAR +${roomData.round_correct_score}</button><button class="bad" id="wrong">✕ SALAH -${roomData.round_wrong_score}</button></div></div>`:`<div class="notice">${roomData.open?"🔔 BEL TERBUKA — menunggu peserta":"Pertanyaan berikutnya siap?"}</div><button id="open" style="width:100%;margin-top:11px" ${roomData.open?"disabled":""}>🔔 ABU BEL / SOAL BERIKUTNYA</button>`}
 <div class="buttons"><button id="round" class="warn">➜ Lanjutkan Babak</button></div></section>
 <section class="card"><h3>Riwayat Babak</h3>${rounds.map(r=>`<div class="history"><b>Babak ${r.round_number} · ${esc(r.round_name)}</b><div class="small muted">Benar +${r.correct_score} · Salah -${r.wrong_score}</div></div>`).join("")}</section>
 </div>`;
 if($("#open"))$("#open").onclick=nextQuestion;if($("#correct"))$("#correct").onclick=()=>answer(true);if($("#wrong"))$("#wrong").onclick=()=>answer(false);$("#round").onclick=nextRoundForm;
}
function playerRender(){
 let me=teams.find(t=>t.id===teamId),w=teams.find(t=>t.id===roomData.winner_team_id);if(!me)return teamPage();
 app.innerHTML=`<div class="wrap"><section class="card"><div class="row"><div><span class="pill">${esc(roomData.round_name)}</span><h2>${esc(me.name)} ${SOUNDS[(me.sound_id-1)%SOUNDS.length][0]}</h2></div><div class="score">${me.score} poin</div></div><p class="muted small">Babak ${roomData.round_number} · +${roomData.round_correct_score} / -${roomData.round_wrong_score}</p></section>
 <section class="card center">${w?`<div class="notice ${w.id===teamId?"win":""}"><div>${w.id===teamId?"🎉 KAMU MENANGI BEL":"BEL SUDAH DIAMBIL"}</div><h1>${esc(w.name)}</h1><p>${w.id===teamId?"Tunggu penilaian pembuat.":"Tunggu hasil jawaban."}</p></div>`:roomData.open?`<p class="muted">Siap? Jadilah yang tercepat!</p><button class="buzz" id="buzz">BEL</button>`:`<div class="notice">⏳ Menunggu pembuat membuka bel...</div>`}</section>
 <section class="card"><div class="row"><h2>Papan Skor</h2><span class="pill">SKOR AKUMULATIF</span></div>${board()}</section></div>`;
 if($("#buzz"))$("#buzz").onclick=buzz;
}
function render(){
 if(!roomData)return home();
 // Jangan render ulang saat peserta masih mengetik nama.
 if(role==="player"&&!teamId)return;
 if(role==="host")hostRender();else playerRender();
}
(async()=>{let q=await db.from("quiz_rooms").select("id").limit(1);net(q.error?"● ERROR":"● SUPABASE SIAP");home()})();
