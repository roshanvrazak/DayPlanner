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

import SettingsModal from "@/components/SettingsModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("SettingsModal", () => {
  it("renders when open", () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true }),
    });
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<SettingsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("fetches settings on open", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ dayStartTime: "08:00", dayEndTime: "18:00", strictMode: false }),
    });
    render(<SettingsModal {...defaultProps} />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/settings");
    });
  });

  it("populates time inputs from fetched settings", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ dayStartTime: "08:30", dayEndTime: "16:30", strictMode: true }),
    });
    render(<SettingsModal {...defaultProps} />);
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue("08:30");
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it("calls onClose when Cancel is clicked", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true }),
    });
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("calls PATCH /api/settings and onSave on save", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: async () => ({ dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true }),
      });

    render(<SettingsModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Save"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(defaultProps.onSave).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  it("shows Saving... while saving", async () => {
    let resolvePatch: (v: unknown) => void;
    const patchPromise = new Promise((r) => { resolvePatch = r; });

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: async () => ({ dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true }),
      })
      .mockReturnValueOnce(patchPromise);

    render(<SettingsModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Save"));
    fireEvent.click(screen.getByText("Save"));

    expect(screen.getByText("Saving...")).toBeDefined();
    resolvePatch!({ json: async () => ({}) });
  });
});
