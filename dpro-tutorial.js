(()=>{
'use strict';
const STORAGE_KEY='dpro.dental.tutorial.v1.1';
const BASE='./';
const STEPS=[
 {step:1,title:'公開デモの全体像',route:'demo-guide.html',primary:'#screenGrid',fallback:['.section-head','main.page'],copy:'まず、歯科受付デモで確認できる画面と全体の流れを見ます。',safe:'案内表示だけを確認します。製品側のリンクはガイドから自動操作しません。'},
 {step:2,title:'受診する家族を選ぶ場所',route:'hybrid.html?t=demo-dental-patient-001',primary:'#patientTabs',fallback:['#patientSummary','.card'],copy:'本人・お子さまなど、受診する方を切り替える場所です。',safe:'現在のデモ診察券だけを表示します。新しい患者情報は作成しません。'},
 {step:3,title:'選択中の診察券を確認',route:'hybrid.html?t=demo-dental-patient-001',primary:'#patientSummary',fallback:['#patientTabs','#serviceStatus'],copy:'選択中の受診者と診察券番号を確認する場所です。',safe:'表示内容の説明のみで、患者データは変更しません。'},
 {step:4,title:'30分予約の入口',route:'hybrid.html?t=demo-dental-patient-001',primary:'#reservationLink',fallback:['.grid','.action-card'],copy:'30分単位の診療予約へ進む入口です。',safe:'「次へ」はガイド自身が画面を切り替えます。予約ボタンを自動クリックしません。'},
 {step:5,title:'予約する受診者を確認',route:'reservation.html?t=demo-dental-patient-001',primary:'#selectedPatient',fallback:['#patientTabs','#reservationForm'],copy:'予約画面でも、受診する方が正しく引き継がれているか確認します。',safe:'氏名・電話番号などを自動入力しません。実在情報は入力しないでください。'},
 {step:6,title:'診療内容と空き枠の流れ',route:'reservation.html?t=demo-dental-patient-001',primary:'#menuChoices',fallback:['#appointmentDate','#slotChoices'],copy:'診療内容・日付・30分枠を順に選ぶ構成を確認します。',safe:'診療内容や日時は自動選択せず、予約送信も行いません。'},
 {step:7,title:'当日急患受付の安全注意',route:'urgent.html?t=demo-dental-patient-001',primary:'.danger-notice',fallback:['#selectedPatient','#symptomChoices'],copy:'当日急患受付は、来院前に症状を医院へ共有する入口です。',safe:'診断・救急判定ではありません。症状入力や急患申込を自動実行しません。'},
 {step:8,title:'家族のデジタル診察券',route:'member.html?t=demo-dental-patient-001',primary:'#familyPanel',fallback:['#patientName','#memberNo','.member-card'],copy:'家族の診察券を1つのLINE導線で切り替える画面を確認します。',safe:'LINE連携・ログイン・家族紐付けは自動実行しません。'},
 {step:9,title:'受付で見せるQR',route:'member.html?t=demo-dental-patient-001',primary:'#qrImage',fallback:['.qr-card','#memberNo'],copy:'来院時に受付で提示するデジタル診察券QRの位置を確認します。',safe:'QR読取・来院チェックイン・待ち列登録は行いません。'},
 {step:10,title:'医院側の受付運用を知る',route:'owner.html',primary:'.sales-guide',fallback:['#adminCodeInput','.summary-grid','.top-bar'],copy:'最後に、医院側の受付運用を説明する領域を確認します。',safe:'管理コードは推測・自動入力しません。認証が必要な情報は説明だけで完了します。'}
];
const el={frame:document.getElementById('dpro-product-frame'),highlight:document.getElementById('dpro-highlight'),launcher:document.getElementById('dpro-launcher'),card:document.getElementById('dpro-card'),body:document.getElementById('dpro-card-body'),handle:document.getElementById('dpro-drag-handle'),badge:document.getElementById('dpro-step-badge'),live:document.getElementById('dpro-live')};
const defaultState=()=>({version:'1.1',index:0,status:'new',active:false,card:null,updatedAt:Date.now()});
let state=loadState(); let resolved=null; let targetTimer=null; let drag=null; let frameScrollBound=false;
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return s&&s.version==='1.1'?Object.assign(defaultState(),s):defaultState();}catch(_){return defaultState();}}
function saveState(){state.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function routeFor(step){return new URL(step.route,location.href).href;}
function frameRoute(){try{const u=new URL(el.frame.contentWindow.location.href);return u.pathname.split('/').pop()+u.search;}catch(_){return '';}}
function normalizeRoute(route){const u=new URL(route,location.href);return u.pathname.split('/').pop()+u.search;}
function setReadonly(on){el.frame.classList.toggle('dpro-readonly',!!on);}
function announce(t){el.live.textContent='';requestAnimationFrame(()=>el.live.textContent=t);}
function launcherLabel(){if(state.status==='completed'||state.status==='skipped')return '操作ガイドをもう一度';if(state.status==='paused'||state.index>0)return '操作ガイドを再開';return '操作ガイドを開始';}
function showLauncher(){el.launcher.hidden=false;el.launcher.textContent=launcherLabel();}
function hideLauncher(){el.launcher.hidden=true;}
function dangerousSelector(sel){return /submitButton|changeRequestButton|cancelRequestButton|urgentCancelButton|lineLinkButton|checkin|save|delete|approve|payment/i.test(sel||'');}
function visibleInFrame(node){if(!node)return false;const w=el.frame.contentWindow;const cs=w.getComputedStyle(node);const r=node.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>1&&r.height>1;}
function inFrameViewport(node){if(!node)return false;const w=el.frame.contentWindow;const r=node.getBoundingClientRect();return r.right>0&&r.bottom>0&&r.left<w.innerWidth&&r.top<w.innerHeight;}
function findTarget(){try{const doc=el.frame.contentDocument;const step=STEPS[state.index];for(const sel of [step.primary,...step.fallback]){const node=doc.querySelector(sel);if(!node||!visibleInFrame(node))continue;if(!inFrameViewport(node)&&!dangerousSelector(sel)){try{node.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});}catch(_){}}if(visibleInFrame(node)&&inFrameViewport(node)){resolved={node,selector:sel,fallback:sel!==step.primary};return resolved;}}}catch(_){ }resolved=null;return null;}
function highlightTarget(){if(!state.active){el.highlight.style.display='none';return;}const found=findTarget();if(!found){el.highlight.style.display='none';renderTargetNote();return;}try{const fr=el.frame.getBoundingClientRect();const r=found.node.getBoundingClientRect();const pad=6;const left=Math.max(2,fr.left+r.left-pad),top=Math.max(2,fr.top+r.top-pad);const right=Math.min(innerWidth-2,fr.left+r.right+pad),bottom=Math.min(innerHeight-2,fr.top+r.bottom+pad);if(right<=left||bottom<=top){el.highlight.style.display='none';return;}Object.assign(el.highlight.style,{display:'block',left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});renderTargetNote();}catch(_){el.highlight.style.display='none';}}
function renderTargetNote(){const note=el.body.querySelector('[data-target-note]');if(note)note.textContent=resolved?`対象: ${resolved.selector}${resolved.fallback?'（fallback）':''}`:'対象を安全に表示できないため、説明カードのみで続行できます。';}
function bodyHtml(){const s=STEPS[state.index];return `<div class="dpro-kicker">FIRST10 / STEP ${s.step} OF 10</div><h1 class="dpro-title" id="dpro-title">${s.title}</h1><p class="dpro-copy">${s.copy}</p><div class="dpro-safe">${s.safe}</div><div class="dpro-target-note" data-target-note></div><div class="dpro-progress" aria-label="進捗 ${s.step}/10"><span style="width:${s.step*10}%"></span></div><div class="dpro-actions"><button type="button" id="dpro-back" ${state.index===0?'disabled':''}>戻る</button><button type="button" class="primary" id="dpro-next">${state.index===STEPS.length-1?'完了':'次へ'}</button><button type="button" id="dpro-close">閉じる</button></div><div class="dpro-secondary-row"><button type="button" id="dpro-skip">スキップ</button><button type="button" id="dpro-replay">最初から</button></div>`;}
function renderStep(){if(!state.active)return;el.card.hidden=false;hideLauncher();setReadonly(true);el.badge.textContent=`${state.index+1} / ${STEPS.length}`;el.body.innerHTML=bodyHtml();el.body.querySelector('#dpro-next').addEventListener('click',next);el.body.querySelector('#dpro-back').addEventListener('click',back);el.body.querySelector('#dpro-close').addEventListener('click',closeGuide);el.body.querySelector('#dpro-skip').addEventListener('click',skip);el.body.querySelector('#dpro-replay').addEventListener('click',replay);restoreCard();clearTimeout(targetTimer);let tries=0;const attempt=()=>{highlightTarget();tries++;if(!resolved&&tries<80)targetTimer=setTimeout(attempt,150);};attempt();focusPrimary();announce(`ステップ${state.index+1}、${STEPS[state.index].title}`);}
function endView(kind){state.active=false;state.status=kind;saveState();setReadonly(false);el.highlight.style.display='none';el.card.hidden=false;hideLauncher();const done=kind==='completed';el.badge.textContent=done?'10 / 10':'SKIP';el.body.innerHTML=`<div class="dpro-end"><div class="icon">${done?'✓':'↷'}</div><h2 id="dpro-title">${done?'First10 完了':'ガイドをスキップしました'}</h2><p>${done?'10ステップを完了しました。製品画面は通常操作へ戻りました。':'いつでも最初からやり直せます。製品画面は通常操作へ戻りました。'}</p><button id="dpro-end-replay" type="button">Replay / 最初から</button></div>`;el.body.querySelector('#dpro-end-replay').addEventListener('click',replay);el.body.querySelector('#dpro-end-replay').focus();announce(done?'操作ガイドを完了しました':'操作ガイドをスキップしました');}
function sameRoute(step){return frameRoute()===normalizeRoute(step.route);}
function loadCurrentRoute(){const step=STEPS[state.index];resolved=null;el.highlight.style.display='none';if(sameRoute(step)){renderStep();return;}el.frame.src=routeFor(step);}
function start(){state.index=0;state.status='running';state.active=true;saveState();loadCurrentRoute();}
function resume(){state.status='running';state.active=true;saveState();loadCurrentRoute();}
function replay(){state.index=0;state.status='running';state.active=true;state.card=null;saveState();loadCurrentRoute();}
function next(){if(!state.active)return;if(state.index>=STEPS.length-1){endView('completed');return;}state.index++;state.status='running';saveState();loadCurrentRoute();}
function back(){if(!state.active||state.index<=0)return;state.index--;state.status='running';saveState();loadCurrentRoute();}
function closeGuide(){state.active=false;state.status='paused';saveState();setReadonly(false);el.card.hidden=true;el.highlight.style.display='none';showLauncher();el.launcher.focus();announce('操作ガイドを一時停止しました');}
function skip(){endView('skipped');}
function focusPrimary(){requestAnimationFrame(()=>{const b=el.body.querySelector('#dpro-next');if(b){b.focus({preventScroll:true});}});}
function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
function cardRect(){return el.card.getBoundingClientRect();}
function clampCard(left,top){const r=cardRect(),gap=6;return {left:clamp(left,gap,Math.max(gap,innerWidth-r.width-gap)),top:clamp(top,gap,Math.max(gap,innerHeight-r.height-gap))};}
function setCardPosition(left,top,persist=true){const p=clampCard(left,top);el.card.style.left=p.left+'px';el.card.style.top=p.top+'px';el.card.style.right='auto';if(persist){state.card=p;saveState();}}
function restoreCard(){if(state.card&&Number.isFinite(state.card.left)&&Number.isFinite(state.card.top))setCardPosition(state.card.left,state.card.top,false);else{el.card.style.left='auto';el.card.style.right='8px';el.card.style.top='8px';requestAnimationFrame(()=>{const r=cardRect();const p=clampCard(r.left,r.top);setCardPosition(p.left,p.top,false);});}}
function dragStart(e){if(e.button!=null&&e.button!==0)return;const r=cardRect();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:r.left,top:r.top};el.handle.dataset.dragging='true';try{el.handle.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();}
function dragMove(e){if(!drag||e.pointerId!==drag.id)return;setCardPosition(drag.left+(e.clientX-drag.startX),drag.top+(e.clientY-drag.startY),false);e.preventDefault();}
function dragEnd(e){if(!drag||e.pointerId!==drag.id)return;const r=cardRect();setCardPosition(r.left,r.top,true);el.handle.dataset.dragging='false';try{el.handle.releasePointerCapture(e.pointerId);}catch(_){}drag=null;e.preventDefault();}
el.handle.addEventListener('pointerdown',dragStart);el.handle.addEventListener('pointermove',dragMove);el.handle.addEventListener('pointerup',dragEnd);el.handle.addEventListener('pointercancel',dragEnd);
el.launcher.addEventListener('click',()=>{if(state.status==='completed'||state.status==='skipped')replay();else if(state.status==='new'&&state.index===0)start();else resume();});
el.frame.addEventListener('load',()=>{frameScrollBound=false;try{el.frame.contentWindow.addEventListener('scroll',highlightTarget,{passive:true});frameScrollBound=true;}catch(_){}if(state.active)renderStep();else{el.highlight.style.display='none';showLauncher();}});
window.addEventListener('resize',()=>{if(!el.card.hidden){const r=cardRect();setCardPosition(r.left,r.top,false);}highlightTarget();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.active){e.preventDefault();closeGuide();return;}if(!state.active)return;if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();next();}if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();back();}});
window.DPRO_TUTORIAL_QA={steps:STEPS,getState:()=>JSON.parse(JSON.stringify(state)),start,resume,replay,next,back,skip,close:closeGuide,refreshTarget:()=>{resolved=null;highlightTarget();return resolved?{selector:resolved.selector,fallback:resolved.fallback}:null;},resolvedSelector:()=>resolved&&resolved.selector,storageKey:STORAGE_KEY};
function init(){showLauncher();if(state.active&&state.status==='running')loadCurrentRoute();else if(state.status==='completed'||state.status==='skipped')showLauncher();else{state.active=false;saveState();} }
init();
})();
