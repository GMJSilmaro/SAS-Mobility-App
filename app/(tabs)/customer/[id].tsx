import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { Customer } from '@/src/types/customer';
import { getCustomerById } from '@/src/services/customerService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (id) {
        const data = await getCustomerById(id);
        console.log('Fetched customer data:', JSON.stringify(data, null, 2));
        setCustomer(data);
      }
    };
    fetchCustomer();
  }, [id]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => router.back()}
        title={customer?.name}
      />
      
      <ScrollView style={styles.content}>
        {/* Company Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="domain" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Company Information</ThemedText>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Customer ID:</ThemedText>
              <ThemedText style={styles.value}>{customer?.id}</ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Total Jobs:</ThemedText>
              <ThemedText style={styles.value}>{customer?.jobCount}</ThemedText>
            </View>
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Name:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.contact?.contactFullname || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Phone:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.contact?.phoneNumber || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Mobile:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.contact?.mobileNumber || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Email:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.contact?.email || 'N/A'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Location Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Location Details</ThemedText>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Location Name:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.location?.locationName || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Address:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.location?.address?.streetAddress || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Postal Code:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.location?.address?.postalCode || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Country:</ThemedText>
              <ThemedText style={styles.value}>
                {customer?.location?.address?.country || 'N/A'}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#009DC4',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 2,
    textAlign: 'right',
  },
});
