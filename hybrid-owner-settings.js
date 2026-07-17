(function(){
  "use strict";
  const O=window.DPRO_DENTAL_OWNER,$=id=>document.getElementById(id);
  const state={settings:null,staff:[],resources:[],menus:[],hours:[]};
  const roleLabels={dentist:"歯科医師",hygienist:"歯科衛生士",assistant:"歯科助手",reception:"受付",other:"その他"};
  const resourceLabels={chair:"診療台",xray:"レントゲン",consultation_room:"相談室",surgery_room:"手術室",other:"その他"};
  const categoryLabels={first_visit:"初診",checkup:"定期検診",cleaning:"クリーニング",treatment:"治療",pediatric:"小児",orthodontic:"矯正",prosthetic:"補綴",surgery:"外科",consultation:"相談",other:"その他"};
  const loginView=$("loginView"),appView=$("appView"),loginMessage=$("loginMessage"),mainMessage=$("mainMessage"),adminCode=$("adminCode");

  function setBusy(on){document.querySelectorAll("button").forEach(b=>{if(!b.classList.contains("keep"))b.disabled=on})}
  function val(id,v){const e=$(id);if(e)e.value=v??""}
  function chk(id,v){const e=$(id);if(e)e.checked=v===true}
  function text(v){return O.esc(v??"")}
  function showPanel(name){document.querySelectorAll(".owner-settings-nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));document.querySelectorAll(".owner-settings-panel").forEach(p=>p.classList.add("hidden"));$("panel-"+name).classList.remove("hidden")}

  function fillBasic(){
    const c=state.settings.clinic||{},s=state.settings.settings||{};
    $("clinicName").textContent=c.clinic_name||"DPRO歯科";
    ["clinic_name","phone","address","business_hours_note","closed_days_note"].forEach(k=>val(k,c[k]));
    ["reservation_enabled","urgent_enabled","checkin_enabled","allow_same_day_reservation","queue_public_enabled","queue_show_people_ahead","queue_show_estimated_wait"].forEach(k=>chk(k,s[k]));
    ["booking_open_days","booking_min_hours","cancellation_limit_hours","max_parallel_reservations","urgent_daily_limit","average_minutes_per_patient","urgent_acceptance_status","public_notice","urgent_public_message","urgent_closed_message","internal_note"].forEach(k=>val(k,s[k]));
  }
  function listCard(title,meta,active,index,type){return `<button type="button" class="owner-master-row" data-edit-type="${type}" data-edit-index="${index}"><span><strong>${text(title)}</strong><small>${text(meta)}</small></span><span class="owner-badge ${active?"good":"bad"}">${active?"使用中":"停止"}</span></button>`}
  function renderStaff(){$("staffList").innerHTML=state.staff.length?state.staff.map((x,i)=>listCard(x.staff_name,`${x.staff_code} / ${roleLabels[x.role]||x.role}${x.is_bookable?" / 予約対象":""}`,x.is_active!==false,i,"staff")).join(""):`<div class="owner-empty">スタッフ未登録</div>`}
  function renderResources(){$("resourceList").innerHTML=state.resources.length?state.resources.map((x,i)=>listCard(x.resource_name,`${x.resource_code} / ${resourceLabels[x.resource_type]||x.resource_type}`,x.is_active!==false,i,"resource")).join(""):`<div class="owner-empty">診療台・設備未登録</div>`}
  function renderMenus(){$("menuList").innerHTML=state.menus.length?state.menus.map((x,i)=>listCard(x.menu_name,`${x.menu_code} / ${categoryLabels[x.category]||x.category} / ${x.duration_minutes}分`,x.is_active!==false,i,"menu")).join(""):`<div class="owner-empty">診療メニュー未登録</div>`}
  function renderHours(){
    $("hoursList").innerHTML=state.hours.map((x,i)=>`<div class="owner-hours-row" data-hours-index="${i}"><div class="owner-hours-day"><strong>${text(x.display_label)}</strong><label class="owner-check"><input type="checkbox" data-hour="is_closed" ${x.is_closed?"checked":""}>休診</label></div><div class="owner-hours-times"><input class="owner-input" type="time" step="1800" data-hour="open_time_1" value="${text(O.formatTime(x.open_time_1))}"><span>～</span><input class="owner-input" type="time" step="1800" data-hour="close_time_1" value="${text(O.formatTime(x.close_time_1))}"><input class="owner-input" type="time" step="1800" data-hour="open_time_2" value="${text(O.formatTime(x.open_time_2))}"><span>～</span><input class="owner-input" type="time" step="1800" data-hour="close_time_2" value="${text(O.formatTime(x.close_time_2))}"></div></div>`).join("");
  }
  function renderAll(){fillBasic();renderStaff();renderResources();renderMenus();renderHours()}

  async function load(){
    O.clear(mainMessage);setBusy(true);
    try{
      const [settings,staff,resources,menus,hours]=await Promise.all([
        O.api("/api/hybrid/owner/settings"),O.api("/api/hybrid/owner/staff"),O.api("/api/hybrid/owner/resources"),O.api("/api/hybrid/owner/menus"),O.api("/api/hybrid/owner/hours")
      ]);
      state.settings=settings;state.staff=staff.staff||[];state.resources=resources.resources||[];state.menus=menus.menus||[];state.hours=hours.hours||[];renderAll();
    }catch(e){if(e.status===401){logout();return}O.show(mainMessage,"error",e.message)}finally{setBusy(false)}
  }
  async function login(){O.setAdminCode(adminCode.value);O.clear(loginMessage);try{await O.api("/api/hybrid/owner/settings");loginView.classList.add("hidden");appView.classList.remove("hidden");await load()}catch(e){O.clearAdminCode();O.show(loginMessage,"error",e.message)}}
  function logout(){O.clearAdminCode();appView.classList.add("hidden");loginView.classList.remove("hidden");adminCode.value=""}
  async function save(path,body,message){O.clear(mainMessage);setBusy(true);try{const d=await O.api(path,{method:"POST",body});O.show(mainMessage,"success",message||d.message);await load()}catch(e){O.show(mainMessage,"error",e.message)}finally{setBusy(false)}}

  function resetStaff(){val("staff_code","");val("staff_name","");val("staff_role","dentist");val("staff_sort_order",100);chk("staff_is_bookable",false);chk("staff_public_display",false);chk("staff_is_active",true);val("staff_internal_note","")}
  function editStaff(x){val("staff_code",x.staff_code);val("staff_name",x.staff_name);val("staff_role",x.role);val("staff_sort_order",x.sort_order);chk("staff_is_bookable",x.is_bookable);chk("staff_public_display",x.public_display);chk("staff_is_active",x.is_active!==false);val("staff_internal_note",x.internal_note);showPanel("staff")}
  function resetResource(){val("resource_code","");val("resource_name","");val("resource_type","chair");val("resource_sort_order",100);chk("resource_is_active",true);val("resource_internal_note","")}
  function editResource(x){val("resource_code",x.resource_code);val("resource_name",x.resource_name);val("resource_type",x.resource_type);val("resource_sort_order",x.sort_order);chk("resource_is_active",x.is_active!==false);val("resource_internal_note",x.internal_note);showPanel("resources")}
  function resetMenu(){val("menu_code","");val("menu_name","");val("menu_category","checkup");val("duration_minutes",30);val("menu_sort_order",100);["public_booking_enabled","phone_booking_enabled","first_visit_enabled","returning_visit_enabled","requires_dentist","requires_chair","menu_is_active"].forEach(k=>chk(k,true));chk("requires_hygienist",false);val("public_description","");val("menu_staff_note","")}
  function editMenu(x){val("menu_code",x.menu_code);val("menu_name",x.menu_name);val("menu_category",x.category);val("duration_minutes",x.duration_minutes);val("menu_sort_order",x.sort_order);["public_booking_enabled","phone_booking_enabled","first_visit_enabled","returning_visit_enabled","requires_dentist","requires_hygienist","requires_chair"].forEach(k=>chk(k,x[k]));chk("menu_is_active",x.is_active!==false);val("public_description",x.public_description);val("menu_staff_note",x.staff_note);showPanel("menus")}

  document.addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.id==="loginButton")return login();if(b.id==="clearCode"){adminCode.value="";return}if(b.id==="logoutButton")return logout();if(b.id==="reloadButton")return load();
    if(b.dataset.panel)return showPanel(b.dataset.panel);
    if(b.id==="staffReset")return resetStaff();if(b.id==="resourceReset")return resetResource();if(b.id==="menuReset")return resetMenu();
    if(b.dataset.editType==="staff")return editStaff(state.staff[Number(b.dataset.editIndex)]);
    if(b.dataset.editType==="resource")return editResource(state.resources[Number(b.dataset.editIndex)]);
    if(b.dataset.editType==="menu")return editMenu(state.menus[Number(b.dataset.editIndex)]);
  });

  $("basicForm").addEventListener("submit",e=>{e.preventDefault();save("/api/hybrid/owner/settings",{
    clinic_name:$("clinic_name").value,phone:$("phone").value,address:$("address").value,business_hours_note:$("business_hours_note").value,closed_days_note:$("closed_days_note").value,
    reservation_enabled:$("reservation_enabled").checked,urgent_enabled:$("urgent_enabled").checked,checkin_enabled:$("checkin_enabled").checked,allow_same_day_reservation:$("allow_same_day_reservation").checked,queue_public_enabled:$("queue_public_enabled").checked,queue_show_people_ahead:$("queue_show_people_ahead").checked,queue_show_estimated_wait:$("queue_show_estimated_wait").checked,
    booking_open_days:Number($("booking_open_days").value),booking_min_hours:Number($("booking_min_hours").value),cancellation_limit_hours:Number($("cancellation_limit_hours").value),max_parallel_reservations:Number($("max_parallel_reservations").value),urgent_acceptance_status:$("urgent_acceptance_status").value,urgent_daily_limit:Number($("urgent_daily_limit").value),average_minutes_per_patient:Number($("average_minutes_per_patient").value),public_notice:$("public_notice").value,urgent_public_message:$("urgent_public_message").value,urgent_closed_message:$("urgent_closed_message").value,internal_note:$("internal_note").value
  },"医院設定を保存しました。")});
  $("staffForm").addEventListener("submit",e=>{e.preventDefault();save("/api/hybrid/owner/staff/upsert",{staff_code:$("staff_code").value,staff_name:$("staff_name").value,role:$("staff_role").value,sort_order:Number($("staff_sort_order").value),is_bookable:$("staff_is_bookable").checked,public_display:$("staff_public_display").checked,is_active:$("staff_is_active").checked,internal_note:$("staff_internal_note").value})});
  $("resourceForm").addEventListener("submit",e=>{e.preventDefault();save("/api/hybrid/owner/resources/upsert",{resource_code:$("resource_code").value,resource_name:$("resource_name").value,resource_type:$("resource_type").value,sort_order:Number($("resource_sort_order").value),is_active:$("resource_is_active").checked,internal_note:$("resource_internal_note").value})});
  $("menuForm").addEventListener("submit",e=>{e.preventDefault();save("/api/hybrid/owner/menus/upsert",{menu_code:$("menu_code").value,menu_name:$("menu_name").value,category:$("menu_category").value,duration_minutes:Number($("duration_minutes").value),sort_order:Number($("menu_sort_order").value),public_booking_enabled:$("public_booking_enabled").checked,phone_booking_enabled:$("phone_booking_enabled").checked,first_visit_enabled:$("first_visit_enabled").checked,returning_visit_enabled:$("returning_visit_enabled").checked,requires_dentist:$("requires_dentist").checked,requires_hygienist:$("requires_hygienist").checked,requires_chair:$("requires_chair").checked,is_active:$("menu_is_active").checked,public_description:$("public_description").value,staff_note:$("menu_staff_note").value})});
  $("hoursForm").addEventListener("submit",async e=>{e.preventDefault();O.clear(mainMessage);setBusy(true);try{const rows=[...document.querySelectorAll(".owner-hours-row")];for(const row of rows){const i=Number(row.dataset.hoursIndex),base=state.hours[i],g=n=>row.querySelector(`[data-hour="${n}"]`);await O.api("/api/hybrid/owner/hours/upsert",{method:"POST",body:{day_of_week:base.day_of_week,display_label:base.display_label,is_closed:g("is_closed").checked,open_time_1:g("open_time_1").value,close_time_1:g("close_time_1").value,open_time_2:g("open_time_2").value,close_time_2:g("close_time_2").value}})}O.show(mainMessage,"success","曜日別診療時間を保存しました。");await load()}catch(err){O.show(mainMessage,"error",err.message)}finally{setBusy(false)}});

  const demo=O.getParam("demo")==="1";$("ownerLink").href=demo?"hybrid-owner.html?demo=1":"hybrid-owner.html";$("checkLink").href=demo?"hybrid-system-check.html?demo=1":"hybrid-system-check.html";if(demo&&!O.getAdminCode())O.setAdminCode("1234");if(O.getAdminCode()){adminCode.value=O.getAdminCode();login()}else if(demo){adminCode.value="1234"}
})();
