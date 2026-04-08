/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_BASE_URL?: string;
  readonly VITE_API_KEY?: string;
  /** URL do APK ou página do build EAS; usada na Home para "Baixar o app (APK)". */
  readonly VITE_APK_DOWNLOAD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
