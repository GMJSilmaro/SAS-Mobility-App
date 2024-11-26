import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, TextInput, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Customer } from '../../src/types/customer';
import { getCustomers } from '../../src/services/customerService';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { GuideButton } from '@/src/components/common/GuideButton';

const SearchBar = ({ onSearch }: { onSearch: (text: string) => void }) => (
  <View style={styles.searchContainer}>
    <MaterialCommunityIcons name="magnify" size={20} color="#666" />
    <TextInput
      style={styles.searchInput}
      placeholder="Search customers..."
      onChangeText={onSearch}
      placeholderTextColor="#666"
    />
  </View>
);

const renderCustomerCard = (customer: Customer) => (
  <TouchableOpacity
    key={customer.id}
    style={[styles.jobCard, { borderLeftColor: '#009DC4' }]}
    onPress={() => router.push({
      pathname: `/customer/[id]` as const,
      params: { id: customer.id }
    })}
  >
    <View style={styles.jobHeader}>
      <View style={styles.jobHeaderLeft}>
        <MaterialCommunityIcons name="domain" size={18} color="#009DC4" />
        <ThemedText style={styles.jobTitle}>{customer.name}</ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: '#E3F2FD' }]}>
        <ThemedText style={[styles.statusText, { color: '#009DC4' }]}>
          Jobs: {customer.jobCount}
        </ThemedText>
      </View>
    </View>

    <View style={styles.jobDetails}>
      {/* Contact Information Section */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="account-group" size={16} color="#009DC4" />
        <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="account" size={16} color="#666" />
        <ThemedText style={styles.detailText}>
          {customer.contact?.contactFullname || "N/A"}
        </ThemedText>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="phone" size={16} color="#666" />
        <ThemedText style={styles.detailText}>
          {customer.contact?.phoneNumber || customer.contact?.mobileNumber || "N/A"}
        </ThemedText>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="email" size={16} color="#666" />
        <ThemedText style={styles.detailText}>
          {customer.contact?.email || "N/A"}
        </ThemedText>
      </View>

      {/* Location Section */}
      <View style={[styles.sectionHeader, { marginTop: 12 }]}>
        <MaterialCommunityIcons name="map-marker" size={16} color="#009DC4" />
        <ThemedText style={styles.sectionTitle}>Location Details</ThemedText>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="office-building" size={16} color="#666" />
        <ThemedText style={styles.detailText}>
          {customer.location?.locationName || customer.location?.address?.streetAddress || "N/A"}
        </ThemedText>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="map" size={16} color="#666" />
        <ThemedText style={styles.detailText}>
          {customer.location?.locationName || customer.location?.address?.streetAddress || "N/A"}
        </ThemedText>
      </View>
    </View>
  </TouchableOpacity>
);

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = async () => {
    console.log('Starting to fetch customers...');
    try {
      const data = await getCustomers();
      console.log('Raw customers data:', data);
      if (Array.isArray(data)) {
        setCustomers(data);
        console.log('Customers set to state:', data.length, 'customers');
      } else {
        console.error('Data is not an array:', data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('Loading set to false');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    console.log('Filtering customer:', customer.name);
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.contact?.contactFullname?.toLowerCase().includes(searchLower) ||
      customer.location?.displayAddress?.toLowerCase().includes(searchLower)
    );
  });

  console.log('Filtered customers count:', filteredCustomers.length);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#009DC4" />
      </View>
    );
  }

  console.log('Rendering customer list');
  return (
    <View style={styles.container}>
      <ScreenHeader 
        leftComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image 
              source={require('@/assets/images/SAS-LOGO.png')}
              style={styles.headerLogo}
            />
            <ThemedText style={styles.headerTitle}>
              Customers
            </ThemedText>
          </View>
        }
        rightComponent={
          <GuideButton
            title="Help"
            steps={[
              {
                target: 'search-bar',
                title: 'Search Customers',
                description: 'Search for customers by name, contact person, or address'
              },
              {
                target: 'customer-card',
                title: 'Customer Details',
                description: 'View customer information including contact details and job count'
              },
              {
                target: 'customer-jobs',
                title: 'Customer Jobs',
                description: 'See how many jobs are associated with this customer'
              }
            ]}
          />
        }
      />
      <View style={styles.tabContent}>
        <SearchBar onSearch={setSearchQuery} />
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#009DC4']}
            />
          }
        >
          {filteredCustomers.map(customer => {
            console.log('Rendering customer card:', customer.name);
            return renderCustomerCard(customer);
          })}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'white',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabContent: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    contentContainer: {
      flexGrow: 1,
      padding: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#2C3E50',
    },
    headerLogo: {
      width: 100,
      height: 50,
      resizeMode: 'stretch'
     
    },
    bottomSpacing: {
      height: 80,
    },
  
    tabBar: {
      backgroundColor: 'white',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    indicator: {
      backgroundColor: '#009DC4',
      height: 3,
    },
    tabLabel: {
      fontWeight: '600',
      textTransform: 'none',
    },
    jobCard: {
      backgroundColor: '#fff',
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderLeftWidth: 3,
      borderRadius: 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    jobHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    jobHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    jobTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: '#2C3E50',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '500',
    },
    jobDetails: {
      gap: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontSize: 13,
      color: '#666',
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: '#000',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: '#009DC4',
    },
  }); 