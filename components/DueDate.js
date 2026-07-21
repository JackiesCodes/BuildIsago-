export default function DueDate({ date }) {
  if (!date) return null;

  const due = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = due < today;

  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <span className={`due-date ${overdue ? 'is-overdue' : ''}`}>
      {overdue ? `Overdue · ${label}` : `Due ${label}`}
    </span>
  );
}
