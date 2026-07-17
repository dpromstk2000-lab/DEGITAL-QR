/* =========================================================
  STEP DENTAL-HYBRID-2
  DPRO 歯科 患者・家族向け共通処理
========================================================= */
(function () {
  "use strict";

  const CONFIG = window.DPRO_DENTAL_HYBRID_CONFIG || {};
  const LEGACY = String(CONFIG.LEGACY_API_BASE || "").replace(/\/+$/, "");
  const HYBRID = String(CONFIG.HYBRID_API_BASE || "").replace(/\/+$/, "");
  const CLINIC_CODE = CONFIG.CLINIC_CODE || "dpro_dental_demo";

  function clean(value) { return String(value ?? "").trim(); }
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function normalizePhone(value) {
    let text = clean(value).normalize("NFKC").replace(/[‐‑‒–—―ー－]/g, "-");
    text = text.replace(/[^\d+]/g, "");
    if (text.startsWith("+81")) text = "0" + text.slice(3);
    return text.replace(/\D/g, "");
  }
  function displayPhone(value) {
    const n = normalizePhone(value);
    if (/^0\d{9,10}$/.test(n)) {
      if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
      return `${n.slice(0,2)}-${n.slice(2,6)}-${n.slice(6)}`;
    }
    return clean(value);
  }
  function formatDate(value) {
    if (!value) return "未定";
    const d = String(value).slice(0, 10).split("-").map(Number);
    if (d.length !== 3 || !d[0]) return String(value);
    const date = new Date(Date.UTC(d[0], d[1]-1, d[2]));
    return `${d[0]}年${d[1]}月${d[2]}日(${["日","月","火","水","木","金","土"][date.getUTCDay()]})`;
  }
  function formatTime(value) { return value ? String(value).slice(0,5) : "未定"; }
  function todayJST() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
    }).format(new Date());
  }
  function addDays(dateText, days) {
    const [y,m,d] = dateText.split("-").map(Number);
    const date = new Date(Date.UTC(y,m-1,d));
    date.setUTCDate(date.getUTCDate()+Number(days||0));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
  }
  function randomKey(prefix="req") {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return `${prefix}-${Date.now()}-${Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("")}`;
  }
  function showMessage(element, type, text) {
    if (!element) return;
    element.className = `message show ${type || "info"}`;
    element.textContent = text;
  }
  function clearMessage(element) {
    if (!element) return;
    element.className = "message";
    element.textContent = "";
  }

  async function request(base, path, options={}) {
    const url = new URL(base + path);
    url.searchParams.set("clinic_code", CLINIC_CODE);
    Object.entries(options.params || {}).forEach(([key,value]) => {
      if (value !== undefined && value !== null && String(value) !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    url.searchParams.set("_t", Date.now());

    const init = { method: options.method || "GET", cache:"no-store", mode:"cors" };
    if (options.body !== undefined) {
      init.headers = {"content-type":"application/json"};
      init.body = JSON.stringify({clinic_code:CLINIC_CODE, ...options.body});
    }

    const response = await fetch(url.toString(), init);
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { throw new Error("API応答を読み取れませんでした。"); }
    if (!response.ok || data.ok === false) {
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  const legacyGet = (path,params={}) => request(LEGACY,path,{params});
  const hybridGet = (path,params={}) => request(HYBRID,path,{params});
  const hybridPost = (path,body={}) => request(HYBRID,path,{method:"POST",body});

  function normalizeCard(source={}) {
    return {
      patient_id: source.patient_id || source.id || "",
      family_id: source.family_id || "",
      family_name: source.family_name || "",
      display_label: source.display_label || "",
      display_order: Number(source.display_order || 10),
      relationship: source.relationship || "",
      member_no: source.member_no || "",
      qr_token: source.qr_token || "",
      patient_name: source.patient_name || "",
      patient_name_kana: source.patient_name_kana || "",
      patient_kind: source.patient_kind || "adult",
      phone: source.phone || source.guardian_phone || "",
      guardian_name: source.guardian_name || source.primary_guardian_name || "",
      guardian_phone: source.guardian_phone || "",
      line_user_id: source.line_user_id || ""
    };
  }
  function cardLabel(card) {
    return card.display_label ||
      (card.relationship === "mother" ? "お母さん" :
       card.relationship === "father" ? "お父さん" :
       card.patient_kind === "child" ? "お子さん" : "本人");
  }

  async function initLiff() {
    const liffId = clean(CONFIG.LIFF_ID);
    if (!CONFIG.USE_LIFF || !liffId || !window.liff) return null;
    try {
      await window.liff.init({liffId});
      if (!window.liff.isLoggedIn()) return null;
      const profile = await window.liff.getProfile();
      return {
        userId: profile.userId || "",
        displayName: profile.displayName || "",
        pictureUrl: profile.pictureUrl || ""
      };
    } catch (error) {
      console.warn("LIFF初期化を継続できませんでした。", error);
      return null;
    }
  }

  async function loadFamilyContext() {
    const urlToken = clean(getParam("t") || getParam("qr_token") || getParam("card_token"));
    const profile = await initLiff();
    let clinic = null, family = null, cards = [];

    if (urlToken) {
      const cardData = await legacyGet("/api/member/card", {t:urlToken});
      clinic = cardData.clinic || null;
      if (cardData.patient) cards = [normalizeCard(cardData.patient)];
      try {
        const familyData = await legacyGet("/api/member/family-cards", {t:urlToken});
        clinic = familyData.clinic || clinic;
        family = familyData.family || null;
        if (Array.isArray(familyData.cards) && familyData.cards.length) {
          cards = familyData.cards.map(normalizeCard);
        }
      } catch (error) {
        console.warn("家族診察券一覧は取得できませんでした。", error);
      }
    } else if (profile?.userId) {
      const familyData = await legacyGet("/api/member/family-cards", {
        line_user_id:profile.userId
      });
      clinic = familyData.clinic || null;
      family = familyData.family || null;
      cards = Array.isArray(familyData.cards) ? familyData.cards.map(normalizeCard) : [];
    }

    cards.sort((a,b) => a.display_order-b.display_order ||
      String(a.patient_name).localeCompare(String(b.patient_name),"ja"));

    return {
      clinic, family, cards, profile,
      selectedToken: urlToken || cards[0]?.qr_token || ""
    };
  }

  function renderPatientSelector(container, cards, selectedToken, onSelect, options={}) {
    if (!container) return;
    const allowManual = options.allowManual === true;
    const items = cards.map(card => `
      <button class="patient-tab ${card.qr_token===selectedToken?"active":""}"
        type="button" data-patient-token="${escapeHtml(card.qr_token)}">
        ${escapeHtml(cardLabel(card))}
        <small>${escapeHtml(card.patient_name)} / ${escapeHtml(card.member_no || "診察券番号なし")}</small>
      </button>`).join("");
    const manual = allowManual ? `
      <button class="patient-tab ${selectedToken==="__manual__"?"active":""}"
        type="button" data-patient-token="__manual__">
        初診・診察券なし
        <small>お名前と電話番号を入力</small>
      </button>` : "";
    container.innerHTML = items + manual;
    container.querySelectorAll("[data-patient-token]").forEach(button => {
      button.addEventListener("click", () => onSelect(button.dataset.patientToken || ""));
    });
  }

  function pageUrl(page, params={}) {
    const url = new URL(CONFIG.BASE_PUBLIC_URL + "/" + page);
    Object.entries(params).forEach(([key,value]) => {
      if (value !== undefined && value !== null && String(value) !== "") {
        url.searchParams.set(key,String(value));
      }
    });
    return url.toString();
  }

  function storageKey(kind) { return `dproDentalHybrid:${CLINIC_CODE}:${kind}`; }
  function saveToken(kind, token, meta={}) {
    if (!token) return;
    const key = storageKey(kind);
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
    list = list.filter(x => x.token !== token);
    list.unshift({token, saved_at:new Date().toISOString(), ...meta});
    localStorage.setItem(key, JSON.stringify(list.slice(0,20)));
  }
  function loadTokens(kind) {
    try { return JSON.parse(localStorage.getItem(storageKey(kind)) || "[]"); }
    catch { return []; }
  }
  function latestToken(kind) { return loadTokens(kind)[0]?.token || ""; }

  const reservationLabels = {
    pending:"医院確認待ち", confirmed:"予約確定", arrived:"到着済み",
    waiting:"診療待ち", in_treatment:"診療中", payment_waiting:"会計待ち",
    completed:"完了", cancel_requested:"取消確認中", cancelled:"取消済み",
    no_show:"未受診"
  };
  const urgentLabels = {
    pending:"医院確認待ち", reviewing:"確認中", call_required:"電話確認が必要",
    come_now:"すぐ来院してください", come_at:"指定時刻に来院",
    unavailable:"本日対応困難", arrived:"到着済み", waiting:"診療待ち",
    in_treatment:"診療中", payment_waiting:"会計待ち", completed:"完了",
    cancelled:"取消済み"
  };
  const queueLabels = {
    waiting:"待機中", called:"お呼出し中", in_room:"診療室へ案内済み",
    in_treatment:"診療中", payment_waiting:"会計待ち", completed:"完了",
    cancelled:"取消済み", no_show:"未受診"
  };
  const symptomLabels = {
    severe_pain:"強い痛み", swelling:"歯ぐき・顔の腫れ",
    filling_lost:"詰め物・被せ物が外れた", tooth_broken:"歯が欠けた・折れた",
    bleeding:"出血", trauma:"転倒・外傷", denture_problem:"入れ歯のトラブル",
    post_treatment_problem:"治療後のトラブル", other:"その他"
  };

  window.DPRO_DENTAL_HYBRID = {
    CONFIG, clean, getParam, escapeHtml, normalizePhone, displayPhone,
    formatDate, formatTime, todayJST, addDays, randomKey,
    showMessage, clearMessage, legacyGet, hybridGet, hybridPost,
    normalizeCard, cardLabel, loadFamilyContext, renderPatientSelector,
    pageUrl, saveToken, loadTokens, latestToken,
    reservationLabels, urgentLabels, queueLabels, symptomLabels
  };
})();