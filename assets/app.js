
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(2)+' MB';
const base=n=>n.replace(/\.[^.]+$/,'');
const ext=n=>(n.split('.').pop()||'').toLowerCase();
const lib=(name,ok)=>{ if(!ok) throw new Error(name+' library could not load. Check your internet connection and reload the page.'); };

/* ---------- icons ---------- */
const IC={
  home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  doc:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  swap:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  table:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  resize:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  eraser:'<path d="M7 21l-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 21"/><path d="M22 21H7M5 11l9 9"/>',
  layers:'<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  bolt:'<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V22h16"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const ico=k=>`<svg class="svg" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
try{ pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(e){}

/* ---------- toast + saving ---------- */
let toastT;
function toast(msg,bad){ const h=$('#toastHost'); h.innerHTML=`<div class="toast ${bad?'bad':''}" role="status">${esc(msg)}</div>`; clearTimeout(toastT); toastT=setTimeout(()=>h.innerHTML='',3800); }
let dlCap=null;
try{ if(window.claude&&claude.use){ claude.use('downloads').then(d=>{dlCap=d;}).catch(()=>{}); } }catch(e){}
async function saveFile(blob,name){
  if(dlCap){
    try{ await dlCap.save({filename:name,data:blob}); toast('Saved '+name); }
    catch(e){ if(e&&e.code==='declined')return; toast('Could not save the file: '+((e&&e.message)||'unknown error'),true); }
    return;
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function busy(box,msg){ box.innerHTML=`<div class="busy"><div class="spin"></div><span class="msg">${esc(msg)}</span></div>`; }
function progress(box,msg){ const m=$('.msg',box); if(m)m.textContent=msg; }
function fail(box,e){ console.error(e); box.innerHTML=`<div class="err"><b>That didn’t work.</b> ${esc((e&&e.message)||e)}</div>`; }
function result(box,blob,name,extra){
  box.innerHTML=`<div class="res"><div class="l"><span class="ok">${ico('check')}</span><div class="t"><b>${esc(name)}</b><span>Ready · ${fmt(blob.size)}${extra?' · '+esc(extra):''}</span></div></div><button class="btn primary" type="button">${ico('download')}Download</button></div>`;
  $('button',box).onclick=()=>saveFile(blob,name);
}
const nextFrame=()=>new Promise(r=>setTimeout(r,30));

/* ---------- drop zone ---------- */
function dz(label,accept,small){
  return `<label class="dz ${small?'small':''}" tabindex="0"><input type="file" accept="${accept}" hidden><span class="up">${ico('upload')}</span><div><b>${label}</b><span class="s">Click to choose a file, or drag and drop it here</span></div></label>`;
}
function bindDz(root,cb){
  const inp=$('input',root);
  inp.onchange=()=>{ if(inp.files.length){ const f=[...inp.files]; inp.value=''; cb(f); } };
  ['dragenter','dragover'].forEach(e=>root.addEventListener(e,ev=>{ev.preventDefault();root.classList.add('over');}));
  ['dragleave','drop'].forEach(e=>root.addEventListener(e,ev=>{ev.preventDefault();root.classList.remove('over');}));
  root.addEventListener('drop',ev=>{ const f=[...ev.dataTransfer.files]; if(f.length)cb(f); });
  root.addEventListener('keydown',ev=>{ if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();inp.click();} });
}

/* ---------- shared converters ---------- */
async function htmlToPdf(html,landscape){
  lib('html2canvas',window.html2canvas); lib('jsPDF',window.jspdf);
  const host=document.createElement('div'); host.className='pdfhost';
  host.style.width=(landscape?1123:794)+'px';
  host.innerHTML=html; document.body.appendChild(host);
  await nextFrame();
  let canvas;
  try{
    const scale=Math.max(0.6,Math.min(2,28000/Math.max(host.scrollHeight,1)));
    canvas=await html2canvas(host,{scale,backgroundColor:'#ffffff',useCORS:true,logging:false});
  } finally { host.remove(); }
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:landscape?'l':'p',unit:'pt',format:'a4'});
  const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
  const ratio=pw/canvas.width, pageH=Math.floor(ph/ratio);
  let y=0,pages=0;
  while(y<canvas.height){
    const h=Math.min(pageH,canvas.height-y);
    const c=document.createElement('canvas'); c.width=canvas.width; c.height=h;
    const cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,c.width,h);
    cx.drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
    if(pages++)pdf.addPage();
    pdf.addImage(c.toDataURL('image/jpeg',0.92),'JPEG',0,0,pw,h*ratio);
    y+=h;
  }
  return {blob:pdf.output('blob'),pages};
}
function sheetRows(ws){
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
  while(rows.length&&rows[rows.length-1].every(c=>String(c).trim()===''))rows.pop();
  return rows;
}
function rowsToTable(rows,cls,max){
  const cut=max&&rows.length>max; const r=cut?rows.slice(0,max):rows;
  const cols=r.reduce((m,x)=>Math.max(m,x.length),0);
  let h=`<table class="${cls||''}">`;
  for(const row of r){ h+='<tr>'; for(let c=0;c<cols;c++)h+=`<td>${esc(row[c]??'')}</td>`; h+='</tr>'; }
  return h+'</table>'+(cut?`<p style="font:13px Arial">Showing the first ${max} of ${rows.length} rows.</p>`:'');
}
const RTL=/[\u0590-\u08FF]/;

/* ---------- tool: Word -> PDF ---------- */
function toolWordPdf(v){
  v.innerHTML=head('word-pdf')+`<div id="d"></div>
  <div class="panel" style="margin-top:16px"><div class="row"><div class="field"><label for="o">Page orientation</label><select id="o"><option value="p">Portrait</option><option value="l">Landscape</option></select></div></div></div>
  <div id="out"></div>
  <p class="hint">Works with .docx files. For an old .doc file, open it in Word and choose Save As → Word Document (.docx) first. Fonts, images and tables are kept; the PDF pages are image-based.</p>`;
  $('#d').innerHTML=dz('Choose a Word file (.docx)','.docx');
  bindDz($('#d .dz'),async files=>{
    const f=files[0], out=$('#out');
    if(ext(f.name)!=='docx'){ return fail(out,new Error('Please choose a .docx file.')); }
    busy(out,'Reading your document…');
    try{
      lib('mammoth',window.mammoth);
      const r=await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()});
      progress(out,'Building the PDF…');
      const {blob,pages}=await htmlToPdf(`<div>${r.value}</div>`,$('#o').value==='l');
      result(out,blob,base(f.name)+'.pdf',pages+(pages===1?' page':' pages'));
    }catch(e){ fail(out,e); }
  });
}

/* ---------- tool: PDF -> Word ---------- */
function pageToParas(items){
  const lines=[]; let cur=null;
  for(const it of items){
    if(!('str' in it))continue;
    const x=it.transform[4], y=it.transform[5], h=it.height||Math.abs(it.transform[3])||10;
    if(!cur||Math.abs(y-cur.y)>h*0.5){ if(cur&&cur.t.trim())lines.push(cur); cur={y,h,t:'',end:null}; }
    if(cur.end!==null&&x-cur.end>h*0.15&&!/\s$/.test(cur.t)&&!/^\s/.test(it.str))cur.t+=' ';
    cur.t+=it.str; cur.end=x+(it.width||0);
  }
  if(cur&&cur.t.trim())lines.push(cur);
  if(!lines.length)return [];
  const gaps=[]; for(let i=1;i<lines.length;i++)gaps.push(Math.abs(lines[i-1].y-lines[i].y));
  const sorted=[...gaps].sort((a,b)=>a-b); const med=sorted.length?sorted[Math.floor(sorted.length/2)]:0;
  const paras=[lines[0].t.trim()];
  for(let i=1;i<lines.length;i++){
    if(med&&gaps[i-1]>med*1.45)paras.push(lines[i].t.trim());
    else paras[paras.length-1]+=' '+lines[i].t.trim();
  }
  return paras;
}
async function pdfToDocx(file,out){
  lib('pdf.js',window.pdfjsLib); lib('docx',window.docx);
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const kids=[]; let scanned=0;
  for(let p=1;p<=pdf.numPages;p++){
    progress(out,`Reading page ${p} of ${pdf.numPages}…`); await nextFrame();
    const page=await pdf.getPage(p), tc=await page.getTextContent();
    const paras=pageToParas(tc.items);
    if(paras.length){
      paras.forEach((t,i)=>{ const rtl=RTL.test(t);
        kids.push(new docx.Paragraph({pageBreakBefore:p>1&&i===0,bidirectional:rtl,spacing:{after:140},children:[new docx.TextRun({text:t,rightToLeft:rtl})]})); });
    }else{
      scanned++;
      const vp=page.getViewport({scale:1.6}), c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
      await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.85));
      const data=new Uint8Array(await blob.arrayBuffer()); const sc=Math.min(1,600/vp.width);
      kids.push(new docx.Paragraph({pageBreakBefore:p>1,children:[new docx.ImageRun({data,type:'jpg',transformation:{width:Math.round(vp.width*sc),height:Math.round(vp.height*sc)}})]}));
    }
  }
  progress(out,'Saving the Word file…');
  const doc=new docx.Document({sections:[{children:kids}]});
  return {blob:await docx.Packer.toBlob(doc),pages:pdf.numPages,scanned};
}
function toolPdfWord(v){
  v.innerHTML=head('pdf-word')+`<div id="d"></div><div id="out"></div>
  <p class="hint">Text and paragraphs are extracted and placed in an editable Word file, including Urdu and Arabic text. The original page layout is not reproduced exactly. Pages that are scanned images (no real text) are inserted as pictures.</p>`;
  $('#d').innerHTML=dz('Choose a PDF file','.pdf,application/pdf');
  bindDz($('#d .dz'),async files=>{
    const f=files[0], out=$('#out');
    if(ext(f.name)!=='pdf')return fail(out,new Error('Please choose a .pdf file.'));
    busy(out,'Opening PDF…');
    try{
      const r=await pdfToDocx(f,out);
      result(out,r.blob,base(f.name)+'.docx',r.pages+(r.pages===1?' page':' pages')+(r.scanned?` · ${r.scanned} scanned page${r.scanned>1?'s':''} added as pictures`:''));
    }catch(e){ fail(out,e); }
  });
}

/* ---------- tool: Excel -> Word / PDF ---------- */
function toolExcel(v){
  v.innerHTML=head('excel')+`<div id="d"></div>
  <div class="panel" id="opts" hidden><div class="row"><div class="lbl" id="fname" style="flex:1;font-size:15px;color:var(--ink)"></div>
  <label class="chk"><input type="checkbox" id="land" checked> Landscape pages</label></div>
  <div class="actions"><button class="btn primary" id="toW" type="button">Convert to Word</button><button class="btn primary" id="toP" type="button">Convert to PDF</button></div></div>
  <div id="out"></div>
  <p class="hint">Every sheet in the workbook is converted, one after the other. Works with .xlsx, .xls and .csv. Values appear as they are displayed in Excel; formatting such as colours and merged cells is simplified.</p>`;
  $('#d').innerHTML=dz('Choose an Excel file (.xlsx, .xls, .csv)','.xlsx,.xls,.csv');
  let file=null;
  bindDz($('#d .dz'),f=>{ file=f[0]; if(!['xlsx','xls','csv'].includes(ext(file.name))){file=null;$('#opts').hidden=true;return fail($('#out'),new Error('Please choose an Excel or CSV file.'));}
    $('#out').innerHTML=''; $('#opts').hidden=false; $('#fname').textContent=file.name+' · '+fmt(file.size); });
  const load=async()=>{ lib('SheetJS',window.XLSX); return XLSX.read(await file.arrayBuffer(),{type:'array'}); };
  $('#toW').onclick=async()=>{
    const out=$('#out'); busy(out,'Reading workbook…');
    try{
      lib('docx',window.docx); const wb=await load(); const kids=[]; let total=0;
      wb.SheetNames.forEach((n,i)=>{
        const rows=sheetRows(wb.Sheets[n]); total+=rows.length;
        kids.push(new docx.Paragraph({heading:docx.HeadingLevel.HEADING_2,pageBreakBefore:i>0,spacing:{after:120},children:[new docx.TextRun(n)]}));
        if(!rows.length){kids.push(new docx.Paragraph('(This sheet is empty)'));return;}
        const cols=rows.reduce((m,r)=>Math.max(m,r.length),0);
        const trs=rows.map((r,ri)=>new docx.TableRow({tableHeader:ri===0,children:Array.from({length:cols},(_,c)=>{ const t=String(r[c]??''); const rtl=RTL.test(t);
          return new docx.TableCell({children:[new docx.Paragraph({bidirectional:rtl,children:[new docx.TextRun({text:t,bold:ri===0,size:18,rightToLeft:rtl})]})]}); })}));
        kids.push(new docx.Table({width:{size:100,type:docx.WidthType.PERCENTAGE},rows:trs}));
      });
      progress(out,'Saving the Word file…');
      const props={};
      if($('#land').checked)props.page={size:{orientation:docx.PageOrientation.LANDSCAPE}};
      const doc=new docx.Document({sections:[{properties:props,children:kids}]});
      result(out,await docx.Packer.toBlob(doc),base(file.name)+'.docx',wb.SheetNames.length+' sheet'+(wb.SheetNames.length>1?'s':''));
    }catch(e){fail(out,e);}
  };
  $('#toP').onclick=async()=>{
    const out=$('#out'); busy(out,'Reading workbook…');
    try{
      const wb=await load(); const land=$('#land').checked; let html='';
      wb.SheetNames.forEach((n,i)=>{
        const rows=sheetRows(wb.Sheets[n]); const cols=rows.reduce((m,r)=>Math.max(m,r.length),0);
        const fs=cols>14?8:cols>10?9:cols>7?11:13;
        html+=`<div style="${i?'page-break-before:always;margin-top:30px':''}"><div class="sn">${esc(n)}</div>${rows.length?rowsToTable(rows,'xt').replace('<table','<table style="font-size:'+fs+'px"'):'<p>(This sheet is empty)</p>'}</div>`;
      });
      progress(out,'Building the PDF…'); await nextFrame();
      const {blob,pages}=await htmlToPdf(html,land);
      result(out,blob,base(file.name)+'.pdf',pages+(pages===1?' page':' pages'));
    }catch(e){fail(out,e);}
  };
}

/* ---------- image helpers ---------- */
function loadImage(file){
  return new Promise((res,rej)=>{
    if(!file.type.startsWith('image/'))return rej(new Error('Please choose an image file (JPG, PNG, WEBP, GIF, BMP).'));
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>res(im); im.onerror=()=>rej(new Error('This image could not be opened.')); im.src=url;
  });
}
function toCanvas(im,max){
  let w=im.naturalWidth,h=im.naturalHeight,s=1;
  if(max&&Math.max(w,h)>max){s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
  const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d',{willReadFrequently:true}).drawImage(im,0,0,w,h); return {c,scaled:s<1};
}
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type,q));

/* ---------- tool: resize ---------- */
function toolResize(v){
  v.innerHTML=head('resize')+`<div id="d"></div>
  <div class="panel" id="w" hidden>
    <div class="row" style="align-items:center;gap:16px"><img id="pv" alt="Preview" style="max-height:120px;max-width:200px;border-radius:8px;border:1px solid var(--line)"><div><b id="nm"></b><div class="hint" id="info" style="margin:2px 0 0"></div></div></div>
    <div class="row" style="margin-top:18px">
      <div class="field"><label for="W">Width</label><input type="number" id="W" min="1"></div>
      <div class="field"><label for="H">Height</label><input type="number" id="H" min="1"></div>
      <div class="field"><label for="U">Unit</label><select id="U"><option value="px">Pixels</option><option value="%">Percent</option></select></div>
      <label class="chk"><input type="checkbox" id="L" checked> Keep proportions</label>
    </div>
    <div class="chips" id="pre"></div>
    <div class="row" style="margin-top:16px">
      <div class="field"><label for="F">Save as</label><select id="F"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WEBP</option></select></div>
      <div class="field" style="flex:1;min-width:200px" id="qw"><label for="Q">Quality <span id="qv">90</span>%</label><input type="range" id="Q" min="30" max="100" value="90"></div>
    </div>
    <div class="actions"><button class="btn primary" id="go" type="button">Resize image</button></div>
    <div id="out"></div>
  </div>`;
  $('#d').innerHTML=dz('Choose an image','image/*');
  let im=null,name='',ow=0,oh=0;
  const dims=()=>{ const u=$('#U').value,w=+$('#W').value,h=+$('#H').value; return u==='%'?[Math.max(1,Math.round(ow*w/100)),Math.max(1,Math.round(oh*h/100))]:[Math.max(1,Math.round(w)),Math.max(1,Math.round(h))]; };
  const setPx=(w,h)=>{ $('#U').value='px'; $('#W').value=w; $('#H').value=h; };
  bindDz($('#d .dz'),async f=>{
    try{
      im=await loadImage(f[0]); name=f[0].name; ow=im.naturalWidth; oh=im.naturalHeight;
      $('#w').hidden=false; $('#pv').src=im.src; $('#nm').textContent=name; $('#info').textContent=`Original: ${ow} × ${oh} px · ${fmt(f[0].size)}`;
      setPx(ow,oh); $('#out').innerHTML='';
      $('#F').value=f[0].type==='image/png'?'image/png':f[0].type==='image/webp'?'image/webp':'image/jpeg'; qvis();
      $('#pre').innerHTML=[['Instagram 1080×1080',1080,1080],['HD 1280×720',1280,720],['Full HD 1920×1080',1920,1080],['Passport 413×531',413,531],['Half size','%',50]].map((p,i)=>`<button class="chip" type="button" data-i="${i}">${p[0]}</button>`).join('');
      const P=[[1080,1080],[1280,720],[1920,1080],[413,531],['%',50]];
      $('#pre').onclick=e=>{ const b=e.target.closest('.chip'); if(!b)return; const p=P[+b.dataset.i];
        if(p[0]==='%'){ $('#U').value='%'; $('#W').value=p[1]; $('#H').value=p[1]; } else { $('#L').checked=false; setPx(p[0],p[1]); } };
    }catch(e){ fail($('#out'),e); $('#w').hidden=false; }
  });
  $('#W').oninput=()=>{ if($('#L').checked&&ow){ const w=+$('#W').value; $('#H').value=$('#U').value==='%'?w:Math.round(w*oh/ow); } };
  $('#H').oninput=()=>{ if($('#L').checked&&oh){ const h=+$('#H').value; $('#W').value=$('#U').value==='%'?h:Math.round(h*ow/oh); } };
  $('#U').onchange=()=>{ if($('#U').value==='%'){ $('#W').value=100; $('#H').value=100; } else setPx(ow,oh); };
  const qvis=()=>{ $('#qw').style.display=$('#F').value==='image/png'?'none':''; };
  $('#F').onchange=qvis; $('#Q').oninput=()=>$('#qv').textContent=$('#Q').value;
  $('#go').onclick=async()=>{
    if(!im)return; const out=$('#out'); const [w,h]=dims();
    if(w*h>100e6)return fail(out,new Error('That size is too large for the browser. Try a smaller size.'));
    busy(out,'Resizing…'); await nextFrame();
    try{
      const type=$('#F').value; const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
      if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,w,h);}
      x.imageSmoothingQuality='high'; x.drawImage(im,0,0,w,h);
      const blob=await toBlob(c,type,+$('#Q').value/100); if(!blob)throw new Error('Could not create the image.');
      const e=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
      result(out,blob,`${base(name)}-${w}x${h}.${e}`,`${w} × ${h} px`);
    }catch(e){fail(out,e);}
  };
}

/* ---------- tool: remove watermark ---------- */
function inpaint(img,mask,w,h){
  const d=img.data, N=w*h, known=new Uint8Array(N); let rem=[];
  for(let i=0;i<N;i++){ if(mask[i])rem.push(i); else known[i]=1; }
  const all=Int32Array.from(rem);
  while(rem.length){
    const nxt=[],fi=[],fc=[];
    for(const i of rem){
      const x=i%w,y=(i/w)|0; let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++){ const yy=y+dy; if(yy<0||yy>=h)continue;
        for(let dx=-1;dx<=1;dx++){ const xx=x+dx; if(xx<0||xx>=w)continue; const j=yy*w+xx;
          if(known[j]){ const o=j*4; r+=d[o];g+=d[o+1];b+=d[o+2];n++; } } }
      if(n){ fi.push(i); fc.push(r/n,g/n,b/n); } else nxt.push(i);
    }
    if(!fi.length)break;
    for(let k=0;k<fi.length;k++){ const o=fi[k]*4; d[o]=fc[k*3];d[o+1]=fc[k*3+1];d[o+2]=fc[k*3+2];d[o+3]=255; known[fi[k]]=1; }
    rem=nxt;
  }
  const n=all.length, tmp=new Float32Array(n*3);
  for(let pass=0;pass<12;pass++){
    for(let k=0;k<n;k++){
      const i=all[k],x=i%w,y=(i/w)|0; let r=0,g=0,b=0,c=0;
      for(let dy=-1;dy<=1;dy++){ const yy=y+dy; if(yy<0||yy>=h)continue;
        for(let dx=-1;dx<=1;dx++){ const xx=x+dx; if(xx<0||xx>=w)continue; const o=(yy*w+xx)*4; r+=d[o];g+=d[o+1];b+=d[o+2];c++; } }
      tmp[k*3]=r/c;tmp[k*3+1]=g/c;tmp[k*3+2]=b/c;
    }
    for(let k=0;k<n;k++){ const o=all[k]*4; d[o]=tmp[k*3];d[o+1]=tmp[k*3+1];d[o+2]=tmp[k*3+2]; }
  }
}
function toolWatermark(v){
  v.innerHTML=head('watermark')+`<div id="d"></div>
  <div class="panel" id="w" hidden>
    <p class="hint" style="margin:0 0 12px">Paint over the watermark or any unwanted mark with the brush, then press <b>Remove painted area</b>.</p>
    <div class="row">
      <div class="field" style="flex:1;min-width:200px"><label for="B">Brush size <span id="bv">28</span></label><input type="range" id="B" min="4" max="120" value="28"></div>
      <button class="btn primary" id="go" type="button">Remove painted area</button>
      <button class="btn" id="clr" type="button">Clear brush</button>
      <button class="btn" id="und" type="button" disabled>Undo</button>
    </div>
    <div style="margin-top:14px"><div class="canvaswrap" id="cw"><canvas id="cv"></canvas><canvas class="ov" id="ov"></canvas></div></div>
    <div class="actions"><button class="btn primary" id="dl" type="button">${ico('download')}Download image</button></div>
    <div id="out"></div>
    <p class="hint">This tool fills the painted area using the pixels around it, so it works best on small marks over plain or smooth backgrounds. Large logos over detailed areas may leave a visible blur. Only paint what you own the right to edit.</p>
  </div>`;
  $('#d').innerHTML=dz('Choose an image with a watermark','image/*');
  let name='',hist=[];
  const cv=$('#cv'),ov=$('#ov'); let cx,ox;
  bindDz($('#d .dz'),async f=>{
    try{
      const im=await loadImage(f[0]); name=f[0].name; const {c,scaled}=toCanvas(im,3000);
      cv.width=ov.width=c.width; cv.height=ov.height=c.height; cx=cv.getContext('2d',{willReadFrequently:true}); ox=ov.getContext('2d',{willReadFrequently:true});
      cx.drawImage(c,0,0); ox.clearRect(0,0,ov.width,ov.height); hist=[]; $('#und').disabled=true; $('#w').hidden=false;
      $('#out').innerHTML=scaled?'<div class="hint">Large image reduced to 3000 px on its longest side for editing.</div>':'';
    }catch(e){ $('#w').hidden=false; fail($('#out'),e); }
  });
  let drawing=false,last=null;
  const pt=e=>{ const r=ov.getBoundingClientRect(); return [(e.clientX-r.left)*ov.width/r.width,(e.clientY-r.top)*ov.height/r.height]; };
  const bs=()=>{ const r=ov.getBoundingClientRect(); return (+$('#B').value)*ov.width/r.width; };
  const paint=(a,b)=>{ ox.strokeStyle='rgba(255,40,90,.6)'; ox.fillStyle='rgba(255,40,90,.6)'; ox.lineCap='round'; ox.lineJoin='round'; ox.lineWidth=bs();
    ox.beginPath(); ox.moveTo(a[0],a[1]); ox.lineTo(b[0],b[1]); ox.stroke(); };
  ov.onpointerdown=e=>{ drawing=true; ov.setPointerCapture(e.pointerId); last=pt(e); paint(last,last); };
  ov.onpointermove=e=>{ if(!drawing)return; const p=pt(e); paint(last,p); last=p; };
  ov.onpointerup=ov.onpointercancel=()=>{ drawing=false; };
  $('#B').oninput=()=>$('#bv').textContent=$('#B').value;
  $('#clr').onclick=()=>ox&&ox.clearRect(0,0,ov.width,ov.height);
  $('#und').onclick=()=>{ if(hist.length){ cx.putImageData(hist.pop(),0,0); $('#und').disabled=!hist.length; } };
  $('#go').onclick=async()=>{
    const out=$('#out'); const w=cv.width,h=cv.height;
    const ov_d=ox.getImageData(0,0,w,h).data; let mask=new Uint8Array(w*h),cnt=0;
    for(let i=0;i<w*h;i++){ if(ov_d[i*4+3]>20){mask[i]=1;cnt++;} }
    if(!cnt)return toast('Paint over the watermark first.',true);
    busy(out,'Removing…'); await nextFrame();
    try{
      for(let it=0;it<2;it++){ const m2=mask.slice(); for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const i=y*w+x; if(mask[i]){ if(x>0)m2[i-1]=1; if(x<w-1)m2[i+1]=1; if(y>0)m2[i-w]=1; if(y<h-1)m2[i+w]=1; } } mask=m2; }
      const img=cx.getImageData(0,0,w,h); hist.push(cx.getImageData(0,0,w,h)); if(hist.length>6)hist.shift(); $('#und').disabled=false;
      inpaint(img,mask,w,h); cx.putImageData(img,0,0); ox.clearRect(0,0,w,h); out.innerHTML='';
      toast('Done. Remove more or download the image.');
    }catch(e){ fail(out,e); }
  };
  $('#dl').onclick=async()=>{ const b=await toBlob(cv,'image/png'); if(b)saveFile(b,base(name)+'-clean.png'); };
}

/* ---------- tool: change background ---------- */
function toolBackground(v){
  v.innerHTML=head('background')+`<div id="d"></div>
  <div class="panel" id="w" hidden>
    <div class="two">
      <div><h3>1. Original — click the background colour</h3><div class="canvaswrap" style="cursor:crosshair"><canvas id="src"></canvas></div>
        <div class="row" style="margin-top:10px;align-items:center"><span class="lbl">Colour to remove:</span><span id="sw" class="sw" style="cursor:default"></span><button class="chip" id="auto" type="button">Pick from corner</button></div></div>
      <div><h3>2. Result</h3><div class="canvaswrap checker"><canvas id="res"></canvas></div></div>
    </div>
    <div class="row" style="margin-top:18px">
      <div class="field" style="flex:1;min-width:180px"><label for="T">Colour match range <span id="tv">30</span></label><input type="range" id="T" min="2" max="100" value="30"></div>
      <div class="field" style="flex:1;min-width:180px"><label for="Fe">Edge softness <span id="fv">1</span></label><input type="range" id="Fe" min="0" max="5" value="1"></div>
      <label class="chk"><input type="checkbox" id="C" checked> Only remove connected to edges</label>
    </div>
    <div style="margin-top:18px"><div class="lbl" style="margin-bottom:6px">New background</div>
      <div class="seg" id="mode"><button type="button" data-m="t" class="on">Transparent</button><button type="button" data-m="c">Colour</button><button type="button" data-m="i">Image</button></div>
      <div id="mc" class="swatches" style="margin-top:12px" hidden></div>
      <div id="mi" style="margin-top:12px" hidden><input type="file" id="bgf" accept="image/*"></div>
    </div>
    <div class="actions"><button class="btn primary" id="dl" type="button">${ico('download')}Download image</button></div>
    <div id="out"></div>
    <p class="hint">This works best when the old background is one even colour (a plain wall, studio sheet or white backdrop). If part of the person or object disappears, lower the range; if background is left behind, raise it or click a different spot.</p>
  </div>`;
  $('#d').innerHTML=dz('Choose a photo','image/*');
  const src=$('#src'),res=$('#res'); let sctx,rctx,orig=null,name='',bg=[255,255,255],alpha=null,mode='t',fill='#ffffff',bgImg=null,subj=null,raf=0;
  const cols=['#ffffff','#f1f3f5','#1d4ed8','#dc2626','#16a34a','#111111'];
  $('#mc').innerHTML=cols.map(c=>`<button class="sw" type="button" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')+`<input type="color" id="cp" value="#ffffff" aria-label="Custom colour">`;
  const setSw=()=>{ $('#sw').style.background=`rgb(${bg})`; };
  function calcMask(){
    if(!orig)return; const {data,width:w,height:h}=orig, N=w*h, td=(+$('#T').value)*4.4, t2=td*td, cand=new Uint8Array(N);
    for(let i=0;i<N;i++){ const o=i*4,a=data[o]-bg[0],b=data[o+1]-bg[1],c=data[o+2]-bg[2]; if(a*a+b*b+c*c<=t2||data[o+3]<8)cand[i]=1; }
    let m=cand;
    if($('#C').checked){
      m=new Uint8Array(N); const st=new Int32Array(N); let sp=0;
      const push=i=>{ if(cand[i]&&!m[i]){m[i]=1;st[sp++]=i;} };
      for(let x=0;x<w;x++){push(x);push((h-1)*w+x);} for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
      while(sp){ const i=st[--sp],x=i%w,y=(i/w)|0; if(x>0)push(i-1); if(x<w-1)push(i+1); if(y>0)push(i-w); if(y<h-1)push(i+w); }
    }
    alpha=new Float32Array(N); for(let i=0;i<N;i++)alpha[i]=m[i]?0:255;
    const r=+$('#Fe').value;
    if(r>0){ const t=new Float32Array(N);
      for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ let s=0,c=0; for(let k=-r;k<=r;k++){ const xx=x+k; if(xx>=0&&xx<w){s+=alpha[y*w+xx];c++;} } t[y*w+x]=s/c; } }
      for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ let s=0,c=0; for(let k=-r;k<=r;k++){ const yy=y+k; if(yy>=0&&yy<h){s+=t[yy*w+x];c++;} } alpha[y*w+x]=s/c; } }
    }
    const sd=new Uint8ClampedArray(data); for(let i=0;i<N;i++)sd[i*4+3]=Math.round(alpha[i]*data[i*4+3]/255);
    subj=document.createElement('canvas'); subj.width=w; subj.height=h; subj.getContext('2d').putImageData(new ImageData(sd,w,h),0,0);
  }
  function draw(){
    if(!subj)return; const w=res.width,h=res.height; rctx.clearRect(0,0,w,h);
    if(mode==='c'){ rctx.fillStyle=fill; rctx.fillRect(0,0,w,h); }
    else if(mode==='i'&&bgImg){ const s=Math.max(w/bgImg.naturalWidth,h/bgImg.naturalHeight),iw=bgImg.naturalWidth*s,ih=bgImg.naturalHeight*s; rctx.drawImage(bgImg,(w-iw)/2,(h-ih)/2,iw,ih); }
    rctx.drawImage(subj,0,0);
  }
  const later=(full)=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ if(full)calcMask(); draw(); }); };
  function autoPick(){ const {data,width:w}=orig; let r=0,g=0,b=0,n=0; for(let y=0;y<6;y++)for(let x=0;x<6;x++){ const o=(y*w+x)*4; r+=data[o];g+=data[o+1];b+=data[o+2];n++; } bg=[r/n,g/n,b/n].map(Math.round); setSw(); }
  bindDz($('#d .dz'),async f=>{
    try{
      const im=await loadImage(f[0]); name=f[0].name; const {c,scaled}=toCanvas(im,2400);
      src.width=res.width=c.width; src.height=res.height=c.height; sctx=src.getContext('2d',{willReadFrequently:true}); rctx=res.getContext('2d');
      sctx.drawImage(c,0,0); orig=sctx.getImageData(0,0,c.width,c.height);
      $('#w').hidden=false; $('#out').innerHTML=scaled?'<div class="hint">Large photo reduced to 2400 px on its longest side.</div>':'';
      autoPick(); later(true);
    }catch(e){ $('#w').hidden=false; fail($('#out'),e); }
  });
  src.onclick=e=>{ if(!orig)return; const r=src.getBoundingClientRect(); const x=Math.floor((e.clientX-r.left)*src.width/r.width), y=Math.floor((e.clientY-r.top)*src.height/r.height);
    let R=0,G=0,B=0,n=0; for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){ const xx=Math.min(src.width-1,Math.max(0,x+dx)),yy=Math.min(src.height-1,Math.max(0,y+dy)),o=(yy*src.width+xx)*4; R+=orig.data[o];G+=orig.data[o+1];B+=orig.data[o+2];n++; }
    bg=[R/n,G/n,B/n].map(Math.round); setSw(); later(true); };
  $('#auto').onclick=()=>{ if(orig){autoPick();later(true);} };
  $('#T').oninput=()=>{ $('#tv').textContent=$('#T').value; later(true); };
  $('#Fe').oninput=()=>{ $('#fv').textContent=$('#Fe').value; later(true); };
  $('#C').onchange=()=>later(true);
  $('#mode').onclick=e=>{ const b=e.target.closest('button'); if(!b)return; mode=b.dataset.m; [...$('#mode').children].forEach(x=>x.classList.toggle('on',x===b));
    $('#mc').hidden=mode!=='c'; $('#mi').hidden=mode!=='i'; later(false); };
  $('#mc').onclick=e=>{ const b=e.target.closest('.sw'); if(!b)return; fill=b.dataset.c; $('#cp').value=fill; [...$('#mc').querySelectorAll('.sw')].forEach(x=>x.classList.toggle('on',x===b)); later(false); };
  $('#cp').oninput=()=>{ fill=$('#cp').value; [...$('#mc').querySelectorAll('.sw')].forEach(x=>x.classList.remove('on')); later(false); };
  $('#bgf').onchange=async e=>{ const f=e.target.files[0]; if(!f)return; try{ bgImg=await loadImage(f); later(false); }catch(err){ toast(err.message,true); } };
  $('#dl').onclick=async()=>{ if(!subj)return; const b=await toBlob(res,'image/png'); if(b)saveFile(b,base(name)+'-new-background.png'); };
}

/* ---------- tool: viewer ---------- */
function toolViewer(v){
  v.innerHTML=head('viewer')+`<div id="d"></div><div id="out" style="margin-top:18px"></div>
  <p class="hint">Opens PDF, Word (.docx), Excel (.xlsx, .xls, .csv), images, and text files (.txt, .json, .xml, .html, .md and more). Files are shown on your device and are not uploaded anywhere.</p>`;
  $('#d').innerHTML=dz('Choose any document to view','*/*');
  bindDz($('#d .dz'),async f=>{
    const file=f[0], out=$('#out'), e=ext(file.name); busy(out,'Opening '+file.name+'…');
    try{
      const title=`<div class="row" style="margin-bottom:12px;justify-content:space-between;align-items:center"><b style="overflow-wrap:anywhere">${esc(file.name)}</b><span class="lbl">${fmt(file.size)}</span></div>`;
      if(e==='pdf'){
        lib('pdf.js',window.pdfjsLib);
        const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
        out.innerHTML=title+'<div class="pdfpages" id="pp"></div>'; const pp=$('#pp',out); const n=Math.min(pdf.numPages,150);
        for(let i=1;i<=n;i++){
          const page=await pdf.getPage(i), base1=page.getViewport({scale:1}), s=Math.min(3,(900/base1.width)*Math.min(2,window.devicePixelRatio||1)), vp=page.getViewport({scale:s});
          const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height; c.setAttribute('aria-label','Page '+i); pp.appendChild(c);
          await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
        }
        if(pdf.numPages>n)pp.insertAdjacentHTML('beforeend',`<p class="hint">Showing the first ${n} of ${pdf.numPages} pages.</p>`);
      }else if(e==='docx'){
        lib('mammoth',window.mammoth); const r=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
        out.innerHTML=title+`<div class="paper">${r.value||'<p>(This document has no visible content)</p>'}</div>`;
      }else if(['xlsx','xls','csv','ods','tsv'].includes(e)){
        lib('SheetJS',window.XLSX); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
        out.innerHTML=title+`<div class="tabs" id="tb"></div><div class="sheet" id="sh"></div>`;
        const show=n=>{ const rows=sheetRows(wb.Sheets[n]); $('#sh',out).innerHTML=rows.length?rowsToTable(rows,'',1500):'<p style="padding:14px">This sheet is empty.</p>'; [...$('#tb',out).children].forEach(b=>b.classList.toggle('on',b.dataset.n===n)); };
        $('#tb',out).innerHTML=wb.SheetNames.map(n=>`<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join('');
        $('#tb',out).onclick=ev=>{ const b=ev.target.closest('button'); if(b)show(b.dataset.n); };
        show(wb.SheetNames[0]);
      }else if(file.type.startsWith('image/')||['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(e)){
        const url=URL.createObjectURL(file);
        out.innerHTML=title+`<div class="paper" style="text-align:center"><img alt="${esc(file.name)}" src="${url}"></div>`;
      }else if(file.type.startsWith('text/')||['txt','json','xml','html','htm','md','log','js','css','yml','yaml','ini','rtf'].includes(e)){
        const t=await file.text(); out.innerHTML=title+`<div class="paper"><pre class="txt">${esc(t.slice(0,500000))}</pre></div>`+(t.length>500000?'<p class="hint">Showing the first 500,000 characters.</p>':'');
      }else if(['doc','ppt','pptx','odt','odp'].includes(e)){
        throw new Error(`.${e} files can’t be shown here. Save the file as .docx (Word) or PDF first, then open it again.`);
      }else throw new Error('This file type isn’t supported for viewing. Supported: PDF, DOCX, XLSX, XLS, CSV, images and text files.');
    }catch(err){ fail(out,err); }
  });
}

/* page shell */
const RUN={'word-pdf':toolWordPdf,'pdf-word':toolPdfWord,excel:toolExcel,resize:toolResize,watermark:toolWatermark,background:toolBackground,viewer:toolViewer};
function head(){return '';}
const tid=document.body.dataset.tool; if(tid&&RUN[tid])RUN[tid]($('#tool'));
const cs=$('#cs'); if(cs)cs.onclick=()=>{ const em=document.body.dataset.email, a=document.createElement('a'); a.href='mailto:'+em+'?subject='+encodeURIComponent('FileKit message from '+($('#cn').value||'a visitor'))+'&body='+encodeURIComponent($('#cm').value); a.target='_blank'; a.rel='noopener'; a.click(); };
})();
