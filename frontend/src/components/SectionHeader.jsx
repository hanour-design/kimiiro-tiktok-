import './SectionHeader.css';

export default function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}
