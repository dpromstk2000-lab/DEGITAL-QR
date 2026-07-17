(function(){
  "use strict";
  const O=window.DPRO_DENTAL_OWNER;
  const state={master:null,today:null,selectedPatient:null,date:O.today()};
  const $=id=>document.getElementById(id);
  const loginView=$("loginView"),appView=$("appView"),loginMessage=$("loginMessage"),mainMessage=$("mainMessage");
  const adminCode=$("adminCode"),boardDate=$("boardDate");

  function setBusy(on){document.querySelectorAll("button").forEach(b=>{if(!b.dataset.keepEnabled)b.disabled=on})}
  function statusButtons(r){
    const s=r.status,items=[];
    if(s==="pending")items.push(["confirmed","予約確定","primary"]);
    if(s==="confirmed")items.push(["arrived","到着","secondary"],["cancelled","取消","danger"],["no_show","未受診","warn"]);
    if(s==="arrived")items.push(["waiting","待機列へ","secondary"],["in_treatment","診療開始","primary"]);
    if(s==="waiting")items.push(["in_treatment","診療開始","primary"],["no_show","未受診","warn"]);
    if(s==="in_treatment")items.push(["payment_waiting","会計待ち","secondary"],["completed","完了","primary"]);
    if(s==="payment_waiting")items.push(["completed","完了","primary"]);
    return items.map(([v,l,c])=>`<button class="owner-btn ${c} small" data-res-status="${v}" data-id="${O.esc(r.id)}">${l}</button>`).join("");
  }
  function renderSummary(){
    const c=state.today?.counts||{};
    $("summary").innerHTML=[
      ["予約",c.reservations_total||0],["確認待ち",c.reservations_pending||0],["急患",c.urgent_total||0],
      ["急患確認待ち",c.urgent_pending||0],["待機中",c.queue_waiting||0],["診療中",c.in_treatment||0]
    ].map(([l,v])=>`<div class="owner-kpi"><span>${l}</span><strong>${v}</strong></div>`).join("");
  }
  function staffOptions(selected){return O.optionRows((state.master?.staff||[]).filter(x=>x.is_bookable),"id","staff_name",selected,"おまかせ")}
  function resourceOptions(selected){return O.optionRows(state.master?.resources||[],"id","resource_name",selected,"未割当")}
  function renderReservations(){
    const rows=state.today?.reservations||[];
    $("reservationList").innerHTML=rows.length?rows.map(r=>{
      const changePending=r.change_request_status==="pending"||(!r.change_request_status&&r.change_requested_at);
      const cancelPending=r.cancel_request_status==="pending"||(!r.cancel_request_status&&r.cancel_requested_at);
      return `<article class="owner-card ${(changePending||cancelPending)?"request":""}">
        <div class="owner-card-head"><div><div class="owner-card-title">${O.esc(O.formatTime(r.start_time))} ${O.esc(r.patient_name)}</div><div class="owner-meta">${O.esc(r.reservation_no)} / ${O.esc(r.menu_name||"")} / ${O.esc(O.labels.source[r.source]||r.source||"")}</div></div>${O.badge(r.status,"reservation")}</div>
        <div class="owner-line"></div><div class="owner-form-grid"><div><label>担当者</label><select class="owner-select" data-staff-for="${O.esc(r.id)}">${staffOptions(r.staff_id)}</select></div><div><label>診療台</label><select class="owner-select" data-resource-for="${O.esc(r.id)}">${resourceOptions(r.resource_id)}</select></div></div>
        <div class="owner-row" style="margin-top:10px"><button class="owner-btn light small" data-assign="${O.esc(r.id)}">割当保存</button>${statusButtons(r)}</div>
        ${changePending?`<div class="owner-note" style="margin-top:12px"><strong>変更希望</strong><br>${O.esc(O.formatDate(r.requested_date))} ${O.esc(O.formatTime(r.requested_time))}<br>${O.esc(r.change_request_note||"")}<div class="owner-row" style="margin-top:8px"><button class="owner-btn primary small" data-request-action="change_approve" data-id="${O.esc(r.id)}">変更を承認</button><button class="owner-btn light small" data-request-action="change_reject" data-id="${O.esc(r.id)}">見送り</button></div></div>`:""}
        ${cancelPending?`<div class="owner-note owner-danger-note" style="margin-top:12px"><strong>取消希望</strong><br>${O.esc(r.cancellation_reason||"")}<div class="owner-row" style="margin-top:8px"><button class="owner-btn danger small" data-request-action="cancel_approve" data-id="${O.esc(r.id)}">取消を承認</button><button class="owner-btn light small" data-request-action="cancel_reject" data-id="${O.esc(r.id)}">予約を維持</button></div></div>`:""}
        ${r.phone?`<div class="owner-meta" style="margin-top:10px">TEL ${O.esc(O.phone(r.phone))}</div>`:""}
      </article>`
    }).join(""):`<div class="owner-empty">この日の予約はありません。</div>`;
  }
  function renderUrgent(){
    const rows=state.today?.urgent_requests||[];
    $("urgentList").innerHTML=rows.length?rows.map(u=>`<article class="owner-card urgent"><div class="owner-card-head"><div><div class="owner-card-title">${O.esc(u.patient_name)}</div><div class="owner-meta">${O.esc(u.request_no)} / ${O.esc(O.labels.symptom[u.symptom_category]||u.symptom_category)} / 痛み ${O.esc(u.pain_scale??"-")}</div></div>${O.badge(u.status,"urgent")}</div><p>${O.esc(u.symptom_detail||"")}</p><div class="owner-form-grid"><div><label>判定</label><select class="owner-select" data-urgent-triage="${O.esc(u.id)}"><option value="">未判定</option>${Object.entries(O.labels.triage).map(([v,l])=>`<option value="${v}" ${u.triage_level===v?"selected":""}>${l}</option>`).join("")}</select></div><div><label>対応状態</label><select class="owner-select" data-urgent-status="${O.esc(u.id)}">${Object.entries(O.labels.urgent).map(([v,l])=>`<option value="${v}" ${u.status===v?"selected":""}>${l}</option>`).join("")}</select></div><div><label>来院案内日時</label><input class="owner-input" type="datetime-local" data-urgent-arrival="${O.esc(u.id)}"></div><div><label>患者向け案内</label><input class="owner-input" data-urgent-message="${O.esc(u.id)}" value="${O.esc(u.customer_message||"")}"></div></div><div class="owner-row" style="margin-top:10px"><button class="owner-btn primary small" data-urgent-save="${O.esc(u.id)}">急患対応を保存</button></div></article>`).join(""):`<div class="owner-empty">本日の急患受付はありません。</div>`;
  }
  function queueButtons(q){
    const s=q.status,items=[];
    if(s==="waiting")items.push(["called","呼出","primary"],["in_treatment","診療開始","secondary"]);
    if(s==="called")items.push(["in_room","診療室へ","secondary"],["in_treatment","診療開始","primary"]);
    if(s==="in_room")items.push(["in_treatment","診療開始","primary"]);
    if(s==="in_treatment")items.push(["payment_waiting","会計待ち","secondary"],["completed","完了","primary"]);
    if(s==="payment_waiting")items.push(["completed","完了","primary"]);
    if(["waiting","called"].includes(s))items.push(["no_show","未受診","warn"]);
    return items.map(([v,l,c])=>`<button class="owner-btn ${c} small" data-queue-status="${v}" data-id="${O.esc(q.id)}">${l}</button>`).join("");
  }
  function renderQueue(){
    const rows=state.today?.queue_entries||[];
    $("queueList").innerHTML=rows.length?rows.map(q=>`<article class="owner-card queue"><div class="owner-card-head"><div><div class="owner-queue-number">${O.esc(q.queue_number)}番</div><div class="owner-card-title">${O.esc(q.patient_name)}</div><div class="owner-meta">${O.esc(O.labels.source[q.source_type]||q.source_type)} / ${O.esc(q.member_no||"診察券なし")}</div></div>${O.badge(q.status,"queue")}</div><div class="owner-row" style="margin-top:12px">${queueButtons(q)}</div></article>`).join(""):`<div class="owner-empty">待ち列はありません。</div>`;
  }
  function renderAll(){renderSummary();renderReservations();renderUrgent();renderQueue()}
  function fillMaster(){
    $("bookingMenu").innerHTML=`<option value="">選択してください</option>`+(state.master?.menus||[]).filter(x=>x.phone_booking_enabled).map(x=>`<option value="${O.esc(x.id)}">${O.esc(x.menu_name)}（${O.esc(x.duration_minutes)}分）</option>`).join("");
    $("bookingStaff").innerHTML=staffOptions("");$("bookingResource").innerHTML=resourceOptions("");
  }
  async function load(){
    O.clear(mainMessage);setBusy(true);
    try{
      const [master,today]=await Promise.all([O.api("/api/hybrid/owner/master-data"),O.api("/api/hybrid/owner/today",{params:{date:state.date}})]);
      state.master=master;state.today=today;$("clinicName").textContent=master.clinic?.clinic_name||"DPRO歯科";fillMaster();renderAll();
    }catch(e){if(e.status===401){logout();return}O.show(mainMessage,"error",e.message)}finally{setBusy(false)}
  }
  async function login(){
    O.setAdminCode(adminCode.value);O.clear(loginMessage);
    try{await O.api("/api/hybrid/owner/master-data");loginView.classList.add("hidden");appView.classList.remove("hidden");await load()}catch(e){O.clearAdminCode();O.show(loginMessage,"error",e.message)}
  }
  function logout(){O.clearAdminCode();appView.classList.add("hidden");loginView.classList.remove("hidden");adminCode.value=""}
  async function act(path,body,success){setBusy(true);O.clear(mainMessage);try{const d=await O.api(path,{method:"POST",body});O.show(mainMessage,"success",success||d.message);await load()}catch(e){O.show(mainMessage,"error",e.message)}finally{setBusy(false)}}

  document.addEventListener("click",async e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.id==="loginButton")return login();if(b.id==="clearCode"){adminCode.value="";return}if(b.id==="logoutButton")return logout();if(b.id==="refreshButton")return load();
    if(b.dataset.tab){document.querySelectorAll(".owner-tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".owner-tab-panel").forEach(x=>x.classList.add("hidden"));$("tab-"+b.dataset.tab).classList.remove("hidden");return}
    if(b.dataset.assign){const id=b.dataset.assign;return act("/api/hybrid/owner/reservations/assign",{reservation_id:id,staff_id:document.querySelector(`[data-staff-for="${id}"]`).value,resource_id:document.querySelector(`[data-resource-for="${id}"]`).value},"割当を保存しました。")}
    if(b.dataset.resStatus){if(["cancelled","no_show"].includes(b.dataset.resStatus)&&!confirm("このステータスへ変更しますか？"))return;return act("/api/hybrid/owner/reservations/status",{reservation_id:b.dataset.id,status:b.dataset.resStatus})}
    if(b.dataset.requestAction){const action=b.dataset.requestAction;if(action.includes("approve")&&!confirm("この希望を承認しますか？"))return;const body={reservation_id:b.dataset.id,action,response_note:prompt("医院側メモ（空欄可）","")||""};if(action==="change_approve"){const r=(state.today.reservations||[]).find(x=>x.id===b.dataset.id);body.appointment_date=r?.requested_date;body.start_time=O.formatTime(r?.requested_time);body.staff_id=document.querySelector(`[data-staff-for="${b.dataset.id}"]`)?.value||"";body.resource_id=document.querySelector(`[data-resource-for="${b.dataset.id}"]`)?.value||""}return act("/api/hybrid/owner/reservations/request-action",body)}
    if(b.dataset.urgentSave){const id=b.dataset.urgentSave;const local=document.querySelector(`[data-urgent-arrival="${id}"]`).value;return act("/api/hybrid/owner/urgent/status",{urgent_request_id:id,status:document.querySelector(`[data-urgent-status="${id}"]`).value,triage_level:document.querySelector(`[data-urgent-triage="${id}"]`).value,assigned_arrival_at:local?new Date(local).toISOString():undefined,customer_message:document.querySelector(`[data-urgent-message="${id}"]`).value})}
    if(b.dataset.queueStatus)return act("/api/hybrid/owner/queue/status",{queue_entry_id:b.dataset.id,status:b.dataset.queueStatus});
  });
  boardDate.addEventListener("change",()=>{state.date=boardDate.value;load()});
  $("patientSearchButton").addEventListener("click",async()=>{const q=$("patientQuery").value;try{const d=await O.api("/api/hybrid/owner/patients/search",{params:{q}});$("patientResults").innerHTML=d.patients.length?d.patients.map(p=>`<button type="button" class="owner-btn light" style="width:100%;margin-top:8px" data-patient-json='${O.esc(JSON.stringify(p))}'>${O.esc(p.patient_name)} / ${O.esc(p.member_no||"診察券なし")} / ${O.esc(O.phone(p.phone))}</button>`).join(""):`<div class="owner-empty">該当患者なし</div>`}catch(e){O.show(mainMessage,"error",e.message)}});
  $("patientResults").addEventListener("click",e=>{const b=e.target.closest("[data-patient-json]");if(!b)return;state.selectedPatient=JSON.parse(b.dataset.patientJson);$("selectedPatient").innerHTML=`<strong>${O.esc(state.selectedPatient.patient_name)}</strong><br>${O.esc(state.selectedPatient.member_no||"診察券なし")} / ${O.esc(O.phone(state.selectedPatient.phone))}`;$("bookingName").value=state.selectedPatient.patient_name;$("bookingPhone").value=state.selectedPatient.phone;$("walkInName").value=state.selectedPatient.patient_name});
  $("loadSlotsButton").addEventListener("click",async()=>{try{const d=await O.api("/api/hybrid/public/slots",{params:{menu_id:$("bookingMenu").value,date:$("bookingDate").value,staff_id:$("bookingStaff").value,resource_id:$("bookingResource").value}});$("bookingTime").innerHTML=d.slots.length?`<option value="">時間を選択</option>`+d.slots.map(x=>`<option value="${x.time}">${x.time}（残り${x.remaining_capacity}）</option>`).join(""):`<option value="">${O.esc(d.reason||"空きなし")}</option>`}catch(e){O.show(mainMessage,"error",e.message)}});
  $("phoneReservationForm").addEventListener("submit",e=>{e.preventDefault();act("/api/hybrid/owner/reservations/create",{source:$("bookingSource").value,patient_id:state.selectedPatient?.id||"",patient_name:$("bookingName").value,phone:$("bookingPhone").value,treatment_menu_id:$("bookingMenu").value,appointment_date:$("bookingDate").value,start_time:$("bookingTime").value,staff_id:$("bookingStaff").value,resource_id:$("bookingResource").value,customer_note:$("bookingNote").value,auto_confirm:true},"電話・窓口予約を確定しました。")});
  $("walkInForm").addEventListener("submit",e=>{e.preventDefault();act("/api/hybrid/owner/queue/walk-in",{patient_id:state.selectedPatient?.id||"",patient_name:$("walkInName").value,priority_score:Number($("walkInPriority").value),staff_note:$("walkInNote").value},"窓口受付を登録しました。")});

  boardDate.value=state.date;$("bookingDate").value=state.date;$("bookingDate").min=O.today();
  const demo=O.getParam("demo")==="1";$("ipadLink").href=demo?"hybrid-owner-ipad.html?demo=1":"hybrid-owner-ipad.html";$("settingsLink").href=demo?"hybrid-owner-settings.html?demo=1":"hybrid-owner-settings.html";$("systemCheckLink").href=demo?"hybrid-system-check.html?demo=1":"hybrid-system-check.html";if(demo&&!O.getAdminCode())O.setAdminCode("1234");if(O.getAdminCode()){adminCode.value=O.getAdminCode();login()}else if(demo){adminCode.value="1234"}
})();
