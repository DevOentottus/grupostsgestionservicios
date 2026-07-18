import "dotenv/config";

function required<T>(key: string, value: T | undefined, devFallback: T): T {
  if (value !== undefined) return value;
  const isDev = (process.env.NODE_ENV || "development") === "development";
  if (isDev) return devFallback;
  throw new Error(
    `❌ ${key} es requerida en producción. Seteala en el entorno o en el secret store de Vercel.`
  );
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  jwt: {
    secret: required("JWT_SECRET", process.env.JWT_SECRET, "dev-secret-servicio-local-sts-2026"),
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "https://serviciolocalsts.vercel.app",
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  },
} as const;
