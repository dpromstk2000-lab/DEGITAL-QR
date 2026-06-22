// =========================================================
// DPRO LIFF 共通設定ファイル
// GitHub Pages 側で使う設定
// =========================================================
//
// 注意：
// SUPABASE_SERVICE_ROLE_KEY は絶対にここに書かない
// ADMIN_TOKEN もここには書かない
//
// 管理画面では、ADMIN_TOKEN は画面で入力して localStorage に保存する形にする
// =========================================================

window.DPRO_CONFIG = {
  // Cloudflare Worker API
  API_BASE_URL: 'https://dpro-liff-common-api.dpromstk2000.workers.dev',

  // Supabase側の店舗コード
  SHOP_CODE: 'demo_shop_default',

  // 表示用
  PROVIDER_NAME: 'DPRO SHOP',
  SHOP_NAME: 'デモ店舗',
  SERVICE_NAME: '予約・顧客フォローLINEシステム',

  // LIFF設定
  // LIFFをまだ使わない場合は空のままでOK
  LIFF_ID: '',

  // 予約画面の基本設定
  DEFAULT_MENU_CODE: 'trial',

  // 画面表示
  THEME: {
    primary: '#2563eb',
    accent: '#facc15',
    dark: '#0f172a'
  }
};
