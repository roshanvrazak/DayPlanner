import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      require("react").createElement("div", props, children),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      require("react").createElement("button", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import AddTaskModal from "@/components/AddTaskModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onAdd: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("AddTaskModal", () => {
  it("renders when open", () => {
    render(<AddTaskModal {...defaultProps} />);
    expect(screen.getByText("New Task")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<AddTaskModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("New Task")).toBeNull();
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<AddTaskModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("submit button is disabled when title is empty", () => {
    render(<AddTaskModal {...defaultProps} />);
    const submitBtn = screen.getByText("Add Task");
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("submit button enabled when title is provided", () => {
    render(<AddTaskModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("What needs to be done?");
    fireEvent.change(input, { target: { value: "My Task" } });
    const submitBtn = screen.getByText("Add Task");
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("calls onAdd with form data on submit", () => {
    render(<AddTaskModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "My Task" },
    });
    fireEvent.submit(screen.getByText("Add Task").closest("form")!);
    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Task", duration: 30, priority: 2 })
    );
  });

  it("does not call onAdd when title is empty and form submitted", () => {
    render(<AddTaskModal {...defaultProps} />);
    const form = screen.getByText("Add Task").closest("form")!;
    fireEvent.submit(form);
    expect(defaultProps.onAdd).not.toHaveBeenCalled();
  });

  it("can add a subtask via Add button", () => {
    render(<AddTaskModal {...defaultProps} />);
    const subtaskInput = screen.getByPlaceholderText("Add a subtask...");
    fireEvent.change(subtaskInput, { target: { value: "Subtask one" } });
    fireEvent.click(screen.getByText("Add"));
    expect(screen.getByText("Subtask one")).toBeDefined();
  });

  it("can add a subtask via Enter key", () => {
    render(<AddTaskModal {...defaultProps} />);
    const subtaskInput = screen.getByPlaceholderText("Add a subtask...");
    fireEvent.change(subtaskInput, { target: { value: "Subtask via enter" } });
    fireEvent.keyDown(subtaskInput, { key: "Enter" });
    expect(screen.getByText("Subtask via enter")).toBeDefined();
  });

  it("subtask Add button is disabled when subtask input is empty", () => {
    render(<AddTaskModal {...defaultProps} />);
    const addBtn = screen.getByText("Add");
    expect((addBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("includes subtasks in onAdd call", () => {
    render(<AddTaskModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Task with subtasks" },
    });
    const subtaskInput = screen.getByPlaceholderText("Add a subtask...");
    fireEvent.change(subtaskInput, { target: { value: "Sub 1" } });
    fireEvent.click(screen.getByText("Add"));

    const form = screen.getByText("Add Task").closest("form")!;
    fireEvent.submit(form);
    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ subtasks: [{ title: "Sub 1" }] })
    );
  });
});
