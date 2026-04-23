import { describe, it, expect } from "vitest";
import { parseHttpStatus } from "./httpError";

describe("parseHttpStatus", () => {
  it("extrae 403 desde 'N: message'", () => {
    expect(parseHttpStatus(new Error("403: No tiene acceso"))).toBe(403);
  });

  it("extrae 500 desde 'N: message'", () => {
    expect(parseHttpStatus(new Error("500: Server error"))).toBe(500);
  });

  it("retorna null para Error sin codigo al inicio", () => {
    expect(parseHttpStatus(new Error("Connection lost"))).toBeNull();
  });

  it("retorna null para no-Error", () => {
    expect(parseHttpStatus("403: string plano")).toBeNull();
    expect(parseHttpStatus(null)).toBeNull();
    expect(parseHttpStatus(undefined)).toBeNull();
    expect(parseHttpStatus({ status: 403 })).toBeNull();
  });

  it("no confunde numeros que no son status HTTP", () => {
    expect(parseHttpStatus(new Error("12: short"))).toBeNull();
    expect(parseHttpStatus(new Error("1234: too long"))).toBeNull();
  });
});
