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

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOverride: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
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

  it("unlock button is disabled by default", () => {
    render(<OverrideModal {...defaultProps} />);
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("unlock button remains disabled with wrong phrase", () => {
    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK");
    fireEvent.change(input, { target: { value: "WRONG PHRASE" } });
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("unlock button enabled with correct phrase", () => {
    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK");
    fireEvent.change(input, { target: { value: "BREAK MY STREAK" } });
    const btn = screen.getByText("Unlock Schedule");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("auto-uppercases input", () => {
    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "break my streak" } });
    expect(input.value).toBe("BREAK MY STREAK");
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<OverrideModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("calls onOverride and onClose on successful submit", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, unlockedCount: 3 }),
    });

    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK");
    fireEvent.change(input, { target: { value: "BREAK MY STREAK" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(defaultProps.onOverride).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  it("shows error message when API returns non-ok response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Incorrect phrase" }),
    });

    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK");
    fireEvent.change(input, { target: { value: "BREAK MY STREAK" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Incorrect phrase")).toBeDefined();
    });
    expect(defaultProps.onOverride).not.toHaveBeenCalled();
  });

  it("shows fallback error on fetch failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    render(<OverrideModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("BREAK MY STREAK");
    fireEvent.change(input, { target: { value: "BREAK MY STREAK" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to override lock")).toBeDefined();
    });
  });
});
