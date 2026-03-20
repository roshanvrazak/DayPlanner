import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      require("react").createElement("div", props, children),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      require("react").createElement("button", props, children),
    aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      require("react").createElement("aside", props, children),
    svg: ({ children, ...props }: React.SVGProps<SVGSVGElement>) =>
      require("react").createElement("svg", props, children),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) =>
      require("react").createElement("span", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

// TaskCard renders a simple card - mock it for isolation
vi.mock("@/components/TaskCard", () => ({
  default: ({ title }: { title: string }) =>
    require("react").createElement("div", { "data-testid": "task-card" }, title),
}));

import BacklogSidebar from "@/components/BacklogSidebar";

const sampleTasks = [
  { id: "t1", title: "Write tests", duration: 60, priority: 1, deadline: null, status: "BACKLOG" },
  { id: "t2", title: "Review PR", duration: 30, priority: 2, deadline: null, status: "BACKLOG" },
  { id: "t3", title: "Deploy app", duration: 45, priority: 3, deadline: null, status: "BACKLOG" },
];

const defaultProps = {
  tasks: sampleTasks,
  isScheduling: false,
  streak: 0,
  isCollapsed: false,
  onToggleCollapse: vi.fn(),
  onPlanWeek: vi.fn(),
  onAddTask: vi.fn(),
  onDeleteTask: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("BacklogSidebar", () => {
  it("renders task count in header", () => {
    render(<BacklogSidebar {...defaultProps} />);
    expect(screen.getByText("3 tasks")).toBeDefined();
  });

  it("renders all tasks", () => {
    render(<BacklogSidebar {...defaultProps} />);
    expect(screen.getByText("Write tests")).toBeDefined();
    expect(screen.getByText("Review PR")).toBeDefined();
    expect(screen.getByText("Deploy app")).toBeDefined();
  });

  it("filters tasks based on search query", () => {
    render(<BacklogSidebar {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "write" } });
    expect(screen.getByText("Write tests")).toBeDefined();
    expect(screen.queryByText("Review PR")).toBeNull();
    expect(screen.queryByText("Deploy app")).toBeNull();
  });

  it("shows no-match empty state when search has no results", () => {
    render(<BacklogSidebar {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "xyz no match" } });
    expect(screen.getByText("No tasks match")).toBeDefined();
  });

  it("shows empty backlog state when no tasks", () => {
    render(<BacklogSidebar {...defaultProps} tasks={[]} />);
    expect(screen.getByText("Backlog empty")).toBeDefined();
  });

  it("Plan My Week button is disabled when no tasks", () => {
    render(<BacklogSidebar {...defaultProps} tasks={[]} />);
    const btn = screen.getByText("Plan My Week");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("Plan My Week button is enabled when tasks exist", () => {
    render(<BacklogSidebar {...defaultProps} />);
    const btn = screen.getByText("Plan My Week");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("Plan My Week button is disabled when scheduling", () => {
    render(<BacklogSidebar {...defaultProps} isScheduling={true} />);
    expect(screen.getByText("Planning...")).toBeDefined();
  });

  it("calls onPlanWeek when Plan My Week clicked", () => {
    render(<BacklogSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("Plan My Week"));
    expect(defaultProps.onPlanWeek).toHaveBeenCalledOnce();
  });

  it("calls onAddTask when add button clicked", () => {
    render(<BacklogSidebar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Add task"));
    expect(defaultProps.onAddTask).toHaveBeenCalledOnce();
  });

  it("does not show streak badge when streak is 0", () => {
    render(<BacklogSidebar {...defaultProps} streak={0} />);
    expect(screen.queryByText(/day streak/)).toBeNull();
  });

  it("shows streak badge when streak > 0", () => {
    render(<BacklogSidebar {...defaultProps} streak={5} />);
    expect(screen.getByText("5 day streak!")).toBeDefined();
  });

  it("calls onToggleCollapse when toggle button clicked", () => {
    render(<BacklogSidebar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Collapse sidebar"));
    expect(defaultProps.onToggleCollapse).toHaveBeenCalledOnce();
  });
});
