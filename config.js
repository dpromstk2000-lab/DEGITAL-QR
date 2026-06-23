/* =========================================================
  STEP 23
  DPRO SHOP
  歯科デジタルQR会員証・診察券システム
  config.js 完全版

  役割：
  ・index.html / member.html / scan.html / owner.html / admin.html 共通設定
  ・医院名、API URL、画面表示、文言、選択肢などをまとめる

  注意：
  ・このファイルはブラウザに公開されます
  ・SUPABASE_SERVICE_ROLE_KEY は絶対に書かない
  ・ADMIN_TOKEN は絶対に書かない
  ・LINE_CHANNEL_ACCESS_TOKEN は絶対に書かない
  ・秘密情報は Cloudflare Worker の Secrets に保存する
========================================================= */

(function () {
  "use strict";

  const CONFIG = {
    /* =====================================================
      1. システム基本情報
    ===================================================== */

    SYSTEM_NAME: "DPRO SHOP",
    SERVICE_NAME: "歯科デジタルQR診察券",
    SERVICE_SHORT_NAME: "QR診察券",
    VERSION: "1.0.0",

    /* =====================================================
      2. 医院情報
      STEP 22 SQL の clinic_code と必ず合わせる
    ===================================================== */

    CLINIC: {
      CLINIC_CODE: "dpro_dental_demo",
      PUBLIC_SLUG: "dpro-dental-demo",

      NAME: "DPRO歯科クリニック",
      NAME_KANA: "ディープロシカクリニック",

      PHONE: "000-0000-0000",
      POSTAL_CODE: "",
      ADDRESS: "大分県内",

      BUSINESS_HOURS_NOTE: "月・火・水・金 9:00〜18:00 / 土 9:00〜13:00",
      CLOSED_DAYS_NOTE: "木曜・日曜・祝日",

      ACCESS_NOTE: "受付でQR診察券をご提示ください。",

      NOTICE_TITLE: "QR診察券のご案内",
      NOTICE_BODY: "次回来院時は、この画面のQR診察券を受付でご提示ください。",

      WEBSITE_URL: "",
      LINE_OFFICIAL_URL: "",

      TIMEZONE: "Asia/Tokyo"
    },

    /* =====================================================
      3. API設定
      Worker作成後、URLが違う場合はここだけ変更
    ===================================================== */

    API: {
      BASE_URL: "https://dpro-dental-qr-api.dpromstk2000.workers.dev",

      TIMEOUT_MS: 15000,

      ENDPOINTS: {
        HEALTH: "/api/health",

        PUBLIC_CLINIC: "/api/public/clinic",

        MEMBER_CARD: "/api/member/card",

        SCAN_LOOKUP: "/api/scan/lookup",
        SCAN_LOG: "/api/scan/log",

        ADMIN_PATIENTS: "/api/admin/patients",
        ADMIN_PATIENT_CREATE: "/api/admin/patients/create",
        ADMIN_PATIENT_UPDATE: "/api/admin/patients/update",
        ADMIN_PATIENT_DETAIL: "/api/admin/patients/detail",

        OWNER_TODAY: "/api/owner/today",
        OWNER_PATIENT_SEARCH: "/api/owner/patients/search",
        OWNER_PATIENT_DETAIL: "/api/owner/patients/detail",
        OWNER_VISIT_CREATE: "/api/owner/visits/create",
        OWNER_VISIT_UPDATE: "/api/owner/visits/update",
        OWNER_FOLLOWUPS: "/api/owner/followups",
        OWNER_FOLLOWUP_UPDATE: "/api/owner/followups/update",
        OWNER_TEMPLATES: "/api/owner/templates",

        DEMO_RESET: "/api/admin/demo/reset"
      }
    },

    /* =====================================================
      4. 画面URL
      GitHub Pagesの公開URLが確定したら BASE_PUBLIC_URL を変更
    ===================================================== */

    PAGES: {
      BASE_PUBLIC_URL: "https://dpromstk2000-lab.github.io/DEGITAL-QR",

      INDEX: "index.html",
      MEMBER: "member.html",
      SCAN: "scan.html",
      OWNER: "owner.html",
      ADMIN: "admin.html",

      getIndexUrl() {
        return `${this.BASE_PUBLIC_URL}/${this.INDEX}`;
      },

      getMemberUrl(qrToken) {
        const token = encodeURIComponent(qrToken || "");
        return `${this.BASE_PUBLIC_URL}/${this.MEMBER}?t=${token}`;
      },

      getScanUrl() {
        return `${this.BASE_PUBLIC_URL}/${this.SCAN}`;
      },

      getOwnerUrl() {
        return `${this.BASE_PUBLIC_URL}/${this.OWNER}`;
      },

      getAdminUrl() {
        return `${this.BASE_PUBLIC_URL}/${this.ADMIN}`;
      }
    },

    /* =====================================================
      5. LINE / LIFF設定
      LIFFを使う場合は LIFF_ID を入れる
      まだ未設定なら空のままでOK
    ===================================================== */

    LINE: {
      USE_LIFF: false,

      LIFF_ID: "",

      OFFICIAL_ACCOUNT_NAME: "DPRO歯科クリニック",
      OFFICIAL_ACCOUNT_URL: "",

      FRIEND_ADD_URL: "",

      DEFAULT_COPY_NOTE: "コピーした文面をLINE公式アカウントのチャットに貼り付けて送信してください。"
    },

    /* =====================================================
      6. 管理画面の簡易設定
      本番では ADMIN_TOKEN をここに書かない
      管理認証は Worker 側でチェックする
    ===================================================== */

    ADMIN: {
      REQUIRE_ADMIN_CODE: true,

      ADMIN_CODE_STORAGE_KEY: "dpro_dental_qr_admin_code",

      ADMIN_HEADER_NAME: "x-dpro-admin-code",

      DISPLAY_OWNER_MODE: true,
      DISPLAY_DEMO_RESET: true,

      DEFAULT_STAFF_NAME: "受付スタッフ"
    },

    /* =====================================================
      7. QR診察券表示設定
    ===================================================== */

    MEMBER_CARD: {
      TITLE: "デジタルQR診察券",

      MAIN_MESSAGE: "受付でこの画面をご提示ください。",

      SUB_MESSAGE: "QRコードを受付スタッフが読み取ります。",

      SHOW_NEXT_APPOINTMENT: true,
      SHOW_NOTICE: true,
      SHOW_PHONE: true,
      SHOW_BUSINESS_HOURS: true,

      QR_SIZE: 220,

      FALLBACK_MEMBER_NO_LABEL: "診察券番号"
    },

    /* =====================================================
      8. QR読み取り画面設定
    ===================================================== */

    SCAN: {
      TITLE: "受付QR読み取り",

      CAMERA_BUTTON_TEXT: "カメラでQRを読み取る",
      MANUAL_BUTTON_TEXT: "診察券番号で検索",

      SUCCESS_TEXT: "患者情報を確認しました。",
      NOT_FOUND_TEXT: "該当する患者が見つかりませんでした。",
      DISABLED_TEXT: "この診察券は現在利用停止中です。",

      AUTO_CREATE_CHECKIN_VISIT: false,

      DEFAULT_VISIT_TYPE: "checkup",
      DEFAULT_VISIT_STATUS: "visited"
    },

    /* =====================================================
      9. オーナー管理画面設定
    ===================================================== */

    OWNER: {
      TITLE: "歯科医院 管理画面",

      TODAY_SECTION_TITLE: "今日の受付",
      SEARCH_SECTION_TITLE: "患者検索",
      FOLLOWUP_SECTION_TITLE: "定期検診・再来院フォロー",

      DEFAULT_SEARCH_LIMIT: 20,
      DEFAULT_TODAY_LIMIT: 50,
      DEFAULT_FOLLOWUP_LIMIT: 50,

      SHOW_REVENUE: false,

      LINE_COPY_DONE_TEXT: "文面をコピーしました。LINE公式のチャットに貼り付けて送信してください。",

      EMPTY_TODAY_TEXT: "今日の受付記録はまだありません。",
      EMPTY_FOLLOWUP_TEXT: "現在、対応が必要なフォローはありません。"
    },

    /* =====================================================
      10. 患者登録画面設定
    ===================================================== */

    ADMIN_SCREEN: {
      TITLE: "患者登録・QR診察券発行",

      DEFAULT_STATUS: "active",
      MEMBER_NO_PREFIX: "D",

      AUTO_MEMBER_NO_LENGTH: 5,

      CREATED_MESSAGE: "患者登録が完了しました。QR診察券を発行できます。",

      UPDATED_MESSAGE: "患者情報を更新しました。"
    },

    /* =====================================================
      11. 患者ステータス
    ===================================================== */

    PATIENT_STATUS: {
      active: {
        label: "通院中",
        description: "通常利用できる患者さん"
      },
      temporary: {
        label: "仮登録",
        description: "初回登録中・確認待ち"
      },
      needs_followup: {
        label: "要フォロー",
        description: "再来院や定期検診の案内が必要"
      },
      paused: {
        label: "一時停止",
        description: "一時的に利用を止めている状態"
      },
      inactive: {
        label: "休眠",
        description: "しばらく来院がない患者さん"
      },
      blocked: {
        label: "利用停止",
        description: "QR診察券を利用停止中"
      }
    },

    /* =====================================================
      12. 来院種別
    ===================================================== */

    VISIT_TYPES: {
      checkup: {
        label: "定期検診",
        followupDefaultDays: 90
      },
      cleaning: {
        label: "クリーニング",
        followupDefaultDays: 90
      },
      treatment: {
        label: "治療",
        followupDefaultDays: 14
      },
      emergency: {
        label: "急患",
        followupDefaultDays: 7
      },
      consultation: {
        label: "相談",
        followupDefaultDays: 7
      },
      orthodontics: {
        label: "矯正",
        followupDefaultDays: 30
      },
      whitening: {
        label: "ホワイトニング",
        followupDefaultDays: 60
      },
      other: {
        label: "その他",
        followupDefaultDays: 30
      }
    },

    /* =====================================================
      13. 来院ステータス
    ===================================================== */

    VISIT_STATUS: {
      checked_in: {
        label: "受付済み"
      },
      visited: {
        label: "来院済み"
      },
      completed: {
        label: "対応完了"
      },
      cancelled: {
        label: "キャンセル"
      },
      no_show: {
        label: "無断キャンセル"
      }
    },

    /* =====================================================
      14. フォロー種別
    ===================================================== */

    FOLLOWUP_TYPES: {
      regular_checkup: {
        label: "定期検診"
      },
      revisit: {
        label: "再来院"
      },
      missed: {
        label: "未予約フォロー"
      },
      after_treatment: {
        label: "治療後確認"
      },
      birthday: {
        label: "誕生日"
      },
      other: {
        label: "その他"
      }
    },

    /* =====================================================
      15. フォローステータス
    ===================================================== */

    FOLLOWUP_STATUS: {
      todo: {
        label: "未対応"
      },
      copied: {
        label: "文面コピー済み"
      },
      sent: {
        label: "送信済み"
      },
      done: {
        label: "完了"
      },
      skipped: {
        label: "スキップ"
      },
      cancelled: {
        label: "取消"
      }
    },

    /* =====================================================
      16. LINE文面で使う置換キー
    ===================================================== */

    TEMPLATE_VARIABLES: {
      clinic_name: "医院名",
      patient_name: "患者名",
      member_no: "診察券番号",
      next_appointment: "次回予約",
      followup_due_date: "フォロー予定日",
      last_visit_date: "前回来院日",
      today: "今日の日付"
    },

    /* =====================================================
      17. デフォルトLINE文面
      WorkerやDBテンプレートが取得できない場合の予備
    ===================================================== */

    DEFAULT_MESSAGES: {
      regular_checkup_3months:
        "こんにちは。{{clinic_name}}です。\n\n前回のご来院からお日にちが経ちましたので、定期検診とクリーニングのご案内です。\n\nお口の状態を良い状態で保つために、そろそろ一度チェックにお越しください。\n\nご都合のよい日時がありましたら、このLINEにそのままご返信ください。",

      revisit_followup:
        "こんにちは。{{clinic_name}}です。\n\n先日はご来院ありがとうございました。\n\nその後、お口の状態はいかがでしょうか。\n気になることがありましたら、いつでもLINEでご相談ください。\n\n次回のご来院目安：\n{{next_appointment}}\n\nご都合がよろしければ、ご希望日時をこのLINEにご返信ください。",

      after_treatment_care:
        "こんにちは。{{clinic_name}}です。\n\n先日の治療後、お痛みや違和感などはございませんか。\n\n気になる症状がある場合は、無理をせずこのLINEにご返信ください。\n受付より確認してご案内いたします。",

      missed_revisit:
        "こんにちは。{{clinic_name}}です。\n\n前回のご来院時に、次回の確認が必要な内容がございました。\n\nお口の状態を確認するため、一度ご来院いただくことをおすすめしております。\n\nご希望の日時がありましたら、このLINEにご返信ください。",

      next_appointment_reminder:
        "こんにちは。{{clinic_name}}です。\n\n次回のご予約についてご案内です。\n\nご予約日時：\n{{next_appointment}}\n\nお気をつけてお越しください。\n変更が必要な場合は、このLINEにご返信ください。"
    },

    /* =====================================================
      18. 画面デザイン設定
    ===================================================== */

    THEME: {
      COLOR_MAIN: "#2563eb",
      COLOR_MAIN_DARK: "#1d4ed8",
      COLOR_SUB: "#0f766e",
      COLOR_ACCENT: "#f59e0b",

      COLOR_BG: "#f6f8fb",
      COLOR_CARD: "#ffffff",
      COLOR_TEXT: "#0f172a",
      COLOR_MUTED: "#64748b",
      COLOR_BORDER: "#e2e8f0",

      COLOR_SUCCESS: "#16a34a",
      COLOR_WARNING: "#f59e0b",
      COLOR_DANGER: "#dc2626",
      COLOR_INFO: "#2563eb",

      BORDER_RADIUS: "18px",

      FONT_FAMILY:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },

    /* =====================================================
      19. ローカルストレージキー
    ===================================================== */

    STORAGE_KEYS: {
      LAST_MEMBER_TOKEN: "dpro_dental_qr_last_member_token",
      LAST_MEMBER_NO: "dpro_dental_qr_last_member_no",
      ADMIN_CODE: "dpro_dental_qr_admin_code",
      STAFF_NAME: "dpro_dental_qr_staff_name",
      LAST_SCAN_TEXT: "dpro_dental_qr_last_scan_text"
    },

    /* =====================================================
      20. ユーティリティ
    ===================================================== */

    utils: {
      getTodayJST() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        });

        const parts = formatter.formatToParts(now);
        const y = parts.find((p) => p.type === "year").value;
        const m = parts.find((p) => p.type === "month").value;
        const d = parts.find((p) => p.type === "day").value;

        return `${y}-${m}-${d}`;
      },

      formatDate(dateText) {
        if (!dateText) return "未設定";

        const date = new Date(`${dateText}T00:00:00+09:00`);
        if (Number.isNaN(date.getTime())) return dateText;

        return new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short"
        }).format(date);
      },

      formatDateShort(dateText) {
        if (!dateText) return "未設定";

        const date = new Date(`${dateText}T00:00:00+09:00`);
        if (Number.isNaN(date.getTime())) return dateText;

        return new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          month: "numeric",
          day: "numeric",
          weekday: "short"
        }).format(date);
      },

      formatDateTime(dateTimeText) {
        if (!dateTimeText) return "未設定";

        const date = new Date(dateTimeText);
        if (Number.isNaN(date.getTime())) return dateTimeText;

        return new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit"
        }).format(date);
      },

      formatTime(timeText) {
        if (!timeText) return "";

        const parts = String(timeText).split(":");
        if (parts.length < 2) return timeText;

        return `${parts[0]}:${parts[1]}`;
      },

      escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      },

      nl2br(value) {
        return this.escapeHtml(value).replace(/\n/g, "<br>");
      },

      getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
      },

      setQueryParam(url, key, value) {
        const target = new URL(url, window.location.href);
        target.searchParams.set(key, value);
        return target.toString();
      },

      normalizePhone(value) {
        return String(value || "")
          .replace(/[^\d]/g, "")
          .trim();
      },

      generateTempMemberNo(prefix, length) {
        const now = new Date();
        const y = String(now.getFullYear()).slice(-2);
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const rand = String(Math.floor(Math.random() * 10 ** length)).padStart(
          length,
          "0"
        );

        return `${prefix}${y}${m}${d}${rand}`;
      },

      getStatusLabel(status) {
        const item = CONFIG.PATIENT_STATUS[status];
        return item ? item.label : status || "未設定";
      },

      getVisitTypeLabel(type) {
        const item = CONFIG.VISIT_TYPES[type];
        return item ? item.label : type || "未設定";
      },

      getVisitStatusLabel(status) {
        const item = CONFIG.VISIT_STATUS[status];
        return item ? item.label : status || "未設定";
      },

      getFollowupTypeLabel(type) {
        const item = CONFIG.FOLLOWUP_TYPES[type];
        return item ? item.label : type || "未設定";
      },

      getFollowupStatusLabel(status) {
        const item = CONFIG.FOLLOWUP_STATUS[status];
        return item ? item.label : status || "未設定";
      },

      buildNextAppointmentText(dateText, timeText, memo) {
        if (!dateText && !timeText && !memo) {
          return "未設定";
        }

        const parts = [];

        if (dateText) {
          parts.push(this.formatDate(dateText));
        }

        if (timeText) {
          parts.push(this.formatTime(timeText));
        }

        if (memo) {
          parts.push(memo);
        }

        return parts.join(" ");
      },

      replaceTemplateVariables(templateText, data) {
        const base = {
          clinic_name: CONFIG.CLINIC.NAME,
          patient_name: data?.patient_name || data?.name || "",
          member_no: data?.member_no || "",
          next_appointment:
            data?.next_appointment ||
            this.buildNextAppointmentText(
              data?.next_appointment_date,
              data?.next_appointment_time,
              data?.next_appointment_memo
            ),
          followup_due_date: data?.followup_due_date
            ? this.formatDate(data.followup_due_date)
            : "",
          last_visit_date: data?.last_visit_date
            ? this.formatDate(data.last_visit_date)
            : "",
          today: this.formatDate(this.getTodayJST())
        };

        let text = String(templateText || "");

        Object.keys(base).forEach((key) => {
          text = text.replaceAll(`{{${key}}}`, base[key] || "");
        });

        return text;
      },

      async copyText(text) {
        const value = String(text || "");

        if (!value) {
          return false;
        }

        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          return true;
        }

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const result = document.execCommand("copy");
        document.body.removeChild(textarea);

        return result;
      },

      buildApiUrl(endpoint, params) {
        const base = CONFIG.API.BASE_URL.replace(/\/$/, "");
        const path = String(endpoint || "").startsWith("/")
          ? endpoint
          : `/${endpoint}`;

        const url = new URL(`${base}${path}`);

        const defaultParams = {
          clinic_code: CONFIG.CLINIC.CLINIC_CODE
        };

        const mergedParams = Object.assign({}, defaultParams, params || {});

        Object.entries(mergedParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
          }
        });

        return url.toString();
      },

      getAdminCode() {
        try {
          return localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_CODE) || "";
        } catch (error) {
          return "";
        }
      },

      setAdminCode(code) {
        try {
          localStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_CODE, code || "");
        } catch (error) {
          console.warn("管理コードを保存できませんでした。", error);
        }
      },

      getStaffName() {
        try {
          return (
            localStorage.getItem(CONFIG.STORAGE_KEYS.STAFF_NAME) ||
            CONFIG.ADMIN.DEFAULT_STAFF_NAME
          );
        } catch (error) {
          return CONFIG.ADMIN.DEFAULT_STAFF_NAME;
        }
      },

      setStaffName(name) {
        try {
          localStorage.setItem(
            CONFIG.STORAGE_KEYS.STAFF_NAME,
            name || CONFIG.ADMIN.DEFAULT_STAFF_NAME
          );
        } catch (error) {
          console.warn("スタッフ名を保存できませんでした。", error);
        }
      },

      async apiFetch(endpoint, options) {
        const opts = options || {};
        const method = opts.method || "GET";
        const params = opts.params || {};
        const body = opts.body;

        const url = this.buildApiUrl(endpoint, params);

        const headers = Object.assign(
          {
            "Content-Type": "application/json"
          },
          opts.headers || {}
        );

        const adminCode = this.getAdminCode();

        if (adminCode) {
          headers[CONFIG.ADMIN.ADMIN_HEADER_NAME] = adminCode;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, CONFIG.API.TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
          });

          const contentType = response.headers.get("content-type") || "";

          let data = null;

          if (contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = {
              ok: response.ok,
              text: await response.text()
            };
          }

          if (!response.ok) {
            const message =
              data?.message ||
              data?.error ||
              `APIエラーが発生しました。status=${response.status}`;
            throw new Error(message);
          }

          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  };

  window.DPRO_DENTAL_QR_CONFIG = CONFIG;
  window.DPRO_CONFIG = CONFIG;
})();
