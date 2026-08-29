import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE=(process.env.DPRO_BASE_URL||'https://dpromstk2000-lab.github.io/DEGITAL-QR/').replace(/\/+$/,'/');
const RESULT='dental-r4-guide-center-qa.json';
const viewports=[
  {name:'desktop',width:1440,height:1000},
  {name:'tablet',width:1024,height:768},
  {name:'mobile390',width:390,height:844},
  {name:'mobile320',width:320,height:720}
];
const report={
  schema:'DPRO_TUTORIAL_DENTAL_R4_GUIDE_CENTER_QA_V1_0',
  system:'DENTAL',stage:'R4',standard:'V1.1_LOCKED',
  base:BASE,sourceHead:process.env.GITHUB_SHA||'',
  generatedAt:new Date().toISOString(),
  first10Expected:10,viewports:[],unsafeWrites:[],businessMutation:0,failures:[],pass:false
};

function scoped(url=''){return url.includes('/DEGITAL-QR/')||url.includes('dpro-dental-qr-api.dpromstk2000.workers.dev');}
function attach(page,b){
  page.on('pageerror',e=>b.pageErrors.push(String(e?.stack||e?.message||e)));
  page.on('console',m=>{
    if(m.type()!=='error')return;
    const loc=m.location();
    if(scoped(loc?.url||''))b.consoleErrors.push({text:m.text(),url:loc?.url||'',line:loc?.lineNumber??null});
  });
  page.on('request',req=>{
    const method=req.method();
    if(!['GET','HEAD','OPTIONS'].includes(method)&&scoped(req.url())){
      const row={method,url:req.url(),resourceType:req.resourceType()};
      b.unsafeWrites.push(row);report.unsafeWrites.push(row);
    }
  });
}
async function waitGuide(page){
  await page.waitForFunction(()=>window.DPRO_DENTAL_GUIDE_CENTER?.ready===true,{timeout:30000});
  await page.waitForFunction(()=>window.DPRO_DENTAL_GUIDE_CENTER?.aligned===true,{timeout:10000});
}
async function waitTutorial(page,index){
  await page.waitForFunction(i=>{
    const qa=window.DPRO_TUTORIAL_QA,f=document.getElementById('dpro-product-frame');
    return !!qa&&qa.getState().active===true&&qa.getState().index===i&&f?.contentDocument?.readyState==='complete';
  },index,{timeout:30000});
  await page.waitForFunction(()=>!!window.DPRO_TUTORIAL_QA?.refreshTarget()?.selector,{timeout:15000,polling:150});
  await page.waitForFunction(()=>document.activeElement?.id==='dpro-next',{timeout:5000});
}
async function metrics(page){
  return page.evaluate(()=>({
    innerWidth,
    documentElementScrollWidth:document.documentElement.scrollWidth,
    bodyScrollWidth:document.body.scrollWidth,
    guideCount:document.querySelectorAll('[data-guide-step]').length,
    ready:document.getElementById('guideReady')?.dataset.guideReady||'',
    aligned:!!window.DPRO_DENTAL_GUIDE_CENTER?.aligned,
    runtimeCount:window.DPRO_DENTAL_GUIDE_CENTER?.runtimeCount||0,
    stateMode:window.DPRO_DENTAL_GUIDE_CENTER?.stateMode||'',
    buttons:[...document.querySelectorAll('[data-guide-action]')].map(b=>({action:b.dataset.guideAction,disabled:b.disabled}))
  }));
}
async function focusAction(page,action){
  await page.evaluate(()=>document.activeElement?.blur());
  for(let i=0;i<12;i++){
    await page.keyboard.press('Tab');
    const a=await page.evaluate(()=>document.activeElement?.dataset?.guideAction||'');
    if(a===action)return true;
  }
  return false;
}
async function visibleFocus(page){
  return page.evaluate(()=>{
    const e=document.activeElement;if(!e)return false;
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return s.outlineStyle!=='none'&&Number.parseFloat(s.outlineWidth||'0')>0&&r.width>0&&r.height>0;
  });
}
async function alignmentData(page){
  return page.evaluate(()=>{
    const g=window.DPRO_DENTAL_GUIDE_CENTER;
    const p=document.getElementById('tutorialProbe');
    const api=p?.contentWindow?.DPRO_TUTORIAL_QA;
    const rows=[...document.querySelectorAll('[data-guide-step]')].map(r=>({
      step:Number(r.dataset.step),title:r.querySelector('h3')?.textContent?.trim()||'',
      route:r.dataset.route,primary:r.dataset.primary,fallback:r.dataset.fallback
    }));
    const runtime=(api?.steps||[]).map(s=>({
      step:s.step,title:s.title,route:s.route,primary:s.primary,
      fallback:Array.isArray(s.fallback)?s.fallback.join('||'):String(s.fallback||'')
    }));
    return {guideReady:g?.ready,guideAligned:g?.aligned,guideCount:rows.length,runtimeCount:runtime.length,rows,runtime};
  });
}
function alignmentOk(a){return a.guideReady===true&&a.guideAligned===true&&a.guideCount===10&&a.runtimeCount===10&&JSON.stringify(a.rows)===JSON.stringify(a.runtime);}
function addFailure(bucket,msg){bucket.failures.push(msg);report.failures.push(`${bucket.name}: ${msg}`);}

const browser=await chromium.launch({headless:true});
for(const spec of viewports){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height}});
  const page=await context.newPage();
  const b={name:spec.name,width:spec.width,height:spec.height,pageErrors:[],consoleErrors:[],unsafeWrites:[],failures:[],controls:{start:false,resume:false,replay:false}};
  attach(page,b);
  try{
    await page.goto(`${BASE}guide-center.html?qa=r4-${spec.name}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
    await page.evaluate(()=>localStorage.removeItem('dpro.dental.tutorial.v1.1'));
    await page.reload({waitUntil:'domcontentloaded'});
    await waitGuide(page);

    const m=await metrics(page);b.initial=m;
    if(m.innerWidth!==spec.width)addFailure(b,`innerWidth ${m.innerWidth} != ${spec.width}`);
    if(m.documentElementScrollWidth>m.innerWidth)addFailure(b,`document overflow ${m.documentElementScrollWidth}>${m.innerWidth}`);
    if(m.bodyScrollWidth>m.innerWidth)addFailure(b,`body overflow ${m.bodyScrollWidth}>${m.innerWidth}`);
    if(m.guideCount!==10||m.runtimeCount!==10)addFailure(b,`First10 mismatch guide=${m.guideCount} runtime=${m.runtimeCount}`);
    if(!m.aligned||m.ready!=='true')addFailure(b,'Guide Center runtime alignment not ready');
    const start=m.buttons.find(x=>x.action==='start'),resume=m.buttons.find(x=>x.action==='resume'),replay=m.buttons.find(x=>x.action==='replay');
    if(m.stateMode!=='start'||start?.disabled!==false||resume?.disabled!==true||replay?.disabled!==true)addFailure(b,'fresh Start/Resume/Replay state mismatch');

    b.alignment=await alignmentData(page);
    if(!alignmentOk(b.alignment))addFailure(b,'Guide routes/targets do not exactly match R3 runtime');

    const startFocused=await focusAction(page,'start');
    b.controls.startFocusVisible=startFocused?await visibleFocus(page):false;
    if(!startFocused||!b.controls.startFocusVisible)addFailure(b,'keyboard/focus cannot prove Start');
    if(startFocused){
      await Promise.all([page.waitForURL(/tutorial\.html/,{timeout:20000}),page.keyboard.press('Enter')]);
      await waitTutorial(page,0);
      const s=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
      if(s.index!==0||s.status!=='running'||!s.active)addFailure(b,'Start did not open Step 1');
      else b.controls.start=true;
    }

    await page.keyboard.press('Enter');
    await waitTutorial(page,1);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().status==='paused',{timeout:5000});
    await page.goto(`${BASE}guide-center.html?qa=r4-resume-${spec.name}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
    await waitGuide(page);
    const resumeMode=await page.evaluate(()=>window.DPRO_DENTAL_GUIDE_CENTER.stateMode);
    if(resumeMode!=='resume')addFailure(b,`Resume mode mismatch ${resumeMode}`);
    const resumeFocused=await focusAction(page,'resume');
    b.controls.resumeFocusVisible=resumeFocused?await visibleFocus(page):false;
    if(!resumeFocused||!b.controls.resumeFocusVisible)addFailure(b,'keyboard/focus cannot prove Resume');
    if(resumeFocused){
      await Promise.all([page.waitForURL(/tutorial\.html/,{timeout:20000}),page.keyboard.press('Enter')]);
      await waitTutorial(page,1);
      const s=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
      if(s.index!==1||s.status!=='running'||!s.active)addFailure(b,'Resume did not restore Step 2');
      else b.controls.resume=true;
    }

    await page.evaluate(()=>window.DPRO_TUTORIAL_QA.skip());
    await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().status==='skipped',{timeout:5000});
    await page.goto(`${BASE}guide-center.html?qa=r4-replay-${spec.name}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
    await waitGuide(page);
    const replayMode=await page.evaluate(()=>window.DPRO_DENTAL_GUIDE_CENTER.stateMode);
    if(replayMode!=='replay')addFailure(b,`Replay mode mismatch ${replayMode}`);
    const replayFocused=await focusAction(page,'replay');
    b.controls.replayFocusVisible=replayFocused?await visibleFocus(page):false;
    if(!replayFocused||!b.controls.replayFocusVisible)addFailure(b,'keyboard/focus cannot prove Replay');
    if(replayFocused){
      await Promise.all([page.waitForURL(/tutorial\.html/,{timeout:20000}),page.keyboard.press('Enter')]);
      await waitTutorial(page,0);
      const s=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
      if(s.index!==0||s.status!=='running'||!s.active)addFailure(b,'Replay did not reset Step 1');
      else b.controls.replay=true;
    }

    if(b.pageErrors.length)addFailure(b,`pageerror ${b.pageErrors.join(' | ')}`);
    if(b.consoleErrors.length)addFailure(b,`console error ${b.consoleErrors.map(x=>x.text).join(' | ')}`);
    if(b.unsafeWrites.length)addFailure(b,`unsafe writes ${b.unsafeWrites.length}`);
  }catch(e){addFailure(b,String(e?.stack||e));}
  b.pass=b.failures.length===0;
  report.viewports.push(b);
  await context.close();
}
await browser.close();
report.businessMutation=report.unsafeWrites.length;
report.pass=report.failures.length===0&&report.businessMutation===0&&report.viewports.every(v=>v.pass);
report.completedAt=new Date().toISOString();
fs.writeFileSync(RESULT,JSON.stringify(report,null,2));
console.log(JSON.stringify({
  pass:report.pass,
  viewports:report.viewports.map(v=>({name:v.name,pass:v.pass,controls:v.controls,pageErrors:v.pageErrors.length,consoleErrors:v.consoleErrors.length,unsafeWrites:v.unsafeWrites.length})),
  first10:10,businessMutation:report.businessMutation,failures:report.failures
},null,2));
if(!report.pass)process.exit(1);
