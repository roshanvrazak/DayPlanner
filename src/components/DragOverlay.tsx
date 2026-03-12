"use client";

const priorityColors: Record<number, { bg: string; border: string; dot: string }> = {
  1: { bg: "bg-red-100/90", border: "border-red-200/50", dot: "bg-red-400" },
  2: { bg: "bg-amber-100/90", border: "border-amber-200/50", dot: "bg-amber-400" },
  3: { bg: "bg-stone-100/90", border: "border-stone-200/50", dot: "bg-stone-400" },
};

interface DraggableTaskOverlayProps {
  task: {
    title: string;
    duration: number;
    priority: number;
  };
}

export default function DraggableTaskOverlay({ task }: DraggableTaskOverlayProps) {
  const colors = priorityColors[task.priority] || priorityColors[3];

  return (
    <div
      className={`
        rounded-xl p-3.5 cursor-grabbing
        ${colors.bg} ${colors.border} border
        shadow-xl shadow-stone-900/15
        scale-105 rotate-2
        w-64
      `}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug">{task.title}</p>
          <span className="text-[11px] text-stone-400 font-medium">{task.duration}m</span>
        </div>
      </div>
    </div>
  );
}
