// Declare .cjs modules so Vercel's build doesn't flag api/index.ts
declare module "*.cjs" {
  const value: any;
  export default value;
}
