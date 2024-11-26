import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Equipment } from '@/src/types/job';

interface EquipmentItemProps {
  equipment: Equipment;
  showStatus?: boolean;
}

export const EquipmentItem = ({ equipment, showStatus = false }: EquipmentItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(animation, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.equipmentItem}>
      <TouchableOpacity onPress={toggleExpand} style={styles.equipmentHeader}>
        <View style={styles.equipmentHeaderLeft}>
          <MaterialCommunityIcons name="cog" size={16} color="#666" />
          <ThemedText style={styles.equipmentName}>{equipment.itemName}</ThemedText>
        </View>
        <MaterialCommunityIcons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      <Animated.View style={{
        opacity: animation,
        maxHeight: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 200],
        }),
      }}>
        {isExpanded && (
          <View style={styles.equipmentContent}>
            <View style={styles.equipmentDetail}>
              <ThemedText style={styles.equipmentLabel}>Model:</ThemedText>
              <ThemedText style={styles.equipmentValue}>{equipment.modelSeries || 'N/A'}</ThemedText>
            </View>
            <View style={styles.equipmentDetail}>
              <ThemedText style={styles.equipmentLabel}>Serial No:</ThemedText>
              <ThemedText style={styles.equipmentValue}>{equipment.serialNo || 'N/A'}</ThemedText>
            </View>
            {showStatus && equipment.status && (
              <View style={styles.equipmentDetail}>
                <ThemedText style={styles.equipmentLabel}>Status:</ThemedText>
                <ThemedText style={[
                  styles.equipmentValue,
                  { color: String(equipment.status) === 'defective' ? '#F44336' : 
                          String(equipment.status) === 'used' ? '#4CAF50' : '#666' }
                ]}>
                  {String(equipment.status).charAt(0).toUpperCase() + String(equipment.status).slice(1)}
                </ThemedText>
              </View>
            )}
            {equipment.notes && (
              <View style={styles.equipmentNotes}>
                <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
                <ThemedText style={styles.notes}>{equipment.notes}</ThemedText>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  equipmentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  equipmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  equipmentContent: {
    padding: 16,
    paddingTop: 0,
  },
  equipmentDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  equipmentLabel: {
    width: 80,
    fontSize: 12,
    color: '#666',
  },
  equipmentValue: {
    flex: 1,
    fontSize: 12,
    color: '#2C3E50',
  },
  equipmentNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#2C3E50',
    lineHeight: 18,
  },
}); 