import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({ progress, size = 'md', showLabel = true, className }: ProgressRingProps) {
  const sizeConfig = {
    sm: { size: 60, strokeWidth: 4 },
    md: { size: 100, strokeWidth: 6 },
    lg: { size: 140, strokeWidth: 8 },
  };

  const { size: ringSize, strokeWidth } = sizeConfig[size];
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return 'hsl(var(--verified))';
    if (value >= 60) return 'hsl(var(--gold))';
    if (value >= 40) return 'hsl(var(--pending))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={ringSize}
        height={ringSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={getColor(progress)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'font-heading font-bold',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-xl',
            size === 'lg' && 'text-3xl'
          )}>
            {progress}
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-muted-foreground">ESG Score</span>
          )}
        </div>
      )}
    </div>
  );
}
