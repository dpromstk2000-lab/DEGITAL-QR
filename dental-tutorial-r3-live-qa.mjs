import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE=(process.env.DPRO_BASE_URL||'https://dpromstk2000-lab.github.io/DEGITAL-QR/').replace(/\/+$/,'/')
const viewports=[
  {name:'desktop',width:1440,height:1000},
  {name:'tablet',width:1024,height:768},
  {name:'mobile390',width:390,height:844},
  {name:'mobile320',width:320,height:720}
];
const report={system:'DENTAL',stage:'R3',standard:'V1.1',base:BASE,generated_at:new Date().toISOString(),first10_expected:10,viewports:[],interaction:{},errors:[],business_writes:[],pass:false};
const browser=await chromium.launch({headless:true});

function isProductScoped(url=''){return url.includes('/DEGITAL-QR/')||url.includes('dpro-dental-qr-api.dpromstk2000.workers.dev');}
function attachTelemetry(page,bucket){
  page.on('pageerror',err=>bucket.pageerrors.push(String(err?.message||err)));
  page.on('console',msg=>{if(msg.type()==='error'){const loc=msg.location(); if(isProductScoped(loc?.url||'')) bucket.consoleErrors.push({text:msg.text(),url:loc?.url||'',line:loc?.lineNumber??null});}});
  page.on('request',req=>{const method=req.method();if(!['GET','HEAD','OPTIONS'].includes(method)&&isProductScoped(req.url())){const row={method,url:req.url(),resourceType:req.resourceType()};bucket.businessWrites.push(row);report.business_writes.push(row);}});
}
async function boot(page){
  await page.goto(BASE+'tutorial.html?qa=1&ts='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA?.steps?.length===10,{timeout:30000});
  await page.waitForFunction(()=>document.getElementById('dpro-product-frame')?.contentDocument?.readyState==='complete',{timeout:30000});
}
async function metrics(page){return await page.evaluate(()=>{
  const f=document.getElementById('dpro-product-frame'); let product=null;
  try{const w=f.contentWindow,d=f.contentDocument;product={innerWidth:w.innerWidth,documentElementScrollWidth:d.documentElement.scrollWidth,bodyScrollWidth:d.body.scrollWidth};}catch(_){ }
  return {parent:{innerWidth:innerWidth,documentElementScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth},product};
});}
async function cardCheck(page){return await page.evaluate(()=>{const c=document.getElementById('dpro-card').getBoundingClientRect();const h=document.getElementById('dpro-highlight').getBoundingClientRect();const hd=getComputedStyle(document.getElementById('dpro-highlight'));return {card:{left:c.left,top:c.top,right:c.right,bottom:c.bottom,width:c.width,height:c.height,inViewport:c.left>=0&&c.top>=0&&c.right<=innerWidth+0.5&&c.bottom<=innerHeight+0.5},highlight:{display:hd.display,left:h.left,top:h.top,right:h.right,bottom:h.bottom,width:h.width,height:h.height,inViewport:hd.display==='none'||(h.left>=0&&h.top>=0&&h.right<=innerWidth+0.5&&h.bottom<=innerHeight+0.5)},activeElement:document.activeElement?.id||'',focusOutline:getComputedStyle(document.activeElement).outlineStyle,resolved:window.DPRO_TUTORIAL_QA.resolvedSelector()};});}
async function startGuide(page){await page.click('#dpro-launcher');await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().active===true);await page.waitForTimeout(350);}
async function waitIndex(page,index){await page.waitForFunction(i=>window.DPRO_TUTORIAL_QA.getState().index===i,index,{timeout:30000});await page.waitForTimeout(350);}

for(const vp of viewports){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});const page=await context.newPage();const bucket={name:vp.name,width:vp.width,height:vp.height,pageerrors:[],consoleErrors:[],businessWrites:[],steps:[]};attachTelemetry(page,bucket);
  try{
    await boot(page);await startGuide(page);
    const count=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.steps.length);bucket.first10=count;
    const m=await metrics(page);bucket.metrics=m;
    const c=await cardCheck(page);bucket.initial=c;
    const overflowRequired=vp.width<=390;
    bucket.overflowPass=!overflowRequired||((m.parent.documentElementScrollWidth<=m.parent.innerWidth)&&(m.parent.bodyScrollWidth<=m.parent.innerWidth)&&m.product&&(m.product.documentElementScrollWidth<=m.product.innerWidth)&&(m.product.bodyScrollWidth<=m.product.innerWidth));
    bucket.basePass=count===10&&c.card.inViewport&&c.highlight.display!=='none'&&c.highlight.width>0&&c.highlight.height>0&&c.highlight.inViewport&&c.activeElement==='dpro-next'&&c.focusOutline!=='none'&&bucket.overflowPass;
  }catch(e){bucket.error=String(e?.stack||e);bucket.basePass=false;}
  bucket.pass=bucket.basePass&&bucket.pageerrors.length===0&&bucket.consoleErrors.length===0&&bucket.businessWrites.length===0;report.viewports.push(bucket);await context.close();
}

// Full keyboard journey + cross-page Resume + completion/replay.
{
  const context=await browser.newContext({viewport:{width:1024,height:768}});const page=await context.newPage();const b={pageerrors:[],consoleErrors:[],businessWrites:[]};attachTelemetry(page,b);const rows=[];
  try{
    await boot(page);await startGuide(page);
    for(let i=0;i<10;i++){
      await waitIndex(page,i);const r=await cardCheck(page);const route=await page.evaluate(()=>{const f=document.getElementById('dpro-product-frame');return f.contentWindow.location.pathname.split('/').pop()+f.contentWindow.location.search;});rows.push({step:i+1,resolved:r.resolved,focus:r.activeElement,route,highlight:r.highlight});
      if(i===1){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA?.getState().index===1&&window.DPRO_TUTORIAL_QA.getState().active===true,{timeout:30000});await page.waitForTimeout(350);}
      await page.keyboard.press('Enter');
    }
    await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().status==='completed',{timeout:10000});
    const completed=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
    await page.keyboard.press('Enter');await waitIndex(page,0);
    const replayed=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
    report.interaction.keyboard={rows,completed,replayed,pass:rows.length===10&&rows.every(x=>x.resolved&&x.focus==='dpro-next'&&x.highlight.display!=='none')&&completed.status==='completed'&&replayed.index===0&&replayed.active===true&&b.pageerrors.length===0&&b.consoleErrors.length===0&&b.businessWrites.length===0};
  }catch(e){report.interaction.keyboard={rows,error:String(e?.stack||e),pass:false};}
  await context.close();
}

// Close via Esc -> Resume, Back, Skip -> Replay, fallback resolution.
{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const b={pageerrors:[],consoleErrors:[],businessWrites:[]};attachTelemetry(page,b);
 try{
   await boot(page);await startGuide(page);await page.keyboard.press('Enter');await waitIndex(page,1);await page.keyboard.press('Enter');await waitIndex(page,2);
   await page.keyboard.press('Alt+ArrowLeft');await waitIndex(page,1);const backPass=(await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState().index))===1;
   await page.keyboard.press('Escape');await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().status==='paused');const paused=await page.evaluate(()=>({state:window.DPRO_TUTORIAL_QA.getState(),launcherHidden:document.getElementById('dpro-launcher').hidden,focus:document.activeElement?.id}));
   await page.keyboard.press('Enter');await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().active===true);await page.waitForTimeout(300);const resumed=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
   await page.evaluate(()=>{const f=document.getElementById('dpro-product-frame');const n=f.contentDocument.querySelector('#patientTabs');if(n)n.style.display='none';});
   const fallback=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.refreshTarget());
   await page.click('#dpro-skip');await page.waitForFunction(()=>window.DPRO_TUTORIAL_QA.getState().status==='skipped');const skipped=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
   await page.click('#dpro-end-replay');await waitIndex(page,0);const replayed=await page.evaluate(()=>window.DPRO_TUTORIAL_QA.getState());
   report.interaction.controls={backPass,paused,resumed,fallback,skipped,replayed,pass:backPass&&paused.state.status==='paused'&&!paused.launcherHidden&&paused.focus==='dpro-launcher'&&resumed.active===true&&fallback?.fallback===true&&skipped.status==='skipped'&&replayed.index===0&&b.pageerrors.length===0&&b.consoleErrors.length===0&&b.businessWrites.length===0};
 }catch(e){report.interaction.controls={error:String(e?.stack||e),pass:false};}
 await context.close();
}

async function dragSuite(width,height,kind){
 const context=await browser.newContext({viewport:{width,height},hasTouch:kind==='touch',isMobile:kind==='touch'});const page=await context.newPage();const b={pageerrors:[],consoleErrors:[],businessWrites:[]};attachTelemetry(page,b);let result={kind};
 try{
  await boot(page);await startGuide(page);const before=await page.locator('#dpro-card').boundingBox();
  // Card body itself must not drag.
  await page.evaluate(()=>{const c=document.getElementById('dpro-card'),r=c.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',r.left+20,r.top+100],['pointermove',r.left+130,r.top+180],['pointerup',r.left+130,r.top+180]])c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:91,pointerType:'mouse',clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1}));});
  const noHandle=await page.locator('#dpro-card').boundingBox();
  if(kind==='mouse'){
   const h=await page.locator('#dpro-drag-handle').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2-120,h.y+h.height/2+130,{steps:5});await page.mouse.up();
  }else{
   await page.evaluate(()=>{const h=document.getElementById('dpro-drag-handle'),r=h.getBoundingClientRect(),id=77;const fire=(type,x,y,buttons)=>h.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons}));fire('pointerdown',r.left+r.width/2,r.top+r.height/2,1);fire('pointermove',-5000,5000,1);fire('pointerup',-5000,5000,0);});
  }
  await page.waitForTimeout(150);const after=await page.locator('#dpro-card').boundingBox();const inViewport=after.x>=0&&after.y>=0&&after.x+after.width<=width+0.5&&after.y+after.height<=height+0.5;
  const nonHandleStable=Math.abs(before.x-noHandle.x)<1&&Math.abs(before.y-noHandle.y)<1;const moved=Math.abs(after.x-before.x)>5||Math.abs(after.y-before.y)>5;
  result={kind,before,noHandle,after,nonHandleStable,moved,inViewport,pageerrors:b.pageerrors,consoleErrors:b.consoleErrors,businessWrites:b.businessWrites,pass:nonHandleStable&&moved&&inViewport&&b.pageerrors.length===0&&b.consoleErrors.length===0&&b.businessWrites.length===0};
 }catch(e){result={kind,error:String(e?.stack||e),pass:false};}
 await context.close();return result;
}
report.interaction.dragDesktop=await dragSuite(1440,1000,'mouse');
report.interaction.dragTablet=await dragSuite(1024,768,'mouse');
report.interaction.dragTouchMobile=await dragSuite(390,844,'touch');

const interactionPass=Object.values(report.interaction).every(x=>x?.pass===true);
report.pass=report.viewports.every(v=>v.pass===true)&&interactionPass&&report.business_writes.length===0;
fs.writeFileSync('dental-r3-live-qa.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({pass:report.pass,viewports:report.viewports.map(v=>({name:v.name,pass:v.pass,metrics:v.metrics,pageerrors:v.pageerrors.length,consoleErrors:v.consoleErrors.length,businessWrites:v.businessWrites.length})),interaction:Object.fromEntries(Object.entries(report.interaction).map(([k,v])=>[k,v.pass])),businessWrites:report.business_writes.length},null,2));
await browser.close();
if(!report.pass)process.exit(1);
