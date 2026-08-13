import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://lfhjbypuhomvbyvbmydq.supabase.co";
const SUPABASE_KEY="sb_publishable_Me2YkKbzhq9cmS4N8F4FJA_bh1NONOt";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let role=null,room=null,teamId=null,state=null,channel=null;

function rid(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function page(html){$("app").innerHTML=`<div class="wrap">${html}</div>`}
function setOnline(){ $("connection").textContent="REAL-TIME"; }
async function connectRoom(){
  if(channel) await supabase.removeChannel(channel);
  channel=supabase.channel("quizbuzz:"+room,{config:{broadcast:{self:true}}});
  channel.on("broadcast",{event:"state"},({payload})=>{state=payload;render()});
  channel.on("broadcast",{event:"join"},({payload})=>{state=payload;render()});
  channel.on("broadcast",{event:"buzz"},({payload})=>{state=payload;render()});
  await channel.subscribe();
  setOnline();
}
async function send(event){await channel.send({type:"broadcast",event,payload:state})}

function home(){role=null;room=null;teamId=null;state=null;page(`<section class="card hero"><h1>PAKKOM-QUIZBUZZ</h1><p class="muted">Bel cerdas cermat real-time dengan sistem skor.</p><div class="buttons"><button id="create">Buat Permainan</button><button class="secondary" id="join">Gabung Permainan</button></div></section>`);$("create").onclick=createPage;$("join").onclick=joinPage}
function createPage(){page(`<section class="card"><h2>Buat Permainan</h2><div class="grid"><label>Jumlah maksimal tim<input id="max" type="number" min="2" max="50" value="5"></label><label>Benar (+)<input id="correct" type="number" value="10"></label><label>Salah (-)<input id="wrong" type="number" value="5"></label></div><div class="buttons"><button id="make">Buat Room</button><button class="secondary" id="back">Kembali</button></div></section>`);$("make").onclick=makeRoom;$("back").onclick=home}
async function makeRoom(){
  role="host";room=rid();state={code:room,max:+$("max").value||5,correct:+$("correct").value||10,wrong:+$("wrong").value||5,teams:[],open:false,winner:null};
  await connectRoom();await send("state");render();
}
function joinPage(){page(`<section class="card"><h2>Gabung Permainan</h2><input id="code" maxlength="8" placeholder="KODE ROOM" style="text-transform:uppercase"><div class="buttons"><button id="go">Lanjut</button><button class="secondary" id="back">Kembali</button></div></section>`);$("go").onclick=joinRoom;$("back").onclick=home}
async function joinRoom(){
  room=$("code").value.trim().toUpperCase();if(!room)return;
  role="player";await connectRoom();
  page(`<section class="card"><h2>Masuk sebagai Tim</h2><input id="name" maxlength="25" placeholder="Nama tim"><button id="enter" style="margin-top:12px;width:100%">Masuk</button></section>`);
  $("enter").onclick=joinTeam;
  await new Promise(r=>setTimeout(r,400));
  await channel.send({type:"broadcast",event:"request",payload:{room}});
}
async function joinTeam(){
  const name=$("name").value.trim();if(!name)return alert("Masukkan nama tim.");
  teamId=rid();
  const joinMsg={id:teamId,name,score:0};
  await channel.send({type:"broadcast",event:"joinRequest",payload:joinMsg});
  page(`<section class="card center"><h2>Menunggu pembuat...</h2><p class="muted">Nama tim: ${esc(name)}</p></section>`);
}

function board(){return state.teams.slice().sort((a,b)=>b.score-a.score).map((t,i)=>`<div class="team ${t.id===state.winner?"winner":""}"><div class="row"><div><span class="rank">${i+1}</span><b>${esc(t.name)}</b></div><span class="score">${t.score}</span></div></div>`).join("")||"<p class='muted'>Belum ada tim.</p>"}

function host(){
  const w=state.teams.find(t=>t.id===state.winner);
  page(`<section class="card"><div class="row"><h2>Ruang Pembuat</h2><b>${state.teams.length}/${state.max} tim</b></div><div class="code">${state.code}</div><p class="center muted">Bagikan kode ini.</p></section><section class="card"><h2>Papan Skor</h2>${board()}</section><section class="card"><h2>Kontrol Bel</h2>${w?`<div class="status win"><b>BEL DITEKAN OLEH</b><h2>${esc(w.name)}</h2></div><div class="buttons"><button class="good" id="yes">✓ BENAR +${state.correct}</button><button class="bad" id="no">✕ SALAH -${state.wrong}</button></div>`:`<div class="status">${state.open?"BEL SIAP":"BEL DITUTUP"}</div><button id="open" style="width:100%">Buka Bel</button>`}</section>`);
  if($("open"))$("open").onclick=async()=>{state.open=true;state.winner=null;await send("state");render()};
  if($("yes"))$("yes").onclick=()=>result(true);if($("no"))$("no").onclick=()=>result(false);
}

async function result(correct){
  const w=state.teams.find(t=>t.id===state.winner);if(w)w.score+=correct?state.correct:-state.wrong;
  state.winner=null;state.open=false;await send("state");render();
}

function player(){
  const me=state.teams.find(t=>t.id===teamId),w=state.teams.find(t=>t.id===state.winner);
  if(!me){page(`<section class="card center"><h2>Menunggu peserta terdaftar</h2><p class="muted">Pastikan pembuat sudah membuka room.</p></section>`);return}
  page(`<section class="card center"><h2>${esc(me.name)}</h2><div class="score">${me.score} poin</div></section><section class="card center">${w?`<div class="status ${w.id===teamId?"win":""}"><b>${w.id===teamId?"KAMU MENEKAN BEL!":"BEL SUDAH DIKUNCI"}</b><h2>${esc(w.name)}</h2></div>`:state.open?`<button class="buzz" id="buzz">BEL</button>`:`<div class="status">Menunggu pembuat membuka bel.</div>`}</section><section class="card"><h2>Papan Skor</h2>${board()}</section>`);
  if($("buzz"))$("buzz").onclick=async()=>{if(!state.open||state.winner)return;state.winner=teamId;state.open=false;await channel.send({type:"broadcast",event:"buzz",payload:state});render()};
}

channel; // Keep the realtime client active.
home();
