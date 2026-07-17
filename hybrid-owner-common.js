/* =========================================================
  STEP DENTAL-HYBRID-3
  DPRO 歯科ハイブリッド 医院管理画面 共通処理
========================================================= */
(function(){
  "use strict";
  const baseConfig=window.DPRO_DENTAL_HYBRID_CONFIG||{};
  const API=String(baseConfig.HYBRID_API_BASE||"https://dpro-dental-hybrid-api.dpromstk2000.workers.dev").replace(/\/+$/,"");
  const CLINIC_CODE=baseConfig.CLINIC_CODE||"dpro_dental_demo";
  const STORAGE_KEY=`dproDentalHybridOwner:${CLINIC_CODE}:adminCode`;

  const labels={
    reservation:{pending:"医院確認待ち",confirmed:"予約確定",arrived:"到着済み",waiting:"診療待ち",in_treatment:"診療中",payment_waiting:"会計待ち",completed:"完了",cancel_requested:"取消確認中",cancelled:"取消済み",no_show:"未受診"},
    urgent:{pending:"医院確認待ち",reviewing:"確認中",call_required:"電話確認",come_now:"すぐ来院",come_at:"指定時刻来院",unavailable:"本日対応困難",arrived:"到着済み",waiting:"診療待ち",in_treatment:"診療中",payment_waiting:"会計待ち",completed:"完了",cancelled:"取消済み"},
    queue:{waiting:"待機中",called:"呼出中",in_room:"診療室案内",in_treatment:"診療中",payment_waiting:"会計待ち",completed:"完了",cancelled:"取消済み",no_show:"未受診"},
    source:{line:"LINE",web:"Web",phone:"電話",counter:"窓口",admin:"管理",import:"取込",reservation:"予約",urgent:"急患",walk_in:"窓口"},
    symptom:{severe_pain:"強い痛み",swelling:"腫れ",filling_lost:"詰め物・被せ物脱落",tooth_broken:"歯の破折",bleeding:"出血",trauma:"外傷",denture_problem:"入れ歯",post_treatment_problem:"治療後トラブル",other:"その他"},
    triage:{routine:"通常",soon:"早め",priority:"優先",emergency_referral:"救急・専門紹介"}
  };
  function clean(v){return String(v??"").trim()}
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  function getParam(name){return new URLSearchParams(location.search).get(name)||""}
  function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
  function formatDate(v){if(!v)return"未定";const x=String(v).slice(0,10).split("-").map(Number);if(x.length!==3)return String(v);const d=new Date(Date.UTC(x[0],x[1]-1,x[2]));return`${x[0]}/${String(x[1]).padStart(2,"0")}/${String(x[2]).padStart(2,"0")}(${["日","月","火","水","木","金","土"][d.getUTCDay()]})`}
  function formatTime(v){return v?String(v).slice(0,5):"未定"}
  function formatDateTime(v){if(!v)return"未設定";const d=new Date(v);return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d)}
  function normalizePhone(v){let s=clean(v).normalize("NFKC").replace(/[^\d+]/g,"");if(s.startsWith("+81"))s=`0${s.slice(3)}`;return s.replace(/\D/g,"")}
  function phone(v){const n=normalizePhone(v);if(n.length===11)return`${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;if(n.length===10)return`${n.slice(0,2)}-${n.slice(2,6)}-${n.slice(6)}`;return clean(v)}
  function getAdminCode(){return sessionStorage.getItem(STORAGE_KEY)||""}
  function setAdminCode(v){const code=clean(v);if(code)sessionStorage.setItem(STORAGE_KEY,code);else sessionStorage.removeItem(STORAGE_KEY)}
  function clearAdminCode(){sessionStorage.removeItem(STORAGE_KEY)}
  async function api(path,{method="GET",params={},body}={}){
    const url=new URL(API+path);url.searchParams.set("clinic_code",CLINIC_CODE);url.searchParams.set("_t",Date.now());
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&String(v)!=="")url.searchParams.set(k,String(v))});
    const headers={"x-dpro-admin-code":getAdminCode()};
    const init={method,headers,cache:"no-store",mode:"cors"};
    if(body!==undefined){headers["content-type"]="application/json";init.body=JSON.stringify({clinic_code:CLINIC_CODE,...body})}
    const res=await fetch(url,init);const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{throw new Error("API応答を読み取れませんでした。")}
    if(!res.ok||data.ok===false){const e=new Error(data.message||data.error||`HTTP ${res.status}`);e.status=res.status;e.data=data;throw e}return data
  }
  function badge(status,kind="reservation"){const label=labels[kind]?.[status]||status||"未設定";const cls=["completed","confirmed"].includes(status)?"good":["cancelled","no_show","unavailable"].includes(status)?"bad":["pending","call_required","payment_waiting"].includes(status)?"warn":"info";return`<span class="owner-badge ${cls}">${esc(label)}</span>`}
  function show(el,type,text){if(!el)return;el.className=`owner-message show ${type||"info"}`;el.textContent=text}
  function clear(el){if(!el)return;el.className="owner-message";el.textContent=""}
  function optionRows(rows,valueKey,labelKey,selected="",blank="未割当"){return`<option value="">${esc(blank)}</option>`+(rows||[]).map(x=>`<option value="${esc(x[valueKey])}" ${String(x[valueKey])===String(selected)?"selected":""}>${esc(x[labelKey])}</option>`).join("")}
  window.DPRO_DENTAL_OWNER={API,CLINIC_CODE,labels,clean,esc,getParam,today,formatDate,formatTime,formatDateTime,phone,getAdminCode,setAdminCode,clearAdminCode,api,badge,show,clear,optionRows};
})();
