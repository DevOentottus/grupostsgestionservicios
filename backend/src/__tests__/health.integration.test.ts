import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// ── Mock data compartido entre vi.hoisted y vi.mock ──
const mockResults = vi.hoisted(() => new Map<string, { data: unknown[]; error?: unknown }>());

vi.mock("@/lib/supabase.js", () => {
  function makeQB(table: string) {
    const entry = mockResults.get(table) ?? { data: [], error: null };
    const result = { data: entry.data, error: entry.error ?? null };
    const qb: Record<string, unknown> = {
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

describe("Health endpoint", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health returns 200 with status ok", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("timestamp");
  });
});
