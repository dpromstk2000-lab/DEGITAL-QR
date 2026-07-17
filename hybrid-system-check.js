(function(){
  "use strict";
  const O=window.DPRO_DENTAL_OWNER,$=id=>document.getElementById(id);
  const loginView=$("loginView"),appView=$("appView"),loginMessage=$("loginMessage"),mainMessage=$("mainMessage"),adminCode=$("adminCode");
  function setBusy(on){$("runButton").disabled=on;$("runButton").textContent=on?"検査中…":"一括チェック実行"}
  function logout(){O.clearAdminCode();appView.classList.add("hidden");loginView.classList.remove("hidden");adminCode.value=""}
  function render(data){
    $("clinicName").textContent=data.clinic_code||"DPRO歯科";
    $("checkMeta").textContent=`${data.version||""} / ${data.jst_date||""} / ${data.elapsed_ms||0}ms / run_id=${data.run_id||""}`;
    const r=$("checkResult");r.className=`owner-check-result ${data.ok?"pass":"fail"}`;r.textContent=data.ok?"全項目合格":"要確認";
    const s=data.summary||{};$("checkSummary").innerHTML=[["合格",s.passed||0],["失敗",s.failed||0],["合計",s.total||0],["予約メニュー",data.counts?.active_menus||0],["予約担当",data.counts?.bookable_staff||0],["診療台",data.counts?.active_resources||0]].map(([l,v])=>`<div class="owner-kpi"><span>${l}</span><strong>${v}</strong></div>`).join("");
    $("checkList").innerHTML=(data.checks||[]).map(x=>`<article class="owner-check-row ${x.ok?"pass":"fail"}"><div class="owner-check-icon">${x.ok?"✓":"!"}</div><div><strong>${O.esc(x.key)}</strong><p>${O.esc(typeof x.detail==="string"?x.detail:JSON.stringify(x.detail))}</p></div><span class="owner-badge ${x.ok?"good":"bad"}">${x.ok?"OK":"NG"}</span></article>`).join("");
    $("rawOutput").textContent=JSON.stringify(data,null,2);
  }
  async function run(){
    O.clear(mainMessage);setBusy(true);
    try{
      const data=await O.api("/api/hybrid/owner/final-system-check");
      render(data);
      O.show(mainMessage,data.ok?"success":"error",data.ok?"営業前system-checkは全項目合格です。":"一部の項目を確認してください。");
    }catch(e){
      if(e.data&&Array.isArray(e.data.checks)){
        render(e.data);
        O.show(mainMessage,"error","一部の項目を確認してください。詳細を表示しました。");
      }else{
        O.show(mainMessage,"error",e.message);
        $("rawOutput").textContent=JSON.stringify(e.data||{message:e.message},null,2);
      }
    }finally{setBusy(false)}
  }
  async function login(){O.setAdminCode(adminCode.value);O.clear(loginMessage);try{await O.api("/api/hybrid/owner/settings");loginView.classList.add("hidden");appView.classList.remove("hidden");await run()}catch(e){O.clearAdminCode();O.show(loginMessage,"error",e.message)}}
  document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.id==="loginButton")return login();if(b.id==="clearCode"){adminCode.value="";return}if(b.id==="logoutButton")return logout();if(b.id==="runButton")return run()});
  const demo=O.getParam("demo")==="1";$("ownerLink").href=demo?"hybrid-owner.html?demo=1":"hybrid-owner.html";$("settingsLink").href=demo?"hybrid-owner-settings.html?demo=1":"hybrid-owner-settings.html";if(demo&&!O.getAdminCode())O.setAdminCode("1234");if(O.getAdminCode()){adminCode.value=O.getAdminCode();login()}else if(demo){adminCode.value="1234"}
})();
