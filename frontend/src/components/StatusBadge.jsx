export default function StatusBadge({ status }) {
  const map = {
    pending:   'status-pending',
    approved:  'status-approved',
    rejected:  'status-rejected',
    cancelled: 'status-cancelled',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {status}
    </span>
  );
}
