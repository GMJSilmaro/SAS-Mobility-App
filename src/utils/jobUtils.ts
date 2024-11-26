interface ColorScheme {
  bg: string;
  text: string;
}

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'created':
      return {
        bg: '#F5F5F5',  // Light gray background
        text: '#616161'  // Dark gray text
      };
    case 'scheduled':
      return {
        bg: '#E3F2FD',  // Light blue background
        text: '#1565C0'  // Dark blue text
      };
    case 'pending':
      return {
        bg: '#FFF3E0',  // Light orange background
        text: '#E65100'  // Dark orange text
      };
    case 'in progress':
      return {
        bg: '#FFF3E0',  // Light orange background
        text: '#E65100'  // Dark orange text
      };
    case 'completed':
      return {
        bg: '#E8F5E9',  // Light green background
        text: '#2E7D32'  // Dark green text
      };
    case 'overdue':
      return {
        bg: '#FFEBEE',  // Light red background
        text: '#C62828'  // Dark red text
      };
    case 'cancelled':
      return {
        bg: '#FFEBEE',  // Light red background
        text: '#C62828'  // Dark red text
      };
    case 'job completed':
      return {
        bg: '#E8F5E9',  // Light green background
        text: '#2E7D32'  // Dark green text
      };
    default:
      return {
        bg: '#F5F5F5',  // Light gray background
        text: '#616161'  // Dark gray text
      };
  }
};

export const getPriorityColor = (priority: string): ColorScheme => {
  switch (priority) {
    case 'High':
      return { bg: '#FFF1F0', text: '#FF4D4F' };
    case 'Medium':
      return { bg: '#FFF7E6', text: '#FFA940' };
    case 'Low':
      return { bg: '#E6F7FF', text: '#009DC4' };
    default:
      return { bg: '#E6F7FF', text: '#009DC4' };
  }
}; 