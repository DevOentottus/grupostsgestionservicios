import { describe, it, expect } from "vitest";
import { cn } from "@/app/lib/utils.js";

describe("cn", () => {
  it("merge clases simples", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("clases condicionales con clsx", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("tailwind-merge resuelve conflictos", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("tailwind-merge resuelve conflictos de color", () => {
    expect(cn("text-red-500", "text-blue-700")).toBe("text-blue-700");
  });

  it("acepta arrays", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("valores falsy se filtran", () => {
    expect(cn("a", undefined, null, "", "b")).toBe("a b");
  });

  it("string vacío si no hay inputs", () => {
    expect(cn()).toBe("");
  });
});
