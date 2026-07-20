'use client';
import { useMemo } from 'react';
import type { Question, RankingPayload } from '@/lib/api/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({
  id, label, rank, total, onChange, onMoveUp, onMoveDown, readOnly,
}: {
  id: string; label: string; rank: number; total: number;
  onChange: (v: string) => void; onMoveUp: () => void; onMoveDown: () => void; readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      {!readOnly && (
        <span
          {...attributes}
          {...listeners}
          className="text-gray-400 cursor-grab text-lg select-none"
          aria-label={`Drag handle for ${label}`}
        >
          ≡
        </span>
      )}
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      <input
        type="number"
        min={1}
        max={total}
        value={rank}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center"
        aria-label={`Rank for ${label}`}
      />
      {!readOnly && (
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={rank === 1} className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 leading-none" aria-label={`Move ${label} up`}>▲</button>
          <button onClick={onMoveDown} disabled={rank === total} className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 leading-none" aria-label={`Move ${label} down`}>▼</button>
        </div>
      )}
    </div>
  );
}

interface Props {
  question: Question;
  value: RankingPayload | null;
  onChange: (p: RankingPayload) => void;
  readOnly?: boolean;
}

export function RankingQuestion({ question, value, onChange, readOnly }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const order = useMemo(() => {
    if (value?.order && value.order.length === question.options.length) return value.order;
    return question.options.map((o) => o.option_id);
  }, [value, question.options]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      onChange({ type: 'ranking', order: arrayMove(order, oldIdx, newIdx) });
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    onChange({ type: 'ranking', order: arrayMove(order, index, newIdx) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Drag to reorder, or enter numbers directly</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((optId, idx) => {
            const opt = question.options.find((o) => o.option_id === optId);
            if (!opt) return null;
            return (
              <SortableItem
                key={optId}
                id={optId}
                label={opt.option_text}
                rank={idx + 1}
                total={order.length}
                onChange={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 1 && n <= order.length) {
                    onChange({ type: 'ranking', order: arrayMove(order, idx, n - 1) });
                  }
                }}
                onMoveUp={() => moveItem(idx, -1)}
                onMoveDown={() => moveItem(idx, 1)}
                readOnly={readOnly}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
