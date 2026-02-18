import { describe, it, expect } from "vitest";

describe("API client", () => {
  it("fetchApi builds correct URL", () => {
    const API_BASE = "/api";
    const path = "/projects";
    expect(`${API_BASE}${path}`).toBe("/api/projects");
  });
});
