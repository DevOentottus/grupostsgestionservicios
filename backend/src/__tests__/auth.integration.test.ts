import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

// ── Mock data compartido (mutable, se resetea en beforeEach) ──
const mockResults = vi.hoisted(() => new Map<string, { data: unknown[]; error?: unknown }>());

vi.mock("@/lib/supabase.js", () => {
  function makeQB(table: string) {
    const entry = mockResults.get(table) ?? { data: [], error: null };
    const result = { data: entry.data, error: entry.error ?? null };
    const qb = {
      select: () => qb,
      insert: () => qb,
      update: () => qb,
      delete: () => qb,
      eq: () => qb,
      gte: () => qb,
      lt: () => qb,
      in: () => qb,
      order: () => qb,
      limit: () => qb,
      single: () => qb,
      then: (resolve: (v: typeof result) => void) => resolve(result),
    };
    return qb;
  }
  return { supabase: { from: (table: string) => makeQB(table) } };
});

import { buildApp } from "@/app.js";
import type { FastifyInstance } from "fastify";

// ── Helpers ──
const TEST_USER = {
  usuario_id: 10,
  usuario_username: "testuser",
  usuario_contrasena: bcrypt.hashSync("correct-password", 4),
  usuario_nombres: "Test",
  usuario_apellido_paterno: "User",
  usuario_apellido_materno: null,
  usuario_correo: "test@serviciolocalsts.com",
  usuario_rol: "admin",
  usuario_activo: true,
};

const INACTIVE_USER = {
  ...TEST_USER,
  usuario_id: 11,
  usuario_username: "inactive",
  usuario_activo: false,
};

/** Configura los mocks para un login exitoso */
function setupLoginSuccess() {
  mockResults.set("usuarios", { data: [TEST_USER] });
  mockResults.set("sessions", { data: [{ token_jti: "test-jti-123" }] });
  mockResults.set("areas", { data: [] });
  mockResults.set("auditoria", { data: [] });
}

describe("Auth — login", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResults.clear();
  });

  it("POST /api/auth/login — success returns token + user", async () => {
    setupLoginSuccess();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "testuser", password: "correct-password" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty("token");
    expect(body.data.user).toMatchObject({
      id: 10,
      username: "testuser",
      email: "test@serviciolocalsts.com",
      rol: "admin",
    });
  });

  it("POST /api/auth/login — wrong password returns 401", async () => {
    mockResults.set("usuarios", { data: [TEST_USER] });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "testuser", password: "wrong-password" },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("UNAUTHORIZED");
    expect(body.detail).toBe("Credenciales inválidas");
  });

  it("POST /api/auth/login — unknown user returns 401", async () => {
    mockResults.set("usuarios", { data: [] });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "noexiste", password: "whatever" },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.detail).toBe("Credenciales inválidas");
  });

  it("POST /api/auth/login — inactive user returns 401", async () => {
    mockResults.set("usuarios", { data: [INACTIVE_USER] });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "inactive", password: "correct-password" },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.detail).toBe("Usuario desactivado");
  });

  it("POST /api/auth/login — invalid body returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "testuser" }, // sin password
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/login — empty body returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: {},
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("VALIDATION_ERROR");
  });
});

describe("Auth — refresh", () => {
  let app: FastifyInstance;
  let validToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResults.clear();
  });

  it("POST /api/auth/refresh — succeeds with valid token", async () => {
    // Generar token JWT real firmado por la app
    validToken = app.jwt.sign(
      { user_id: 10, rol: "admin", area_id: null, jti: "test-jti-123" },
      { expiresIn: "15m" }
    );

    // Mock de checkSessionNotRevoked: sessions query
    mockResults.set("sessions", {
      data: [{ token_jti: "test-jti-123", revoked: false, expires_at: new Date(Date.now() + 86400000).toISOString() }],
    });
    // Mock de usuario activo
    mockResults.set("usuarios", { data: [TEST_USER] });
    // Mock de áreas (admin no necesita)
    mockResults.set("areas", { data: [] });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty("token");
    expect(body.data.token).not.toBe(validToken); // nuevo token
  });

  it("POST /api/auth/refresh — revoked session returns 401", async () => {
    validToken = app.jwt.sign(
      { user_id: 10, rol: "admin", area_id: null, jti: "revoked-jti" },
      { expiresIn: "15m" }
    );

    mockResults.set("sessions", {
      data: [{ token_jti: "revoked-jti", revoked: true, expires_at: new Date(Date.now() + 86400000).toISOString() }],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("SESSION_REVOKED");
  });

  it("POST /api/auth/refresh — no token returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("UNAUTHORIZED");
  });

  it("POST /api/auth/refresh — expired token can still refresh", async () => {
    // Token que ya expiró
    validToken = app.jwt.sign(
      { user_id: 10, rol: "admin", area_id: null, jti: "expired-jti" },
      { expiresIn: "0s" }
    );

    // Esperar un ms para que expire
    await new Promise((r) => setTimeout(r, 100));

    mockResults.set("sessions", {
      data: [{ token_jti: "expired-jti", revoked: false, expires_at: new Date(Date.now() + 86400000).toISOString() }],
    });
    mockResults.set("usuarios", { data: [TEST_USER] });
    mockResults.set("areas", { data: [] });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe("Auth — me", () => {
  let app: FastifyInstance;
  let validToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResults.clear();
  });

  it("GET /api/auth/me — returns user info with valid token", async () => {
    validToken = app.jwt.sign(
      { user_id: 10, rol: "admin", area_id: null },
      { expiresIn: "15m" }
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.user_id).toBe(10);
    expect(body.data.rol).toBe("admin");
  });

  it("GET /api/auth/me — no token returns 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });
});
