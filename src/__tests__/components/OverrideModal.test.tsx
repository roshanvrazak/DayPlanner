import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      require("react").createElement("div", props, children),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      require("react").createElement("button", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import OverrideModal from "@/components/OverrideModal";

const TEST_PHRASE = "DELTA-STORM-42-ECHO";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOverride: vi.fn(),
};

function mockSettingsFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url === "/api/settings") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ overridePhrase: TEST_PHRASE }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettingsFetch();
});

describe("OverrideModal", () => {
  it("renders when open", () => {
    render(<OverrideModal {...defaultProps} />);
    expect(screen.getByText("Emergency Override")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<OverrideModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Emergency Override")).toBeNull();
  });

  it("unlock button is disabled by default", async () => {
    render(<OverrideModal {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("unlock button remains disabled with wrong phrase", async () => {
    render(<OverrideModal {...defaultProps} />);
    const input = await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.change(input, { target: { value: "WRONG PHRASE" } });
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("unlock button enabled with correct phrase", async () => {
    render(<OverrideModal {...defaultProps} />);
    const input = await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.change(input, { target: { value: TEST_PHRASE } });
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("auto-uppercases input", async () => {
    render(<OverrideModal {...defaultProps} />);
    const input = (await waitFor(() =>
      screen.getByPlaceholderText(TEST_PHRASE)
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "delta-storm-42-echo" } });
    expect(input.value).toBe("DELTA-STORM-42-ECHO");
  });

  it("calls onClose when Cancel is clicked", async () => {
    render(<OverrideModal {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("calls onOverride and onClose on successful submit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/settings") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ overridePhrase: TEST_PHRASE }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, unlockedCount: 3 }),
        });
      })
    );

    render(<OverrideModal {...defaultProps} />);
    const input = await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.change(input, { target: { value: TEST_PHRASE } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(defaultProps.onOverride).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  it("shows error message when API returns non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/settings") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ overridePhrase: TEST_PHRASE }),
          });
        }
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Incorrect phrase" }),
        });
      })
    );

    render(<OverrideModal {...defaultProps} />);
    const input = await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.change(input, { target: { value: TEST_PHRASE } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Incorrect phrase")).toBeDefined();
    });
    expect(defaultProps.onOverride).not.toHaveBeenCalled();
  });

  it("shows fallback error on fetch failure for override call", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/settings") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ overridePhrase: TEST_PHRASE }),
          });
        }
        return Promise.reject(new Error("Network error"));
      })
    );

    render(<OverrideModal {...defaultProps} />);
    const input = await waitFor(() => screen.getByPlaceholderText(TEST_PHRASE));
    fireEvent.change(input, { target: { value: TEST_PHRASE } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to override lock")).toBeDefined();
    });
  });
});
