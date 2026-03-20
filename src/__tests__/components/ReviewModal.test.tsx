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

import ReviewModal from "@/components/ReviewModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

const sampleBlocks = [
  {
    id: "b1",
    startTime: "2024-01-15T09:00:00.000Z",
    endTime: "2024-01-15T10:00:00.000Z",
    completed: false,
    task: { title: "Morning standup", priority: 1 },
  },
  {
    id: "b2",
    startTime: "2024-01-15T10:00:00.000Z",
    endTime: "2024-01-15T11:00:00.000Z",
    completed: true,
    task: { title: "Code review", priority: 2 },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("ReviewModal", () => {
  it("renders when open", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [],
    });
    render(<ReviewModal {...defaultProps} />);
    expect(screen.getByText("Daily Review")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<ReviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Daily Review")).toBeNull();
  });

  it("fetches blocks on open", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [],
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/review");
    });
  });

  it("shows empty state when no blocks", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [],
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("No blocks scheduled for today")).toBeDefined();
    });
  });

  it("renders block titles after fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => sampleBlocks,
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Morning standup")).toBeDefined();
      expect(screen.getByText("Code review")).toBeDefined();
    });
  });

  it("shows correct completed count", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => sampleBlocks,
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("1/2")).toBeDefined();
    });
  });

  it("toggles block completion on click", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => sampleBlocks,
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Morning standup"));

    // b1 starts as not completed — click it to complete
    const b1Button = screen.getByText("Morning standup").closest("button")!;
    fireEvent.click(b1Button);

    // Now count should be 2/2
    await waitFor(() => {
      expect(screen.getByText("2/2")).toBeDefined();
    });
  });

  it("Save Review button is disabled when no blocks", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [],
    });
    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => {
      const btn = screen.getByText("Save Review");
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("calls onSave and onClose after successful save", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ json: async () => sampleBlocks })
      .mockResolvedValueOnce({ json: async () => ({ success: true }) });

    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Save Review"));
    fireEvent.click(screen.getByText("Save Review"));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  it("POSTs block updates on save", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ json: async () => sampleBlocks })
      .mockResolvedValueOnce({ json: async () => ({ success: true }) });

    render(<ReviewModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Save Review"));
    fireEvent.click(screen.getByText("Save Review"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/review",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("blockId"),
        })
      );
    });
  });

  it("calls onClose when Cancel is clicked", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [],
    });
    render(<ReviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });
});
