import { Timestamp } from 'firebase/firestore';

interface Certificate {
  certificateId: string;
  dateAdded: Timestamp;
  expiryDate: string;
  id: string;
  issueDate: string;
  issuer: string;
  name: string;
}

export interface User {
  activePhone1: boolean;
  activePhone2: boolean;
  activeUser: boolean;
  certificates: Certificate[];
  dateOfBirth: string;
  documents: any[];
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyRelationship: string;
  expirationDate: string;
  firstName: string;
  fullName: string;
  gender: string;
  isActive: boolean;
  isAdmin: boolean;
  isFieldWorker: boolean;
  isOnline: boolean;
  lastLogin: Timestamp;
  lastName: string;
  lastUpdated: Timestamp;
  middleName: string;
  password: string;
  primaryCode: string;
  primaryPhone: string;
  profilePicture: string;
  role: string;
  secondaryCode: string;
  secondaryPhone: string;
  shortBio: string;
  skills: string[];
  stateProvince: string;
  streetAddress: string;
  timestamp: Timestamp;
  uid: string;
  workerId: string;
  zipCode: string;
} 