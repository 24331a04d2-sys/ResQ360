import React from 'react';
import { IncidentStatus } from '../../types';
import { CheckCircle2, Clock, Navigation, MapPin, ShieldAlert, Check, XCircle } from 'lucide-react';

interface Props {
  status: IncidentStatus;
  className?: string;
}

export const StatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  let text = status.toUpperCase().replace('_', ' ');
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Clock;

  switch (status) {
    case 'reported':
      text = 'REPORTED';
      style = 'bg-slate-100 text-slate-700 border-slate-200';
      Icon = Clock;
      break;
    case 'ai_analyzed':
      text = 'AI ANALYZED';
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      Icon = ShieldAlert;
      break;
    case 'verified':
      text = 'VERIFIED';
      style = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
      Icon = CheckCircle2;
      break;
    case 'acknowledged':
      text = 'ACKNOWLEDGED';
      style = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      Icon = CheckCircle2;
      break;
    case 'assigned':
      text = 'ASSIGNED';
      style = 'bg-sky-50 text-sky-700 border-sky-200';
      Icon = Clock;
      break;
    case 'dispatched':
      text = 'DISPATCHED';
      style = 'bg-purple-50 text-purple-700 border-purple-200';
      Icon = Navigation;
      break;
    case 'en_route':
      text = 'EN ROUTE';
      style = 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-400/30';
      Icon = Navigation;
      break;
    case 'arrived':
      text = 'ON SCENE';
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30';
      Icon = MapPin;
      break;
    case 'resolved':
      text = 'RESOLVED';
      style = 'bg-green-50 text-green-700 border-green-200';
      Icon = Check;
      break;
    case 'cancelled':
      text = 'CANCELLED';
      style = 'bg-rose-50 text-rose-600 border-rose-200 line-through';
      Icon = XCircle;
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide border ${style} ${className}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {text}
    </span>
  );
};
