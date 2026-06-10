// Vercel serverless function entry point.
// The actual handler is built by bundling backend/src/serverless.ts
// via `npm run build:serverless` (esbuild), which resolves @/ aliases.
// esbuild outputs to backend/dist/serverless.js, which is imported here.
export { default } from "../backend/dist/serverless.js";
