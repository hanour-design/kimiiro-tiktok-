import './StatusBadge.css';

const statusColors = {
  '運用中': 'green',
  '準備中': 'yellow',
  '休止中': 'gray',
};

export default function StatusBadge({ status }) {
  const color = statusColors[status] || 'gray';
  return <span className={`status-badge status-${color}`}>{status}</span>;
}
