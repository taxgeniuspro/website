import { Clock, AlertCircle, Send, CheckCircle, XCircle, FileText } from 'lucide-react';

export type ClientStatus = 'DRAFT' | 'IN_REVIEW' | 'FILED' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
export type ClientPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export function getStatusIcon(status: ClientStatus) {
  switch (status) {
    case 'DRAFT':
      return <Clock className="h-4 w-4 text-gray-500" />;
    case 'IN_REVIEW':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'FILED':
      return <Send className="h-4 w-4 text-blue-500" />;
    case 'ACCEPTED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'REJECTED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'AMENDED':
      return <FileText className="h-4 w-4 text-purple-500" />;
    default:
      return null;
  }
}

export function getStatusColor(status: ClientStatus) {
  switch (status) {
    case 'DRAFT':
      return 'secondary';
    case 'IN_REVIEW':
      return 'warning';
    case 'FILED':
      return 'default';
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'destructive';
    case 'AMENDED':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function getPriorityColor(priority: ClientPriority) {
  switch (priority) {
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'secondary';
    default:
      return 'secondary';
  }
}
