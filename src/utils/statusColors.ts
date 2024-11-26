import { JobStatus } from '@/src/types/job';

interface StatusColor {
  bg: string;
  text: string;
}

export const getStatusColor = (status: JobStatus): StatusColor => {
  switch (status) {
    case JobStatus.Created:
      return { bg: '#F5F5F5', text: '#757575' };  // Neutral grey
    case JobStatus.Scheduled:
      return { bg: '#FFF3CD', text: '#856404' };  // Warm yellow/amber
    case JobStatus.InProgress:
      return { bg: '#FFF3E0', text: '#F57C00' };  // Warm orange
    case JobStatus.Completed:
      return { bg: '#E8F5E9', text: '#2E7D32' };  // Soft green
    case JobStatus.Cancelled:
      return { bg: '#FFEBEE', text: '#C62828' };  // Soft red
    default:
      return { bg: '#E3F2FD', text: '#1976D2' };  // Soft blue
  }
}; 