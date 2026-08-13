const $=id=>document.getElementById(id);
const screens=["home","create","join","team","game"];
let data={role:null,room:null,team:null,state:null};

function show(id){screens.forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function makeCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function save(){localStorage.setItem("PAKKOM_QUIZBUZZ_DEMO",JSON.stringify(data));}
function load(){try{data=JSON.parse(localStorage.getItem("PAKKOM_QUIZBUZZ_DEMO"))||data}catch(e){}}
function renderGame(){
  const s=data.state;if(!s)return;
  show("game");$("codeBox").textContent=s.code;
  $("slotInfo").textContent=`${s.teams.length}/${s.maxTeams} TIM`;
  $("hostControls").classList.toggle("hidden",data.role!=="host");
  $("playerControls").classList.toggle("hidden",data.role!=="player");
  const teams=[...s.teams].sort((a,b)=>b.score-a.score);
  $("scoreboard").innerHTML=teams.length?teams.map((t,i)=>`<div class="team ${s.winner===t.id?"winner":""}"><div class="row"><div><span class="rank">${i+1}</span><b>${escapeHtml(t.name)}</b></div><span class="score">${t.score}</span></div></div>`).join(""):"<p class='muted'>Belum ada tim.</p>";
  const w=s.teams.find(t=>t.id===s.winner);
  if(data.role==="host"){
    $("winnerBox").innerHTML=w?`<div class="status win center"><b>BEL DITEKAN OLEH</b><h2>${escapeHtml(w.name)}</h2></div>`:`<div class="status center">${s.open?"BEL SIAP — peserta boleh menekan.":"Bel ditutup."}</div>`;
    $("openBellBtn").classList.toggle("hidden",!!w||s.open);
    $("correctBtn").classList.toggle("hidden",!w);$("wrongBtn").classList.toggle("hidden",!w);
  }else{
    const me=s.teams.find(t=>t.id===data.team);
    $("playerStatus").innerHTML=w?`<div class="status ${w.id===data.team?"win":""}"><b>${w.id===data.team?"KAMU MENEKAN BEL!":"BEL SUDAH DIKUNCI"}</b><h2>${escapeHtml(w.name)}</h2></div>`:s.open?`<p class="muted">Bel siap. Tekan saat waktunya.</p>`:`<div class="status">Menunggu pembuat membuka bel.</div>`;
    $("buzzBtn").disabled=!s.open||!!w;
    if(me)$("gameTitle").textContent=me.name;
  }
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

$("createBtn").onclick=()=>show("create");
$("joinBtn").onclick=()=>show("join");
$("back1").onclick=()=>show("home");
$("back2").onclick=()=>show("home");
$("makeRoomBtn").onclick=()=>{
 const max=Math.max(2,Math.min(50,Number($("maxTeams").value)||5));
 data={role:"host",room:makeCode(),team:null,state:{code:"",maxTeams:max,correct:Number($("correctScore").value)||10,wrong:Number($("wrongScore").value)||5,teams:[],open:false,winner:null}};
 data.state.code=data.room;save();renderGame();
};
$("continueJoinBtn").onclick=()=>{
 const code=$("roomCode").value.trim().toUpperCase();
 const d=JSON.parse(localStorage.getItem("PAKKOM_QUIZBUZZ_DEMO")||"null");
 if(!d||d.room!==code){alert("Room tidak ditemukan pada demo lokal. Untuk antar-HP gunakan backend real-time.");return}
 data=d;data.role="player";data.room=code;save();$("roomInfo").textContent=`Room ${code} • ${data.state.teams.length}/${data.state.maxTeams} slot`;show("team");
};
$("enterTeamBtn").onclick=()=>{
 const name=$("teamName").value.trim();if(!name)return alert("Masukkan nama tim.");
 if(data.state.teams.length>=data.state.maxTeams)return alert("Room penuh.");
 if(data.state.teams.some(t=>t.name.toLowerCase()===name.toLowerCase()))return alert("Nama tim sudah digunakan.");
 const id=makeCode();data.team=id;data.state.teams.push({id,name,score:0});save();renderGame();
};
$("openBellBtn").onclick=()=>{data.state.open=true;data.state.winner=null;save();renderGame()};
$("buzzBtn").onclick=()=>{if(data.state.open&&!data.state.winner){data.state.winner=data.team;save();renderGame()}};
function result(ok){const w=data.state.teams.find(t=>t.id===data.state.winner);if(w)w.score+=ok?data.state.correct:-data.state.wrong;data.state.winner=null;data.state.open=false;save();renderGame()}
$("correctBtn").onclick=()=>result(true);$("wrongBtn").onclick=()=>result(false);
$("homeBtn").onclick=()=>{data={role:null,room:null,team:null,state:null};save();show("home")};
load();show("home");
