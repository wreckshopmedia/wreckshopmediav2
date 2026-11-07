/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** local-only dev flag - tints the shell bounds for layout debugging. see src/utils/flags.ts */
  readonly VITE_DEBUG_BOUNDS?: string;
  /** GA4 measurement ID (G-XXXXXXX). only used in prod builds. see src/utils/analytics.ts */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
