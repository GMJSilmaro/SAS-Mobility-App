import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { JobStatus } from '@/src/types/job';
import { getStatusColor } from '@/src/utils/statusColors';

interface StatusBadgeProps {
  status: JobStatus;
  style?: object;
  textStyle?: object;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  style,
  textStyle 
}) => {
  const statusColor = getStatusColor(status);

  return (
    <View style={[
      styles.badge,
      { backgroundColor: statusColor.bg },
      style
    ]}>
      <ThemedText style={[
        styles.text,
        { color: statusColor.text },
        textStyle
      ]}>
        {status}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 