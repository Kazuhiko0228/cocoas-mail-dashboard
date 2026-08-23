/* 画面が「約束していること」を全部あつめる。
   この製品でいちばん多く出た不具合は「画面が言っていることに処理が無い」で、
   人が気づけないのは、そもそも約束の一覧が無いから。
   機械にできるのは「約束を漏れなく並べる」ところまで。
   突き合わせは人がやる。 */
const fs=require('fs'), path=require('path');

/* 約束の言い回し。強いものほど上に置く */
const PAT=[
  {k:'届く',    re:/(届きます|届く|送信されます|送信します|送信しました|送られます|配信されます|通知されます|お知らせします)/},
  {k:'反映',    re:/(反映されます|反映され|自動で入りま|自動で反映|自動的に|そのまま残ります|残ります|引き継がれ|連携されま)/},
  {k:'消さない',re:/(消しません|消えません|失われません|そのまま残|保持されま|変わりません)/},
  {k:'できない',re:/(できません|止まります|読むだけに|入力できなくな|変更できません)/},
  {k:'自動',    re:/(自動で|自動的に|自動計算|自動反映|自動入力|自動判定)/},
  {k:'保存',    re:/(保存されます|保存します|保存しました|記録されます|残します|控えに)/},
];
/* 拾わないもの */
const SKIP=/^(はい|いいえ|OK|閉じる|保存|送信)$/;
/* メールやお知らせの本文、点検の項目、法令の解説は「画面の約束」ではない */
const NOTCLAIM=[
  /^[〔【]/,                              /* メールのひな形 */
  /保護者様へ|いつもお世話になっております/,
  /か$/,                                  /* 安全点検の項目（「〜ないか」） */
  /とされている|求められる|義務づけ|基準では|指針では|法により|monitor/,
  /^※?\s*[0-9]+\s*$/
];

function strings(src){
  /* '…' と "…" の中身を、行番号つきで取り出す */
  const out=[];
  let i=0,line=1;
  while(i<src.length){
    const c=src[i];
    if(c==='\n'){line++;i++;continue;}
    if(c==='/'&&src[i+1]==='/'){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(c==='/'&&src[i+1]==='*'){while(i<src.length&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++;}i+=2;continue;}
    if(c==="'"||c==='"'||c==='`'){
      const q=c,st=line;let s='';i++;
      while(i<src.length){
        if(src[i]==='\\'){s+=src[i+1];i+=2;continue;}
        if(src[i]===q){i++;break;}
        if(src[i]==='\n')line++;
        s+=src[i];i++;
      }
      if(s.length>4)out.push({s:s,line:st});
      continue;
    }
    i++;
  }
  return out;
}

const rows=[];
for(const f of process.argv.slice(2)){
  const src=fs.readFileSync(f,'utf8');
  for(const x of strings(src)){
    /* タグを外して、読める文だけにする */
    const t=x.s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
    if(!t||t.length<8||SKIP.test(t))continue;
    if(!/[ぁ-んァ-ヶ一-龠]/.test(t))continue;
    if(NOTCLAIM.some(r=>r.test(t)))continue;
    /* 画面に出る説明文かどうか：文末が「です・ます」体か、注意書きの形 */
    if(!/(ます。?|ません。?|ください。?|です。?)/.test(t))continue;
    for(const p of PAT){
      if(p.re.test(t)){ rows.push({f:path.basename(f),line:x.line,kind:p.k,t:t}); break; }
    }
  }
}
/* 同じ文は1つに */
const seen=new Set(),uniq=[];
for(const r of rows){ const k=r.kind+'|'+r.t; if(seen.has(k))continue; seen.add(k); uniq.push(r); }

const byKind={};
uniq.forEach(r=>{(byKind[r.kind]=byKind[r.kind]||[]).push(r);});
console.log('画面が約束していること：'+uniq.length+'件\n');
for(const k of PAT.map(p=>p.k)){
  const list=byKind[k]||[];
  if(!list.length)continue;
  console.log('── '+k+'（'+list.length+'件）');
  list.forEach((r,i)=>console.log('  '+String(i+1).padStart(3)+' '+r.f+':'+r.line+'  '+r.t.slice(0,150)));
  console.log('');
}
