import React from 'react';
import { TicketStatus, TicketPriority, TicketCategory } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Flame,
  AlertTriangle,
  Info,
  DollarSign,
  Barcode,
  Printer,
  Truck,
  BookOpen,
  HelpCircle
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  switch (status) {
    case 'Open':
      return (
        <span className="badge badge-status-open">
          <Clock size={12} />
          Open
        </span>
      );
    case 'In Progress':
      return (
        <span className="badge badge-status-in-progress">
          <AlertCircle size={12} />
          In Progress
        </span>
      );
    case 'Resolved':
      return (
        <span className="badge badge-status-resolved">
          <CheckCircle2 size={12} />
          Resolved
        </span>
      );
    case 'Closed':
      return (
        <span className="badge badge-status-closed">
          <XCircle size={12} />
          Closed
        </span>
      );
    default:
      return <span className="badge">{status}</span>;
  }
};

export const PriorityBadge: React.FC<{ priority: TicketPriority; isAiOriginal?: boolean }> = ({
  priority,
  isAiOriginal
}) => {
  switch (priority) {
    case 'Critical':
      return (
        <span className="badge badge-priority-critical" title="Highest priority - SLA < 24 hrs">
          <Flame size={12} />
          Critical
          {isAiOriginal && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>AI</span>}
        </span>
      );
    case 'High':
      return (
        <span className="badge badge-priority-high" title="High priority - SLA < 48 hrs">
          <AlertTriangle size={12} />
          High
          {isAiOriginal && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>AI</span>}
        </span>
      );
    case 'Medium':
      return (
        <span className="badge badge-priority-medium">
          <Info size={12} />
          Medium
          {isAiOriginal && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>AI</span>}
        </span>
      );
    case 'Low':
      return (
        <span className="badge badge-priority-low">
          <Info size={12} />
          Low
          {isAiOriginal && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>AI</span>}
        </span>
      );
    default:
      return <span className="badge">{priority}</span>;
  }
};

export const CategoryBadge: React.FC<{ category: TicketCategory | string }> = ({ category }) => {
  const getIcon = () => {
    switch (category) {
      case 'Royalty & Payments':
        return <DollarSign size={12} color="#10b981" />;
      case 'ISBN & Metadata Issues':
        return <Barcode size={12} color="#f59e0b" />;
      case 'Printing & Quality':
        return <Printer size={12} color="#f43f5e" />;
      case 'Distribution & Availability':
        return <Truck size={12} color="#06b6d4" />;
      case 'Book Status & Production Updates':
        return <BookOpen size={12} color="#8b5cf6" />;
      default:
        return <HelpCircle size={12} color="#94a3b8" />;
    }
  };

  return (
    <span className="badge badge-category">
      {getIcon()}
      {category}
    </span>
  );
};
