import ReferenceUploader from './ReferenceUploader';
import ReferenceCard from './ReferenceCard';

export default function ReferencesPanel({ projectId, references }) {
  return (
    <div>
      <ReferenceUploader projectId={projectId} />

      {references?.length > 0 ? (
        <div className="reference-grid">
          {references.map((r) => (
            <ReferenceCard key={r.id} projectId={projectId} reference={r} />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginTop: 16 }}>
          No references yet. Add an inspiration image above — its dominant colors get pulled
          out automatically, and you can detect any text it contains.
        </p>
      )}
    </div>
  );
}
