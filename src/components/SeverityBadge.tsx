interface SeverityBadgeProps {
  level: 'NORMAL' | 'MODERATE' | 'URGENT' | 'MONITOR' | 'LOW' | 'HIGH';
  label?: string;
}

export default function SeverityBadge({ level, label }: SeverityBadgeProps) {
  const styles = {
    NORMAL: 'bg-green-100 text-green-800 border-green-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
    MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    MONITOR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    URGENT: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[level]}`}>
      {label || level}
    </span>
  );
}
