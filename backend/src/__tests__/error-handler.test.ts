import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "@/core/middleware/error-handler.js";
import { AppError, SessionRevokedError, ValidationError } from "@/core/errors/index.js";
import { ZodError, z } from "zod";

function makeMockReply() {
  const state: { statusCode: number; body: unknown } = { statusCode: 200, body: null };
  const reply = {
    status: vi.fn((code: number) => {
      state.statusCode = code;
      return reply;
    }),
    send: vi.fn((body: unknown) => {
      state.body = body;
      return reply;
    }),
    _state: state,
  } as any;
  return reply;
}

describe("errorHandler", () => {
  it("handles AppError with correct status and Problem Details format", () => {
    const reply = makeMockReply();
    const err = new AppError("Recurso no encontrado", 404, "NOT_FOUND");

    errorHandler(err, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      type: "https://api.serviciolocalsts.com/errors/not_found",
      title: "NOT_FOUND",
      status: 404,
      detail: "Recurso no encontrado",
    });
  });

  it("handles SessionRevokedError with 401", () => {
    const reply = makeMockReply();
    const err = new SessionRevokedError();

    errorHandler(err, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      type: "https://api.serviciolocalsts.com/errors/session_revoked",
      title: "SESSION_REVOKED",
      status: 401,
      detail: "Sesión revocada",
    });
  });

  it("handles ValidationError with 400", () => {
    const reply = makeMockReply();
    const err = new ValidationError("El nombre es requerido");

    errorHandler(err, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      type: "https://api.serviciolocalsts.com/errors/validation_error",
      title: "VALIDATION_ERROR",
      status: 400,
      detail: "El nombre es requerido",
    });
  });

  it("handles ZodError with field-level issues", () => {
    const reply = makeMockReply();
    const schema = z.object({ email: z.string().email() });
    let zodError: ZodError;
    try {
      schema.parse({ email: "invalido" });
      throw new Error("should not reach");
    } catch (e) {
      zodError = e as ZodError;
    }

    errorHandler(zodError!, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    const sent = (reply.send as any).mock.calls[0][0];
    expect(sent.title).toBe("VALIDATION_ERROR");
    expect(sent.errors).toHaveLength(1);
    expect(sent.errors[0]).toMatchObject({
      field: "email",
      message: expect.stringContaining("Invalid email"),
    });
  });

  it("handles unknown Error as 500", () => {
    const reply = makeMockReply();
    const err = new Error("Algo explotó");

    errorHandler(err, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      type: "https://api.serviciolocalsts.com/errors/internal",
      title: "INTERNAL_ERROR",
      status: 500,
      detail: "Error interno del servidor",
    });
  });

  it("handles Error with no message", () => {
    const reply = makeMockReply();
    const err = new Error();

    errorHandler(err, {} as any, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      type: "https://api.serviciolocalsts.com/errors/internal",
      title: "INTERNAL_ERROR",
      status: 500,
      detail: "Error interno del servidor",
    });
  });
});
