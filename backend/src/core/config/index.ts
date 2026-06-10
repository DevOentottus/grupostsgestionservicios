import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-servicio-local-sts-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "https://serviciolocalsts.vercel.app",
  },
} as const;
