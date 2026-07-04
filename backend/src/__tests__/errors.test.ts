import { describe, it, expect } from "vitest";
import {
  AppError,
  UnauthorizedError,
  SessionRevokedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/core/errors/index.js";

describe("AppError", () => {
  it("creates an error with statusCode and code", () => {
    const err = new AppError("Algo salió mal", 400, "BAD_REQUEST");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Algo salió mal");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
  });
});

describe("SessionRevokedError", () => {
  it("creates 401 error with SESSION_REVOKED code", () => {
    const err = new SessionRevokedError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("SESSION_REVOKED");
    expect(err.message).toBe("Sesión revocada");
  });

  it("can be caught with instanceof AppError", () => {
    const err = new SessionRevokedError();
    expect(err instanceof AppError).toBe(true);
  });
});

describe("UnauthorizedError", () => {
  it("creates 401 with UNAUTHORIZED code", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("uses custom message", () => {
    const err = new UnauthorizedError("Token expirado");
    expect(err.message).toBe("Token expirado");
  });
});

describe("ForbiddenError", () => {
  it("creates 403 with FORBIDDEN code", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

describe("NotFoundError", () => {
  it("creates 404 with NOT_FOUND code", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });
});

describe("ValidationError", () => {
  it("creates 400 with VALIDATION_ERROR code", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("ConflictError", () => {
  it("creates 409 with CONFLICT code", () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});
