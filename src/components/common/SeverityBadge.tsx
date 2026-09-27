import React from 'react';
import { SeverityLevel } from '../../types';
import { AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react';

interface Props {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<Props> = ({ severity, className = '', showIcon = true }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Info;

  switch (severity) {
    case 'CRITICAL':
      badgeStyle = 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-400/20';
      Icon = AlertTriangle;
      break;
    case 'HIGH':
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-400/20';
      Icon = AlertCircle;
      break;
    case 'MEDIUM':
      badgeStyle = 'bg-yellow-50 text-yellow-800 border-yellow-200';
      Icon = Clock;
      break;
    case 'LOW':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      Icon = Info;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${badgeStyle} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {severity}
    </span>
  );
};
