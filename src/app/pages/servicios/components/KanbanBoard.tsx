import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──
export interface KanbanColumnDef {
  id: string;
  title: string;
  headerClass: string;
  countClass: string;
}

export interface KanbanItem {
  id: number;
  columnId: string;
  titulo: string;
  subtitulo?: string | null;
  badge?: string | null;
  badgeClass?: string;
  meta?: { label: string; value: string }[];
}

interface KanbanBoardProps {
  columns: KanbanColumnDef[];
  items: KanbanItem[];
  onItemDrop: (itemId: number, targetColumnId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// ── Column Component ──
function KanbanColumn({
  column,
  items,
}: {
  column: KanbanColumnDef;
  items: KanbanItem[];
}) {
  return (
    <div className="flex-shrink-0 w-72 bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-280px)]">
      {/* Header */}
      <div className={`px-3 py-2.5 rounded-t-xl ${column.headerClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${column.countClass}`}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[100px]">
        {items.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
            Sin elementos
          </div>
        ) : (
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <KanbanCard key={item.id} item={item} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// ── Card Component ──
function KanbanCard({ item }: { item: KanbanItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: "item", item, columnId: item.columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow"
    >
      <p className="text-sm font-medium text-slate-800 leading-snug">{item.titulo}</p>
      {item.subtitulo && (
        <p className="text-xs text-slate-500 mt-0.5">{item.subtitulo}</p>
      )}
      {item.meta && item.meta.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {item.meta.map((m, i) => (
            <span
              key={i}
              className={`text-xs px-1.5 py-0.5 rounded ${m.label === "Asignado" ? "bg-blue-50 text-blue-700" : m.label === "Tiempo" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
            >
              {m.value}
            </span>
          ))}
        </div>
      )}
      {item.badge && (
        <div className="mt-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.badgeClass || "bg-slate-100 text-slate-600"}`}>
            {item.badge}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ──
function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-72 bg-slate-100 rounded-xl p-3 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg mb-3" />
          <div className="space-y-2">
            <div className="h-24 bg-slate-200 rounded-lg" />
            <div className="h-24 bg-slate-200 rounded-lg" />
            <div className="h-24 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main KanbanBoard ──
export function KanbanBoard({ columns, items, onItemDrop, isLoading, error, onRetry }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Group items by column
  const grouped = useMemo(() => {
    const groups: Record<string, KanbanItem[]> = {};
    for (const col of columns) {
      groups[col.id] = [];
    }
    for (const item of items) {
      if (groups[item.columnId]) {
        groups[item.columnId].push(item);
      } else {
        // Fallback to first column
        groups[columns[0]?.id || ""]?.push(item);
      }
    }
    return groups;
  }, [items, columns]);

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { item: KanbanItem; columnId: string } | undefined;
    if (!activeData) return;

    // Determine target column
    let targetColumnId = over.id as string;
    const isColumn = columns.some((c) => c.id === targetColumnId);
    if (!isColumn) {
      const overData = over.data.current as { columnId: string } | undefined;
      targetColumnId = overData?.columnId || activeData.columnId;
    }

    if (activeData.columnId === targetColumnId) return;
    onItemDrop(activeData.item.id, targetColumnId);
  };

  if (isLoading) return <KanbanSkeleton />;
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm mb-3">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-blue-600 hover:underline">
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 200 }}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            items={grouped[column.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-white rounded-lg border-2 border-blue-400 p-3 shadow-lg w-72">
            <p className="text-sm font-medium text-slate-800">{activeItem.titulo}</p>
            {activeItem.subtitulo && (
              <p className="text-xs text-slate-500 mt-0.5">{activeItem.subtitulo}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
