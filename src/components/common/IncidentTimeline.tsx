import React from 'react';
import { StatusHistoryItem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Clock, User } from 'lucide-react';

interface Props {
  history: StatusHistoryItem[];
  className?: string;
}

export const IncidentTimeline: React.FC<Props> = ({ history, className = '' }) => {
  if (!history || history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        No dispatch status history recorded yet.
      </div>
    );
  }

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ${className}`}>
      {history.map((item, idx) => (
        <div key={item.id || idx} className="relative group">
          {/* Timeline node dot */}
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white bg-blue-600 shadow-sm flex items-center justify-center text-white" />

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <StatusBadge status={item.status} />
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <Clock className="w-3 h-3" />
                <span>{formatTime(item.timestamp)}</span>
              </div>
            </div>

            {item.note && (
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {item.note}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <User className="w-3 h-3 text-slate-400" />
              <span>
                Updated by: <strong className="text-slate-700 font-medium">{item.updatedByName}</strong> ({item.updatedByRole})
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
