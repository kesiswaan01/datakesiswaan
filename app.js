/* Aplikasi Kesiswaan — Frontend. Navigasi & filter 100% lokal; server hanya untuk login/bootstrap/simpan. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Z=n=>String(n).padStart(2,'0'),iso=d=>d.getFullYear()+'-'+Z(d.getMonth()+1)+'-'+Z(d.getDate()),hm=d=>Z(d.getHours())+':'+Z(d.getMinutes());
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const ld=(k,s)=>{try{return JSON.parse((s?sessionStorage:localStorage).getItem(k))}catch(e){return null}};
const sv=(k,v,s)=>{try{(s?sessionStorage:localStorage).setItem(k,JSON.stringify(v))}catch(e){}};
const rm=(k,s)=>{try{(s?sessionStorage:localStorage).removeItem(k)}catch(e){}};
/* ── Transport REST ke API Apps Script (menggantikan google.script.run) ──
   POST text/plain = "simple request" → tanpa preflight CORS. Semua tulis idempoten (id dari klien) sehingga aman diulang. */
const CFG=window.APP_CONFIG||{},API_URL=String(CFG.API_URL||'');
async function rpc(body,o){
  o=o||{};const retry=o.retry==null?2:o.retry,timeout=o.timeout||45000;let err;
  if(!API_URL||/GANTI/i.test(API_URL))throw new Error('Alamat API belum diatur di config.js');
  for(let i=0;i<=retry;i++){
    const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),timeout);
    try{
      const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow',credentials:'omit',signal:ac.signal});
      clearTimeout(tm);if(!r.ok)throw new Error('Server menjawab '+r.status);
      return await r.json();
    }catch(e){clearTimeout(tm);err=e.name==='AbortError'?new Error('Server terlalu lama menjawab'):e;if(i<retry)await new Promise(k=>setTimeout(k,700*(i+1)))}
  }
  throw err;
}
const gs=async(fn,...a)=>{ // login tidak diulang otomatis (agar tidak menambah hitungan salah)
  const r=await rpc({fn,args:a},(fn==='login'||fn==='loginOrtu')?{retry:0}:null);
  if(r&&r.message==='WAJIB_GANTI'){bukaGanti(true);return{success:false,message:'Buat kata sandi baru dulu untuk melanjutkan.'}} // ditegakkan server: semua fungsi lain terblokir
  return r;
};
function arahkanSandiAwal(m){if(/Kata sandi awal/.test(String(m))){const b=$('#sabox');if(b){b.hidden=false;$('#sawarn').hidden=!/belum diatur/.test(m);b.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('#sanew').focus(),400)}}}
const pesanGagal=e=>{const m=String(e&&e.message||'');return /config\.js|terlalu lama/.test(m)?m:'Gagal terhubung ke server. Periksa sambungan internet lalu coba lagi.'};
let ORTU_MODE=(ld('cfg')||{}).ortuMode||'nisn'; // dari cache; diperbarui oleh muatCfg()
const S={t:null,d:null,p:'dashboard',per:'week',tab:'pel',pg:1,n:10,q:'',dq:'',qp:'',qd:'',qs:'',sel:new Set(),psel:new Set(),ppage:[],pageIds:[],allIds:[],ed:null,qk:'',kl:'',mk:null,mem:new Set(),pgx:{pr:1,pd:1,sw:1,rw:1,nl:1},ek:null,att:{},last:0};
// pembina/pelatih yang hanya memegang kegiatan harian (mis. GEMERLAP): menu Prestasi dan Nilai disembunyikan
const hanyaPetugas=()=>{const d=S.d;return !!d&&['pembina','pelatih'].includes(d.user.peran)&&d.ekskul.length>0&&d.ekskul.every(e=>e.mode==='petugas')};
const navBoleh=(n,ix)=>!!n[ix]&&!(hanyaPetugas()&&['prestasi','nilai'].includes(n[0]));
const NAV=[['dashboard','Dashboard','i-dash',1,1,1,0,1],['ekskul','Ekstrakurikuler','i-flag',1,1,1],['tahfidz','Tahfidz','i-book',1,0,0,0,0,1],['keleks','Kelola Ekskul','i-gear',1,0,0],['pelanggaran','Pelanggaran & Terlambat','i-warn',1,0,0,0,1],['jenis','Jenis Pelanggaran','i-warn',1,0,0,0,0],['prestasi','Prestasi Siswa','i-trophy',1,1,1],['pendaftaran','Pendaftaran Baru','i-user',1,0,0],['siswa','Data Siswa','i-users',1,0,0],['pembina','Pembina & Pelatih','i-user',1,0,0],['laporan','Laporan & Ekspor','i-file',1,1,0],['nilai','Nilai Ekskul','i-star',1,1,1,0,0,1],['pengaturan','Pengaturan Sistem','i-gear',1,0,0],['anak','Data Anak','i-users',0,0,0,1]]; // [id,label,icon,kesiswaan,pembina,pelatih]
const SOON=[];
const TITLE={dashboard:'Dashboard',ekskul:'Ekstrakurikuler',pelanggaran:'Pelanggaran & Terlambat',prestasi:'Prestasi Siswa',pendaftaran:'Pendaftaran Baru',siswa:'Data Siswa',pembina:'Pembina & Pelatih',laporan:'Laporan & Ekspor',pengaturan:'Pengaturan Sistem',anak:'Data Anak',tahfidz:'Tahfidz',jenis:'Jenis Pelanggaran',nilai:'Nilai Ekskul',keleks:'Kelola Ekskul'};
const noEk=r=>r==='kesiswaan'||r==='disiplin'||r==='tahfidz',ROLE={kesiswaan:'Kesiswaan',pembina:'Pembina',pelatih:'Pelatih',disiplin:'Penegak Disiplin',tahfidz:'Guru Tahfidz',ortu:'Orang tua'};
const SC={hadir:'ok',izin:'wn',sakit:'in',alpa:'er'};

function toast(m,t){const e=document.createElement('div');e.className='toast '+(t||'');e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),t==='err'?9000:3500)}

/* ── Sesi & data awal ── */
function applyOrtuMode(){ // mode NISN: kata sandi = NISN (tanpa 4 digit HP); mode kode: kode akses + 4 digit HP
  const kode=typeof ORTU_MODE!=='undefined'&&ORTU_MODE==='kode',k=$('#lk input'),d=$('#ld input');
  $('#lkt').textContent=kode?'Kode akses dari sekolah':'Kata sandi (ketik NISN ananda sekali lagi)';
  k.setAttribute('inputmode',kode?'text':'numeric');k.autocomplete=kode?'off':'current-password';
  $('#ld').hidden=!kode;d.required=kode;if(!kode)d.value='';
}
function start(){
  try{const m=sessionStorage.getItem('pesanLogin');if(m){$('#lerr').textContent=m;sessionStorage.removeItem('pesanLogin')}}catch(e){}
  applyOrtuMode();
  const th=ld('theme');if(th)document.documentElement.dataset.theme=th;
  S.t=ld('tok',1);const c=ld('boot',1);
  if(S.t&&c){load(c);refresh()}else if(S.t){refresh()}else $('#login').hidden=false;
}
async function refresh(){
  const selesai=()=>document.body.classList.remove('memuat');
  try{const r=await gs('boot',S.t);
    if(!r.success){selesai();if(r.message==='SESI')return out(1);return toast(r.message,'err')}
    S.last=Date.now();load(r.data);selesai();
  }catch(e){selesai();setSync('off');if(S.d&&!S.d.siswa.length&&S.d.user.peran!=='ortu')toast('Gagal memuat data. Periksa koneksi lalu muat ulang halaman.','err')}
}
function mulai(r){
  if(r.wajibGanti){load({user:r.user,total:0,ekskul:[],siswa:[],anggota:[],pertemuan:[],kv:{}});S.wajib=true;bukaGanti(true);return} // masuk dengan sandi awal: wajib ganti dulu, data belum dimuat // setelah login: tampilkan aplikasi segera; data awal dipakai bila sudah ada di cache server, jika tidak dimuat di latar
  if(r.data){load(r.data);return}
  load({user:r.user,total:0,ekskul:[],siswa:[],anggota:[],pertemuan:[],kv:{}});
  document.body.classList.add('memuat');const e=$('#sync');e.className='pill in';e.textContent='Memuat data…';
  refresh();
}
function load(d){
  S.d=d;S.map={};S.lab={};S.jm={};
  d.siswa.forEach(x=>{S.map[x.id]=x;S.lab[x.nama+' ('+x.nisn+')']=x.id});
  (d.jenis||[]).forEach(j=>S.jm[j.id]=j);
  simpanBoot();S.cur=null;
  d.kv=d.kv||{};applyKv(d.kv);
  const u=d.user,r=u.peran;
  $('#un').textContent=u.nama;$('#ur').textContent=ROLE[r]||r;$('#role').textContent=ROLE[r]||r;
  const ix={kesiswaan:3,pembina:4,pelatih:5,ortu:6,disiplin:7,tahfidz:8}[r];
  $('#nav').innerHTML=NAV.filter(n=>navBoleh(n,ix)).map(n=>`<button class="nl" data-act="nav" data-p="${n[0]}"><svg class="i"><use href="#${n[2]}"/></svg>${esc(n[1])}</button>`).join('')+
    SOON.map(s=>`<button class="nl" disabled><svg class="i"><use href="#i-dash"/></svg>${esc(s)}<em>Segera</em></button>`).join('');
  $('#login').hidden=true;$('#app').hidden=false;$('#bgubah').hidden=r==='ortu';
  if(!NAV.find(n=>n[0]===S.p&&navBoleh(n,ix)))S.p=r==='ortu'?'anak':r==='tahfidz'?'tahfidz':'dashboard';
  fillForms();fillMore();renderAll();go(S.p);flush();
}
async function doLogin(f){
  const b=$('button',f);b.classList.add('load');$('#lerr').textContent='';
  try{const r=await gs('login',f.elements.u.value.trim(),f.elements.p.value);
    if(!r.success)$('#lerr').textContent=r.message;
    else{S.t=r.data.token;sv('tok',S.t,1);f.reset();S.p='dashboard';mulai(r.data)}
  }catch(e){$('#lerr').textContent=pesanGagal(e)}
  b.classList.remove('load');
}
function out(silent){
  if(S.t&&!silent)gs('logout',S.t).catch(()=>{});
  clearTimeout(tBoot);tBoot=0;S.jp=null;rm('tok',1);rm('boot',1);
  try{sessionStorage.setItem('pesanLogin',silent?'Sesi berakhir, silakan masuk lagi.':'')}catch(e){}
  location.reload(); // muat ulang bersih: tidak ada sisa data, daftar saran, atau status milik pengguna sebelumnya di halaman (aman untuk perangkat bersama)
}

/* ── Navigasi SPA: tanpa server, tanpa mengubah URL (aman di iframe) ── */
function go(p,pop){
  S.p=p;
  if(!pop){try{const cur=history.state&&history.state.p;if(!cur)history.replaceState({p},'');else if(cur!==p)history.pushState({p},'')}catch(e){}} // tombol Kembali Android = menu sebelumnya
  renderPage(p); // gambar halaman tujuan lebih dulu bila datanya berubah sejak terakhir digambar
  if(S.cur&&S.cur!==p){const a=$('#s-'+S.cur);if(a)a.hidden=true}else if(!S.cur)$$('[id^=s-]').forEach(s=>s.hidden=s.id!=='s-'+p);
  const e=$('#s-'+p);if(e)e.hidden=false;S.cur=p;
  $$('#nav .nl').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  $('#pt').textContent=TITLE[p]||'';document.body.classList.remove('nav-open');scrollTo(0,0);
}

/* ── Antrean tulis (outbox): UI langsung berubah, sinkron di latar, aman saat offline ── */
let busy=false;
let tBoot=0;
function simpanBoot(){clearTimeout(tBoot);tBoot=setTimeout(()=>{tBoot=0;if(S.d)sv('boot',S.d,1)},500)} // menulis data awal ke sessionStorage tidak lagi memblokir klik
addEventListener('pagehide',()=>{if(tBoot){clearTimeout(tBoot);tBoot=0;if(S.d)sv('boot',S.d,1)}});
function queue(fn,arg){const q=ld('out')||[];q.push({fn,arg});sv('out',q);simpanBoot();flush()}
function setSync(s){const e=$('#sync'),n=(ld('out')||[]).length;e.className='pill '+(s==='ok'?'ok':s==='sync'?'in':'wn');e.textContent=s==='ok'?'Tersinkron':s==='sync'?'Menyimpan…':'Offline · '+n+' tertunda'}
async function flush(){
  if(busy||!S.t)return;const q=ld('out')||[];if(!q.length)return setSync('ok');
  busy=true;setSync('sync');
  try{const r=await gs(q[0].fn,S.t,q[0].arg);
    if(r.message==='SESI'){busy=false;return out(1)}
    const c=ld('out')||[];c.shift();sv('out',c);
    if(!r.success){toast(r.message,'err');refresh()}
  }catch(e){busy=false;setSync('off');setTimeout(flush,15000);
    if(!S.fs){S.fs=1;toast('Belum tersimpan ke server ('+String(e&&e.message||'koneksi terputus').slice(0,140)+'). Akan dicoba lagi otomatis.','err')}return}
  busy=false;S.fs=0;flush();
}

/* ── Render ── */
const J=id=>S.jm[id]||{nama:'-',poin:0},PN=x=>x.pn!=null?x.pn:J(x.j).poin; // poin catatan = salinan saat dicatat
const sid=(p,i)=>p+'-'+String(i).slice(-5).toUpperCase();
const nm=i=>(S.map[i]||{nama:'(tidak diketahui)'}).nama;
const PAGE_RENDER={dashboard:()=>renderDash(),ekskul:()=>renderEks(),pelanggaran:()=>renderPel(),prestasi:()=>renderPres(),pendaftaran:()=>renderPend(),siswa:()=>renderSis(),pembina:()=>renderUsr(),anak:()=>renderAnak(),keleks:()=>renderKel(),nilai:()=>renderNilai(),jenis:()=>renderJenis(),tahfidz:()=>renderTh()};
const dirty=new Set();let idleH=0;
function renderPage(p){if(!dirty.has(p))return;dirty.delete(p);const f=PAGE_RENDER[p];if(f)f()}
function idleRender(){ // gambar halaman lain sedikit demi sedikit saat CPU senggang, agar berpindah menu nanti sudah siap
  if(idleH||!dirty.size)return;
  const run=()=>{idleH=0;const t=performance.now();while(dirty.size&&performance.now()-t<6){renderPage(dirty.values().next().value)}if(dirty.size)idleRender()};
  idleH=window.requestIdleCallback?requestIdleCallback(run,{timeout:2500}):setTimeout(run,60);
}
function renderAll(){Object.keys(PAGE_RENDER).forEach(p=>dirty.add(p));renderPage(S.p);idleRender()}
function rng(){const n=new Date(),t=iso(n);let a=t;if(S.per==='week'){const d=new Date(n);d.setDate(n.getDate()-((n.getDay()+6)%7));a=iso(d)}if(S.per==='month')a=t.slice(0,8)+'01';return[a,t]}
function tot(c){return c.H+c.I+c.S+c.A}
function renderDash(){
  const d=S.d,adm=d.user.peran==='kesiswaan',[a,b]=rng(),t=iso(new Date()),inr=x=>x>=a&&x<=b;
  const pel=(d.pel||[]).filter(x=>inr(x.tgl)),ter=d.terl||[],th=ter.filter(x=>x.tgl===t),pt=d.pertemuan.filter(x=>inr(x.tgl));
  const pp=(d.pres||[]).filter(x=>x.st==='menunggu').length,poin=pel.reduce((s,x)=>s+PN(x),0);let h=0,n=0;pt.forEach(x=>{h+=x.c.H;n+=tot(x.c)});
  const disp=d.user.peran==='disiplin',K=[...(adm||disp?[['Total Siswa Aktif',d.total,'Seluruh rombel','i-users','in'],['Pelanggaran Periode',pel.length,'Akumulasi poin: '+poin,'i-warn','er'],['Terlambat Hari Ini',th.length,'Tercatat hari ini','i-clock','wn'],['Prestasi',(d.pres||[]).filter(x=>inr(x.tgl)&&PV(x)).length,pp?pp+' menunggu verifikasi':'Pada periode ini','i-trophy','ok'],['Pendaftar Baru',(d.pend||[]).length,(d.pend||[]).filter(x=>x.st==='Baru').length+' perlu verifikasi','i-user','in']]:[['Siswa Ekskul',d.siswa.length,hanyaPetugas()?'Petugas aktif':'Anggota aktif','i-users','in'],...(hanyaPetugas()?[]:[['Prestasi',(d.pres||[]).filter(x=>inr(x.tgl)&&PV(x)).length,pp?pp+' menunggu verifikasi':'Pada periode ini','i-trophy','ok']])]),['Pertemuan Ekskul',pt.length,'Rata-rata hadir: '+(n?Math.round(h*1000/n)/10:0)+'%','i-flag','ok']];
  if(disp)K.splice(3);
  $('#kpi').innerHTML=K.map(k=>`<div class="card kpi"><div class="kh"><span>${k[0]}</span><span class="ic ${k[4]}"><svg class="i"><use href="#${k[3]}"/></svg></span></div><b>${k[1]}</b><small>${k[2]}</small></div>`).join('');
  $$('[data-act=per]').forEach(x=>x.classList.toggle('on',x.dataset.v===S.per));
  const en=id=>(d.ekskul.find(e=>e.id===id)||{}).nama_ekskul||'Ekskul';
  const L=[...(d.pel||[]).map(x=>({id:sid('PLG',x.id),n:nm(x.s),k:(S.map[x.s]||{}).kelas,e:J(x.j).nama,w:x.tgl+' '+x.jam,p:['er',PN(x)+' Poin']})),
    ...ter.map(x=>({id:sid('TLB',x.id),n:nm(x.s),k:(S.map[x.s]||{}).kelas,e:'Terlambat: '+x.al,w:x.tgl+' '+x.jam,p:['wn','Terlambat']})),
    ...(d.pres||[]).map(x=>({id:sid('PRS',x.id),n:nm(x.s),k:(S.map[x.s]||{}).kelas,e:x.jn+' ('+x.tk+')',w:x.tgl,p:x.st==='menunggu'?['wn','Menunggu verifikasi']:x.st==='ditolak'?['er','Ditolak']:['ok','Prestasi']})),
    ...d.pertemuan.map(x=>({id:sid('EKS',x.id),n:en(x.e),k:'Ekskul',e:'Pertemuan ke-'+x.ke,w:x.tgl,p:['ok',x.c.H+'/'+tot(x.c)+' Hadir']}))]
    .sort((p,q)=>p.w<q.w?1:-1).filter(x=>!S.dq||(x.n+x.e+x.id).toLowerCase().includes(S.dq)).slice(0,8);
  $('#act').innerHTML=L.map(x=>`<tr><td><span class="idl">${x.id}</span></td><td>${esc(x.n)}</td><td>${esc(x.k)}</td><td>${esc(x.e)}</td><td>${esc(x.w)}</td><td><span class="pill ${x.p[0]}">${esc(x.p[1])}</span></td></tr>`).join('')||'<tr><td colspan="6" class="mu">Belum ada data.</td></tr>';
}
const pertemuanHariIni=id=>S.d.pertemuan.find(x=>x.e===id&&x.tgl===iso(new Date()));
function hariIni(e){ // status kegiatan harian hari ini: sudah/belum diisi
  const x=pertemuanHariIni(e.id);
  const hr=hariDari(iso(new Date())),jt=adaJadwal(e.id)?`<small>${jadwalHari(e.id,hr).length} petugas terjadwal hari ${hr}</small>`:'<small>Jadwal petugas belum disusun</small>';
  return x?`<div class="ekm">Hari ini: <span class="pill ok">sudah diisi</span> <small>${x.c.H} hadir dari ${tot(x.c)} petugas</small></div>`:`<div class="ekm">Hari ini: <span class="pill wn">belum diisi</span> ${jt}</div>`;
}
function renderEks(){
  const d=S.d;
  $('#ekl').innerHTML=d.ekskul.map(e=>{const m=d.anggota.filter(a=>a.e===e.id).length,pt=d.pertemuan.filter(x=>x.e===e.id);let n=0,h=0;pt.forEach(x=>{n+=tot(x.c);h+=x.c.H});
    return `<div class="card ek"><h3>${esc(e.nama_ekskul)}</h3>${e.mode==='petugas'?'<span class="pill in">Kegiatan harian · kehadiran petugas</span> ':''}${e.mode==='petugas'?'<div><span class="pill in">Kegiatan harian · hanya kehadiran petugas</span></div>':''}<small>${esc(hariTxt(e))}, ${esc(e.jam)} · ${esc(e.lokasi)}</small><div class="ekm"><b>${m}</b> ${e.mode==='petugas'?'petugas':'siswa'} <span class="pill ok">${n?Math.round(h*100/n):0}% hadir</span></div>${e.mode==='petugas'?hariIni(e):''}<button class="btn pri w" data-act="pres" data-id="${esc(e.id)}">${e.mode==='petugas'?(pertemuanHariIni(e.id)?'Perbaiki Kehadiran Hari Ini':'Isi Kehadiran Hari Ini'):'Isi Kehadiran'}</button>${e.mode==='petugas'?`<button class="btn w" style="margin-top:8px" data-act="jadwal" data-id="${esc(e.id)}">Jadwal Petugas</button>`:''}${d.user.peran!=='kesiswaan'?`<button class="btn w" style="margin-top:8px" data-act="mem" data-id="${esc(e.id)}">Kelola Anggota</button>`:''}</div>`}).join('')||'<p class="mu">Belum ada ekskul untuk akun ini.</p>';
  if(S.jp){const f=document.activeElement;if(f&&f.closest&&f.closest('#jpf'))renderJadwalTabel();else renderJadwal()} // bila sedang mengetik di editor: perbarui tabel saja, jangan bangun ulang isian
  renderRiwayat();
}
function sum(){const c={hadir:0,izin:0,sakit:0,alpa:0};Object.values(S.att).forEach(v=>c[v]++);$('#ps').innerHTML=Object.keys(c).map(k=>`<span class="pill ${SC[k]}">${k[0].toUpperCase()+k.slice(1)}: ${c[k]}</span>`).join('')}
function savePres(){
  if(S.ed)return updPres();
  const e=S.ek,tg=$('#pd').value;if(!tg)return toast('Isi tanggal pertemuan','err');
  if(S.d.pertemuan.some(x=>x.e===e&&x.tgl===tg))return toast('Pertemuan pada tanggal ini sudah tercatat','err');
  const baris=$$('#pf tr[data-s]').map(tr=>({s:tr.dataset.s,st:S.att[tr.dataset.s],n:$('[data-n]',tr).value})),c={H:0,I:0,S:0,A:0},K={hadir:'H',izin:'I',sakit:'S',alpa:'A'};
  if(isPetugas(e)&&!baris.length)return toast('Belum ada petugas dalam daftar. Atur jadwal atau tambahkan petugas pengganti.','err');
  baris.forEach(b=>c[K[b.st]]++);
  const p={id:uid(),ekskul:e,tanggal:tg,ke:+$('#pk').value||1,materi:$('#pm').value,pelatih:$('#pp').checked,baris};
  S.d.pertemuan.unshift({id:p.id,e,tgl:tg,ke:p.ke,materi:p.materi,c});
  $('#pf').innerHTML='';renderAll();toast('Kehadiran disimpan');queue('savePresensi',p);
}
function sigSiswa(){let h=0;for(const x of S.d.siswa){const t=x.id+x.nama+x.nisn+x.kelas;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0}return S.d.siswa.length+':'+h}
function ensureDL(){if(!S.d)return;const g=sigSiswa();if(g===S.dlSig)return;S.dlSig=g;$('#dl').innerHTML=S.d.siswa.map(x=>`<option value="${esc(x.nama+' ('+x.nisn+')')}">${esc(x.kelas)}</option>`).join('')}
document.addEventListener('focusin',ev=>{const t=ev.target;if(t&&t.getAttribute&&t.getAttribute('list')==='dl')ensureDL()},true);
function fillForms(){
  S.dlSig=''; // daftar saran siswa dibangun saat kolom siswa difokuskan (ensureDL)
  $('#jn').innerHTML=(S.d.jenis||[]).filter(j=>j.a!==false).map(j=>`<option value="${esc(j.id)}">${esc(j.nama)}${KATS.includes(j.kat)?' · '+j.kat:''} (${j.poin} poin)</option>`).join('');
  const n=new Date();[$('#fp [name=t]'),$('#fp [name=j]'),$('#ft [name=j]'),$('#fr [name=t]')].forEach(i=>{if(i&&!i.value)i.value=i.type==='date'?iso(n):hm(n)});
}
function renderPel(){
  const d=S.d;if(!d.pel)return;const pel=S.tab==='pel',adm=d.user.peran==='kesiswaan',disp=d.user.peran==='disiplin',cdel=adm||disp,bisa=x=>adm||(disp&&!!x.u&&x.u===d.user.id); // Penegak Disiplin: hanya catatan yang ia catat sendiri
  $$('[data-act=tab]').forEach(b=>b.classList.toggle('on',b.dataset.v===S.tab));
  $('#ph').innerHTML='<tr>'+(cdel?'<th style="width:44px"><input type="checkbox" id="ckall" aria-label="Pilih semua baris di halaman ini"></th>':'')+'<th>ID</th><th>Siswa</th><th>Kelas</th><th>'+(pel?'Pelanggaran':'Alasan')+'</th><th>Waktu</th><th>Aksi</th></tr>';
  const q=S.q;let L=(pel?d.pel:d.terl).map(x=>{const s=S.map[x.s]||{};return{rid:x.id,sid:x.s,u:x.u,id:sid(pel?'PLG':'TLB',x.id),n:s.nama||'-',nisn:s.nisn||'',k:s.kelas||'',e:pel?J(x.j).nama:x.al,kt:pel?(J(x.j).kat||''):'',p:pel?PN(x):0,w:x.tgl+' '+x.jam}});
  if(q)L=L.filter(x=>(x.n+x.nisn+x.e+x.id).toLowerCase().includes(q));
  const pages=Math.max(1,Math.ceil(L.length/S.n));S.pg=Math.min(S.pg,pages);
  const rows=L.slice((S.pg-1)*S.n,S.pg*S.n);S.pageIds=rows.filter(bisa).map(x=>x.rid);S.allIds=L.filter(bisa).map(x=>x.rid);
  $('#pb').innerHTML=rows.map(x=>`<tr>${cdel?(bisa(x)?`<td><input type="checkbox" data-ck="${esc(x.rid)}"${S.sel.has(x.rid)?' checked':''} aria-label="Pilih ${esc(x.id)}"></td>`:'<td></td>'):''}<td><span class="idl">${x.id}</span></td><td>${esc(x.n)}<small>NISN ${esc(x.nisn)}</small></td><td>${esc(x.k)}</td><td>${pel?katPill(x.kt)+' ':''}${esc(x.e)} ${pel?`<span class="pill er">${x.p} Poin</span>`:''}</td><td>${esc(x.w)}</td><td><button class="btn sm" data-act="lapsiswa" data-id="${esc(x.sid)}">Laporan</button>${bisa(x)?` <button class="btn sm dng" data-act="hdel" data-id="${esc(x.rid)}">Hapus</button>`:''}</td></tr>`).join('')||`<tr><td colspan="${cdel?8:6}" class="mu">Tidak ada data.</td></tr>`;
  const pg=[];for(let i=Math.max(1,S.pg-2);i<=Math.min(pages,S.pg+2);i++)pg.push(`<button data-act="page" data-k="pel" data-v="${i}" class="${i===S.pg?'on':''}" aria-label="Halaman ${i}">${i}</button>`);
  $('#pgr').innerHTML=`<small>Menampilkan ${L.length?(S.pg-1)*S.n+1:0}–${Math.min(L.length,S.pg*S.n)} dari ${L.length}</small><div>${pg.join('')}</div><select data-act="rows" aria-label="Baris per halaman">${[5,10,25,50].map(v=>`<option ${v===S.n?'selected':''}>${v}</option>`).join('')}</select>`;
  hBar();
  const sm={};d.pel.forEach(x=>sm[x.s]=(sm[x.s]||0)+PN(x));
  $('#top5').innerHTML='<h3>Top 5 Akumulasi Poin</h3>'+(Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([i,v])=>`<p><span>${esc(nm(i))}</span><b>${v} / 30</b></p><div class="pb"><i style="width:${Math.min(100,v*100/30)}%"></i></div>`).join('')||'<p class="mu">Belum ada poin.</p>')+'<small style="margin-top:12px">Batas 30 poin: Surat Panggilan Orang Tua (SP-1)</small>';
}
function addPel(f){
  const s=S.lab[f.elements.s.value];if(!s)return toast('Pilih siswa dari daftar saran','err');
  const e=f.elements,r={id:uid(),siswa:s,jenis:e.k.value,tanggal:e.t.value,jam:e.j.value,catatan:e.c.value};
  S.d.pel.unshift({id:r.id,s,j:r.jenis,tgl:r.tanggal,jam:r.jam,cat:r.catatan,u:S.d.user.id,pn:J(r.jenis).poin});
  e.s.value='';e.c.value='';renderAll();toast('Pelanggaran dicatat');queue('savePelanggaran',r);
}
function addTer(f){
  const e=f.elements,s=S.lab[e.s.value];if(!s)return toast('Pilih siswa dari daftar saran','err');
  const r={id:uid(),siswa:s,tanggal:iso(new Date()),jam:e.j.value,alasan:e.a.value};
  S.d.terl.unshift({id:r.id,s,tgl:r.tanggal,jam:r.jam,al:r.alasan,u:S.d.user.id});
  e.s.value='';e.j.value=hm(new Date());renderAll();toast('Keterlambatan dicatat');queue('saveTerlambat',r);
}

/* ── Berkas: foto dikompres di browser (maks 1280px) agar unggah cepat; PDF maks 5 MB ── */
const filePayload=f=>new Promise((ok,no)=>{
  if(!f)return ok(null);
  if(!/^image\/(jpeg|png)$|^application\/pdf$/.test(f.type))return no(new Error('Berkas harus JPG, PNG, atau PDF.'));
  if(f.type==='application/pdf'){
    if(f.size>5242880)return no(new Error('PDF maksimal 5 MB.'));
    const r=new FileReader();r.onload=()=>ok({name:f.name,mime:f.type,data:r.result.split(',')[1]});r.onerror=()=>no(new Error('Gagal membaca berkas.'));return r.readAsDataURL(f);
  }
  const im=new Image(),u=URL.createObjectURL(f);
  im.onload=()=>{const k=Math.min(1,1280/Math.max(im.width,im.height)),c=document.createElement('canvas'),x=c.getContext('2d');c.width=im.width*k;c.height=im.height*k;x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    ok({name:f.name.replace(/\.\w+$/,'')+'.jpg',mime:'image/jpeg',data:c.toDataURL('image/jpeg',.75).split(',')[1]})};
  im.onerror=()=>no(new Error('Gambar tidak dapat dibaca.'));im.src=u;
});
/* Kirim langsung (berkas besar tidak disimpan di outbox lokal); gagal → batalkan perubahan di layar */
async function send(fn,arg,undo){
  setSync('sync');
  try{const r=await gs(fn,S.t,arg);
    if(r.message==='SESI')return out(1);
    if(!r.success){undo&&undo();toast(r.message,'err')}else{toast('Tersimpan di server');refresh()}
  }catch(e){undo&&undo();toast('Gagal mengirim. Periksa koneksi lalu coba lagi.','err')}
  setSync('ok');
}
const pgb=(k,c,p,n)=>{const b=[];for(let i=Math.max(1,c-2);i<=Math.min(p,c+2);i++)b.push(`<button data-act="page" data-k="${k}" data-v="${i}" class="${i===c?'on':''}" aria-label="Halaman ${i}">${i}</button>`);return`<small>${n} data</small><div>${b.join('')}</div>`};
/* ── Prestasi: status verifikasi, tolak, rekap Excel (Kesiswaan) dan laporan dari orang tua ── */
const PST={terverifikasi:['ok','Terverifikasi'],menunggu:['wn','Menunggu verifikasi'],ditolak:['er','Ditolak']},PV=x=>(x.st||'terverifikasi')==='terverifikasi';
function renderPres(){
  const d=S.d;if(!d.pres)return;const adm=d.user.peran==='kesiswaan';
  $('#prth').innerHTML='<tr>'+(adm?'<th style="width:44px"><input type="checkbox" id="pckall" aria-label="Pilih semua baris di halaman ini"></th>':'')+'<th>ID</th><th>Siswa</th><th>Prestasi</th><th>Tingkat</th><th>Tanggal</th>'+(adm?'<th>Status</th>':'')+'<th>Sertifikat</th>'+(adm?'<th>Aksi</th>':'')+'</tr>';
  $('#prf').hidden=!adm;$('#prrk').hidden=!adm;
  const pend=d.pres.filter(x=>x.st==='menunggu').length,bn=$('#prbn');bn.hidden=!(adm&&pend);
  if(adm&&pend)bn.innerHTML=`<span class="pill wn">${pend} laporan menunggu verifikasi</span> Dikirim orang tua. Periksa sertifikatnya, lalu klik Verifikasi atau Tolak. <button class="btn sm" data-act="prtampil">Tampilkan</button>`;
  if(adm){const kls=[...new Set((d.siswa||[]).map(x=>x.kelas).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'id',{numeric:true})),k=$('#prk'),v=k.value;k.innerHTML='<option value="">Semua kelas</option>'+kls.map(x=>`<option>${esc(x)}</option>`).join('');k.value=kls.includes(v)?v:''}
  let L=d.pres.map(x=>{const s=S.map[x.s]||{};return{...x,n:s.nama||'-',nisn:s.nisn||''}});
  if(adm&&S.prf)L=L.filter(x=>(x.st||'terverifikasi')===S.prf);
  if(S.qp)L=L.filter(x=>(x.n+x.nisn+x.jn+(x.pen||'')).toLowerCase().includes(S.qp));
  const pages=Math.max(1,Math.ceil(L.length/10)),c=S.pgx.pr=Math.min(S.pgx.pr,pages),rows=L.slice((c-1)*10,c*10);S.ppage=rows.map(x=>x.id);
  $('#prb').innerHTML=rows.map(x=>{const st=PST[x.st||'terverifikasi'];
    return`<tr>${adm?`<td><input type="checkbox" data-pk="${esc(x.id)}"${S.psel.has(x.id)?' checked':''} aria-label="Pilih ${esc(x.jn)}"></td>`:''}<td><span class="idl">${sid('PRS',x.id)}</span></td><td>${esc(x.n)}<small>NISN ${esc(x.nisn)}</small></td><td>${esc(x.jn)}<small>${esc(x.pen)}</small>${x.o==='o'&&adm?'<small>Dilaporkan orang tua</small>':''}</td><td>${esc(x.tk)}</td><td>${esc(x.tgl)}</td>${adm?`<td><span class="pill ${st[0]}">${st[1]}</span>${x.ca?`<small>${esc(x.ca)}</small>`:''}</td>`:''}<td>${x.f==='pending'?'<span class="pill in">Mengunggah…</span>':x.f&&x.st!=='ditolak'?`<button class="btn sm" data-act="view" data-id="${esc(x.f)}">Lihat</button>`:'<span class="mu">—</span>'}</td>${adm?`<td>${x.st==='menunggu'?`<button class="btn sm pri" data-act="pverif" data-id="${esc(x.id)}">Verifikasi</button> <button class="btn sm dng" data-act="ptolak" data-id="${esc(x.id)}">Tolak</button> `:x.st==='ditolak'?`<button class="btn sm" data-act="pverif" data-id="${esc(x.id)}">Verifikasi</button> `:''}<button class="btn sm dng" data-act="pdel" data-id="${esc(x.id)}">Hapus</button></td>`:''}</tr>`}).join('')||`<tr><td colspan="${adm?9:6}" class="mu">Belum ada prestasi.</td></tr>`;
  $('#prp').innerHTML=pgb('pr',c,pages,L.length);pBar();
}
function pBar(){
  const b=$('#pbar');if(!b)return;if(S.d.user.peran!=='kesiswaan'){b.hidden=true;return}
  b.hidden=false;const n=S.psel.size,pend=(S.d.pres||[]).filter(x=>x.st==='menunggu').length;
  b.innerHTML=`<small>${n?`<b>${n} dipilih</b>`:'Centang baris untuk memverifikasi atau menghapus beberapa sekaligus'}</small><div>${pend?`<button class="btn sm" data-act="ppmenunggu">Pilih semua yang menunggu (${pend})</button> `:''}${n?`<button class="btn sm" data-act="ppbatal">Batal pilih</button> <button class="btn sm pri" data-act="ppverif">Verifikasi ${n}</button> <button class="btn sm dng" data-act="ppdel">Hapus ${n}</button>`:''}</div>`;
  const c=$('#pckall');if(c)c.checked=(S.ppage||[]).length>0&&S.ppage.every(i=>S.psel.has(i));
}
function confirmHapusPres(ids){
  const set=new Set(ids),rec=(S.d.pres||[]).filter(x=>set.has(x.id));
  if(!rec.length)return toast('Data prestasi tidak ditemukan','err');
  S.dx={pdel:rec.map(x=>x.id)};const ber=rec.filter(x=>x.f&&x.f!=='pending').length;
  $('#dt').textContent='Hapus prestasi';
  $('#db').innerHTML=`<p>Hapus <b>${rec.length} prestasi</b> secara permanen?</p><ul>${rec.slice(0,5).map(x=>`<li>${esc(nm(x.s))} — ${esc(x.jn)} (${esc(x.tgl)})${x.st==='menunggu'?' · menunggu verifikasi':''}</li>`).join('')}${rec.length>5?`<li>…dan ${rec.length-5} lainnya</li>`:''}</ul>`
    +(ber?`<p>${ber} sertifikat akan dipindahkan ke Sampah Drive.</p>`:'')
    +`<p class="mu">Tindakan ini tidak bisa dibatalkan. Prestasi yang dihapus tidak lagi terhitung di dashboard dan rekap. Untuk laporan yang keliru, pertimbangkan <b>Tolak</b> agar orang tua melihat alasannya.</p>`
    +(rec.length>1?`<label class="chk" style="height:auto;margin:8px 0 0"><input type="checkbox" id="dc">Saya mengerti, hapus semua prestasi ini</label>`:'');
  $('#dok').disabled=rec.length>1;$('#dm').showModal();
}
async function hapusPresKirim(btn){
  const ids=S.dx.pdel;btn.classList.add('load');
  try{const r=await gs('hapusPrestasi',S.t,{ids});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const set=new Set(ids);S.d.pres=S.d.pres.filter(x=>!set.has(x.id));S.psel.clear();$('#dm').close();renderAll();toast(r.data.hapus+' prestasi dihapus');refresh()}
  }catch(e){toast('Gagal menghapus. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}
async function tolakPresKirim(btn){
  const id=S.dx.tolak,cat=($('#tka')||{}).value||'';btn.classList.add('load');
  try{const r=await gs('verifPrestasi',S.t,{id,status:'ditolak',catatan:cat.trim()});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const x=S.d.pres.find(z=>z.id===id);if(x){x.st='ditolak';x.ca=cat.trim()}$('#dm').close();renderAll();toast('Laporan ditolak');refresh()}
  }catch(e){toast('Gagal menolak. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}
async function rekapPrestasiUnduh(btn){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  btn.classList.add('load');
  try{const r=await gs('rekapPrestasi',S.t,{dari:$('#prd').value,sampai:$('#prs2').value,status:$('#prst').value,kelas:$('#prk').value});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else if(!r.data.total)toast('Tidak ada prestasi pada pilihan ini','err');
    else{const x=r.data,wb=XLSX.utils.book_new(),sh=(o,w)=>{const ws=XLSX.utils.aoa_to_sheet([o.kolom,...o.baris]);ws['!cols']=w.map(n=>({wch:n}));return ws};
      XLSX.utils.book_append_sheet(wb,sh(x.daftar,[5,12,14,28,10,34,12,24,20,12,12]),'Daftar Prestasi');
      XLSX.utils.book_append_sheet(wb,sh(x.perSiswa,[5,28,10,14,9,9,11,7,9,9,12]),'Rekap per Siswa');
      XLSX.utils.book_append_sheet(wb,sh(x.perTingkat,[16,10]),'Rekap per Tingkat');
      saveWb(wb,'Rekap_Prestasi_'+iso(new Date())+'.xlsx');toast(`Rekap diunduh (${x.total} prestasi)`)}
  }catch(e){toast('Gagal menyiapkan rekap. Coba lagi.','err')}
  btn.classList.remove('load');
}
async function ortuKirimPres(f){ // orang tua melaporkan prestasi anaknya; menunggu verifikasi sekolah
  const e=f.elements,b=$('button',f);b.classList.add('load');let file=null;
  try{file=await filePayload(e.f.files[0])}catch(x){b.classList.remove('load');return toast(x.message,'err')}
  try{const r=await gs('ortuPrestasi',S.t,{id:uid(),jenis:e.k.value,tingkat:e.l.value,tanggal:e.t.value,penyelenggara:e.p.value,file});
    if(r.message==='SESI'){b.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{f.reset();f.hidden=true;toast('Laporan terkirim. Menunggu verifikasi sekolah.');refresh()}
  }catch(x){toast('Gagal mengirim. Periksa koneksi lalu coba lagi.','err')}
  b.classList.remove('load');
}
const presAnakForm=()=>`<form id="fpo" class="fg4" hidden style="margin-bottom:12px"><h3>Laporkan Prestasi Anak</h3>
  <label>Nama prestasi<input name="k" required maxlength="100" placeholder="mis. Juara 1 MTQ tingkat kecamatan"></label>
  <label>Tingkat<select name="l"><option>Sekolah</option><option>Kecamatan</option><option>Kota</option><option>Provinsi</option><option>Nasional</option><option>Internasional</option></select></label>
  <label>Tanggal pelaksanaan<input name="t" type="date" required></label><label>Penyelenggara<input name="p" maxlength="100"></label>
  <label>Foto/scan sertifikat (JPG, PNG, PDF; maks 5 MB)<input name="f" type="file" accept="image/jpeg,image/png,application/pdf"></label>
  <button class="btn pri">Kirim Laporan</button><p class="mu" style="grid-column:1/-1;margin:0">Laporan diperiksa sekolah dulu. Menyertakan sertifikat mempercepat verifikasi.</p></form>`;

const DOC=['Foto','Akta','KK','Surat'],ST=['Baru','Diverifikasi','Diterima','Ditolak'],STC={Baru:'wn',Diverifikasi:'in',Diterima:'ok',Ditolak:'er'};
function renderPend(){
  const d=S.d;if(!d.pend)return;
  let L=d.pend;if(S.qd)L=L.filter(x=>(x.n+x.no).toLowerCase().includes(S.qd));
  const pages=Math.max(1,Math.ceil(L.length/10)),c=S.pgx.pd=Math.min(S.pgx.pd,pages);
  $('#pdb').innerHTML=L.slice((c-1)*10,c*10).map(x=>{const b=(x.d||[]).map((f,i)=>f==='pending'?'<span class="pill in">Mengunggah…</span>':f?`<button class="btn sm" data-act="view" data-id="${esc(f)}">${DOC[i]}</button>`:'').join(' ');
    return`<tr><td><span class="idl">${esc(x.no)}</span></td><td>${esc(x.n)}</td><td>${esc(x.kon)}</td><td>${b||'<span class="mu">—</span>'}${x.no==='Memproses…'?'':`<br><button class="btn sm" data-act="bukti" data-id="${esc(x.id)}">Bukti PDF</button>${x.em?` <button class="btn sm" data-act="kirimb" data-id="${esc(x.id)}">Email</button>`:''}`}</td><td><select data-act="setst" data-id="${esc(x.id)}" class="${STC[x.st]||''}" aria-label="Status ${esc(x.n)}">${ST.map(v=>`<option${v===x.st?' selected':''}>${v}</option>`).join('')}</select></td></tr>`}).join('')||'<tr><td colspan="5" class="mu">Belum ada pendaftar.</td></tr>';
  $('#pdp').innerHTML=pgb('pd',c,pages,L.length);
}
async function addPres(f){
  const e=f.elements,s=S.lab[e.s.value];if(!s)return toast('Pilih siswa dari daftar saran','err');
  const b=$('button',f);b.classList.add('load');let file=null;
  try{file=await filePayload(e.f.files[0])}catch(x){b.classList.remove('load');return toast(x.message,'err')}
  const r={id:uid(),siswa:s,jenis:e.k.value,tingkat:e.l.value,tanggal:e.t.value,penyelenggara:e.p.value,file};
  S.d.pres.unshift({id:r.id,s,jn:r.jenis,tk:r.tingkat,tgl:r.tanggal,pen:r.penyelenggara,f:file?'pending':'',st:'terverifikasi',ca:'',o:'s'});
  f.reset();fillForms();renderAll();b.classList.remove('load');toast(file?'Mengunggah sertifikat…':'Prestasi dicatat');
  if(file)send('savePrestasi',r,()=>{S.d.pres=S.d.pres.filter(p=>p.id!==r.id);renderAll()}); // berkas besar: kirim langsung
  else queue('savePrestasi',r); // tanpa berkas: masuk antrean luring (tersimpan di perangkat, dikirim otomatis saat online)
}
async function addPend(f){
  const e=f.elements,b=$('button',f);b.classList.add('load');const files={};let n=0;
  try{for(const k of['foto','akta','kk','surat']){files[k]=await filePayload(e[k].files[0]);n+=files[k]?files[k].data.length:0}
    if(n>11e6)throw new Error('Total berkas terlalu besar (maks sekitar 8 MB).')}
  catch(x){b.classList.remove('load');return toast(x.message,'err')}
  const r={id:uid(),nama:e.n.value,lahir:e.l.value,asal:e.a.value,kontak:e.k.value,email:e.e.value,files};
  S.d.pend.unshift({id:r.id,no:'Memproses…',n:r.nama,kon:r.kontak,em:r.email,st:'Baru',d:Object.keys(files).map(k=>files[k]?'pending':'')});
  f.reset();renderAll();b.classList.remove('load');toast('Pendaftar dicatat, berkas diunggah…');
  send('savePendaftaran',r,()=>{S.d.pend=S.d.pend.filter(p=>p.id!==r.id);renderAll()});
}
async function viewFile(id){
  const m=$('#vm');$('#vb').innerHTML='<p class="mu">Memuat berkas…</p>';m.showModal();
  try{const r=await gs('getBerkas',S.t,id);if(!r.success){$('#vb').textContent=r.message;return}showFile(r.data)}
  catch(e){$('#vb').textContent='Gagal memuat berkas.'}
}

/* ── Identitas (nama, warna, logo, footer) ── */
function applyKv(k){
  const r=document.documentElement.style,s=(n,v)=>v?r.setProperty(n,v):r.removeProperty(n);
  s('--pri',k.warna_utama);s('--side',k.warna_sidebar);
  const nm=k.nama_aplikasi||'Aplikasi Kesiswaan';$('#an').textContent=nm.toUpperCase();document.title=nm;
  $$('.logo').forEach(l=>{l.innerHTML=k.logo_thumb?`<img src="${esc(k.logo_thumb)}" alt="Logo">`:'K'});
  $('#fx').textContent=k.teks_footer||'';
}
function reidx(){
  S.map={};S.lab={};S.d.siswa.forEach(x=>{S.map[x.id]=x;S.lab[x.nama+' ('+x.nisn+')']=x.id});
  S.dlSig=''; // daftar saran siswa dibangun saat kolom siswa difokuskan (ensureDL)
}
function fillSet(){
  const k=S.d.kv||{},e=$('#fg').elements,p=$('#lg-pv');
  e.n.value=k.nama_aplikasi||'Aplikasi Kesiswaan';e.f.value=k.teks_footer||'';
  e.a.value=(k.warna_utama||'#2563EB').toLowerCase();e.s.value=(k.warna_sidebar||'#1E3A8A').toLowerCase();
  p.hidden=!k.logo_thumb;if(k.logo_thumb)p.src=k.logo_thumb;
  e.om.value=k.ortu_mode==='kode'?'kode':'nisn';e.ne.checked=k.notif_aktif!=='tidak';e.np.checked=k.notif_prestasi==='ya';e.kd.value='';e.kd.placeholder=k.kode_set==='ya'?'Sudah diatur (isi untuk mengganti)':'Belum diatur';
}
function fillMore(){
  const d=S.d,adm=d.user.peran==='kesiswaan',eo=d.ekskul.map(e=>`<option value="${esc(e.id)}">${esc(e.nama_ekskul)}</option>`).join('');
  $('#hk').innerHTML=(adm?'<option value="">Semua ekskul</option>':'')+eo;$('#uk').innerHTML=eo;$('#le').innerHTML=(adm?'<option value="">Semua ekskul</option>':'')+eo;
  if(!adm)$('#lj').innerHTML='<option value="hadir">Rekap kehadiran ekskul</option>';
  const n=new Date(),a=$('#fl [name=d]'),b=$('#fl [name=s]');if(!a.value)a.value=iso(n).slice(0,8)+'01';if(!b.value)b.value=iso(n);
  fillSet();$('#prh').hidden=adm;
}
const thumb=f=>new Promise((ok,no)=>{const im=new Image(),u=URL.createObjectURL(f);
  im.onload=()=>{const k=80/Math.max(im.width,im.height),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    let d=c.toDataURL('image/png');if(d.length>38000)d=c.toDataURL('image/jpeg',.8);ok(d)};
  im.onerror=()=>no(new Error('Logo tidak dapat dibaca.'));im.src=u});
async function savSet(f){
  const e=f.elements,b=$('button',f);b.classList.add('load');let logo=null,th=null;
  try{if(e.l.files[0]){logo=await filePayload(e.l.files[0]);th=await thumb(e.l.files[0])}}catch(x){b.classList.remove('load');return toast(x.message,'err')}
  const p={nama:e.n.value,footer:e.f.value,warna_utama:e.a.value,warna_sidebar:e.s.value,logo,thumb:th,kode:e.kd.value,ortuMode:e.om.value,notif:e.ne.checked,notifPrestasi:e.np.checked},old={...S.d.kv};
  Object.assign(S.d.kv,{nama_aplikasi:p.nama,teks_footer:p.footer,warna_utama:p.warna_utama,warna_sidebar:p.warna_sidebar});if(th)S.d.kv.logo_thumb=th;S.d.kv.ortu_mode=p.ortuMode;S.d.kv.notif_aktif=p.notif?'ya':'tidak';S.d.kv.notif_prestasi=p.notifPrestasi?'ya':'tidak';if(p.kode)S.d.kv.kode_set='ya';
  applyKv(S.d.kv);fillSet();e.l.value='';b.classList.remove('load');toast('Pengaturan diterapkan');
  send('savePengaturan',p,()=>{S.d.kv=old;applyKv(old);fillSet()});
}
function defSet(){
  const p={nama:'Aplikasi Kesiswaan',footer:'',warna_utama:'#2563EB',warna_sidebar:'#1E3A8A',hapusLogo:true,notif:true,notifPrestasi:false},old={...S.d.kv};
  Object.assign(S.d.kv,{nama_aplikasi:p.nama,teks_footer:'',warna_utama:p.warna_utama,warna_sidebar:p.warna_sidebar,logo_thumb:''});
  applyKv(S.d.kv);fillSet();toast('Dikembalikan ke bawaan');send('savePengaturan',p,()=>{S.d.kv=old;applyKv(old);fillSet()});
}

/* ── Data Siswa ── */
function renderSis(){
  const d=S.d;if(d.user.peran!=='kesiswaan')return;
  let L=d.siswa;if(S.qs)L=L.filter(x=>(x.nama+x.nisn+x.kelas).toLowerCase().includes(S.qs));
  const pages=Math.max(1,Math.ceil(L.length/10)),c=S.pgx.sw=Math.min(S.pgx.sw,pages);
  $('#sb').innerHTML=L.slice((c-1)*10,c*10).map(x=>`<tr><td><span class="idl">${esc(x.nisn)}</span></td><td>${esc(x.nama)}</td><td>${esc(x.kelas)}</td><td>${esc(x.ot)}<small>${esc(x.kt)}</small></td><td><button class="btn sm" data-act="sedit" data-id="${esc(x.id)}">Ubah</button> <button class="btn sm" data-act="soff" data-id="${esc(x.id)}">Nonaktifkan</button> <button class="btn sm dng" data-act="sdel" data-id="${esc(x.id)}">Hapus</button></td></tr>`).join('')||'<tr><td colspan="5" class="mu">Belum ada siswa. Tambah satu atau impor CSV.</td></tr>';
  $('#sp').innerHTML=pgb('sw',c,pages,L.length);
}
function savSis(f){
  const e=f.elements,id=e.id.value||uid(),nisn=e.b.value.trim();
  if(S.d.siswa.some(x=>x.nisn===nisn&&x.id!==id))return toast('NISN sudah terdaftar','err');
  const r={id,nama:e.n.value.trim(),nisn,kelas:e.k.value,no:e.m.value,ot:e.o.value,kt:e.t.value,em:e.e.value},i=S.d.siswa.findIndex(x=>x.id===id);
  if(i<0){S.d.siswa.unshift(r);S.d.total++}else S.d.siswa[i]=r;
  reidx();f.reset();f.hidden=true;renderAll();toast('Data siswa disimpan');queue('saveSiswa',r);
}
function csv(t,d){const R=[];let r=[],c='',q=0;
  for(let i=0;i<t.length;i++){const x=t[i];
    if(q){if(x==='"'){if(t[i+1]==='"'){c+='"';i++}else q=0}else c+=x}
    else if(x==='"')q=1;else if(x===d){r.push(c);c=''}
    else if(x==='\n'||x==='\r'){if(x==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(z=>z.trim()))R.push(r);r=[]}else c+=x}
  r.push(c);if(r.some(z=>z.trim()))R.push(r);return R}
const CK={nama:'nama',nisn:'nisn',kelas:'kelas',nis:'no',nis_madrasah:'no',nama_orang_tua:'ot',kontak_orang_tua:'kt',email_orang_tua:'em'};
function impor(f){
  const rd=new FileReader();
  rd.onload=async()=>{
    const t=String(rd.result).replace(/^\uFEFF/,''),h1=t.split('\n')[0],dl=(h1.match(/;/g)||[]).length>(h1.match(/,/g)||[]).length?';':',',R=csv(t,dl);
    if(R.length<2)return toast('File CSV kosong atau tidak ada baris data.','err');
    const H=R[0].map(h=>CK[h.trim().toLowerCase()]);
    if(!H.includes('nama')||!H.includes('nisn'))return toast('Baris pertama harus berisi judul kolom: nama, nisn, kelas, ...','err');
    const rows=R.slice(1).map(r=>{const o={};H.forEach((k,i)=>{if(k)o[k]=(r[i]||'').trim()});return o});
    if(rows.length>2000)return toast('Maksimal 2000 baris per impor.','err');
    setSync('sync');toast('Mengimpor '+rows.length+' baris…');
    try{const r=await gs('importSiswa',S.t,rows);if(r.message==='SESI')return out(1);
      if(!r.success)toast(r.message,'err');
      else{const x=r.data;toast(x.tambah+' siswa ditambahkan'+(x.lewat?', '+x.lewat+' dilewati (NISN sudah ada)':'')+(x.salah.length?', '+x.salah.length+' baris tidak valid ('+x.salah[0]+')':''));refresh()}
    }catch(e){toast('Impor gagal. Periksa koneksi.','err')}
    setSync('ok');
  };
  rd.readAsText(f,'UTF-8');
}

/* ── Akun Pembina & Pelatih ── */
const idList=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const ekNamaPenuh=v=>idList(v).map(i=>(S.d.ekskul.find(e=>e.id===i)||{}).nama_ekskul||i).join(', ');
const ekNama=v=>{const n=idList(v);return n.length>2?n.length+' ekskul':ekNamaPenuh(v)};
function bukaEk(id){
  const u=S.d.users.find(x=>x.id===id);if(!u)return;S.ekuid=id;const pilih=new Set(idList(u.ek));
  $('#ekmt').textContent='Ekskul diampu — '+u.nm;$('#ekme').textContent='';
  $('#ekml').innerHTML=S.d.ekskul.map(e=>`<label class="chk" style="height:auto"><input type="checkbox" value="${esc(e.id)}"${pilih.has(e.id)?' checked':''}>${esc(e.nama_ekskul)}${e.mode==='petugas'?' <small>(kegiatan harian)</small>':''}</label>`).join('');
  $('#ekm').showModal();
}
function simpanEk(){
  const u=S.d.users.find(x=>x.id===S.ekuid);if(!u)return;const v=$$('#ekml input:checked').map(i=>i.value);
  if(!v.length)return $('#ekme').textContent='Pilih minimal satu ekskul.';
  if(v.length>12)return $('#ekme').textContent='Maksimal 12 ekskul per akun.';
  u.ek=v.join(',');$('#ekm').close();renderUsr();toast('Perubahan disimpan');queue('saveUser',{id:u.id,u:u.u,nm:u.nm,r:u.r,ek:u.ek,a:u.a});
}
function renderUsr(){
  const d=S.d;if(!d.users)return;
  const RL=[['pelatih','Pelatih'],['pembina','Pembina'],['disiplin','Penegak Disiplin'],['tahfidz','Guru Tahfidz'],['kesiswaan','Kesiswaan (admin)']];
  $('#ub').innerHTML=d.users.map(u=>{const me=u.id===d.user.id,kes=noEk(u.r),id=esc(u.id);
    return`<tr><td><input data-uf="nm" data-id="${id}" value="${esc(u.nm)}" maxlength="100" aria-label="Nama lengkap"></td>
    <td><input data-uf="u" data-id="${id}" value="${esc(u.u)}" maxlength="30" autocapitalize="none" aria-label="Nama pengguna"></td>
    <td><select data-uf="r" data-id="${id}"${me?' disabled title="Peran akun sendiri tidak dapat diubah"':''} aria-label="Peran">${u.r?'':'<option value="" selected>— pilih peran —</option>'}${RL.map(r=>`<option value="${r[0]}"${u.r===r[0]?' selected':''}>${r[1]}</option>`).join('')}</select></td>
    <td>${kes||!u.r?`<select data-uf="ek" data-id="${id}" disabled aria-label="Ekskul diampu"><option>${!u.r?'Pilih peran dulu':u.r==='kesiswaan'?'Semua ekskul':'Tidak berlaku'}</option></select>`:`<button class="btn sm" data-act="ekpilih" data-id="${id}" title="${esc(ekNamaPenuh(u.ek))}" aria-label="Ekskul diampu">${esc(ekNama(u.ek))||'— pilih ekskul —'}</button>`}</td>
    <td><span class="pill ${u.a?'ok':'er'}">${u.a?'Aktif':'Nonaktif'}</span>${u.r?'':' <span class="pill wn">Belum ada peran</span>'}${u.wg?' <span class="pill in">Wajib ganti sandi</span>':''}</td>
    <td><button class="btn sm" data-act="uedit" data-id="${id}">Reset sandi</button> ${me||!['pembina','pelatih',''].includes(u.r)?'':`<button class="btn sm" data-act="sandiawal" data-id="${id}">Sandi awal</button> `}${me?'':`<button class="btn sm" data-act="utog" data-id="${id}">${u.a?'Nonaktifkan':'Aktifkan'}</button>`}${me||!['pembina','pelatih',''].includes(u.r)?'':` <button class="btn sm dng" data-act="udel" data-id="${id}">Hapus</button>`}</td></tr>`}).join('');
  const n=d.users.filter(x=>!x.r).length,bn=$('#ubn');bn.hidden=!n;bn.innerHTML=n?`<span class="pill wn">${n} akun belum diberi peran</span> Akun ini belum bisa masuk. Pilih peran (dan ekskul untuk pembina/pelatih) di tabel di bawah.`:'';
  $('#sabox').hidden=false;
  if(S.saCek===undefined){S.saCek=0;gs('getSandiAwal',S.t).then(r=>{if(r&&r.success){S.saCek=r.data.ada?1:-1;$('#sawarn').hidden=!!r.data.ada}}).catch(()=>{S.saCek=undefined})} // peringatan dini bila kata sandi awal belum diatur
  const aku=(d.users||[]).find(x=>x.id===d.user.id);if(aku&&aku.nm&&aku.nm!==d.user.nama){d.user.nama=aku.nm;$('#un').textContent=aku.nm} // nama di pojok kanan atas ikut berubah
}
/* Edit langsung di tabel: tampil seketika, disimpan lewat antrean latar (berurutan, tanpa memuat ulang tabel agar kursor tidak lompat) */
function editUsr(t){
  const u=S.d.users.find(x=>x.id===t.dataset.id);if(!u)return;
  const f=t.dataset.uf,v=f==='u'?t.value.trim().toLowerCase():t.value.trim();
  if(f==='nm'&&!v){toast('Nama lengkap wajib diisi','err');return renderUsr()}
  if(f==='u'){
    if(!/^[a-z0-9._-]{3,30}$/.test(v)){toast('Nama pengguna 3–30 karakter: huruf kecil, angka, titik, atau strip','err');return renderUsr()}
    if(S.d.users.some(x=>x.u===v&&x.id!==u.id)){toast('Nama pengguna sudah dipakai','err');return renderUsr()}
    t.value=v;
  }
  if(f==='ek'&&!v){toast('Ekskul wajib dipilih untuk pembina/pelatih','err');return renderUsr()}
  if(u[f]===v)return;
  u[f]=v;
  if(f==='nm'&&u.id===S.d.user.id){S.d.user.nama=v;$('#un').textContent=v} // akun sendiri: nama di pojok kanan atas ikut berubah seketika
  if(f==='r'){if(noEk(v))u.ek='';renderUsr()}
  if(u.r&&!noEk(u.r)&&!u.ek){toast('Pilih ekskul yang diampu agar perubahan peran tersimpan','err');return}
  toast('Perubahan disimpan');queue('saveUser',{id:u.id,u:u.u,nm:u.nm,r:u.r,ek:u.ek,a:u.a});
}
function savUsr(f){
  const e=f.elements,id=e.id.value||uid(),old=S.d.users.find(x=>x.id===id),r={id,u:e.u.value.trim().toLowerCase(),nm:e.n.value.trim(),r:e.r.value,ek:(!e.r.value||noEk(e.r.value))?'':e.k.value,pw:e.p.value,wajibGanti:e.w.checked,a:old?old.a:true};
  if(!old&&!r.r)return toast('Pilih peran akun','err');
  if(!old&&r.pw.length<8)return toast('Kata sandi minimal 8 karakter','err');
  if(S.d.users.some(x=>x.u===r.u&&x.id!==id))return toast('Nama pengguna sudah dipakai','err');
  const prev=JSON.parse(JSON.stringify(S.d.users)),row={id,u:r.u,nm:r.nm,r:r.r,ek:r.ek,a:r.a,wg:r.pw?(id!==S.d.user.id&&r.wajibGanti):(old?old.wg:false)};
  if(old)Object.assign(old,row);else S.d.users.push(row);
  f.reset();f.hidden=true;renderUsr();toast('Menyimpan akun…');
  send('saveUser',r,()=>{S.d.users=prev;renderUsr()});
}

/* ── Laporan ── */
let LP=null;
async function tampil(f){
  const e=f.elements,b=$('button',f);b.classList.add('load');
  try{const r=await gs('buatLaporan',S.t,{jenis:e.j.value,dari:e.d.value,sampai:e.s.value,ekskul:e.e.value});
    if(r.message==='SESI'){b.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');else{LP=r.data;renderLap()}
  }catch(x){toast('Gagal memuat laporan. Coba lagi.','err')}
  b.classList.remove('load');
}
function renderLap(){
  const k=S.d.kv||{},L=LP,box=$('#lp');box.hidden=false;
  box.innerHTML=`<div class="bar no-print"><b>Pratinjau</b><div><button class="btn" data-act="xl">Ekspor Excel (.xlsx)</button> ${window.AndroidApp?'':'<button class="btn pri" data-act="cetak">Cetak / Simpan PDF</button>'}</div></div>
  <div class="kop">${k.logo_thumb?`<img src="${esc(k.logo_thumb)}" alt="" width="56" height="56">`:''}<div><h2>${esc(k.nama_aplikasi||'Aplikasi Kesiswaan')}</h2><small>${esc(k.teks_footer||'')}</small></div></div>
  <h3 class="ctr">${esc(L.judul)}</h3><p class="ctr mu">Periode: ${esc(L.periode)}</p>
  <p>${L.ringkas.map(x=>`<span class="pill in">${esc(x[0])}: ${esc(x[1])}</span>`).join(' ')}</p>
  <div class="tw"><table><thead><tr>${L.kolom.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${L.baris.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${L.kolom.length}" class="mu">Tidak ada data pada periode ini.</td></tr>`}</tbody></table></div>
  <small>Dicetak ${iso(new Date())} ${hm(new Date())}</small>`;
}
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function saveWb(wb,name){ // di aplikasi Android: simpan ke folder Download lewat jembatan; di browser: unduh biasa
  if(window.AndroidApp&&AndroidApp.saveFile){AndroidApp.saveFile(XLSX.write(wb,{bookType:'xlsx',type:'base64'}),name,XLSX_MIME);return}
  XLSX.writeFile(wb,name);
}
function expXl(){
  if(!LP)return;if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const L=LP,wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[L.judul],['Periode: '+L.periode],[],L.kolom,...L.baris]),'Laporan');
  saveWb(wb,'Laporan_'+L.judul.replace(/\W+/g,'_')+'_'+iso(new Date())+'.xlsx');
}
const two=(e,msg,fn)=>{if(e.dataset.c!=='1'){e.dataset.c='1';const t=e.textContent;e.textContent=msg;setTimeout(()=>{e.dataset.c='';e.textContent=t},3000);return}fn()};

/* ── Orang tua / siswa ── */
async function doLoginOrtu(f){
  const e=f.elements,b=$('button',f);b.classList.add('load');$('#oerr').textContent='';
  try{const r=await gs('loginOrtu',e.k.value,e.n.value.trim(),e.d.value.trim());
    if(!r.success)$('#oerr').textContent=r.message;
    else{S.t=r.data.token;sv('tok',S.t,1);f.reset();S.p='anak';mulai(r.data)}
  }catch(x){$('#oerr').textContent=pesanGagal(x)}
  b.classList.remove('load');
}
function renderAnak(){
  const o=S.d.ortu;if(!o){if(S.d.user.peran==='ortu')$('#an-b').innerHTML='<p class="mu">Memuat data…</p>';return}
  $('#an-n').textContent=o.nama;$('#an-s').textContent='Kelas '+o.kelas+' · NISN '+o.nisn;
  const tb=(h,rows)=>`<div class="tw"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${h.length}" class="mu">Belum ada data.</td></tr>`}</tbody></table></div>`;
  const kp=(a,b,c)=>`<div class="card kpi"><div class="kh"><span>${a}</span></div><b>${b}</b><small>${c}</small></div>`;
  $('#an-b').innerHTML=`<div class="kpis">${kp('Total Poin Pelanggaran',o.poin,'Batas surat panggilan: 30 poin')}${kp('Keterlambatan',o.terl.length,'Total tercatat')}${kp('Prestasi',o.pres.length,'Total tercatat')}</div>
  <div class="card"><h3>Kehadiran Ekstrakurikuler</h3>${tb(['Ekskul','Hadir','Izin','Sakit','Alpa','Persentase'],o.hadir.map(h=>{const t=h.H+h.I+h.S+h.A;return`<tr><td>${esc(h.n)}</td><td>${h.H}</td><td>${h.I}</td><td>${h.S}</td><td>${h.A}</td><td>${t?Math.round(h.H*100/t):0}%</td></tr>`}))}</div>
  <div class="card"><div class="bar"><h3>Pelanggaran</h3><button class="btn" data-act="laportu">Cetak laporan pelanggaran &amp; keterlambatan</button></div>${tb(['Tanggal','Pelanggaran','Poin'],o.pel.map(x=>`<tr><td>${esc(x.tgl)} ${esc(x.jam)}</td><td>${esc(x.j)} ${katPill(x.k)}</td><td><span class="pill er">${x.p} Poin</span></td></tr>`))}</div>
  <div class="card"><h3>Keterlambatan</h3>${tb(['Tanggal','Jam datang','Alasan'],o.terl.map(x=>`<tr><td>${esc(x.tgl)}</td><td>${esc(x.jam)}</td><td>${esc(x.al)}</td></tr>`))}</div>
  <div class="card"><div class="bar"><h3>Prestasi</h3><button class="btn" data-act="ppo">Laporkan Prestasi Anak</button></div>${presAnakForm()}${tb(['Tanggal','Prestasi','Tingkat','Penyelenggara','Status'],o.pres.map(x=>{const st=PST[x.st||'terverifikasi'];return`<tr><td>${esc(x.tgl)}</td><td>${esc(x.jn)}</td><td>${esc(x.tk)}</td><td>${esc(x.pen)}</td><td><span class="pill ${st[0]}">${st[1]}</span>${x.ca?`<small>${esc(x.ca)}</small>`:''}</td></tr>`}))}</div>`;
  $('#an-b').insertAdjacentHTML('beforeend',tahfidzAnak(o.tahfidz));
}

/* ── Bukti pendaftaran PDF ── */
function showFile(d){
  S.vf=d;const bin=atob(d.data),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
  if(S.bu)URL.revokeObjectURL(S.bu);S.bu=URL.createObjectURL(new Blob([a],{type:d.mime}));
  $('#vd').href=S.bu;$('#vd').download=d.name;
  $('#vb').innerHTML=d.mime==='application/pdf'?(window.AndroidApp?'<p>Pratinjau PDF tidak tersedia di aplikasi Android.</p><p class="mu">Ketuk <b>Unduh</b> untuk menyimpan dan membukanya dengan aplikasi PDF di ponsel.</p>':`<iframe src="${S.bu}" title="${esc(d.name)}"></iframe>`):`<img src="${S.bu}" alt="${esc(d.name)}">`;
}
async function bukti(id,kirim,btn){
  btn&&btn.classList.add('load');
  if(!kirim){$('#vb').innerHTML='<p class="mu">Membuat PDF…</p>';$('#vm').showModal()}
  try{const r=await gs('buktiPendaftaran',S.t,{id,kirim});
    if(r.message==='SESI'){btn&&btn.classList.remove('load');return out(1)}
    if(!r.success){toast(r.message,'err');if(!kirim)$('#vm').close()}
    else if(kirim)toast('Bukti pendaftaran dikirim ke email orang tua');else showFile(r.data);
  }catch(e){toast('Gagal memproses. Coba lagi.','err');if(!kirim)$('#vm').close()}
  btn&&btn.classList.remove('load');
}

/* ── Kelola Ekskul ── */
const HARI=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
function renderKel(){
  const d=S.d;if(d.user.peran!=='kesiswaan')return;
  $('#kb').innerHTML=d.ekskul.map(e=>{const n=d.anggota.filter(a=>a.e===e.id).length;
    return`<tr><td><b>${esc(e.nama_ekskul)}</b>${e.mode==='petugas'?'<small><span class="pill in">Kegiatan harian · hanya kehadiran petugas</span></small>':'<small class="mu">Ekskul biasa</small>'}</td><td>${esc(hariTxt(e))}, ${esc(String(e.jam).slice(0,5))}<small>${esc(e.lokasi)}</small></td><td>${n} siswa</td><td><button class="btn sm" data-act="kang" data-id="${esc(e.id)}">Anggota</button> <button class="btn sm" data-act="kedit" data-id="${esc(e.id)}">Ubah</button> <button class="btn sm" data-act="kdel" data-id="${esc(e.id)}">Hapus</button></td></tr>`}).join('')||'<tr><td colspan="4" class="mu">Belum ada ekskul.</td></tr>';
}
const isPetugas=id=>{const e=S.d.ekskul.find(x=>x.id===id);return !!e&&e.mode==='petugas'}; // kegiatan harian: hanya kehadiran petugas
/* ── Kegiatan harian: jadwal petugas per hari + keterangan asal ekskul ── */
const HARI_ID=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const hariDari=tg=>{const [y,m,d]=String(tg).split('-').map(Number);return HARI_ID[new Date(y,m-1,d).getDay()]};
const urutNama=(a,b)=>String(a.nama).localeCompare(String(b.nama));
const adaJadwal=ek=>(S.d.jadwal||[]).some(j=>j.e===ek);
const jadwalHari=(ek,h)=>(S.d.jadwal||[]).filter(j=>j.e===ek&&j.h===h).map(j=>S.map[j.s]).filter(Boolean).sort(urutNama);
function asalTxt(id){ // ekskul biasa yang diikuti siswa: dari server, atau dihitung dari keanggotaan bila belum ada
  const a=(S.d.asal||{})[id];if(a)return a; // isian manual atau hitungan server
  return S.d.ekskul.filter(e=>e.mode!=='petugas'&&S.d.anggota.some(x=>x.e===e.id&&x.s===id)).map(e=>e.nama_ekskul).join(', ');
}
function petugasRows(ek,tg){ // daftar kehadiran = petugas yang dijadwalkan pada hari dari tanggal itu (bila jadwal belum disusun: semua anggota)
  const ms=adaJadwal(ek)?jadwalHari(ek,hariDari(tg)):S.d.anggota.filter(a=>a.e===ek).map(a=>S.map[a.s]).filter(Boolean).sort(urutNama);
  return ms.map(m=>({...m,st:'hadir',n:'',asal:asalTxt(m.id)}));
}
const hariTxt=e=>String(e.hari||'').split(',').map(x=>x.trim()).filter(Boolean).join(', ');
function savEks(f){
  const e=f.elements,id=e.id.value||'EK'+Date.now().toString(36),nama=e.n.value.trim(),hr=$$('input[name=h]:checked',f).map(i=>i.value);
  if(!nama)return toast('Nama ekskul wajib diisi','err');
  if(!hr.length)return toast('Pilih minimal satu hari kegiatan','err');
  if(!e.j.value)return toast('Isi jam kegiatan','err');
  if(S.d.ekskul.some(x=>x.nama_ekskul.toLowerCase()===nama.toLowerCase()&&x.id!==id))return toast('Nama ekskul sudah ada','err');
  const r={id,nama,hari:hr.join(','),jam:e.j.value,lokasi:e.l.value,mode:e.m.value},i=S.d.ekskul.findIndex(x=>x.id===id),prev=i<0?null:S.d.ekskul[i],
    row={...(prev||{id_pembina:'',id_pelatih:''}),id,nama_ekskul:nama,hari:r.hari,jam:r.jam,lokasi:r.lokasi,mode:r.mode};
  if(i<0)S.d.ekskul.push(row);else S.d.ekskul[i]=row;
  f.hidden=true;fillMore();renderAll();toast('Menyimpan ekskul…');
  send('saveEkskul',r,()=>{ // gagal: kembalikan tampilan dan buka lagi formnya agar tidak perlu mengetik ulang
    if(i<0)S.d.ekskul=S.d.ekskul.filter(x=>x.id!==id);else S.d.ekskul[i]=prev;
    fillMore();renderAll();f.hidden=false});
}
const flt=()=>S.d.siswa.filter(x=>(!S.kl||x.kelas===S.kl)&&(!S.qk||(x.nama+x.nisn).toLowerCase().includes(S.qk)));
function renderAng(){
  const d=S.d,e=d.ekskul.find(x=>x.id===S.mk),box=$('#fa');if(!e)return;
  const kl=[...new Set(d.siswa.map(x=>x.kelas).filter(Boolean))].sort(),L=flt(),q=S.qk;
  box.hidden=false;
  box.innerHTML=`<div class="ph"><h3>Anggota — ${esc(e.nama_ekskul)}</h3><button class="btn" data-act="atutup">Tutup</button></div>
  <div class="fg"><label>Cari siswa<input type="search" id="qa" placeholder="Nama atau NISN" autocomplete="off"></label><label>Kelas<select id="ka"><option value="">Semua kelas</option>${kl.map(k=>`<option${k===S.kl?' selected':''}>${esc(k)}</option>`).join('')}</select></label></div>
  <div class="bar" style="margin-top:12px"><b id="ac">${S.mem.size} anggota terpilih</b><div><button class="btn sm" data-act="apilih">Pilih semua hasil (${L.length})</button> <button class="btn sm" data-act="akosong">Kosongkan hasil</button></div></div>
  <div class="tw"><table><tbody>${L.slice(0,100).map(x=>`<tr><td width="44"><input type="checkbox" style="width:20px;height:20px" data-sid="${esc(x.id)}"${S.mem.has(x.id)?' checked':''} aria-label="Pilih ${esc(x.nama)}"></td><td>${esc(x.nama)}<small>NISN ${esc(x.nisn)}</small></td><td>${esc(x.kelas)}</td></tr>`).join('')||'<tr><td class="mu">Tidak ada siswa yang cocok.</td></tr>'}</tbody></table></div>
  ${L.length>100?`<small>Menampilkan 100 dari ${L.length} hasil. Persempit pencarian atau pilih kelas.</small>`:''}
  <p><button class="btn pri" data-act="asimpan">Simpan Anggota</button></p>`;
  return q;
}
function refAng(){const raw=($('#qa')||{}).value||'';renderAng();const i=$('#qa');if(i){i.value=raw;i.focus();i.setSelectionRange(raw.length,raw.length)}}
function simpanAng(){
  const ek=S.mk,ids=[...S.mem];
  S.d.anggota=S.d.anggota.filter(a=>a.e!==ek).concat(ids.map(s=>({e:ek,s})));
  $('#fa').hidden=true;renderAll();toast('Anggota disimpan ('+ids.length+' siswa)');queue('saveAnggota',{ekskul:ek,siswa:ids});
}

/* ── Anggota ekskul oleh pembina/pelatih: semua perubahan lewat kotak centang, disimpan sekali ── */
function renderMem(){
  const e=S.d.ekskul.find(x=>x.id===S.mk),box=$('#fm');if(!e)return;box.hidden=false;
  S.add=new Set();S.del=new Set();S.mr=[];S.pool={};
  box.innerHTML=`<div class="ph"><h3>Anggota — ${esc(e.nama_ekskul)}</h3><button class="btn" data-act="mclose">Tutup</button></div>
  <h4 style="margin:0 0 8px">Tambah anggota</h4>
  <div class="fg"><label>Cari nama atau NISN (minimal 3 huruf)<input type="search" id="qm" autocomplete="off" placeholder="mis. Ahmad"></label><label>Atau tampilkan siswa satu kelas<select id="kls"><option value="">Memuat daftar kelas…</option></select></label></div>
  <div class="bar" style="margin-top:8px"><small>Centang siswa yang akan ditambahkan. Tidak ada yang masuk otomatis.</small><div><button class="btn sm" data-act="mall">Centang semua yang tampil</button> <button class="btn sm" data-act="mnone">Hapus centang</button></div></div>
  <div id="mr" class="tw"></div>
  <h4 style="margin:16px 0 4px">Anggota saat ini <span id="mc"></span></h4>
  <small>Hapus centang pada siswa yang akan dikeluarkan.</small>
  <div class="tw"><table><tbody id="ml"></tbody></table></div>
  <div class="bar" style="margin-top:12px"><b id="mp"></b><div><button class="btn" data-act="mbatal">Batalkan perubahan</button> <button class="btn pri" data-act="msimpan">Simpan Perubahan</button></div></div>`;
  memList();memRes('Cari nama/NISN atau pilih kelas untuk menampilkan siswa.');memPend();loadKls();
}
async function loadKls(){
  if(!S.kls){try{const r=await gs('daftarKelas',S.t);if(r.message==='SESI')return out(1);S.kls=r.success?r.data:[]}catch(e){S.kls=[]}}
  const s=$('#kls');if(s)s.innerHTML='<option value="">— pilih kelas —</option>'+S.kls.map(k=>`<option value="${esc(k.k)}">${esc(k.k)} (${k.n} siswa)</option>`).join('');
}
const isMem=id=>S.d.anggota.some(a=>a.e===S.mk&&a.s===id);
function memPend(){$('#mp').textContent='Akan ditambahkan: '+S.add.size+' · Akan dikeluarkan: '+S.del.size}
function memList(){
  const L=S.d.anggota.filter(a=>a.e===S.mk).map(a=>S.map[a.s]).filter(Boolean).sort((a,b)=>a.nama.localeCompare(b.nama));
  $('#mc').textContent='('+L.length+')';
  $('#ml').innerHTML=L.map(x=>`<tr${S.del.has(x.id)?' style="opacity:.5"':''}><td width="44"><input type="checkbox" style="width:20px;height:20px" data-mc="del" data-id="${esc(x.id)}"${S.del.has(x.id)?'':' checked'} aria-label="Anggota ${esc(x.nama)}"></td><td>${esc(x.nama)}<small>NISN ${esc(x.nisn)}</small></td><td>${esc(x.kelas)}</td></tr>`).join('')||'<tr><td colspan="3" class="mu">Belum ada anggota.</td></tr>';
}
function memRes(msg){
  const m=msg||(S.mr.length?'':'Tidak ada siswa yang cocok.');
  $('#mr').innerHTML=m?`<p class="mu">${esc(m)}</p>`:`<table><tbody>${S.mr.map(x=>`<tr><td width="44">${isMem(x.id)?'':`<input type="checkbox" style="width:20px;height:20px" data-mc="add" data-id="${esc(x.id)}"${S.add.has(x.id)?' checked':''} aria-label="Tambah ${esc(x.nama)}">`}</td><td>${esc(x.nama)}<small>NISN ••••${esc(x.n4)}</small></td><td>${esc(x.kelas)} ${isMem(x.id)?'<span class="pill ok">Sudah anggota</span>':''}</td></tr>`).join('')}</tbody></table>`;
}
async function tampilSiswa(fn,arg,ok){
  memRes('Memuat…');
  try{const r=await gs(fn,S.t,arg);
    if(!ok())return;
    if(r.message==='SESI')return out(1);
    if(!r.success){S.mr=[];return memRes(r.message)}
    S.mr=r.data;r.data.forEach(x=>S.pool[x.id]=x);memRes();
  }catch(e){S.mr=[];memRes('Gagal memuat. Periksa koneksi lalu coba lagi.')}
}
function cari(v){
  if(v.length<3){S.mr=[];return memRes(v?'Ketik minimal 3 huruf.':'Cari nama/NISN atau pilih kelas untuk menampilkan siswa.')}
  $('#kls').value='';tampilSiswa('cariSiswa',v,()=>$('#qm')&&$('#qm').value.trim()===v);
}
function lihatKelas(k){
  if(!k){S.mr=[];return memRes('Cari nama/NISN atau pilih kelas untuk menampilkan siswa.')}
  $('#qm').value='';tampilSiswa('siswaKelas',{kelas:k},()=>$('#kls')&&$('#kls').value===k);
}
function simpanMem(){
  const tam=[...S.add],hap=[...S.del];
  if(!tam.length&&!hap.length)return toast('Belum ada perubahan untuk disimpan','err');
  if(tam.length>200||hap.length>200)return toast('Maksimal 200 siswa sekali simpan','err');
  tam.forEach(id=>{const x=S.pool[id];if(!x)return;if(!S.map[id]){const r={id,nama:x.nama,kelas:x.kelas,nisn:'••••'+x.n4};S.d.siswa.push(r);S.map[id]=r}if(!isMem(id))S.d.anggota.push({e:S.mk,s:id})});
  hap.forEach(id=>{S.d.anggota=S.d.anggota.filter(a=>!(a.e===S.mk&&a.s===id));if(!S.d.anggota.some(a=>a.s===id)){S.d.siswa=S.d.siswa.filter(x=>x.id!==id);delete S.map[id]}});
  S.add.clear();S.del.clear();memList();memRes(S.mr.length?'':'Cari nama/NISN atau pilih kelas untuk menampilkan siswa.');memPend();renderEks();
  toast((tam.length?tam.length+' ditambahkan':'')+(tam.length&&hap.length?', ':'')+(hap.length?hap.length+' dikeluarkan':''));
  queue('ubahAnggota',{ekskul:S.mk,tambah:tam,hapus:hap});
}

/* ── Form presensi (baru & perbaikan memakai form yang sama) ── */
function formPres(o){
  const e=S.d.ekskul.find(x=>x.id===o.ekskul);if(!e)return;
  const pt=e.mode==='petugas',hr=pt?hariDari(o.tgl):'',asalM=m=>m.asal!==undefined?m.asal:(m.a!==undefined?m.a:asalTxt(m.id));
  const pool=pt?S.d.anggota.filter(a=>a.e===e.id&&!o.rows.some(r=>r.id===a.s)).map(a=>S.map[a.s]).filter(Boolean).sort(urutNama):[];
  S.ek=o.ekskul;S.ed=o.id||null;S.att={};S.prow=o.rows;S.pctx={judul:o.judul,ke:o.ke,id:o.id,materi:o.materi,pelatih:o.pelatih};o.rows.forEach(m=>S.att[m.id]=m.st||'hadir');
  $('#pf').innerHTML=`<div class="card"><div class="ph"><h3>${esc(o.judul)} — ${esc(e.nama_ekskul)}</h3><button class="btn" data-act="closepres">Tutup</button></div>
  <div class="fg"><label>Tanggal<input type="date" id="pd" value="${esc(o.tgl)}"></label>${e.mode==='petugas'?`<input type="hidden" id="pk" value="${esc(o.ke)}"><input type="hidden" id="pm" value=""><input type="checkbox" id="pp" hidden><p class="mu" style="align-self:end;margin:0">Kegiatan harian: catat kehadiran petugas saja. ${adaJadwal(e.id)?`Hari <b>${esc(hr)}</b>: ${o.rows.filter(r=>!r.pengganti).length} petugas terjadwal.`:`Jadwal petugas belum disusun, daftar memuat semua anggota. <button type=\"button\" class=\"btn sm\" data-act=\"jadwal\" data-id=\"${esc(e.id)}\">Susun jadwal</button>`}</p>`:`<label>Pertemuan ke<input type="number" id="pk" min="1" value="${esc(o.ke)}"></label><label>Materi / agenda<input id="pm" maxlength="150" value="${esc(o.materi||'')}"></label><label class="chk"><input type="checkbox" id="pp"${o.pelatih?' checked':''}>Pelatih hadir</label>`}</div>
  <div class="bar" style="margin-top:12px"><b>${e.mode==='petugas'?'Kehadiran Petugas':'Daftar Kehadiran'} (${o.rows.length})</b>${o.id?'':'<button class="btn" data-act="markall">Tandai semua hadir</button>'}</div>
  ${pt&&pool.length?`<div class="bar" style="margin:8px 0"><select id="pgn" aria-label="Petugas pengganti"><option value="">Tambah petugas pengganti…</option>${pool.map(m=>`<option value="${esc(m.id)}">${esc(m.nama)} (${esc(m.kelas)})</option>`).join('')}</select><button type="button" class="btn" data-act="pengganti">Tambahkan</button></div>`:''}
  <div class="tw"><table><thead><tr><th>No</th><th>${pt?'Petugas':'Siswa'}</th><th>Kelas</th>${pt?'<th>Asal ekskul</th>':''}<th>Status</th><th>Catatan</th></tr></thead><tbody>${o.rows.map((m,i)=>`<tr data-s="${esc(m.id)}"><td>${i+1}</td><td>${esc(m.nama)}<small>NISN ${esc(m.nisn)}</small></td><td>${esc(m.kelas)}</td>${pt?`<td class="asal">${asalM(m)?esc(asalM(m)):'<span class="mu">Belum diisi</span>'}</td>`:''}<td><div class="seg">${['hadir','izin','sakit','alpa'].map(v=>`<button type="button" data-act="mark" data-v="${v}" class="${v}${(m.st||'hadir')===v?' on':''}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></td><td><input data-n maxlength="100" value="${esc(m.n||'')}" aria-label="Catatan ${esc(m.nama)}"></td></tr>`).join('')}</tbody></table></div>
  ${o.rows.length?'':`<p class="mu" role="status">${pt?'Belum ada petugas yang dijadwalkan pada hari '+esc(hr)+'. Atur jadwal, atau tambahkan petugas pengganti.':'Belum ada anggota.'}</p>`}
  <div id="ps" class="sum"></div><button class="btn pri" data-act="savepres">${o.id?'Simpan Perbaikan':'Simpan Kehadiran'}</button></div>`;
  sum();$('#pf').scrollIntoView({behavior:'smooth',block:'start'});
}
function openPres(id){
  const hi=isPetugas(id)&&pertemuanHariIni(id);
  if(hi){toast('Kehadiran hari ini sudah diisi. Membuka untuk diperbaiki.');return editPres(hi.id)}
  const d=S.d,ms=d.anggota.filter(a=>a.e===id).map(a=>S.map[a.s]).filter(Boolean);
  formPres({ekskul:id,judul:'Form Presensi',tgl:iso(new Date()),ke:d.pertemuan.filter(x=>x.e===id).length+1,materi:'',pelatih:true,rows:isPetugas(id)?petugasRows(id,iso(new Date())):ms.map(m=>({...m,st:'hadir',n:''}))});
}
async function editPres(id,btn){
  btn&&btn.classList.add('load');
  try{const r=await gs('getPresensi',S.t,{id});
    if(r.message==='SESI'){btn&&btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const d=r.data;formPres({id:d.id,ekskul:d.ekskul,judul:'Perbaiki Presensi',tgl:d.tgl,ke:d.ke,materi:d.materi,pelatih:d.pelatih,rows:d.baris})}
  }catch(e){toast('Gagal memuat data pertemuan. Coba lagi.','err')}
  btn&&btn.classList.remove('load');
}
function updPres(){
  const id=S.ed,tg=$('#pd').value,x=S.d.pertemuan.find(p=>p.id===id);if(!x)return;
  if(!tg)return toast('Isi tanggal pertemuan','err');
  if(S.d.pertemuan.some(p=>p.e===x.e&&p.tgl===tg&&p.id!==id))return toast('Sudah ada pertemuan lain pada tanggal itu','err');
  const baris=$$('#pf tr[data-s]').map(tr=>({s:tr.dataset.s,st:S.att[tr.dataset.s],n:$('[data-n]',tr).value})),c={H:0,I:0,S:0,A:0},K={hadir:'H',izin:'I',sakit:'S',alpa:'A'};
  baris.forEach(b=>c[K[b.st]]++);
  const p={id,tanggal:tg,ke:+$('#pk').value||x.ke,materi:$('#pm').value,pelatih:$('#pp').checked,baris};
  Object.assign(x,{tgl:tg,ke:p.ke,materi:p.materi,c});S.d.pertemuan.sort((a,b)=>a.tgl<b.tgl?1:-1);
  $('#pf').innerHTML='';S.ed=null;renderAll();toast('Perbaikan disimpan');queue('updatePresensi',p);
}
function delPres(e){
  two(e,'Yakin hapus?',()=>{const id=e.dataset.id;
    S.d.pertemuan=S.d.pertemuan.filter(p=>p.id!==id);if(S.ed===id){$('#pf').innerHTML='';S.ed=null}
    renderAll();toast('Riwayat kehadiran dihapus');queue('hapusPertemuan',{id})});
}
function riwayatFilter(){const k=($('#hk')||{}).value||'',a=($('#hd')||{}).value||'',b=($('#hs')||{}).value||'';return S.d.pertemuan.filter(x=>(!k||x.e===k)&&(!a||x.tgl>=a)&&(!b||x.tgl<=b))}
function renderRiwayat(){
  const d=S.d,adm=d.user.peran==='kesiswaan',L=riwayatFilter(),en=id=>(d.ekskul.find(e=>e.id===id)||{}).nama_ekskul||'';
  const pages=Math.max(1,Math.ceil(L.length/10)),c=S.pgx.rw=Math.min(S.pgx.rw,pages);
  $('#rw').innerHTML=L.slice((c-1)*10,c*10).map(x=>`<tr><td>${esc(x.tgl)}</td><td>${esc(en(x.e))}</td><td>${isPetugas(x.e)?'Harian':'Ke-'+esc(x.ke)}${x.materi?`<small>${esc(x.materi)}</small>`:''}</td><td>${x.c.H}/${tot(x.c)} <span class="pill ok">${tot(x.c)?Math.round(x.c.H*100/tot(x.c)):0}%</span></td><td><button class="btn sm" data-act="rwxl" data-id="${esc(x.id)}">Unduh</button> <button class="btn sm" data-act="rwedit" data-id="${esc(x.id)}">Perbaiki</button>${adm?` <button class="btn sm" data-act="rwpindah" data-id="${esc(x.id)}">Pindahkan</button> <button class="btn sm" data-act="rwdel" data-id="${esc(x.id)}">Hapus</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5" class="mu">Belum ada riwayat pada filter ini.</td></tr>';
  $('#rwp').innerHTML=pgb('rw',c,pages,L.length);
}
function dlgPindah(id){
  const x=S.d.pertemuan.find(p=>p.id===id);if(!x)return;const en=i=>(S.d.ekskul.find(e=>e.id===i)||{}).nama_ekskul||i;
  S.dx={pindah:id};$('#dt').textContent='Pindahkan catatan kehadiran';
  $('#db').innerHTML=`<p>Catatan kehadiran tanggal <b>${esc(x.tgl)}</b> saat ini tercatat di <b>${esc(en(x.e))}</b>. Pindahkan ke:</p><label>Kegiatan tujuan<select id="pdt">${S.d.ekskul.filter(e=>e.id!==x.e).map(e=>`<option value="${esc(e.id)}">${esc(e.nama_ekskul)}</option>`).join('')}</select></label><p class="mu">Daftar kehadiran ikut berpindah apa adanya; pastikan siswa yang tercatat memang peserta kegiatan tujuan. Bila kegiatan tujuan sudah punya catatan pada tanggal itu, pemindahan ditolak.</p>`;
  $('#dok').textContent='Pindahkan';$('#dok').disabled=false;$('#dm').showModal();
}
async function pindahKirim(btn){
  const id=S.dx.pindah,tujuan=($('#pdt')||{}).value;if(!tujuan)return;btn.classList.add('load');
  try{const r=await gs('pindahkanPertemuan',S.t,{id,tujuan});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const x=S.d.pertemuan.find(p=>p.id===id);if(x){x.e=tujuan;if(r.data.ke)x.ke=r.data.ke}$('#dm').close();renderAll();toast('Catatan kehadiran dipindahkan');refresh()}
  }catch(e){toast(pesanGagal(e),'err')}
  btn.classList.remove('load');
}
async function unduhPertemuan(id,btn){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  btn.classList.add('load');
  try{const r=await gs('getPresensi',S.t,{id});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{
      const d=r.data,e=S.d.ekskul.find(x=>x.id===d.ekskul)||{nama_ekskul:'Ekskul'},c={hadir:0,izin:0,sakit:0,alpa:0},cap=v=>v?v[0].toUpperCase()+v.slice(1):'';
      d.baris.forEach(b=>{if(c[b.st]!==undefined)c[b.st]++});
      const ws=XLSX.utils.aoa_to_sheet([['Daftar Hadir Ekstrakurikuler'],['Ekskul',e.nama_ekskul],['Tanggal',d.tgl],...(e.mode==='petugas'?[['Jenis','Kegiatan harian (kehadiran petugas)']]:[['Pertemuan ke',d.ke],['Materi',d.materi||'-'],['Pelatih',d.pelatih?'Hadir':'Tidak hadir']]),[],
        e.mode==='petugas'?['No','NISN','Nama','Kelas','Asal Ekskul','Status','Catatan']:['No','NISN','Nama','Kelas','Status','Catatan'],...d.baris.map((b,i)=>e.mode==='petugas'?[i+1,b.nisn,b.nama,b.kelas,b.a||'-',cap(b.st),b.n||'']:[i+1,b.nisn,b.nama,b.kelas,cap(b.st),b.n||'']),[],
        ['Ringkasan'],['Hadir',c.hadir],['Izin',c.izin],['Sakit',c.sakit],['Alpa',c.alpa],['Total',d.baris.length]]);
      ws['!cols']=[{wch:14},{wch:14},{wch:30},{wch:12},{wch:10},{wch:34}];
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Daftar Hadir');
      saveWb(wb,('Presensi_'+e.nama_ekskul+'_'+d.tgl+(e.mode==='petugas'?'':'_Pertemuan-'+d.ke)+'.xlsx').replace(/[^\w.\-]+/g,'_'));
      toast('File Excel pertemuan diunduh');
    }
  }catch(e){toast('Gagal menyiapkan file. Coba lagi.','err')}
  btn.classList.remove('load');
}

async function unduhRiwayat(btn){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  btn.classList.add('load');toast('Menyiapkan file Excel…');
  try{const r=await gs('riwayatExcel',S.t,{ekskul:$('#hk').value,dari:$('#hd').value,sampai:$('#hs').value});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const x=r.data,wb=XLSX.utils.book_new(),sh=(o)=>XLSX.utils.aoa_to_sheet([o.kolom,...o.baris]);
      if(!x.detail.baris.length)toast('Tidak ada data pada filter ini','err');
      else{XLSX.utils.book_append_sheet(wb,sh(x.ringkas),'Rekap per Pertemuan');XLSX.utils.book_append_sheet(wb,sh(x.detail),'Detail Kehadiran');
        saveWb(wb,'Riwayat_Kehadiran_Ekskul_'+iso(new Date())+'.xlsx');toast('File Excel diunduh ('+x.ringkas.baris.length+' pertemuan)')}}
  }catch(e){toast('Gagal menyiapkan file. Coba lagi.','err')}
  btn.classList.remove('load');
}

/* ── Hapus akun pembina/pelatih permanen ── */
function confirmHapusAkun(u){
  S.dx={akun:u.id};$('#dt').textContent='Hapus akun permanen';
  $('#db').innerHTML=`<p>Hapus akun <b>${esc(u.nm)}</b> (<code>${esc(u.u)}</code>${u.r?', '+esc(ROLE[u.r]||u.r):', belum ada peran'}) dari aplikasi?</p>
  <ul><li>Akun langsung tidak bisa masuk lagi.</li><li>Data yang pernah dicatat akun ini (presensi, pelanggaran, dan lain-lain) <b>tetap tersimpan</b>.</li><li>Tindakan ini tidak bisa dibatalkan.</li></ul>
  <p class="mu">Jika hanya berhenti sementara, gunakan <b>Nonaktifkan</b> agar akunnya bisa dipakai lagi.</p>`;
  $('#dok').disabled=false;$('#dm').showModal();
}
async function hapusAkunKirim(btn){
  const id=S.dx.akun;btn.classList.add('load');
  try{const r=await gs('hapusAkun',S.t,{id});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{S.d.users=S.d.users.filter(x=>x.id!==id);$('#dm').close();renderUsr();toast('Akun dihapus permanen');refresh()}
  }catch(e){toast('Gagal menghapus. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}

/* ── Hapus siswa permanen ── */
function confirmDel(x,k){
  const tot=k.hadir+k.pelanggaran+k.terlambat+k.prestasi;S.dx={id:x.id,semua:tot>0};
  $('#dt').textContent='Hapus siswa permanen';
  $('#db').innerHTML=`<p>Hapus <b>${esc(x.nama)}</b> (NISN ${esc(x.nisn)}) dari aplikasi?</p>`+(tot>0
    ?`<p>Catatan yang <b>ikut terhapus permanen</b> dan tidak bisa dikembalikan:</p><ul><li>${k.hadir} catatan kehadiran ekskul</li><li>${k.pelanggaran} pelanggaran</li><li>${k.terlambat} keterlambatan</li><li>${k.prestasi} prestasi (sertifikat dipindah ke Sampah Drive)</li><li>${k.ekskul} keanggotaan ekskul</li></ul>
      <p class="mu">Jika siswa hanya pindah atau lulus, pakai <b>Nonaktifkan</b> agar riwayatnya tetap tersimpan.</p>
      <label class="chk" style="height:auto;margin:8px 0 0"><input type="checkbox" id="dc">Saya mengerti, hapus siswa beserta seluruh catatannya</label>`
    :`<p class="mu">Siswa ini belum punya catatan kehadiran, pelanggaran, keterlambatan, maupun prestasi${k.ekskul?`, dan akan dikeluarkan dari ${k.ekskul} ekskul`:''}.</p>`);
  $('#dok').disabled=tot>0;$('#dm').showModal();
}
async function hapusSis(btn){
  if(S.dx&&S.dx.pindah)return pindahKirim(btn);
  if(S.dx&&S.dx.sandi)return resetSandiKirim(btn);
  if(S.dx&&S.dx.pdel)return hapusPresKirim(btn);
  if(S.dx&&S.dx.tolak)return tolakPresKirim(btn);
  if(S.dx&&S.dx.akun)return hapusAkunKirim(btn);
  if(S.dx&&S.dx.cat)return hapusCat(btn); // hapus catatan pelanggaran/keterlambatan memakai dialog yang sama
  btn.classList.add('load');
  try{const r=await gs('hapusSiswa',S.t,S.dx);
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const id=S.dx.id;$('#dm').close();
      S.d.siswa=S.d.siswa.filter(x=>x.id!==id);S.d.anggota=S.d.anggota.filter(a=>a.s!==id);
      ['pel','terl'].forEach(k=>{if(S.d[k])S.d[k]=S.d[k].filter(x=>x.s!==id)});if(S.d.pres)S.d.pres=S.d.pres.filter(x=>x.s!==id);
      S.d.total--;reidx();renderAll();toast('Siswa dihapus');refresh()}
  }catch(e){toast('Gagal menghapus. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}

/* ── Nilai ekskul (A/B/C/D): pilihan lewat daftar tarik-turun; ekspor & impor Excel ── */
const GRADE=['A','B','C','D'],GCLS={A:'nA',B:'nB',C:'nC',D:'nD'};
function periodes(){ // semester berjalan + 3 sebelumnya (Ganjil: Jul–Des, Genap: Jan–Jun)
  const d=new Date(),y=d.getFullYear(),m=d.getMonth()+1,out=[];let ta=m>=7?y:y-1,gj=m>=7;
  for(let i=0;i<4;i++){out.push(`${ta}/${ta+1} ${gj?'Ganjil':'Genap'}`);if(gj){gj=false;ta--}else gj=true}
  return out;
}
const nNorm=s=>String(s==null?'':s).replace(/\D/g,'').replace(/^0+/,''); // NISN dari Excel sering kehilangan angka 0 di depan
const nEks=()=>[...S.d.ekskul.filter(e=>e.mode!=='petugas'),...(['kesiswaan','tahfidz'].includes(S.d.user.peran)?[{id:'TAHFIDZ',nama_ekskul:'Tahfidz (ekskul wajib)'}]:[])];
function nMembers(){const nv=S.nv; // Tahfidz: seluruh siswa aktif (boleh dipersempit per kelas)
  if(nv.ek==='TAHFIDZ')return S.d.siswa.filter(x=>!nv.kl||x.kelas===nv.kl).slice().sort((a,b)=>a.nama.localeCompare(b.nama));
  return S.d.anggota.filter(a=>a.e===nv.ek).map(a=>S.map[a.s]).filter(Boolean).sort((a,b)=>a.nama.localeCompare(b.nama))}
function nSaved(sid){return(S.d.nilai||[]).find(x=>x.e===S.nv.ek&&x.s===sid&&x.p===S.nv.per)}
function nilaiNow(sid){const ed=S.nv.edits[sid],ex=nSaved(sid);return{n:ed?ed.n:(ex?ex.n:''),c:ed?ed.c:(ex?ex.c||'':'')}}
function nSync(sid){const ex=nSaved(sid),e=S.nv.edits[sid];if(e&&e.n===(ex?ex.n:'')&&e.c===(ex?ex.c||'':''))delete S.nv.edits[sid]}
function nMeta(){
  const cnt={A:0,B:0,C:0,D:0,'':0};nMembers().forEach(m=>cnt[nilaiNow(m.id).n]++);
  $('#nsum').innerHTML=GRADE.map(g=>`<span class="pill ${{A:'ok',B:'in',C:'wn',D:'er'}[g]}">${g}: ${cnt[g]}</span>`).join('')+`<span class="pill" style="background:var(--th);color:var(--mu)">Belum dinilai: ${cnt['']}</span>`;
  const n=Object.keys(S.nv.edits).length;$('#nmod').textContent=n?n+' perubahan belum disimpan':'Semua perubahan tersimpan';
}
function renderNilai(){
  const d=S.d;if(!$('#nk'))return;S.nv=S.nv||{ek:'',per:'',edits:{}};const nv=S.nv;
  if(!(d.siswa||[]).length&&!(d.ekskul||[]).length)return; // kerangka login: data belum tiba, jangan menetapkan pilihan bawaan
  if(!nEks().find(e=>e.id===nv.ek))nv.ek=(nEks()[0]||{}).id||'';
  const P=periodes();if(!P.includes(nv.per))nv.per=P[0];
  $('#nk').innerHTML=nEks().map(e=>`<option value="${esc(e.id)}"${e.id===nv.ek?' selected':''}>${esc(e.nama_ekskul)}</option>`).join('')||'<option value="">Belum ada ekskul</option>';
  $('#np2').innerHTML=P.map(p=>`<option${p===nv.per?' selected':''}>${esc(p)}</option>`).join('');
  const th=nv.ek==='TAHFIDZ',kls=[...new Set((d.siswa||[]).map(x=>x.kelas).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'id',{numeric:true}));
  $('#nkl').hidden=!th;if(th){if(nv.kl===undefined)nv.kl=kls[0]||'';$('#nkls').innerHTML='<option value="">Semua kelas</option>'+kls.map(k=>`<option${k===nv.kl?' selected':''}>${esc(k)}</option>`).join('')}
  const ML=nMembers(),NPG=30,npages=Math.max(1,Math.ceil(ML.length/NPG)),nc=S.pgx.nl=Math.min(S.pgx.nl||1,npages),off=(nc-1)*NPG;
  $('#nb').innerHTML=ML.slice(off,off+NPG).map((m,k)=>{const i=off+k,v=nilaiNow(m.id);
    return`<tr data-s="${esc(m.id)}"${nv.edits[m.id]?' style="background:var(--sub)"':''}><td>${i+1}</td><td>${esc(m.nama)}<small>NISN ${esc(m.nisn)}</small></td><td>${esc(m.kelas)}</td><td><select data-ns="${esc(m.id)}" class="${GCLS[v.n]||''}" aria-label="Nilai ${esc(m.nama)}"><option value="">— pilih —</option>${GRADE.map(g=>`<option${v.n===g?' selected':''}>${g}</option>`).join('')}</select></td><td><input data-nc="${esc(m.id)}" maxlength="100" value="${esc(v.c)}" placeholder="Catatan (opsional)" aria-label="Catatan ${esc(m.nama)}"></td></tr>`}).join('')||`<tr><td colspan="5" class="mu">${th?'Tidak ada siswa pada pilihan kelas ini.':'Ekskul ini belum punya anggota. Tambahkan lewat menu Kelola Anggota.'}</td></tr>`;
  $('#nbp').innerHTML=ML.length>NPG?pgb('nl',nc,npages,ML.length):'';
  nMeta();
}
function nPilih(sel){ // tanpa membangun ulang tabel agar posisi layar tidak bergeser
  const nv=S.nv,id=sel.dataset.ns,cur=nilaiNow(id);nv.edits[id]={n:sel.value,c:cur.c};nSync(id);
  sel.className=GCLS[sel.value]||'';sel.closest('tr').style.background=nv.edits[id]?'var(--sub)':'';nMeta();
}
function nCatatan(id,v){const cur=nilaiNow(id);S.nv.edits[id]={n:cur.n,c:v};nSync(id);const tr=$(`#nb tr[data-s="${CSS.escape(id)}"]`);if(tr)tr.style.background=S.nv.edits[id]?'var(--sub)':'';nMeta()}
function nSimpan(){
  const nv=S.nv,baris=Object.keys(nv.edits).map(s=>({s,n:nv.edits[s].n,c:nv.edits[s].c}));
  if(!baris.length)return toast('Belum ada perubahan untuk disimpan','err');
  S.d.nilai=S.d.nilai||[];
  baris.forEach(b=>{const i=S.d.nilai.findIndex(x=>x.e===nv.ek&&x.s===b.s&&x.p===nv.per);
    if(!b.n){if(i>=0)S.d.nilai.splice(i,1)}else if(i>=0)Object.assign(S.d.nilai[i],{n:b.n,c:b.c});else S.d.nilai.push({e:nv.ek,s:b.s,p:nv.per,n:b.n,c:b.c})});
  nv.edits={};$('#nimp').innerHTML='';renderNilai();toast('Nilai disimpan ('+baris.length+' siswa)');
  queue('saveNilai',{ekskul:nv.ek,periode:nv.per,baris});
}
function nUnduh(){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const nv=S.nv,e=nEks().find(x=>x.id===nv.ek);if(!e)return;
  const rows=nMembers().map((m,i)=>{const v=nilaiNow(m.id);return[i+1,m.nisn,m.nama,m.kelas,v.n,v.c]});
  const ws=XLSX.utils.aoa_to_sheet([['Nilai Ekstrakurikuler'],['Ekskul',e.nama_ekskul],['Periode',nv.per],['Petunjuk','Isi kolom Nilai dengan A, B, C, atau D. Jangan ubah kolom NISN, Ekskul, dan Periode.'],[],['No','NISN','Nama','Kelas','Nilai','Catatan'],...rows]);
  ws['!cols']=[{wch:6},{wch:14},{wch:30},{wch:12},{wch:10},{wch:34}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Nilai');
  saveWb(wb,('Nilai_'+e.nama_ekskul+'_'+nv.per+(nv.ek==='TAHFIDZ'&&nv.kl?'_'+nv.kl:'')+'.xlsx').replace(/[^\w.\-]+/g,'_'));toast('File Excel nilai diunduh');
}
/* Impor: hanya mengisi tabel (belum menyimpan) agar bisa diperiksa dulu; baris bermasalah dilewati dan dilaporkan */
function nImpor(file){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  if(file.size>2*1048576)return toast('Berkas terlalu besar (maksimal 2 MB)','err');
  const rd=new FileReader();
  rd.onerror=()=>toast('Gagal membaca berkas','err');
  rd.onload=()=>{
    let A;
    try{const wb=XLSX.read(new Uint8Array(rd.result),{type:'array',cellFormula:false,cellHTML:false,cellStyles:false,sheetRows:2000});
      A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false,blankrows:false})}
    catch(e){return toast('Berkas Excel tidak dapat dibaca','err')}
    const nv=S.nv,ek=nEks().find(x=>x.id===nv.ek),low=v=>String(v==null?'':v).trim().toLowerCase(),fail=m=>{$('#nimp').innerHTML=`<span style="color:var(--er)">${esc(m)}</span>`;toast(m,'err')};
    const meta={};A.slice(0,12).forEach(r=>{const k=low(r[0]);if(k==='ekskul'||k==='periode')meta[k]=String(r[1]||'').trim()});
    if(meta.periode&&meta.periode!==nv.per)return fail(`Berkas ini untuk periode ${meta.periode}, sedangkan yang dipilih ${nv.per}. Ganti periode lalu impor ulang.`);
    if(meta.ekskul&&ek&&meta.ekskul.toLowerCase()!==ek.nama_ekskul.toLowerCase())return fail(`Berkas ini untuk ekskul ${meta.ekskul}, sedangkan yang dipilih ${ek.nama_ekskul}.`);
    const hi=A.findIndex(r=>r.some(c=>low(c)==='nilai'));
    if(hi<0)return fail('Kolom "Nilai" tidak ditemukan. Gunakan berkas hasil Unduh Excel.');
    const H=A[hi].map(low),ci={nisn:H.indexOf('nisn'),nama:H.indexOf('nama'),nilai:H.indexOf('nilai'),cat:H.indexOf('catatan')};
    if(ci.nisn<0&&ci.nama<0)return fail('Kolom "NISN" atau "Nama" tidak ditemukan.');
    const ms=nMembers(),byN={},byName={};ms.forEach(m=>{if(nNorm(m.nisn))byN[nNorm(m.nisn)]=m;byName[low(m.nama)]=m});
    let baca=0,ubah=0;const bad=[];
    A.slice(hi+1).forEach((r,i)=>{
      const row=hi+2+i,nis=ci.nisn>=0?nNorm(r[ci.nisn]):'',nm=ci.nama>=0?low(r[ci.nama]):'';
      if(!nis&&!nm)return;
      const g=String(r[ci.nilai]==null?'':r[ci.nilai]).trim().toUpperCase();
      if(g===''||g==='-')return; // kosong = tidak diubah
      const m=nis?byN[nis]:byName[nm],label=String(ci.nama>=0&&r[ci.nama]||r[ci.nisn]||'').trim();
      if(!m){bad.push(`Baris ${row}: ${label||'siswa'} ${nv.ek==='TAHFIDZ'?'tidak ada di kelas yang dipilih':'bukan anggota ekskul ini'}`);return}
      if(!GRADE.includes(g)){bad.push(`Baris ${row}: nilai "${g.slice(0,10)}" untuk ${label} tidak valid (harus A, B, C, atau D)`);return}
      const cur=nilaiNow(m.id),cat=ci.cat>=0?String(r[ci.cat]==null?'':r[ci.cat]).trim().slice(0,100):cur.c;
      baca++;nv.edits[m.id]={n:g,c:cat};nSync(m.id);if(nv.edits[m.id])ubah++;
    });
    renderNilai();
    $('#nimp').innerHTML=`<b>Impor Excel:</b> ${baca} nilai terbaca, ${ubah} berubah. <b>Periksa tabel, lalu klik Simpan Nilai.</b>`+(bad.length?`<br><span style="color:var(--er)">${bad.length} baris dilewati:</span><br>${bad.slice(0,6).map(esc).join('<br>')}${bad.length>6?'<br>…':''}`:'');
    toast(ubah?ubah+' nilai diisi dari Excel (belum disimpan)':(baca?'Tidak ada nilai yang berubah':'Tidak ada nilai yang bisa dibaca'),ubah?'':'err');
  };
  rd.readAsArrayBuffer(file);
}

/* ── Impor akun dari Excel: hanya Nama Lengkap & Nama Pengguna. Peran/ekskul dipilih sesudahnya di tabel; kata sandi awal sama untuk semua (dari server) ── */
function uTemplat(){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const ws=XLSX.utils.aoa_to_sheet([['Impor Akun Pembina & Pelatih'],['Petunjuk','Isi Nama Lengkap dan Nama Pengguna (3–30 huruf kecil/angka/titik/strip, tanpa spasi). Peran dan ekskul dipilih sesudah diimpor, di tabel akun. Kata sandi awal sama untuk semua akun dan ditampilkan setelah impor. Nama pengguna yang sudah ada akan dilewati.'],[],['Nama Lengkap','Nama Pengguna']]);
  ws['!cols']=[{wch:32},{wch:24}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Akun');
  saveWb(wb,'Templat_Impor_Akun_Pembina_Pelatih.xlsx');toast('Templat diunduh');
}
function uImpor(file){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  if(file.size>2*1048576)return toast('Berkas terlalu besar (maksimal 2 MB)','err');
  const rd=new FileReader();rd.onerror=()=>toast('Gagal membaca berkas','err');
  rd.onload=()=>{
    let A;
    try{const wb=XLSX.read(new Uint8Array(rd.result),{type:'array',cellFormula:false,cellHTML:false,cellStyles:false,sheetRows:1000});
      A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false,blankrows:false})}
    catch(e){return toast('Berkas Excel tidak dapat dibaca','err')}
    const low=v=>String(v==null?'':v).trim().toLowerCase(),hi=A.findIndex(r=>r.some(c=>['nama pengguna','username'].includes(low(c))));
    if(hi<0)return toast('Kolom "Nama Pengguna" tidak ditemukan. Gunakan templat dari tombol Unduh Templat.','err');
    const H=A[hi].map(low),col=(...n)=>H.findIndex(h=>n.includes(h)),ci={nm:col('nama lengkap','nama'),u:col('nama pengguna','username')};
    if(ci.nm<0)return toast('Kolom "Nama Lengkap" tidak ditemukan.','err');
    const have=new Set(S.d.users.map(x=>x.u)),seen=new Set(),items=[];
    A.slice(hi+1).forEach((r,i)=>{ // kolom lain (peran, ekskul, kata sandi) sengaja diabaikan
      const cell=k=>String(r[k]==null?'':r[k]).trim(),it={baris:hi+2+i,nm:cell(ci.nm),u:cell(ci.u).toLowerCase()};
      if(!it.nm&&!it.u)return;
      it.err=!it.nm?'Nama lengkap kosong':!/^[a-z0-9._-]{3,30}$/.test(it.u)?'Nama pengguna tidak valid':(have.has(it.u)||seen.has(it.u))?'Nama pengguna sudah dipakai':'';
      if(!it.err)seen.add(it.u);items.push(it);
    });
    if(!items.length)return toast('Tidak ada baris data yang terbaca','err');
    if(items.length>200)return toast('Maksimal 200 akun sekali impor','err');
    S.uprev=items;S.ares=null;renderUPrev();
  };
  rd.readAsArrayBuffer(file);
}
function renderUPrev(){
  const it=S.uprev,ok=it.filter(x=>!x.err),box=$('#uimpbox'),bad=it.length-ok.length;
  box.innerHTML=`<div class="card"><div class="ph"><h3>Pratinjau impor akun</h3><button class="btn" data-act="ututup">Batal</button></div>
  <p><span class="pill ok">${ok.length} siap diimpor</span> <span class="pill ${bad?'er':''}" style="${bad?'':'background:var(--th);color:var(--mu)'}">${bad} bermasalah (dilewati)</span></p>
  <div class="tw"><table><thead><tr><th>Baris</th><th>Nama lengkap</th><th>Nama pengguna</th><th>Status</th></tr></thead><tbody>${it.map(x=>`<tr><td>${x.baris}</td><td>${esc(x.nm)}</td><td>${esc(x.u)}</td><td>${x.err?`<span class="pill er">${esc(x.err)}</span>`:'<span class="pill ok">Siap</span>'}</td></tr>`).join('')}</tbody></table></div>
  <p class="mu">Akun baru dibuat <b>tanpa peran</b> dan belum bisa masuk sampai Anda memilih peran (dan ekskul) di tabel akun. Kata sandi awal sama untuk semua akun dan ditampilkan setelah impor.</p>
  <button class="btn pri" data-act="ukirim"${ok.length?'':' disabled'}>Impor ${ok.length} akun</button></div>`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}
async function uKirim(btn){
  const rows=S.uprev.filter(x=>!x.err).map(x=>({baris:x.baris,nm:x.nm,u:x.u}));
  if(!rows.length)return;btn.classList.add('load');
  try{const r=await gs('importAkun',S.t,rows);
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success){toast(r.message,'err');arahkanSandiAwal(r.message)}
    else{
      S.ares=S.uprev.map(x=>{if(x.err)return{...x,status:'dilewati',alasan:x.err};const h=r.data.hasil.find(z=>z.baris===x.baris)||{};return{...x,status:h.status||'dilewati',alasan:h.alasan||''}});
      S.asandi=r.data.sandi;S.uprev=null;renderUHasil(r.data.tambah);refresh();
    }
  }catch(e){toast('Gagal mengirim. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}
function renderUHasil(n){
  const a=S.ares,bad=a.filter(x=>x.status!=='dibuat').length,box=$('#uimpbox');
  box.innerHTML=`<div class="card"><div class="ph"><h3>Hasil impor akun</h3><button class="btn" data-act="ututup">Tutup</button></div>
  <p><span class="pill ok">${n} akun dibuat</span> ${bad?`<span class="pill er">${bad} dilewati</span>`:''}</p>
  <p><b>Kata sandi awal semua akun baru:</b> <code style="font-size:15px">${esc(S.asandi)}</code></p>
  <p><b>Langkah berikutnya:</b> pilih <b>peran</b> (dan <b>ekskul</b> untuk pembina/pelatih) tiap akun baru di tabel di bawah. Akun tanpa peran belum bisa masuk. Bagikan nama pengguna dan kata sandi awal ini kepada yang bersangkutan.</p>
  <div class="tw"><table><thead><tr><th>Baris</th><th>Nama lengkap</th><th>Nama pengguna</th><th>Status</th></tr></thead><tbody>${a.map(x=>`<tr><td>${x.baris}</td><td>${esc(x.nm)}</td><td>${esc(x.u)}</td><td>${x.status==='dibuat'?'<span class="pill ok">Dibuat</span>':`<span class="pill er">Dilewati: ${esc(x.alasan)}</span>`}</td></tr>`).join('')}</tbody></table></div>
  <button class="btn" data-act="uhxl">Unduh daftar akun (Excel)</button></div>`;
}
function uHasilXl(){
  if(!window.XLSX||!S.ares)return;
  const ws=XLSX.utils.aoa_to_sheet([['Hasil Impor Akun Pembina & Pelatih'],['Simpan berkas ini dengan aman dan hapus setelah akun dibagikan.'],[],['Nama Lengkap','Nama Pengguna','Status','Kata Sandi Awal'],...S.ares.map(x=>[x.nm,x.u,x.status==='dibuat'?'Dibuat':'Dilewati: '+x.alasan,x.status==='dibuat'?S.asandi:''])]);
  ws['!cols']=[{wch:30},{wch:22},{wch:40},{wch:18}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Hasil');saveWb(wb,'Daftar_Akun_Baru_'+iso(new Date())+'.xlsx');
}

/* ── Jenis Pelanggaran (Kesiswaan): tambah, ubah, nonaktifkan/aktifkan; riwayat tidak pernah dihapus ── */
const KATS=['Ringan','Sedang','Berat'],KC={Ringan:'ok',Sedang:'wn',Berat:'er'},katPill=k=>KATS.includes(k)?`<span class="pill ${KC[k]}">${k}</span>`:'';
function renderJenis(){
  const d=S.d;if(d.user.peran!=='kesiswaan'||!d.jenis)return;
  const rank=j=>KATS.indexOf(j.kat)+1; // Berat → Sedang → Ringan → belum dikategorikan
  const L=[...d.jenis].sort((a,b)=>(b.a!==false)-(a.a!==false)||rank(b)-rank(a)||a.nama.localeCompare(b.nama));
  $('#jb').innerHTML=L.map(j=>`<tr${j.a===false?' style="opacity:.6"':''}><td><b>${esc(j.nama)}</b></td><td><select data-jk="${esc(j.id)}" class="k${KATS.includes(j.kat)?j.kat[0]:''}" aria-label="Kategori ${esc(j.nama)}"><option value="">— pilih —</option>${KATS.map(k=>`<option${k===j.kat?' selected':''}>${k}</option>`).join('')}</select>${KATS.includes(j.kat)||!j.kat?'':`<small>Belum dikategorikan (kategori lama: ${esc(j.kat)})</small>`}</td><td><span class="pill er">${j.poin} poin</span></td><td>${j.n||0} catatan</td><td><span class="pill ${j.a===false?'wn':'ok'}">${j.a===false?'Nonaktif':'Aktif'}</span></td><td><button class="btn sm" data-act="jedit" data-id="${esc(j.id)}">Ubah</button> <button class="btn sm" data-act="jtog" data-id="${esc(j.id)}">${j.a===false?'Aktifkan':'Nonaktifkan'}</button></td></tr>`).join('')||'<tr><td colspan="6" class="mu">Belum ada jenis pelanggaran.</td></tr>';
}
function jenisKirim(j){queue('saveJenis',{id:j.id,nama:j.nama,kategori:j.kat,poin:j.poin,aktif:j.a!==false})}
function savJenis(f){
  const e=f.elements,id=e.id.value||'J'+Date.now().toString(36),nama=e.n.value.trim(),poin=Math.round(+e.p.value),kat=e.k.value;
  if(nama.length<3)return toast('Nama pelanggaran minimal 3 karakter','err');
  if(!KATS.includes(kat))return toast('Pilih kategori: Ringan, Sedang, atau Berat','err');
  if(!(poin>=0&&poin<=100))return toast('Poin harus angka 0–100','err');
  if(S.d.jenis.some(x=>x.id!==id&&x.nama.trim().toLowerCase()===nama.toLowerCase()))return toast('Nama pelanggaran sudah ada','err');
  const i=S.d.jenis.findIndex(x=>x.id===id),old=i<0?null:S.d.jenis[i],j={id,nama,kat,poin,a:old?old.a:true,n:old?old.n:0};
  if(old&&old.poin!==poin)(S.d.pel||[]).forEach(x=>{if(x.j===id&&x.pn==null)x.pn=old.poin}); // catatan lama tetap memakai poin lamanya
  if(i<0)S.d.jenis.push(j);else S.d.jenis[i]=j;S.jm[id]=j;
  f.reset();f.hidden=true;fillForms();renderAll();toast('Jenis pelanggaran disimpan');jenisKirim(j);
}

/* ── Hapus catatan pelanggaran/keterlambatan (Kesiswaan): per baris atau beberapa sekaligus lewat kotak centang ── */
function hBar(){
  const b=$('#hbar');if(!b)return;const adm=S.d.user.peran==='kesiswaan',disp=S.d.user.peran==='disiplin';
  if(!adm&&!disp){b.hidden=true;return}
  b.hidden=false;const n=S.sel.size;
  b.innerHTML=`<small>${n?`<b>${n} dipilih</b>`:disp?'Anda dapat menghapus catatan yang Anda catat sendiri jika keliru (centang barisnya)':'Centang baris untuk menghapus beberapa catatan sekaligus'}</small><div><button class="btn sm" data-act="hsemua">${disp?'Pilih semua catatan saya':'Pilih semua hasil'} (${S.allIds.length})</button>${n?` <button class="btn sm" data-act="hbatal">Batal pilih</button> <button class="btn sm dng" data-act="hdelsel">Hapus ${n} yang dipilih</button>`:''}</div>`;
  const c=$('#ckall');if(c)c.checked=S.pageIds.length>0&&S.pageIds.every(i=>S.sel.has(i));
}
function confirmHapusCat(ids){
  const pel=S.tab==='pel',src=(pel?S.d.pel:S.d.terl)||[],set=new Set(ids),rec=src.filter(x=>set.has(x.id));
  if(!rec.length)return toast('Catatan tidak ditemukan','err');
  S.dx={cat:pel?'pelanggaran':'terlambat',ids:rec.map(x=>x.id)};
  const poin=pel?rec.reduce((a,x)=>a+PN(x),0):0,sis=new Set(rec.map(x=>x.s)).size;
  $('#dt').textContent=pel?'Hapus catatan pelanggaran':'Hapus catatan keterlambatan';
  $('#db').innerHTML=`<p>Hapus <b>${rec.length} catatan ${pel?'pelanggaran':'keterlambatan'}</b> milik ${sis} siswa?</p><ul>${rec.slice(0,5).map(x=>`<li>${esc(nm(x.s))} — ${esc(pel?J(x.j).nama:x.al)} (${esc(x.tgl)})</li>`).join('')}${rec.length>5?`<li>…dan ${rec.length-5} lainnya</li>`:''}</ul>`
    +(pel?`<p>Poin yang ikut hilang: <b>${poin}</b>. Akumulasi poin siswa akan berkurang.</p>`:'')
    +(S.d.user.peran==='disiplin'?`<p class="mu">Tindakan ini tidak bisa dibatalkan dan <b>tercatat di log audit atas nama Anda</b>. Gunakan hanya untuk catatan yang keliru.</p>`:`<p class="mu">Tindakan ini tidak bisa dibatalkan. Jika hanya salah input, ini cara yang tepat; untuk jenis yang tidak dipakai lagi, nonaktifkan jenisnya di menu Jenis Pelanggaran.</p>`)
    +(rec.length>1?`<label class="chk" style="height:auto;margin:8px 0 0"><input type="checkbox" id="dc">Saya mengerti, hapus semua catatan ini</label>`:'');
  $('#dok').disabled=rec.length>1;$('#dm').showModal();
}
async function hapusCat(btn){
  btn.classList.add('load');
  try{const r=await gs('hapusCatatan',S.t,{jenis:S.dx.cat,ids:S.dx.ids});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const set=new Set(S.dx.ids),k=S.dx.cat==='pelanggaran'?'pel':'terl';
      S.d[k]=S.d[k].filter(x=>!set.has(x.id));S.sel.clear();$('#dm').close();renderAll();toast(r.data.hapus+' catatan dihapus');refresh()}
  }catch(e){toast('Gagal menghapus. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}

/* ── Tahfidz (ekskul wajib): kehadiran + perkembangan hafalan tiap pertemuan, rekap, dan tampilan orang tua ── */
const SURAH=[['Al-Fatihah',7],['Al-Baqarah',286],['Ali \'Imran',200],['An-Nisa\'',176],['Al-Ma\'idah',120],['Al-An\'am',165],['Al-A\'raf',206],['Al-Anfal',75],['At-Taubah',129],['Yunus',109],['Hud',123],['Yusuf',111],['Ar-Ra\'d',43],['Ibrahim',52],['Al-Hijr',99],['An-Nahl',128],['Al-Isra\'',111],['Al-Kahf',110],['Maryam',98],['Ta-Ha',135],['Al-Anbiya\'',112],['Al-Hajj',78],['Al-Mu\'minun',118],['An-Nur',64],['Al-Furqan',77],['Asy-Syu\'ara\'',227],['An-Naml',93],['Al-Qasas',88],['Al-\'Ankabut',69],['Ar-Rum',60],['Luqman',34],['As-Sajdah',30],['Al-Ahzab',73],['Saba\'',54],['Fatir',45],['Ya-Sin',83],['As-Saffat',182],['Sad',88],['Az-Zumar',75],['Gafir',85],['Fussilat',54],['Asy-Syura',53],['Az-Zukhruf',89],['Ad-Dukhan',59],['Al-Jasiyah',37],['Al-Ahqaf',35],['Muhammad',38],['Al-Fath',29],['Al-Hujurat',18],['Qaf',45],['Az-Zariyat',60],['At-Tur',49],['An-Najm',62],['Al-Qamar',55],['Ar-Rahman',78],['Al-Waqi\'ah',96],['Al-Hadid',29],['Al-Mujadalah',22],['Al-Hasyr',24],['Al-Mumtahanah',13],['As-Saff',14],['Al-Jumu\'ah',11],['Al-Munafiqun',11],['At-Tagabun',18],['At-Talaq',12],['At-Tahrim',12],['Al-Mulk',30],['Al-Qalam',52],['Al-Haqqah',52],['Al-Ma\'arij',44],['Nuh',28],['Al-Jinn',28],['Al-Muzzammil',20],['Al-Muddassir',56],['Al-Qiyamah',40],['Al-Insan',31],['Al-Mursalat',50],['An-Naba\'',40],['An-Nazi\'at',46],['\'Abasa',42],['At-Takwir',29],['Al-Infitar',19],['Al-Mutaffifin',36],['Al-Insyiqaq',25],['Al-Buruj',22],['At-Tariq',17],['Al-A\'la',19],['Al-Gasyiyah',26],['Al-Fajr',30],['Al-Balad',20],['Asy-Syams',15],['Al-Lail',21],['Ad-Duha',11],['Asy-Syarh',8],['At-Tin',8],['Al-\'Alaq',19],['Al-Qadr',5],['Al-Bayyinah',8],['Az-Zalzalah',8],['Al-\'Adiyat',11],['Al-Qari\'ah',11],['At-Takasur',8],['Al-\'Asr',3],['Al-Humazah',9],['Al-Fil',5],['Quraisy',4],['Al-Ma\'un',7],['Al-Kausar',3],['Al-Kafirun',6],['An-Nasr',3],['Al-Lahab',5],['Al-Ikhlas',4],['Al-Falaq',5],['An-Nas',6]];
const THST={hadir:'Hadir',izin:'Izin',sakit:'Sakit',alpa:'Alpa'},THKL={lancar:'Lancar',cukup:'Cukup',ulang:'Perlu diulang'};
const SURAH_OPT='<option value="">— surah —</option>'+SURAH.map((x,i)=>`<option value="${i+1}">${i+1}. ${esc(x[0])}</option>`).join('');
function renderTh(){
  if(!$('#thk'))return;
  const kls=[...new Set((S.d.siswa||[]).map(x=>x.kelas).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'id',{numeric:true}));
  const sel=(id,first)=>{const e=$(id),v=e.value;e.innerHTML=`<option value="">${first}</option>`+kls.map(k=>`<option>${esc(k)}</option>`).join('');e.value=kls.includes(v)?v:''};
  sel('#thk','— pilih kelas —');sel('#thk2','Semua kelas');
  const n=iso(new Date()),f=$('#fth').elements;$('#thd').max=n;if(!$('#thd').value)$('#thd').value=n;if(!f.d.value)f.d.value=n.slice(0,8)+'01';if(!f.s.value)f.s.value=n;
}
async function thMuat(){
  const k=$('#thk').value,t=$('#thd').value,box=$('#thf');
  if(!k||!t){box.innerHTML='<p class="mu">Pilih kelas dan tanggal pertemuan.</p>';S.th=null;return}
  box.innerHTML='<p class="mu">Memuat…</p>';
  try{const r=await gs('thMuat',S.t,{kelas:k,tanggal:t});
    if($('#thk').value!==k||$('#thd').value!==t)return; // pilihan sudah berganti selama memuat
    if(r.message==='SESI')return out(1);
    if(!r.success){box.innerHTML='';return toast(r.message,'err')}
    S.th={kelas:k,tanggal:t,rows:r.data};thRender();
  }catch(e){box.innerHTML='<p class="mu">Gagal memuat. Periksa koneksi lalu pilih ulang.</p>'}
}
function thRow(r,i){
  const e=r.ent||{st:'hadir',sr:0,d:0,e:0,mu:'',kl:'',c:''},o=(v,l,cur)=>`<option value="${v}"${cur===v?' selected':''}>${l}</option>`;
  return`<tr data-s="${esc(r.id)}"><td>${i+1}</td><td>${esc(r.nama)}<small>NISN ${esc(r.nisn)}</small><small>${r.ter?`Terakhir: ${esc(r.ter)} · total ${r.tot} ayat`:'Belum ada setoran'}</small></td>
  <td><select data-tf="st" aria-label="Kehadiran ${esc(r.nama)}">${Object.keys(THST).map(k=>o(k,THST[k],e.st)).join('')}</select></td>
  <td class="ay"><select data-tf="sr" aria-label="Surah ${esc(r.nama)}">${e.sr?SURAH_OPT.replace(`value="${e.sr}">`,`value="${e.sr}" selected>`):SURAH_OPT}</select><span><input data-tf="d" type="number" min="1" inputmode="numeric" placeholder="ayat dari" value="${e.d||''}" aria-label="Ayat dari"><input data-tf="e" type="number" min="1" inputmode="numeric" placeholder="sampai" value="${e.e||''}" aria-label="Ayat sampai"></span></td>
  <td><input data-tf="mu" maxlength="60" placeholder="Murojaah, mis. An-Nas 1–6" value="${esc(e.mu)}" aria-label="Murojaah"></td>
  <td><select data-tf="kl" aria-label="Kelancaran"><option value="">— kelancaran —</option>${Object.keys(THKL).map(k=>o(k,THKL[k],e.kl)).join('')}</select></td>
  <td><input data-tf="c" maxlength="100" placeholder="Catatan" value="${esc(e.c)}" aria-label="Catatan"></td></tr>`;
}
function thRender(){
  const th=S.th,box=$('#thf');
  if(!th.rows.length){box.innerHTML='<p class="mu">Tidak ada siswa aktif di kelas ini.</p>';return}
  box.innerHTML=`<div class="card"><div class="bar"><h3>Kelas ${esc(th.kelas)} · ${esc(th.tanggal)}</h3><button class="btn sm" data-act="thsemua">Semua hadir</button></div>
  <div class="tw"><table><thead><tr><th>No</th><th>Siswa</th><th>Kehadiran</th><th>Setoran baru</th><th>Murojaah</th><th>Kelancaran</th><th>Catatan</th></tr></thead><tbody>${th.rows.map(thRow).join('')}</tbody></table></div>
  <div id="thsum" class="sum"></div><button class="btn pri" data-act="thsimpan">Simpan Pertemuan</button></div>`;
  $$('#thf tr[data-s]').forEach(thLock);thSum();
}
function thLock(tr){const off=$('[data-tf=st]',tr).value!=='hadir';['sr','d','e','mu','kl'].forEach(k=>{$(`[data-tf=${k}]`,tr).disabled=off})} // hafalan hanya untuk yang hadir
function thSum(){const c={hadir:0,izin:0,sakit:0,alpa:0};$$('#thf [data-tf=st]').forEach(s=>c[s.value]++);$('#thsum').innerHTML=Object.keys(c).map(k=>`<span class="pill ${SC[k]}">${THST[k]}: ${c[k]}</span>`).join('')}
async function thSimpan(btn){
  const th=S.th;if(!th)return;const baris=[];
  for(const tr of $$('#thf tr[data-s]')){
    const g=k=>$(`[data-tf=${k}]`,tr).value,st=g('st'),nama=tr.children[1].firstChild.textContent,b={s:tr.dataset.s,st,sr:0,d:'',e:'',mu:'',kl:'',c:g('c').trim()};
    if(st==='hadir'){b.sr=+g('sr')||0;b.mu=g('mu').trim();b.kl=g('kl');
      if(b.sr){b.d=+g('d');b.e=+g('e');const n=SURAH[b.sr-1][1];
        if(!(b.d>=1&&b.e>=b.d&&b.e<=n)){tr.scrollIntoView({block:'center'});return toast(`${nama}: ayat ${SURAH[b.sr-1][0]} harus 1–${n}, dan "dari" tidak lebih besar dari "sampai"`,'err')}}
      else if(g('d')||g('e')){tr.scrollIntoView({block:'center'});return toast(nama+': pilih surahnya dulu','err')}}
    baris.push(b);
  }
  btn.classList.add('load');
  try{const r=await gs('thSimpan',S.t,{kelas:th.kelas,tanggal:th.tanggal,baris});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');else{toast(`Pertemuan disimpan (${r.data.baru} baru, ${r.data.ubah} diperbarui)`);thMuat()}
  }catch(e){toast('Gagal menyimpan. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}
async function thRekap(f){
  const e=f.elements,b=$('button',f);b.classList.add('load');
  try{const r=await gs('thRekap',S.t,{kelas:e.k.value,dari:e.d.value,sampai:e.s.value});
    if(r.message==='SESI'){b.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');else{S.thr={rows:r.data,k:e.k.value,d:e.d.value,s:e.s.value};thRekapRender()}
  }catch(x){toast('Gagal memuat rekap. Coba lagi.','err')}
  b.classList.remove('load');
}
const thPct=x=>{const t=x.hadir+x.izin+x.sakit+x.alpa;return t?Math.round(x.hadir*100/t)+'%':'—'};
function thRekapRender(){
  const R=S.thr;
  $('#thr').innerHTML=`<div class="card"><div class="bar"><h3>Rekap ${esc(R.d)} s.d. ${esc(R.s)}${R.k?' · '+esc(R.k):''}</h3><button class="btn" data-act="thxl">Unduh Excel</button></div>
  <div class="tw"><table><thead><tr><th>Siswa</th><th>Kelas</th><th>H</th><th>I</th><th>S</th><th>A</th><th>% Hadir</th><th>Ayat periode</th><th>Total ayat</th><th>Surah tuntas</th><th>Posisi terakhir</th><th></th></tr></thead><tbody>${R.rows.map(x=>`<tr><td>${esc(x.nama)}<small>NISN ${esc(x.nisn)}</small></td><td>${esc(x.kelas)}</td><td>${x.hadir}</td><td>${x.izin}</td><td>${x.sakit}</td><td>${x.alpa}</td><td>${thPct(x)}</td><td>${x.ayat}</td><td>${x.total}</td><td>${x.tuntas}</td><td>${esc(x.ter||'—')}</td><td><button class="btn sm" data-act="thriw" data-id="${esc(x.id)}">Riwayat</button></td></tr>`).join('')||'<tr><td colspan="12" class="mu">Tidak ada siswa.</td></tr>'}</tbody></table></div></div>`;
}
function thXl(){
  if(!window.XLSX||!S.thr)return toast('Pustaka Excel belum termuat atau rekap belum ditampilkan.','err');
  const R=S.thr,ws=XLSX.utils.aoa_to_sheet([['Rekap Tahfidz'],['Periode',R.d+' s.d. '+R.s],['Kelas',R.k||'Semua kelas'],[],['No','Nama','Kelas','NISN','Hadir','Izin','Sakit','Alpa','% Hadir','Ayat periode','Total ayat sejak awal','Surah tuntas','Posisi terakhir'],...R.rows.map((x,i)=>[i+1,x.nama,x.kelas,x.nisn,x.hadir,x.izin,x.sakit,x.alpa,thPct(x),x.ayat,x.total,x.tuntas,x.ter||''])]);
  ws['!cols']=[{wch:5},{wch:28},{wch:10},{wch:14},{wch:7},{wch:7},{wch:7},{wch:7},{wch:9},{wch:12},{wch:20},{wch:12},{wch:24}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Rekap Tahfidz');saveWb(wb,('Rekap_Tahfidz_'+(R.k||'Semua')+'_'+R.d+'_'+R.s+'.xlsx').replace(/[^\w.\-]+/g,'_'));toast('File Excel rekap diunduh');
}
const thRiwTabel=riw=>`<div class="tw"><table><thead><tr><th>Tanggal</th><th>Kehadiran</th><th>Setoran baru</th><th>Murojaah</th><th>Kelancaran</th><th>Catatan</th></tr></thead><tbody>${(riw||[]).map(x=>`<tr><td>${esc(x.t)}</td><td><span class="pill ${SC[x.st]||''}">${esc(THST[x.st]||x.st)}</span></td><td>${x.sur?esc(x.sur)+' '+x.d+'–'+x.e:'—'}</td><td>${esc(x.mu||'—')}</td><td>${esc(THKL[x.kl]||'—')}</td><td>${esc(x.c||'')}</td></tr>`).join('')||'<tr><td colspan="6" class="mu">Belum ada catatan.</td></tr>'}</tbody></table></div>`;
function tahfidzAnak(t){
  if(!t)return'<div class="card"><h3>Tahfidz (ekskul wajib)</h3><p class="mu">Belum ada catatan kehadiran atau hafalan Tahfidz.</p></div>';
  const tot=t.hadir+t.izin+t.sakit+t.alpa,kp=(a,b,c)=>`<div class="card kpi"><div class="kh"><span>${a}</span></div><b>${b}</b><small>${c}</small></div>`;
  return`<div class="card"><h3>Tahfidz (ekskul wajib)</h3><div class="kpis">${kp('Kehadiran',tot?Math.round(t.hadir*100/tot)+'%':'—',`Hadir ${t.hadir} · Izin ${t.izin} · Sakit ${t.sakit} · Alpa ${t.alpa}`)}${kp('Total hafalan',t.ayat+' ayat',t.persen+'% dari 6.236 ayat')}${kp('Surah tuntas',t.tuntas.length,esc(t.tuntas.slice(0,4).join(', '))||'Belum ada')}</div>
  <p><b>Posisi hafalan terakhir:</b> ${esc(t.ter||'Belum ada')}${t.terTgl?` (${esc(t.terTgl)})`:''}</p><h4 style="margin:12px 0 8px">10 pertemuan terakhir</h4>${thRiwTabel(t.riw)}</div>`;
}

/* ── Impor Jenis Pelanggaran dari Excel: Nama Pelanggaran, Kategori, Poin (pratinjau dulu; nama yang sudah ada dilewati kecuali "perbarui" dicentang) ── */
function jTemplat(){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const ws=XLSX.utils.aoa_to_sheet([['Impor Jenis Pelanggaran'],['Petunjuk','Isi Nama Pelanggaran (3–80 huruf), Kategori (Ringan, Sedang, atau Berat), dan Poin (bilangan bulat 0–100). Maksimal 200 baris. Nama yang sudah ada dilewati kecuali Anda memilih "Perbarui" saat pratinjau. Lihat lembar "Contoh".'],[],['Nama Pelanggaran','Kategori','Poin']]);
  ws['!cols']=[{wch:44},{wch:14},{wch:8}];
  const ct=XLSX.utils.aoa_to_sheet([['Nama Pelanggaran','Kategori','Poin'],['Tidak memakai atribut lengkap','Ringan',5],['Menggunakan HP saat pelajaran','Sedang',10],['Berkelahi','Berat',40]]);
  ct['!cols']=[{wch:44},{wch:14},{wch:8}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Jenis Pelanggaran');XLSX.utils.book_append_sheet(wb,ct,'Contoh');
  saveWb(wb,'Templat_Impor_Jenis_Pelanggaran.xlsx');toast('Templat diunduh');
}
function jImpor(file){
  if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  if(file.size>2*1048576)return toast('Berkas terlalu besar (maksimal 2 MB)','err');
  const rd=new FileReader();rd.onerror=()=>toast('Gagal membaca berkas','err');
  rd.onload=()=>{
    let A;
    try{const wb=XLSX.read(new Uint8Array(rd.result),{type:'array',cellFormula:false,cellHTML:false,cellStyles:false,sheetRows:1000});
      A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false,blankrows:false})}
    catch(e){return toast('Berkas Excel tidak dapat dibaca','err')}
    const low=v=>String(v==null?'':v).trim().toLowerCase(),NM=['nama pelanggaran','jenis pelanggaran','pelanggaran','nama'],hi=A.findIndex(r=>r.some(c=>NM.includes(low(c))));
    if(hi<0)return toast('Kolom "Nama Pelanggaran" tidak ditemukan. Gunakan templat dari tombol Templat Excel.','err');
    const H=A[hi].map(low),ci={nm:H.findIndex(h=>NM.includes(h)),kt:H.indexOf('kategori'),pn:H.indexOf('poin')};
    if(ci.kt<0||ci.pn<0)return toast('Kolom "Kategori" dan "Poin" harus ada. Gunakan templat dari tombol Templat Excel.','err');
    const items=[],seen=new Set();
    A.slice(hi+1).forEach((r,i)=>{
      const cell=k=>String(r[k]==null?'':r[k]).trim(),it={baris:hi+2+i,nama:cell(ci.nm),kategori:'',poinTxt:cell(ci.pn)};
      if(!it.nama&&!cell(ci.kt)&&!it.poinTxt)return;
      it.kategori=KATS.find(k=>k.toLowerCase()===cell(ci.kt).toLowerCase())||cell(ci.kt);
      const n=Number(it.poinTxt.replace(',','.'));it.poin=n;
      it.err=(it.nama.length<3||it.nama.length>80)?'Nama harus 3–80 karakter':!KATS.includes(it.kategori)?'Kategori harus Ringan, Sedang, atau Berat':(it.poinTxt===''||!Number.isInteger(n)||n<0||n>100)?'Poin harus bilangan bulat 0–100':seen.has(it.nama.toLowerCase())?'Nama dobel di dalam berkas':'';
      if(!it.err){seen.add(it.nama.toLowerCase());
        const m=S.d.jenis.find(j=>j.nama.trim().toLowerCase()===it.nama.toLowerCase());
        it.aksi=!m?'baru':(m.kat===it.kategori&&m.poin===n)?'sama':'beda';if(m)it.lama=`${m.kat||'—'}, ${m.poin} poin`}
      items.push(it);
    });
    if(!items.length)return toast('Tidak ada baris data yang terbaca','err');
    if(items.length>200)return toast('Maksimal 200 baris sekali impor','err');
    S.jprev=items;S.jperb=false;renderJPrev();
  };
  rd.readAsArrayBuffer(file);
}
function jKirimDaftar(){const it=S.jprev||[];return it.filter(x=>!x.err&&(x.aksi==='baru'||(S.jperb&&x.aksi==='beda')))}
function renderJPrev(){
  const it=S.jprev,box=$('#jimpbox'),c=a=>it.filter(x=>x.aksi===a).length,bad=it.filter(x=>x.err).length,kirim=jKirimDaftar().length;
  box.innerHTML=`<div class="card"><div class="ph"><h3>Pratinjau impor jenis pelanggaran</h3><button class="btn" data-act="jtutup">Batal</button></div>
  <p><span class="pill ok">${c('baru')} baru</span> <span class="pill in">${c('sama')} sudah ada, sama</span> <span class="pill wn">${c('beda')} sudah ada, berbeda</span> <span class="pill ${bad?'er':''}" style="${bad?'':'background:var(--th);color:var(--mu)'}">${bad} bermasalah</span></p>
  ${c('beda')?`<label class="chk" style="height:auto;margin:0 0 8px"><input type="checkbox" id="jperb"${S.jperb?' checked':''}>Perbarui kategori dan poin jenis yang namanya sudah ada (${c('beda')})</label>`:''}
  <div class="tw"><table><thead><tr><th>Baris</th><th>Pelanggaran</th><th>Kategori</th><th>Poin</th><th>Status</th></tr></thead><tbody>${it.map(x=>`<tr><td>${x.baris}</td><td>${esc(x.nama)}</td><td>${esc(x.kategori)}</td><td>${esc(x.poinTxt)}</td><td>${x.err?`<span class="pill er">${esc(x.err)}</span>`:x.aksi==='baru'?'<span class="pill ok">Baru</span>':x.aksi==='sama'?'<span class="pill in">Sudah ada (sama)</span>':S.jperb?`<span class="pill wn">Diperbarui</span><small>sebelumnya: ${esc(x.lama)}</small>`:`<span class="pill">Dilewati</span><small>sudah ada: ${esc(x.lama)}</small>`}</td></tr>`).join('')}</tbody></table></div>
  <p class="mu">Jenis yang diimpor aktif dan langsung muncul di form pencatatan. Perubahan poin hanya berlaku untuk pelanggaran yang dicatat sesudahnya.</p>
  <button class="btn pri" data-act="jkirim"${kirim?'':' disabled'}>Impor ${kirim} jenis</button></div>`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}
async function jKirim(btn){
  const rows=jKirimDaftar().map(x=>({baris:x.baris,nama:x.nama,kategori:x.kategori,poin:x.poin}));
  if(!rows.length)return;btn.classList.add('load');
  try{const r=await gs('importJenis',S.t,{rows,perbarui:!!S.jperb});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success)toast(r.message,'err');
    else{const x=r.data,bm=(S.jprev||[]).filter(h=>h.err).map(h=>({baris:h.baris,nama:h.nama||'(kosong)',alasan:h.err})),gagal=[...bm,...x.hasil.filter(h=>h.status==='dilewati')];S.jprev=null;
      $('#jimpbox').innerHTML=`<div class="card"><div class="ph"><h3>Hasil impor jenis pelanggaran</h3><button class="btn" data-act="jtutup">Tutup</button></div>
      <p><span class="pill ok">${x.baru} dibuat</span> ${x.diperbarui?`<span class="pill wn">${x.diperbarui} diperbarui</span> `:''}${x.sama?`<span class="pill in">${x.sama} sudah ada (sama)</span> `:''}${gagal.length?`<span class="pill er">${gagal.length} dilewati</span>`:''}</p>
      ${gagal.length?`<ul>${gagal.map(h=>`<li>Baris ${h.baris}: ${esc(h.nama)} — ${esc(h.alasan)}</li>`).join('')}</ul>`:''}</div>`;
      toast(x.baru+x.diperbarui?`Impor selesai: ${x.baru} dibuat, ${x.diperbarui} diperbarui`:'Tidak ada jenis yang berubah');refresh()}
  }catch(e){toast('Gagal mengirim. Periksa koneksi lalu coba lagi.','err')}
  btn.classList.remove('load');
}

/* ── Kata sandi: sandi awal (Kesiswaan) dan penggantian sandi sendiri (semua staf) ── */
function bukaGanti(paksa){
  S.wajib=!!paksa;const f=$('#fgs');f.reset();$('#gerr').textContent='';
  $('#gmt').textContent=paksa?'Buat kata sandi baru':'Ubah kata sandi';
  $('#gmp').textContent=paksa?'Anda masuk dengan kata sandi awal. Demi keamanan data siswa, buat kata sandi baru sebelum melanjutkan.':'Gunakan kata sandi yang tidak dipakai di tempat lain.';
  $('#gbatal').hidden=!!paksa;$('#gkeluar').hidden=!paksa;
  if(!$('#gm').open)$('#gm').showModal();
  setTimeout(()=>f.elements.a.focus(),50);
}
async function gantiKirim(f){
  const e=f.elements,a=e.a.value,b=e.b.value,c=e.c.value,er=$('#gerr'),bt=$('button.pri',f);er.textContent='';
  if(b.trim().length<8)return er.textContent='Kata sandi baru minimal 8 karakter.';
  if(b!==c)return er.textContent='Pengulangan kata sandi tidak sama.';
  if(a===b)return er.textContent='Kata sandi baru harus berbeda dari yang lama.';
  bt.classList.add('load');
  try{const r=await gs('gantiSandi',S.t,{lama:a,baru:b});
    if(r.message==='SESI'){bt.classList.remove('load');return out(1)}
    if(!r.success)er.textContent=r.message;
    else{const was=S.wajib;S.wajib=false;f.reset();$('#gm').close();toast('Kata sandi berhasil diganti');if(was)refresh()}
  }catch(x){er.textContent=pesanGagal(x)}
  bt.classList.remove('load');
}
function konfirmSandiAwal(ids){
  const L=S.d.users.filter(u=>ids.includes(u.id));if(!L.length)return toast('Tidak ada akun pembina/pelatih untuk diatur ulang','err');
  S.dx={sandi:L.map(u=>u.id)};$('#dt').textContent='Atur ulang ke sandi awal';
  $('#db').innerHTML=`<p>Atur ulang kata sandi <b>${L.length} akun</b> ke kata sandi awal?</p><ul>${L.slice(0,6).map(u=>`<li>${esc(u.nm)} (<code>${esc(u.u)}</code>)</li>`).join('')}${L.length>6?`<li>…dan ${L.length-6} lainnya</li>`:''}</ul><p>Yang bersangkutan <b>langsung keluar</b> dari aplikasi dan wajib membuat kata sandi baru saat masuk berikutnya. Kata sandi lama tidak berlaku lagi.</p>`
    +(L.length>1?`<label class="chk" style="height:auto;margin:8px 0 0"><input type="checkbox" id="dc">Saya mengerti, atur ulang semua akun ini</label>`:'');
  $('#dok').textContent='Atur ulang';$('#dok').disabled=L.length>1;$('#dm').showModal();
}
async function resetSandiKirim(btn){
  const ids=S.dx.sandi;btn.classList.add('load');
  try{const r=await gs('resetKeSandiAwal',S.t,{ids});
    if(r.message==='SESI'){btn.classList.remove('load');return out(1)}
    if(!r.success){toast(r.message,'err');$('#dm').close();arahkanSandiAwal(r.message)}
    else{$('#dm').close();const d=r.data;toast(d.diatur+' akun diatur ulang ke sandi awal'+(d.dilewati.length?' ('+d.dilewati.length+' dilewati)':''));refresh()}
  }catch(e){toast(pesanGagal(e),'err')}
  btn.classList.remove('load');
}
$('#gm').addEventListener('cancel',ev=>{if(S.wajib)ev.preventDefault()}); // dialog wajib ganti sandi tidak bisa ditutup dengan Esc
$('#dm').addEventListener('close',()=>{$('#dok').textContent='Hapus Permanen'});

/* ── Laporan per siswa: pelanggaran + keterlambatan → pratinjau, cetak A4 (PDF), Excel ── */
const BATAS_POIN=30;
const tglID=v=>{try{const [y,m,d]=String(v).split('-').map(Number);const t=new Date(y,m-1,d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});return t==='Invalid Date'?v:t}catch(e){return v}};
function kopHTML(){const kv=S.d.kv||{},logo=kv.logo_thumb?`<img src="${esc(kv.logo_thumb)}" alt="">`:'';return `<div class="kop">${logo}<div><h2>${esc(kv.nama_aplikasi||'Aplikasi Kesiswaan')}</h2><div>${esc(kv.teks_footer||'')}</div></div></div>`}
function cetakHTML(html){ // cetak A4 isi apa pun lewat wadah #cetak (aplikasi lain disembunyikan oleh CSS cetak)
  $('#cetak').innerHTML=html;document.body.classList.add('cetak-siswa');
  const bersih=()=>{document.body.classList.remove('cetak-siswa');$('#cetak').innerHTML='';removeEventListener('afterprint',bersih)};
  addEventListener('afterprint',bersih);setTimeout(()=>print(),60);
}
function lapHTML(d){
  const kv=S.d.kv||{},kop=kv.nama_aplikasi||'Aplikasi Kesiswaan',sub=kv.teks_footer||'',logo=kv.logo_thumb?`<img src="${esc(kv.logo_thumb)}" alt="">`:'';
  const tp=d.pel.reduce((a,x)=>a+x.p,0),kat=['Ringan','Sedang','Berat'].map(k=>`${k}: ${d.pel.filter(x=>x.k===k).length}`).join(' · ');
  const per=(d.dari||d.sampai)?`${d.dari?tglID(d.dari):'awal'} s.d. ${d.sampai?tglID(d.sampai):'sekarang'}`:'Seluruh catatan',ak=d.akum.poin;
  const st=ak>=BATAS_POIN?`<b>Akumulasi ${ak} poin telah mencapai batas ${BATAS_POIN} poin</b>: perlu pemanggilan orang tua (Surat Panggilan SP-1).`:`Akumulasi ${ak} poin; ${BATAS_POIN-ak} poin lagi menuju batas ${BATAS_POIN} poin untuk pemanggilan orang tua.`;
  const tb=(h,rows,kosong)=>`<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${h.length}">${kosong}</td></tr>`}</tbody></table>`;
  const dc=d.dicetak.split(' ');
  return `${kopHTML()}
  <h2 style="text-align:center;margin:6px 0 10px">LAPORAN PELANGGARAN DAN KETERLAMBATAN SISWA</h2>
  <table class="idt"><tr><td>Nama</td><td>: <b>${esc(d.siswa.nama)}</b></td><td>Kelas</td><td>: ${esc(d.siswa.kelas)}</td></tr><tr><td>NISN</td><td>: ${esc(d.siswa.nisn)}</td><td>Periode</td><td>: ${esc(per)}</td></tr></table>
  <div class="ringk"><div><b>${d.pel.length}</b>Pelanggaran</div><div><b>${tp}</b>Poin periode ini</div><div><b>${ak}</b>Akumulasi poin</div><div><b>${d.terl.length}</b>Keterlambatan</div></div>
  <p>${st}</p>
  <h3>A. Pelanggaran</h3>${tb(['No','Tanggal','Jam','Pelanggaran','Kategori','Poin','Catatan'],d.pel.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(tglID(x.tgl))}</td><td>${esc(x.jam)}</td><td>${esc(x.j)}</td><td>${esc(x.k||'-')}</td><td>${x.p}</td><td>${esc(x.c||'')}</td></tr>`),'Tidak ada catatan pelanggaran pada periode ini.')}
  ${d.pel.length?`<p>Rincian kategori — ${kat}. <b>Total poin: ${tp}</b></p>`:''}
  <h3>B. Keterlambatan</h3>${tb(['No','Tanggal','Jam datang','Alasan'],d.terl.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(tglID(x.tgl))}</td><td>${esc(x.jam)}</td><td>${esc(x.al)}</td></tr>`),'Tidak ada catatan keterlambatan pada periode ini.')}
  ${d.terl.length?`<p><b>Total keterlambatan: ${d.terl.length} kali</b></p>`:''}
  <div class="ttd"><div>Orang Tua / Wali<br><br><br><br>( ........................ )</div><div>Wali Kelas<br><br><br><br>( ........................ )</div><div>Kesiswaan<br><br><br><br>( ........................ )</div></div>
  <p style="font-size:11px;margin-top:14px">Dicetak ${esc(tglID(dc[0]))} ${esc(dc[1]||'')} oleh ${esc(d.oleh)}</p>`;
}
function tampilLap(d){
  S.lap=d;$('#lmb').innerHTML=lapHTML(d);$('#lmcetak').hidden=!!window.AndroidApp; // di aplikasi Android: gunakan Excel
  if(!$('#lm').open)$('#lm').showModal();$('#lmb').scrollTop=0;
}
async function bukaLaporan(sid,dari,sampai){
  if(!sid)return toast('Siswa tidak ditemukan','err');
  $('#lmb').innerHTML='<p class="mu">Memuat laporan…</p>';if(!$('#lm').open)$('#lm').showModal();
  try{const r=await gs('laporanSiswa',S.t,{siswa:sid,dari:dari||'',sampai:sampai||''});
    if(r.message==='SESI'){$('#lm').close();return out(1)}
    if(!r.success){$('#lm').close();return toast(r.message,'err')}
    tampilLap(r.data);
  }catch(e){$('#lm').close();toast(pesanGagal(e),'err')}
}
function laporanForm(f){
  const e=f.elements,sid=S.lab[e.s.value];
  if(!sid)return toast('Pilih siswa dari daftar saran','err');
  if(e.d.value&&e.e.value&&e.d.value>e.e.value)return toast('Tanggal "dari" tidak boleh setelah "sampai"','err');
  bukaLaporan(sid,e.d.value,e.e.value);
}
function lapOrtu(){ // orang tua: dari data anaknya yang sudah ada di layar (tanpa panggilan server)
  const o=S.d.ortu;if(!o)return;const u=(a,b)=>(a.tgl+' '+a.jam)<(b.tgl+' '+b.jam)?-1:1,n=new Date();
  tampilLap({siswa:{nama:o.nama,nisn:o.nisn,kelas:o.kelas},dari:'',sampai:'',pel:[...o.pel].sort(u).map(x=>({tgl:x.tgl,jam:x.jam,j:x.j,k:x.k||'',p:x.p,c:''})),terl:[...o.terl].sort(u).map(x=>({tgl:x.tgl,jam:x.jam,al:x.al})),
    akum:{poin:o.poin,n:o.pel.length},dicetak:iso(n)+' '+hm(n),oleh:'Orang tua/wali'});
}
function cetakLap(){
  if(S.lap)cetakHTML(lapHTML(S.lap));
}
function lapXl(){
  const d=S.lap;if(!d)return;if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const tp=d.pel.reduce((a,x)=>a+x.p,0),per=(d.dari||d.sampai)?`${d.dari||'awal'} s.d. ${d.sampai||'sekarang'}`:'Seluruh catatan',wb=XLSX.utils.book_new(),sh=(a,w)=>{const x=XLSX.utils.aoa_to_sheet(a);x['!cols']=w.map(n=>({wch:n}));return x};
  XLSX.utils.book_append_sheet(wb,sh([['Laporan Pelanggaran dan Keterlambatan Siswa'],[],['Nama',d.siswa.nama],['NISN',d.siswa.nisn],['Kelas',d.siswa.kelas],['Periode',per],[],['Jumlah pelanggaran',d.pel.length],['Total poin periode ini',tp],['Akumulasi poin (seluruh catatan)',d.akum.poin],['Batas pemanggilan orang tua (poin)',BATAS_POIN],['Jumlah keterlambatan',d.terl.length],[],['Dicetak',d.dicetak+' oleh '+d.oleh]],[36,34]),'Ringkasan');
  XLSX.utils.book_append_sheet(wb,sh([['No','Tanggal','Jam','Pelanggaran','Kategori','Poin','Catatan'],...d.pel.map((x,i)=>[i+1,x.tgl,x.jam,x.j,x.k,x.p,x.c]),['','','','','Total',tp,'']],[5,12,8,34,12,7,40]),'Pelanggaran');
  XLSX.utils.book_append_sheet(wb,sh([['No','Tanggal','Jam datang','Alasan'],...d.terl.map((x,i)=>[i+1,x.tgl,x.jam,x.al]),['','Total',d.terl.length,'']],[5,12,12,24]),'Keterlambatan');
  saveWb(wb,('Laporan_'+d.siswa.nama+'_'+iso(new Date())+'.xlsx').replace(/[^\w.\-]+/g,'_'));toast('File Excel laporan diunduh');
}

/* ── Editor jadwal petugas (kegiatan harian) ── */
function bukaJadwal(id){S.jp=id;renderJadwal();$('#jpf').scrollIntoView({behavior:'smooth',block:'start'})}
function hariKegiatan(e){return String(e.hari||'').split(',').map(x=>x.trim()).filter(Boolean)}
function renderJadwal(){
  const box=$('#jpf'),id=S.jp,e=id&&S.d.ekskul.find(x=>x.id===id);
  if(!e){box.innerHTML='';return}
  const hr=hariKegiatan(e),ek=S.d.ekskul.filter(x=>x.mode!=='petugas').map(x=>x.nama_ekskul);
  box.innerHTML=`<div class="card"><div class="ph"><h3>Jadwal Petugas — ${esc(e.nama_ekskul)}</h3><div class="bar"><button class="btn" id="jcetak" data-act="jcetak">Cetak</button><button class="btn" data-act="jxl">Unduh Excel</button><button class="btn" data-act="jtutup">Tutup</button></div></div>
  <datalist id="dlek">${ek.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
  <form id="fjd" class="fg4"><label>Petugas<input name="s" list="dl" required placeholder="Ketik nama / NISN"></label>
    <label>Asal ekskul (boleh dikosongkan)<input name="a" list="dlek" maxlength="60" placeholder="mis. Pramuka" autocomplete="off"></label>
    <fieldset class="days"><legend>Bertugas pada hari</legend>${hr.map(h=>`<label class="chk"><input type="checkbox" name="jh" value="${esc(h)}">${esc(h)}</label>`).join('')}</fieldset>
    <button class="btn pri">Tambahkan ke Jadwal</button></form>
  <div id="jtab"></div>
  <div id="jasal"></div></div>`;
  renderJadwalTabel();renderAsalPetugas();$('#jcetak').hidden=!!window.AndroidApp;
}
function petugasKegiatan(id){return S.d.anggota.filter(a=>a.e===id).map(a=>S.map[a.s]).filter(Boolean).sort(urutNama)}
function renderJadwalTabel(){
  const box=$('#jtab'),id=S.jp,e=id&&S.d.ekskul.find(x=>x.id===id);if(!box||!e)return;
  const hr=hariKegiatan(e),tp=new Set((S.d.jadwal||[]).filter(j=>j.e===id).map(j=>j.s)),kosong=[...tp].filter(i=>S.map[i]&&!asalTxt(i)).length;
  box.innerHTML=`<p class="mu">${tp.size} petugas terjadwal. Petugas yang dijadwalkan otomatis menjadi anggota kegiatan, dan boleh bertugas di beberapa hari.${kosong?` <b>${kosong} petugas belum punya keterangan asal ekskul</b>: isi pada bagian <i>Asal ekskul petugas</i> di bawah.`:''}</p>
  <div class="tw"><table><thead><tr><th>Hari</th><th>Petugas yang bertugas</th></tr></thead><tbody>${hr.map(h=>{const ms=jadwalHari(id,h);return `<tr><td><b>${esc(h)}</b><small>${ms.length} petugas</small></td><td>${ms.map(m=>`<span class="chip">${esc(m.nama)}<small>${esc(m.kelas)} · ${asalTxt(m.id)?esc(asalTxt(m.id)):'<span class="mu">asal ekskul belum diisi</span>'}</small><button type="button" class="chipx" data-act="jdel" data-h="${esc(h)}" data-id="${esc(m.id)}" aria-label="Hapus ${esc(m.nama)} dari hari ${esc(h)}">×</button></span>`).join('')||'<span class="mu">Belum ada petugas</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
}
function renderAsalPetugas(){ // isian asal ekskul tiap petugas; tersimpan otomatis saat kolom ditinggalkan
  const box=$('#jasal'),id=S.jp;if(!box||!id)return;const ps=petugasKegiatan(id);
  box.innerHTML=ps.length?`<h4 style="margin:16px 0 4px">Asal ekskul petugas</h4><p class="mu" style="margin:0 0 6px">Terisi otomatis dari keanggotaan ekskul lain. Bila kosong atau keliru, ketik sendiri (mis. Pramuka, PMR, Paskibra); kosongkan untuk kembali ke otomatis. Tersimpan saat Anda pindah dari kolom.</p>
  <div class="tw"><table><thead><tr><th>Petugas</th><th>Asal ekskul</th></tr></thead><tbody>${ps.map(m=>`<tr><td>${esc(m.nama)}<small>${esc(m.kelas)}</small></td><td><input data-asal="${esc(m.id)}" list="dlek" maxlength="60" value="${esc(asalTxt(m.id))}" placeholder="Isi asal ekskul" autocomplete="off" aria-label="Asal ekskul ${esc(m.nama)}"></td></tr>`).join('')}</tbody></table></div>`:'';
}
function simpanAsal(inp){
  const id=S.jp,sid=inp.dataset.asal,val=inp.value.trim().slice(0,60);S.d.asal=S.d.asal||{};
  if((S.d.asal[sid]||'')===val)return;
  const lama=S.d.asal[sid];S.d.asal[sid]=val;renderJadwalTabel();
  send('saveAsalPetugas',{ekskul:id,baris:[{s:sid,a:val}]},()=>{S.d.asal[sid]=lama;renderJadwal()});
}
function tambahJadwal(f){
  const id=S.jp,e=f.elements,sid=S.lab[e.s.value],hr=$$('input[name=jh]:checked',f).map(i=>i.value),adm=S.d.user.peran==='kesiswaan',as=e.a.value.trim().slice(0,60);
  if(!sid)return toast('Pilih petugas dari daftar saran','err');
  if(!hr.length)return toast('Pilih minimal satu hari','err');
  const anggota=S.d.anggota.some(a=>a.e===id&&a.s===sid);
  if(!anggota&&!adm)return toast('Siswa ini belum anggota kegiatan. Tambahkan lewat Kelola Anggota.','err');
  S.d.jadwal=S.d.jadwal||[];
  const tam=hr.filter(h=>!S.d.jadwal.some(j=>j.e===id&&j.h===h&&j.s===sid)).map(h=>({h,s:sid}));
  if(!tam.length)return toast('Petugas ini sudah terjadwal pada hari yang dipilih','err');
  tam.forEach(x=>S.d.jadwal.push({e:id,h:x.h,s:x.s}));if(!anggota)S.d.anggota.push({e:id,s:sid});
  S.d.asal=S.d.asal||{};if(as)S.d.asal[sid]=as;
  f.reset();renderEks();
  send('saveJadwalPetugas',{ekskul:id,tambah:tam,hapus:[],asal:as?[{s:sid,a:as}]:[]},()=>{S.d.jadwal=S.d.jadwal.filter(j=>!(j.e===id&&tam.some(x=>x.h===j.h&&x.s===j.s)));if(!anggota)S.d.anggota=S.d.anggota.filter(a=>!(a.e===id&&a.s===sid));renderEks()});
}
function hapusJadwal(btn){
  const id=S.jp,h=btn.dataset.h,sid=btn.dataset.id,lama=S.d.jadwal.slice();
  S.d.jadwal=S.d.jadwal.filter(j=>!(j.e===id&&j.h===h&&j.s===sid));renderEks();
  send('saveJadwalPetugas',{ekskul:id,tambah:[],hapus:[{h,s:sid}]},()=>{S.d.jadwal=lama;renderEks()});
}
function jadwalData(){const id=S.jp,e=S.d.ekskul.find(x=>x.id===id);return e?{e,per:hariKegiatan(e).map(h=>({h,ms:jadwalHari(id,h)}))}:null}
function jadwalCetak(){
  const d=jadwalData();if(!d)return;const n=new Date();
  cetakHTML(`<div class="lap">${kopHTML()}<h2 style="text-align:center;margin:6px 0 10px">JADWAL PETUGAS ${esc(String(d.e.nama_ekskul).toUpperCase())}</h2><p style="text-align:center;margin:0 0 8px">${esc(hariTxt(d.e))} · ${esc(String(d.e.jam).slice(0,5))}${d.e.lokasi?' · '+esc(d.e.lokasi):''}</p>`
    +d.per.map(x=>`<h3>${esc(x.h)} (${x.ms.length} petugas)</h3><table><thead><tr><th>No</th><th>Nama petugas</th><th>Kelas</th><th>Asal ekskul</th></tr></thead><tbody>${x.ms.map((m,i)=>`<tr><td>${i+1}</td><td>${esc(m.nama)}</td><td>${esc(m.kelas)}</td><td>${esc(asalTxt(m.id)||'-')}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada petugas</td></tr>'}</tbody></table>`).join('')
    +`<p style="font-size:11px;margin-top:14px">Dicetak ${esc(tglID(iso(n)))} ${esc(hm(n))} oleh ${esc(S.d.user.nama)}</p></div>`);
}
function jadwalXl(){
  const d=jadwalData();if(!d)return;if(!window.XLSX)return toast('Pustaka Excel belum termuat. Tunggu sebentar lalu coba lagi.','err');
  const aoa=[['Jadwal Petugas',d.e.nama_ekskul],['Hari kegiatan',hariTxt(d.e)],[],['Hari','No','Nama petugas','Kelas','NISN','Asal Ekskul']];
  d.per.forEach(x=>{if(!x.ms.length)aoa.push([x.h,'','(belum ada petugas)','','','']);x.ms.forEach((m,i)=>aoa.push([x.h,i+1,m.nama,m.kelas,m.nisn,asalTxt(m.id)||'-']))});
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:10},{wch:5},{wch:32},{wch:12},{wch:14},{wch:34}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Jadwal Petugas');saveWb(wb,('Jadwal_Petugas_'+d.e.nama_ekskul+'.xlsx').replace(/[^\w.\-]+/g,'_'));toast('File Excel jadwal diunduh');
}
function penggantiTambah(){
  const sel=$('#pgn');if(!sel||!sel.value)return toast('Pilih petugas pengganti dulu','err');
  const m=S.map[sel.value];if(!m)return;
  const cur=(S.prow||[]).map(r=>{const tr=$$('#pf tr[data-s]').find(t=>t.dataset.s===r.id);return{...r,st:S.att[r.id]||'hadir',n:tr?$('[data-n]',tr).value:r.n}});
  cur.push({...m,st:'hadir',n:'Pengganti',asal:asalTxt(m.id),pengganti:true});
  formPres({...S.pctx,ekskul:S.ek,tgl:$('#pd').value,rows:cur});
}
/* ── Event (delegasi) ── */
const A={
  nav:e=>go(e.dataset.p),menu:()=>document.body.classList.toggle('nav-open'),out:()=>out(),
  theme:()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;sv('theme',t)},
  per:e=>{S.per=e.dataset.v;renderDash()},pres:e=>openPres(e.dataset.id),closepres:()=>{$('#pf').innerHTML='';S.ed=null},rwedit:e=>editPres(e.dataset.id,e),rwxl:e=>unduhPertemuan(e.dataset.id,e),rwdel:delPres,unduhrw:e=>unduhRiwayat(e),
  mark:e=>{const tr=e.closest('tr');S.att[tr.dataset.s]=e.dataset.v;$$('button',tr).forEach(b=>b.className=b.dataset.v+(b===e?' on':''));sum()},
  markall:()=>{$$('#pf tr[data-s]').forEach(tr=>{S.att[tr.dataset.s]='hadir';$$('button',tr).forEach(b=>b.className=b.dataset.v+(b.dataset.v==='hadir'?' on':''))});sum()},
  savepres:savePres,tab:e=>{S.tab=e.dataset.v;S.pg=1;S.sel.clear();renderPel()},page:e=>{const k=e.dataset.k,v=+e.dataset.v;if(k==='pel'){S.pg=v;renderPel()}else{S.pgx[k]=v;({pr:renderPres,pd:renderPend,sw:renderSis,rw:renderRiwayat,nl:renderNilai})[k]()}},
  view:e=>viewFile(e.dataset.id),vclose:()=>$('#vm').close(),
  impor:()=>$('#csv').click(),xl:expXl,cetak:()=>print(),gdef:defSet,
  lt:e=>{$('#lg').hidden=e.dataset.v==='o';$('#lo').hidden=e.dataset.v!=='o'},
  bukti:e=>bukti(e.dataset.id,false,e),
  jtpl:jTemplat,jimp:()=>$('#jfile').click(),jkirim:e=>jKirim(e),jtutup:()=>{S.jprev=null;$('#jimpbox').innerHTML=''},
  utpl:uTemplat,uimp:()=>$('#ufile').click(),ukirim:e=>uKirim(e),uhxl:uHasilXl,ututup:()=>{S.uprev=null;S.ares=null;$('#uimpbox').innerHTML=''},
  jbaru:()=>{const f=$('#fj');f.reset();f.elements.id.value='';$('#fjt').textContent='Tambah Jenis Pelanggaran';$('#jw').hidden=true;f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  jbatal:()=>{$('#fj').hidden=true},
  jedit:e=>{const j=S.d.jenis.find(x=>x.id===e.dataset.id),f=$('#fj'),m=f.elements;if(!j)return;m.id.value=j.id;m.n.value=j.nama;m.k.value=KATS.includes(j.kat)?j.kat:'';m.p.value=j.poin;$('#fjt').textContent='Ubah Jenis Pelanggaran';$('#jw').hidden=false;f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  jtog:e=>{const j=S.d.jenis.find(x=>x.id===e.dataset.id);if(!j)return;j.a=j.a===false;S.jm[j.id]=j;fillForms();renderAll();toast(j.a?'Jenis diaktifkan':'Jenis dinonaktifkan');jenisKirim(j)},
  hdel:e=>confirmHapusCat([e.dataset.id]),hdelsel:()=>confirmHapusCat([...S.sel]),hsemua:()=>{S.allIds.forEach(i=>S.sel.add(i));renderPel()},hbatal:()=>{S.sel.clear();renderPel()},
  thtab:e=>{$$('[data-act=thtab]').forEach(b=>b.classList.toggle('on',b===e));$('#th-in').hidden=e.dataset.v!=='in';$('#th-rk').hidden=e.dataset.v!=='rk'},
  thsemua:()=>{$$('#thf [data-tf=st]').forEach(x=>{x.value='hadir';thLock(x.closest('tr'))});thSum()},thsimpan:e=>thSimpan(e),thxl:thXl,tmclose:()=>$('#tm').close(),
  thriw:e=>{const x=S.thr.rows.find(z=>z.id===e.dataset.id);if(!x)return;$('#tmt').textContent='Riwayat Tahfidz — '+x.nama;$('#tmb').innerHTML=`<p class="mu">Posisi terakhir: ${esc(x.ter||'belum ada')} · total ${x.total} ayat</p>`+thRiwTabel(x.riw);$('#tm').showModal()},
  thnilai:()=>{S.nv=S.nv||{ek:'',per:'',edits:{}};if(Object.keys(S.nv.edits).length)return toast('Simpan atau batalkan perubahan nilai dulu','err');S.nv.ek='TAHFIDZ';S.nv.kl=undefined;go('nilai');renderNilai()},
  pverif:e=>{const x=S.d.pres.find(z=>z.id===e.dataset.id);if(!x)return;x.st='terverifikasi';x.ca='';renderAll();toast('Prestasi diverifikasi');queue('verifPrestasi',{id:x.id,status:'terverifikasi'})},
  ptolak:e=>{S.dx={tolak:e.dataset.id};$('#dt').textContent='Tolak laporan prestasi';$('#db').innerHTML='<p>Tolak laporan prestasi ini? Sertifikat yang diunggah dipindahkan ke Sampah Drive.</p><label>Alasan (opsional, tampil di akun orang tua)<input id="tka" maxlength="150" placeholder="mis. Sertifikat tidak terbaca"></label>';$('#dok').disabled=false;$('#dm').showModal()},
  pdel:e=>confirmHapusPres([e.dataset.id]),ppdel:()=>confirmHapusPres([...S.psel]),ppbatal:()=>{S.psel.clear();renderPres()},
  ppmenunggu:()=>{S.d.pres.filter(x=>x.st==='menunggu').forEach(x=>S.psel.add(x.id));renderPres()},
  ppverif:()=>{const ids=[...S.psel];if(!ids.length)return;if(ids.length>200)return toast('Maksimal 200 prestasi sekali proses','err');ids.forEach(i=>{const x=S.d.pres.find(z=>z.id===i);if(x){x.st='terverifikasi';x.ca=''}});S.psel.clear();renderAll();toast(ids.length+' prestasi diverifikasi');queue('verifPrestasi',{ids,status:'terverifikasi'})},
  prtampil:()=>{S.prf='menunggu';$('#prf').value='menunggu';S.pgx.pr=1;renderPres()},prxl:e=>rekapPrestasiUnduh(e),
  ppo:()=>{const f=$('#fpo');f.hidden=!f.hidden;if(!f.hidden){f.elements.t.max=iso(new Date());f.scrollIntoView({behavior:'smooth',block:'center'})}},
  segar:async e=>{e.classList.add('load');try{const r=await gs('segarkanData',S.t,{});if(r.message==='SESI')return out(1);if(!r.success)toast(r.message,'err');else{await refresh();toast('Data dimuat ulang dari spreadsheet')}}catch(x){toast('Gagal menyegarkan. Periksa koneksi lalu coba lagi.','err')}e.classList.remove('load')},
  gubah:()=>bukaGanti(false),gtutup:()=>$('#gm').close(),gkeluar:()=>out(),
  sandiawal:e=>konfirmSandiAwal([e.dataset.id]),saresetsemua:()=>konfirmSandiAwal(S.d.users.filter(u=>['pembina','pelatih'].includes(u.r)&&u.id!==S.d.user.id).map(u=>u.id)),
  satamp:async e=>{const c=$('#sacur');if(c.dataset.on==='1'){c.value='••••••••';c.dataset.on='0';e.textContent='Tampilkan';return}e.classList.add('load');try{const r=await gs('getSandiAwal',S.t);if(r.success){c.value=r.data.ada?r.data.sandi:'(belum diatur)';c.dataset.on='1';e.textContent='Sembunyikan'}else toast(r.message,'err')}catch(x){toast(pesanGagal(x),'err')}e.classList.remove('load')},
  sasimpan:async e=>{const i=$('#sanew'),v=i.value.trim();if(v.length<8)return toast('Kata sandi awal minimal 8 karakter','err');e.classList.add('load');try{const r=await gs('setSandiAwal',S.t,{sandi:v});if(r.message==='SESI'){e.classList.remove('load');return out(1)}if(!r.success)toast(r.message,'err');else{i.value='';const c=$('#sacur');c.value='••••••••';c.dataset.on='0';$('#satamp').textContent='Tampilkan';S.saCek=1;$('#sawarn').hidden=true;toast('Kata sandi awal diperbarui. Berlaku untuk impor dan atur ulang berikutnya.')}}catch(x){toast(pesanGagal(x),'err')}e.classList.remove('load')},
  jadwal:e=>bukaJadwal(e.dataset.id),jtutup:()=>{S.jp=null;$('#jpf').innerHTML=''},jdel:e=>hapusJadwal(e),jxl:()=>jadwalXl(),jcetak:()=>jadwalCetak(),pengganti:()=>penggantiTambah(),
  lapsiswa:e=>bukaLaporan(e.dataset.id,'',''),laportu:()=>lapOrtu(),lapcetak:()=>cetakLap(),lapxl:()=>lapXl(),laptutup:()=>$('#lm').close(),
  ekpilih:e=>bukaEk(e.dataset.id),eksimpan:simpanEk,ektutup:()=>$('#ekm').close(),rwpindah:e=>dlgPindah(e.dataset.id),
  nsimpan:nSimpan,nxl:nUnduh,nimp:()=>$('#nfile').click(),
  nbatal:()=>{S.nv.edits={};$('#nimp').innerHTML='';renderNilai()},
  mem:e=>{S.mk=e.dataset.id;renderMem();$('#fm').scrollIntoView({behavior:'smooth'})},mclose:()=>{$('#fm').hidden=true},
  msimpan:simpanMem,
  mbatal:()=>{S.add.clear();S.del.clear();memList();memRes(S.mr.length?'':'Cari nama/NISN atau pilih kelas untuk menampilkan siswa.');memPend()},
  mall:()=>{S.mr.forEach(x=>{if(!isMem(x.id))S.add.add(x.id)});memRes();memPend()},
  mnone:()=>{S.add.clear();memRes(S.mr.length?'':'Cari nama/NISN atau pilih kelas untuk menampilkan siswa.');memPend()},
  hrsemua:()=>$$('#fe input[name=h]').forEach(i=>{i.checked=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'].includes(i.value)}),
  kbaru:()=>{const f=$('#fe');f.reset();f.elements.id.value='';$('#fet').textContent='Tambah Ekskul';f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  kbatal:()=>{$('#fe').hidden=true},
  kedit:e=>{const x=S.d.ekskul.find(z=>z.id===e.dataset.id),f=$('#fe'),m=f.elements;if(!x)return;m.id.value=x.id;m.n.value=x.nama_ekskul;$$('input[name=h]',f).forEach(i=>{i.checked=String(x.hari).split(',').map(z=>z.trim()).includes(i.value)});m.j.value=String(x.jam).slice(0,5);m.l.value=x.lokasi||'';m.m.value=x.mode==='petugas'?'petugas':'';$('#fet').textContent='Ubah Ekskul';f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  kang:e=>{S.mk=e.dataset.id;S.mem=new Set(S.d.anggota.filter(a=>a.e===S.mk).map(a=>a.s));S.qk='';S.kl='';renderAng();$('#fa').scrollIntoView({behavior:'smooth'})},
  atutup:()=>{$('#fa').hidden=true},apilih:()=>{flt().forEach(x=>S.mem.add(x.id));refAng()},akosong:()=>{flt().forEach(x=>S.mem.delete(x.id));refAng()},asimpan:simpanAng,
  kdel:e=>two(e,'Yakin?',()=>{const id=e.dataset.id;
    if(S.d.pertemuan.some(x=>x.e===id))return toast('Ekskul ini sudah punya riwayat presensi sehingga tidak bisa dihapus','err');
    const u=(S.d.users||[]).find(x=>x.ek===id);if(u)return toast('Akun "'+u.nm+'" masih mengampu ekskul ini. Pindahkan akunnya dulu.','err');
    S.d.ekskul=S.d.ekskul.filter(x=>x.id!==id);S.d.anggota=S.d.anggota.filter(a=>a.e!==id);fillMore();renderAll();toast('Ekskul dihapus');queue('hapusEkskul',{id})}),kirimb:e=>two(e,'Kirim?',()=>bukti(e.dataset.id,true,e)),
  sbaru:()=>{const f=$('#fs');f.reset();f.elements.id.value='';$('#fst').textContent='Tambah Siswa';f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  sbatal:()=>{$('#fs').hidden=true},
  sdel:async e=>{const x=S.d.siswa.find(z=>z.id===e.dataset.id);if(!x)return;e.classList.add('load');
    try{const r=await gs('ringkasSiswa',S.t,{id:x.id});
      if(r.message==='SESI'){e.classList.remove('load');return out(1)}
      if(!r.success)toast(r.message,'err');else confirmDel(x,r.data);
    }catch(err){toast('Gagal memeriksa data siswa. Coba lagi.','err')}
    e.classList.remove('load')},
  dbatal:()=>$('#dm').close(),dok:hapusSis,
  sedit:e=>{const x=S.d.siswa.find(z=>z.id===e.dataset.id),f=$('#fs'),m=f.elements;if(!x)return;m.id.value=x.id;m.n.value=x.nama;m.b.value=x.nisn;m.k.value=x.kelas||'';m.m.value=x.no||'';m.o.value=x.ot||'';m.t.value=x.kt||'';m.e.value=x.em||'';$('#fst').textContent='Ubah Siswa';f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  soff:e=>two(e,'Yakin?',()=>{const i=S.d.siswa.findIndex(z=>z.id===e.dataset.id);if(i<0)return;const x=S.d.siswa.splice(i,1)[0];S.d.total--;reidx();renderAll();toast('Siswa dinonaktifkan');queue('saveSiswa',{...x,aktif:false})}),
  ubaru:()=>{const f=$('#fu');f.reset();f.elements.id.value='';f.elements.k.disabled=false;$('#fut').textContent='Tambah Akun';$('#pwh').textContent='(minimal 8 karakter)';f.elements.p.required=true;f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  ubatal:()=>{$('#fu').hidden=true},
  uedit:e=>{const u=S.d.users.find(z=>z.id===e.dataset.id),f=$('#fu'),m=f.elements;if(!u)return;m.id.value=u.id;m.n.value=u.nm;m.u.value=u.u;m.r.value=u.r;m.k.value=u.ek||m.k.value;m.k.disabled=noEk(u.r)||!u.r;m.p.value='';m.p.required=false;$('#fut').textContent='Ubah Akun';$('#pwh').textContent='(kosongkan jika tidak diubah)';f.hidden=false;f.scrollIntoView({behavior:'smooth'})},
  utog:e=>{const u=S.d.users.find(z=>z.id===e.dataset.id);if(!u)return;u.a=!u.a;renderUsr();send('setAktifAkun',{id:u.id,a:u.a},()=>{u.a=!u.a;renderUsr()})},
  udel:e=>{const u=S.d.users.find(z=>z.id===e.dataset.id);if(u)confirmHapusAkun(u)},
};
document.addEventListener('click',ev=>{if(window.AndroidApp&&S.vf&&ev.target.closest('#vd')){ev.preventDefault();AndroidApp.saveFile(S.vf.data,S.vf.name,S.vf.mime);return}
  const e=ev.target.closest('[data-act]');if(e&&A[e.dataset.act]&&e.tagName!=='SELECT')A[e.dataset.act](e)});
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.dataset&&t.dataset.asal!==undefined&&S.jp){simpanAsal(t);return}
  if(t.id==='pd'&&S.ek&&isPetugas(S.ek)&&!S.ed&&t.value&&$('#pf').innerHTML){formPres({ekskul:S.ek,judul:'Form Presensi',tgl:t.value,ke:S.d.pertemuan.filter(x=>x.e===S.ek).length+1,materi:'',pelatih:false,rows:petugasRows(S.ek,t.value)});return}
  if(t.id==='ckall'){S.pageIds.forEach(i=>t.checked?S.sel.add(i):S.sel.delete(i));renderPel();return}
  if(t.dataset.ck){t.checked?S.sel.add(t.dataset.ck):S.sel.delete(t.dataset.ck);hBar();return}
  if(t.id==='thk'||t.id==='thd'){thMuat();return}
  if(t.dataset.tf==='st'){thLock(t.closest('tr'));thSum();return}
  if(t.id==='dc'){$('#dok').disabled=!t.checked;return}
  if(t.dataset.jk){const j=S.d.jenis.find(x=>x.id===t.dataset.jk);if(!j)return;if(!t.value)return renderJenis();j.kat=t.value;S.jm[j.id]=j;renderAll();toast('Kategori diubah ke '+j.kat);jenisKirim(j);return}
  if(t.id==='prf'){S.prf=t.value;S.psel.clear();S.pgx.pr=1;renderPres();return}
  if(t.id==='pckall'){(S.ppage||[]).forEach(i=>t.checked?S.psel.add(i):S.psel.delete(i));renderPres();return}
  if(t.dataset.pk){t.checked?S.psel.add(t.dataset.pk):S.psel.delete(t.dataset.pk);pBar();return}
  if(t.id==='kls'){lihatKelas(t.value);return}
  if(t.id==='nk'||t.id==='np2'||t.id==='nkls'){if(Object.keys(S.nv.edits).length){toast('Simpan atau batalkan perubahan nilai dulu','err');renderNilai();return}S.nv[{nk:'ek',np2:'per',nkls:'kl'}[t.id]]=t.value;S.pgx.nl=1;if(t.id==='nk')S.nv.kl=undefined;renderNilai();return}
  if(t.dataset.nc){nCatatan(t.dataset.nc,t.value.trim());return}
  if(t.dataset.ns){nPilih(t);return}
  if(t.id==='ufile'){if(t.files[0])uImpor(t.files[0]);t.value='';return}
  if(t.id==='jfile'){if(t.files[0])jImpor(t.files[0]);t.value='';return}
  if(t.id==='jperb'){S.jperb=t.checked;renderJPrev();return}
  if(t.id==='nfile'){if(t.files[0])nImpor(t.files[0]);t.value='';return}
  if(t.id==='hk'||t.id==='hd'||t.id==='hs'){S.pgx.rw=1;renderRiwayat();return}
  if(t.dataset.mc){const id=t.dataset.id;
    if(t.dataset.mc==='add'){t.checked?S.add.add(id):S.add.delete(id)}
    else{t.checked?S.del.delete(id):S.del.add(id);t.closest('tr').style.opacity=t.checked?'':'.5'}
    memPend();return}
  if(t.dataset.uf){editUsr(t);return}
  if(t.id==='ka'){S.kl=t.value;refAng();return}
  if(t.dataset.sid){t.checked?S.mem.add(t.dataset.sid):S.mem.delete(t.dataset.sid);$('#ac').textContent=S.mem.size+' anggota terpilih';return}
  if(t.id==='csv'){if(t.files[0])impor(t.files[0]);t.value='';return}
  if(t.name==='r'&&t.form&&t.form.getAttribute('id')==='fu'){t.form.elements.k.disabled=noEk(t.value)||!t.value;return}
  if(t.dataset.act==='rows'){S.n=+t.value;S.pg=1;renderPel()}
  else if(t.dataset.act==='setst'){const x=S.d.pend.find(p=>p.id===t.dataset.id);if(!x)return;x.st=t.value;renderPend();renderDash();queue('setStatusPendaftaran',{id:x.id,status:x.st});toast('Status diperbarui')}});
document.addEventListener('submit',ev=>{ev.preventDefault();({lg:doLogin,fp:addPel,ft:addTer,fr:addPres,fd:addPend,fs:savSis,fu:savUsr,fg:savSet,fgs:gantiKirim,fls:laporanForm,fjd:tambahJadwal,fl:tampil,lo:doLoginOrtu,fe:savEks,fj:savJenis,fth:thRekap,fpo:ortuKirimPres})[ev.target.getAttribute('id')]?.(ev.target)});
let dt;document.addEventListener('input',ev=>{if(ev.target.id==='qm'){clearTimeout(dt);const v=ev.target.value.trim();dt=setTimeout(()=>cari(v),400);return}if(ev.target.id==='qa'){clearTimeout(dt);const v=ev.target.value;dt=setTimeout(()=>{S.qk=v.trim().toLowerCase();refAng()},250);return}if(ev.target.type==='color'){document.documentElement.style.setProperty(ev.target.name==='a'?'--pri':'--side',ev.target.value);return}const k=ev.target.dataset.q;if(!k)return;clearTimeout(dt);const v=ev.target.value.trim().toLowerCase();dt=setTimeout(()=>{if(k==='q')S.sel.clear();if(k==='qp')S.psel.clear();S[k]=v;S.pg=1;S.pgx.pr=1;S.pgx.pd=1;S.pgx.sw=1;({dq:renderDash,q:renderPel,qp:renderPres,qd:renderPend,qs:renderSis})[k]()},120)});
addEventListener('popstate',e=>{const p=e.state&&e.state.p;if(S.d&&p&&p!==S.p&&NAV.find(n=>n[0]===p&&navBoleh(n,{kesiswaan:3,pembina:4,pelatih:5,ortu:6,disiplin:7,tahfidz:8}[S.d.user.peran])))go(p,true)});
addEventListener('online',flush);setInterval(flush,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.t&&Date.now()-S.last>60000&&!(ld('out')||[]).length)refresh()});
/* ── Konfigurasi publik (mode login orang tua): tampil dari cache dulu, perbarui di latar. Sekaligus "membangunkan" server lebih awal ── */
const APP_VERSI='2.3.2',APP_BUILD=12; // naikkan APP_BUILD bersama API_BUILD (Api.gs) tiap rilis
function cekVersi(d){ // memberi tahu bila server (Apps Script) dan tampilan (GitHub) tidak sepasang
  const sb=Number(d&&d.build)||0,bar=$('#verbar');let m='';
  if(sb<APP_BUILD)m=`Server belum diperbarui (server ${d&&d.versi?'v'+d.versi:'versi lama'}, aplikasi v${APP_VERSI}). Ganti Kode.gs dan Api.gs di Apps Script, lalu Deploy → Manage deployments → pensil → New version.`;
  else if(sb>APP_BUILD)m=`Tampilan di perangkat ini belum yang terbaru (server v${d.versi}, aplikasi v${APP_VERSI}). Tekan Ctrl+F5 untuk memuat ulang.`;
  bar.hidden=!m;bar.textContent=m;
  $$('.vinfo').forEach(x=>x.textContent=`Aplikasi v${APP_VERSI} · Server ${d&&d.versi?'v'+d.versi:'(versi lama)'}`);
}
async function muatCfg(){
  if(!API_URL||/GANTI/i.test(API_URL))return;
  try{const r=await fetch(API_URL+(API_URL.includes('?')?'&':'?')+'aksi=publik',{credentials:'omit'}),j=await r.json();
    if(j&&j.success&&j.data){sv('cfg',j.data);cekVersi(j.data);if(j.data.ortuMode!==ORTU_MODE){ORTU_MODE=j.data.ortuMode;applyOrtuMode()}}}catch(e){}
}
/* ── Penyegaran hemat kuota: bertanya versi data (server hanya membaca cache, tanpa membuka spreadsheet); muat ulang hanya bila berubah ── */
function mulaiPolling(){
  const ms=+CFG.POLL_MS||0;S.aktif=Date.now();
  ['pointerdown','keydown','scroll','touchstart'].forEach(ev=>addEventListener(ev,()=>{S.aktif=Date.now()},{passive:true}));
  if(!ms)return;
  setInterval(async()=>{
    if(document.hidden||!S.t||!S.d||busy||(ld('out')||[]).length||Date.now()-S.aktif>600000)return; // tab tersembunyi / ada antrean / diam >10 menit → berhenti
    const a=document.activeElement;if((a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))||$$('dialog[open]').length)return; // jangan ganggu yang sedang mengetik
    try{const r=await rpc({fn:'cekPerubahan',args:[S.t,S.d.ver||'']},{retry:0,timeout:15000});
      if(r.message==='SESI')return out(1);
      if(r.success&&r.data.berubah)refresh()}catch(e){}
  },ms);
}
/* ── Service worker: cangkang aplikasi tersimpan di perangkat → buka seketika, juga saat sinyal buruk ── */
function daftarSW(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  const punya=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(punya)toast('Pembaruan aplikasi tersedia. Muat ulang halaman untuk memakainya.')});
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
muatCfg();daftarSW();start();mulaiPolling();
