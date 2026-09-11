/// <reference types="vite/client" />

// Import de worklet audio par URL (voir plugin `?worklet-url` dans vite.config.ts).
declare module '*?worklet-url' {
  const url: string;
  export default url;
}
