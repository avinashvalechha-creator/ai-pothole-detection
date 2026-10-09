import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeColor = 'blue',
}) => {
  const badgeClasses = {
    green: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
    red: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
    blue: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
    purple: 'bg-purple-950/80 text-purple-400 border-purple-800/60',
  }[badgeColor];

  const iconClasses = {
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    blue: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }[badgeColor];

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg border ${iconClasses}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">{value}</span>
        {badge && (
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
  );
};
