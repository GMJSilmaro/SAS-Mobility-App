import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ThemedText';
import { Job } from '@/src/types/job';
import { router } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { getStatusColor } from '../utils/jobUtils';

export function JobCard({ job }: { job: Job }) {
  const { user } = useAuth();
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({
        pathname: `/job/[id]`,
        params: { id: job.jobID }
      })}
    >
      <View style={styles.header}>
        <View style={styles.jobInfo}>
          <MaterialCommunityIcons 
            name="file-document-outline" 
            size={20} 
            color="#009DC4" 
          />
          <ThemedText style={styles.jobNo}>{job.jobNo}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.jobStatus).bg }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(job.jobStatus).text }]}>
              {job.jobStatus}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.time}>
          {job.startTime} - {job.endTime}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="domain" size={16} color="#666" />
          <ThemedText style={styles.infoText} numberOfLines={1}>
            {job.customerName}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
          <ThemedText style={styles.infoText} numberOfLines={2}>
            {job.location.fullAddress}
          </ThemedText>
        </View>

        {job.equipments?.[0] && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tools" size={16} color="#666" />
            <ThemedText style={styles.infoText} numberOfLines={1}>
              {job.equipments[0].itemName}
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobNo: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
}); 