import Link from 'next/link';
import { formatMoney } from '@/lib/utils/money';
import { courseLevelLabel } from '@/lib/constants/courseLevels';

export default function CourseCard({ course }) {
  return (
    <Link href={`/academy/${course.slug}`} className="product-card">
      <div className="product-card-image">
        {course.coverUrl ? <img src={course.coverUrl} alt="" /> : <div className="product-card-placeholder" />}
      </div>
      <div className="product-card-body">
        <span className="service-tag">{courseLevelLabel(course.level)}</span>
        <h3>{course.title}</h3>
        <span className="field-hint" style={{ margin: 0 }}>
          {Number(course.lesson_count) || 0} lessons
        </span>
        <span className="product-card-price">
          {Number(course.price) === 0 ? 'Free' : formatMoney(course.price, course.currency)}
        </span>
      </div>
    </Link>
  );
}
