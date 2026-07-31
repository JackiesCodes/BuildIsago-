import Link from 'next/link';
import CourseStatusBadge from './CourseStatusBadge';
import { formatMoney } from '@/lib/utils/money';

export default function CourseAdminList({ courses }) {
  if (!courses?.length) {
    return (
      <div className="empty-state">
        <h3>No courses yet</h3>
        <p>Training and skills-development courses you sell will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {courses.map((c) => (
        <Link key={c.id} href={`/dashboard/studio/academy/${c.id}`} className="project-row">
          <div>
            <div className="title">{c.title}</div>
            <div className="meta">
              <span>{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {Number(c.price) === 0 ? 'Free' : formatMoney(c.price, c.currency)}
            </span>
            <CourseStatusBadge status={c.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
