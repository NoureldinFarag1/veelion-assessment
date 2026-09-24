import { TASK_FILTERS } from "@/lib/taskStatus";
import type { TaskFilter } from "@/types/api";

type StatusFilterProps = {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <section aria-label="Filter tasks by status" className="card" style={{ padding: "0.8rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {TASK_FILTERS.map((filter) => {
          const active = filter.value === value;

          return (
            <button
              key={filter.value}
              type="button"
              className={active ? "button primary" : "button"}
              onClick={() => onChange(filter.value)}
              aria-pressed={active}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
