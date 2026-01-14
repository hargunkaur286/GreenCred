import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'gold';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      'stat-card',
      variant === 'primary' && 'bg-primary text-primary-foreground',
      variant === 'gold' && 'bg-accent text-accent-foreground'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}>
            {title}
          </p>
          <p className="mt-2 text-3xl font-heading font-bold">{value}</p>
          {subtitle && (
            <p className={cn(
              'mt-1 text-sm',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-verified' : 'text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          variant === 'default' ? 'bg-primary/10 text-primary' : 'bg-white/20'
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
