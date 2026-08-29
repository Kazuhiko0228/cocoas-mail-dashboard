/* 今日6回くり返した3つの型を、静的に探す
   ① 定義されていない名前を読んでいる（present is not defined の型）
   ② 同名の「トップレベル」関数が2つある（後勝ち。renderTimecard/auditFY/lockSnap で3回やった）
   ③ 引数を増やした関数を、古い数で呼んでいる
   文字列・コメント・正規表現は、1文字ずつ見て確実に読み飛ばす。 */
const fs=require('fs'), path=require('path');

const BUILTIN=new Set(('window document localStorage sessionStorage location navigator history console '+
 'setTimeout clearTimeout setInterval clearInterval requestAnimationFrame fetch XMLHttpRequest '+
 'Object Array String Number Boolean Math JSON Date RegExp Error TypeError Promise Map Set WeakMap '+
 'parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI '+
 'Blob File FileReader URL FormData Event CustomEvent Node Element HTMLElement Image Audio '+
 'alert confirm prompt print btoa atob crypto TextEncoder TextDecoder Intl Symbol Proxy Reflect '+
 'undefined NaN Infinity globalThis self top parent frames screen performance L structuredClone '+
 'AbortController Headers Request Response WebSocket IntersectionObserver MutationObserver ResizeObserver '+
 'DOMParser getComputedStyle matchMedia Uint8Array Int8Array Float32Array ArrayBuffer DataView '+
 'arguments escape unescape NodeFilter URLSearchParams CanvasRenderingContext2D CSS SVGElement Text Range Selection').split(/\s+/));
const KW=new Set(('if else for while do return function var let const new typeof instanceof in of this true false null '+
 'try catch finally throw switch case default break continue delete void class extends super yield await async '+
 'get set static').split(/\s+/));

/* 1文字ずつ見て、コード以外を空白に置き換える */
function strip(src){
  let out='',i=0,n=src.length,prev='';
  function lastSignificant(){ for(let j=out.length-1;j>=0;j--){const c=out[j]; if(!/\s/.test(c))return c;} return ''; }
  while(i<n){
    const c=src[i], c2=src[i+1];
    if(c==='/'&&c2==='/'){ while(i<n&&src[i]!=='\n'){out+=' ';i++;} continue; }
    if(c==='/'&&c2==='*'){ while(i<n&&!(src[i]==='*'&&src[i+1]==='/')){out+=(src[i]==='\n'?'\n':' ');i++;} out+='  ';i+=2; continue; }
    if(c==='"'||c==="'"||c==='`'){
      const q=c; out+=' '; i++;
      while(i<n){
        if(src[i]==='\\'){out+='  ';i+=2;continue;}
        if(src[i]===q){out+=' ';i++;break;}
        out+=(src[i]==='\n'?'\n':' ');i++;
      }
      continue;
    }
    if(c==='/'){
      /* 割り算か正規表現か。直前の意味のある文字で判ずる */
      const p=lastSignificant();
      const kwBefore=/\b(return|typeof|case|in|of|do|else|instanceof|new|delete|void|throw|yield|await)\s*$/.test(out);
      if(p===''||kwBefore||'(,=:[!&|?{};+-*%~^<>'.includes(p)){
        out+=' ';i++;let inCls=false;
        while(i<n){
          if(src[i]==='\\'){out+='  ';i+=2;continue;}
          if(src[i]==='[')inCls=true;
          if(src[i]===']')inCls=false;
          if(src[i]==='/'&&!inCls){out+=' ';i++;break;}
          if(src[i]==='\n')break;
          out+=' ';i++;
        }
        while(i<n&&/[gimsuy]/.test(src[i])){out+=' ';i++;}
        continue;
      }
    }
    out+=c;i++;
  }
  return out;
}

function scriptBlocks(src){
  const out=[];const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m;
  while((m=re.exec(src)))out.push(m[1]);
  return out;
}
function lineOf(s,idx){return s.slice(0,idx).split('\n').length;}

for(const f of process.argv.slice(2)){
  const raw=fs.readFileSync(f,'utf8');
  const blocks=scriptBlocks(raw);
  /* ★まず文法。ここで落ちると画面はまるごと動かない。
     2026-08-27 に「関数の先頭が二重になっている」ファイルを通してしまったので足した。
     見つけたら、ほかの検査に進まずここで止める（あとの結果があてにならないため）。 */
  const vm=require('vm');
  let ng=0;
  blocks.forEach((b,i)=>{
    try{ new vm.Script(b); }
    catch(e){ ng++; console.log('■ '+f); console.log('  ★文法エラー（'+(i+1)+'つめの script）: '+e.message); }
  });
  if(ng){ process.exitCode=1; continue; }
  const code=blocks.join('\n/*<<block>>*/\n');
  const S=strip(code);

  /* ② トップレベルの同名関数（行頭に function があるものだけ） */
  const top={};let m,re=/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  while((m=re.exec(S)))(top[m[1]]=top[m[1]]||[]).push(lineOf(S,m.index));
  const dup=Object.keys(top).filter(k=>top[k].length>1);

  /* ③ 引数の数（トップレベルの関数だけ見る） */
  const arity={};re=/^function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/gm;
  while((m=re.exec(S))){
    const body=S.slice(m.index,m.index+4000);
    const usesArgs=/\barguments\b/.test(body);
    arity[m[1]]={max:m[2].trim()?m[2].split(',').length:0,usesArgs:usesArgs};
  }

  /* ① 宣言されている名前を集める */
  const dec=new Set(Object.keys(top));
  /* var a=1,b,c; の2つ目以降も拾う（宣言の終わりまで、深さ0のカンマで区切る） */
  re=/\b(?:var|let|const)\s+/g;
  while((m=re.exec(S))){
    let i=m.index+m[0].length,d3=0,cur='',list=[];
    while(i<S.length){
      const ch=S[i];
      if('([{'.includes(ch))d3++;
      if(')]}'.includes(ch)){ if(d3===0)break; d3--; }
      if(ch===';'&&d3===0)break;
      if(ch==='\n'&&d3===0&&!/[,=+\-*/%?&|:]\s*$/.test(cur))break;
      if(ch===','&&d3===0){list.push(cur);cur='';i++;continue;}
      cur+=ch;i++;
    }
    list.push(cur);
    list.forEach(function(x){
      const mm=String(x).replace(/^\s+/,'').match(/^([A-Za-z_$][\w$]*)/);
      if(mm)dec.add(mm[1]);
    });
  }
  /* 入れ子の関数宣言（行頭でないもの）も名前として登録する */
  re=/function\s+([A-Za-z_$][\w$]*)\s*\(/g;while((m=re.exec(S)))dec.add(m[1]);
  re=/function\s*[A-Za-z_$\w]*\s*\(([^)]*)\)/g;
  while((m=re.exec(S)))m[1].split(',').forEach(p=>{p=p.trim();if(p)dec.add(p.replace(/=.*$/,'').trim());});
  re=/catch\s*\(\s*([A-Za-z_$][\w$]*)/g;while((m=re.exec(S)))dec.add(m[1]);
  /* Object.defineProperty(window,'X',…) で作っている名前 */
  re=/defineProperty\s*\(\s*window\s*,\s*['\"]([A-Za-z_$][\w$]*)['\"]/g;while((m=re.exec(code)))dec.add(m[1]);
  re=/\b([A-Za-z_$][\w$]*)\s*=[^=]/g;while((m=re.exec(S)))dec.add(m[1]);   /* 代入で作る暗黙のグローバル */

  /* 読んでいる名前 */
  const bad={};
  re=/(^|[^.\w$])([A-Za-z_$][\w$]*)\b/g;
  while((m=re.exec(S))){
    const nm=m[2];
    if(KW.has(nm)||BUILTIN.has(nm)||dec.has(nm))continue;
    /* オブジェクトの鍵（name:）は読みではない */
    const after=S.slice(m.index+m[0].length);
    if(/^\s*:/.test(after))continue;
    (bad[nm]=bad[nm]||[]).push(lineOf(S,m.index));
  }

  /* 引数が多すぎる呼び出し */
  const argBad=[];
  for(const name of Object.keys(arity)){
    if(arity[name].usesArgs)continue;
    const re2=new RegExp('(^|[^.\\w$])'+name.replace(/\$/g,'\\$')+'\\s*\\(','g');
    let mm;
    while((mm=re2.exec(S))){
      let i=mm.index+mm[0].length,depth=1,d2=0,cnt=0,any=false;
      while(i<S.length&&depth>0){
        const ch=S[i];
        if(ch==='(')depth++;
        else if(ch===')'){depth--;if(!depth)break;}
        if(depth===1){
          /* かっこは depth 側で数えているので、ここでは [ と { だけ */
          if('[{'.includes(ch))d2++;
          if(']}'.includes(ch))d2--;
          if(ch===','&&d2===0)cnt++;
          if(!/\s/.test(ch))any=true;
        }
        i++;
      }
      const n=any?cnt+1:0;
      if(n>arity[name].max)argBad.push(name+'（'+lineOf(S,mm.index)+'行 渡'+n+'/受'+arity[name].max+'）');
    }
  }

  console.log('■ '+path.basename(f));
  console.log('  ② 同名のトップレベル関数: '+(dup.length?dup.map(k=>k+'（'+top[k].join(',')+'行）').join(' / '):'なし'));
  const names=Object.keys(bad).sort();
  console.log('  ① 定義が見当たらない名前: '+(names.length?names.map(n=>n+'（'+bad[n].slice(0,3).join(',')+'行）').join(' / '):'なし'));
  console.log('  ③ 引数が多すぎる呼び出し: '+(argBad.length?argBad.join(' / '):'なし'));
}
