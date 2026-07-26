/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOT_USERNAME?: string;
  readonly VITE_CHANNEL_URL?: string;
  readonly VITE_COMMUNITY_URL?: string;
  readonly VITE_WEBAPP_URL?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}