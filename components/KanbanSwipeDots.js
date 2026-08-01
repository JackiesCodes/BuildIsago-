'use client';

import { useEffect, useState } from 'react';

export default function KanbanSwipeDots({ boardId, columns }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const board = document.getElementById(boardId);
    if (!board) return undefined;

    const items = Array.from(board.querySelectorAll('.kanban-column'));
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) setActive(items.indexOf(mostVisible.target));
      },
      { root: board, threshold: [0.5, 0.75, 1] }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [boardId]);

  function goTo(index) {
    const board = document.getElementById(boardId);
    const items = board?.querySelectorAll('.kanban-column');
    items?.[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  return (
    <div className="kanban-swipe-dots" role="tablist" aria-label="Kanban columns">
      {columns.map((col, i) => (
        <button
          key={col.key}
          type="button"
          role="tab"
          aria-selected={active === i}
          aria-label={col.label}
          className={active === i ? 'active' : ''}
          onClick={() => goTo(i)}
        />
      ))}
    </div>
  );
}
