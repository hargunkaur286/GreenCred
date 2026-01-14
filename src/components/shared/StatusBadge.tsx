import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { VerificationStatus } from '@/types/esg';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

const statusConfig = {
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className: 'verified-badge',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'pending-badge',
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
    className: 'expired-badge',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'expired-badge',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn(
      config.className,
      size === 'sm' && 'text-xs px-1.5 py-0.5'
    )}>
      <Icon className={cn('h-3.5 w-3.5', size === 'sm' && 'h-3 w-3')} />
      {config.label}
    </span>
  );
}
