/* 画面だけでなく、記録の種類・タブ・役割まで開いて回る検査 */
const {chromium}=require('/Users/slimshady/cw-scrape/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',timeout:60000});
  let bad=[];
  for(const role of ['1','3']){
    const pg=await b.newPage({viewport:{width:1400,height:1000}});
    const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.dismiss());
    await pg.goto('http://localhost:8899/index.html');
    await pg.evaluate(r=>{localStorage.clear();sessionStorage.setItem('cocoas_staffSession',r);},role);
    await pg.goto('http://localhost:8899/index.html'); await pg.waitForTimeout(1600);
    await pg.evaluate(()=>{const f=document.getElementById('thFlow');if(f)f.remove();});

    // 全画面
    /* 権限で開けない画面と、別名（enroll→billing）は除く */
    const pages=await pg.evaluate(()=>Object.keys(TITLES).filter(function(p){
      if(p==='enroll')return false;                 /* billing の別名 */
      if(p==='creator')return false;                /* 別ファイル（creator.html）を開くだけ。section を持たない */
      if(!document.querySelector('section[data-page="'+p+'"]'))return false;
      try{ return canView(p)&&egPlanOfPage(p); }catch(e){ return true; }
    }));
    for(const p of pages){
      const r=await pg.evaluate(pp=>{try{go(pp);}catch(e){return 'THROW: '+e.message;}
        var s=document.querySelector('section[data-page="'+pp+'"]');
        if(s&&s.hidden)return '開かなかった';
        return (s&&s.textContent.trim().length>20)?'':'空';},p);
      if(r)bad.push(`役割${role} 画面 ${p}: ${r}`);
    }
    // 記録の種類（日常＋活動記録）
    const types=await pg.evaluate(()=>{
      var a=[];
      try{ if(canView('records'))a=a.concat(REC_DAILY); }catch(e){}
      try{ if(canView('carerec'))a=a.concat(recCareList()); }catch(e){}
      return a;
    });
    for(const t of types){
      const r=await pg.evaluate(tt=>{
        try{recType=tt;recDate=todayISO();go(recPageOf(tt)==='carerec'?'carerec':'records');}
        catch(e){return 'THROW: '+e.message;}
        var rb=document.getElementById('recBody');
        return (rb&&rb.innerHTML.length>50)?'':'中身なし';},t);
      if(r)bad.push(`役割${role} 記録 ${t}: ${r}`);
    }
    // シフトのタブ
    const canShift=await pg.evaluate(()=>{try{return canView('shift');}catch(e){return true;}});
    for(const tab of (canShift?['plan','time']:[])){
      const r=await pg.evaluate(tb=>{try{shiftTab=tb;go('shift');}catch(e){return 'THROW: '+e.message;}return '';},tab);
      if(r)bad.push(`役割${role} シフト ${tab}: ${r}`);
    }
    if(errs.length)bad.push(`役割${role} JSエラー: ${errs.join(' / ')}`);
    await pg.close();
  }
  await b.close();
  console.log(bad.length?('■ 見つかった問題\n'+bad.join('\n')):'画面・記録・タブ すべて開けた（管理者・一般とも）');
})();
