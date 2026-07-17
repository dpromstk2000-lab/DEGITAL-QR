/* =========================================================
  STEP DENTAL-HYBRID-2
  DPRO 歯科 予約・急患受付 LINE 患者画面設定
  公開可能な設定のみ
========================================================= */
(function () {
  "use strict";

  const existing = window.DPRO_DENTAL_QR_CONFIG || window.DPRO_CONFIG || {};
  const pageBase =
    existing?.PAGES?.BASE_PUBLIC_URL ||
    "https://dpromstk2000-lab.github.io/DEGITAL-QR";

  window.DPRO_DENTAL_HYBRID_CONFIG = {
    VERSION: "DENTAL-HYBRID-2-PATIENT-UI-20260717",
    CLINIC_CODE: existing?.CLINIC?.CLINIC_CODE || "dpro_dental_demo",
    LEGACY_API_BASE:
      existing?.API?.BASE_URL ||
      "https://dpro-dental-qr-api.dpromstk2000.workers.dev",
    HYBRID_API_BASE:
      "https://dpro-dental-hybrid-api.dpromstk2000.workers.dev",
    BASE_PUBLIC_URL: String(pageBase).replace(/\/+$/, ""),
    LIFF_ID: existing?.LINE?.LIFF_ID || "",
    USE_LIFF: existing?.LINE?.USE_LIFF !== false,
    PAGES: {
      HUB: "hybrid.html",
      RESERVATION: "reservation.html",
      URGENT: "urgent.html",
      STATUS: "reservation-status.html",
      CHECKIN: "checkin.html",
      MEMBER: "member.html"
    }
  };
})();