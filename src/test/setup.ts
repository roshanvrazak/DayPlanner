import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js server functions
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status ?? 200,
      ok: (init?.status ?? 200) < 400,
    }),
  },
}));

// Mock sonner toasts (no-op in tests)
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
  Toaster: () => null,
}));
