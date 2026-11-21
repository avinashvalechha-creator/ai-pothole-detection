import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: any;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeColor = 'blue',
}) => {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'green':
        return 'border-[#008000] text-[#008000]';
      case 'amber':
        return 'border-[#FFA500] text-[#FFA500]';
      case 'red':
        return 'border-[#FF0000] text-[#FF0000]';
      default:
        return 'border-[#000000] text-[#000000]';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border-[3px] border-[#000000] p-3.5 sm:p-4 flex flex-col justify-between hover:bg-[#F0F0F0] transition-colors">
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-1.5 sm:gap-2 mb-3">
        <span className="font-headline text-xs sm:text-[13px] uppercase tracking-wider text-[#000000] leading-snug break-words">
          {title}
        </span>
        {badge && (
          <span className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 border-[2px] uppercase tracking-wider ${getBadgeStyle()}`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="font-headline text-3xl tracking-tight text-[#000000] leading-none mb-2">
          {value}
        </div>
        {subtext && (
          <p className="text-[12px] font-mono text-[#000000] uppercase tracking-wide border-t-[1px] border-[#000000] pt-2">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
