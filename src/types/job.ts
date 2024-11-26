import { ReactNode } from 'react';

export enum JobStatus {
  InProgress = "In Progress",
  Pending = "Pending",
  Completed = "Completed",
  Created = "Created",
  Cancelled = "Cancelled",
  Scheduled = "Scheduled"
}

export type JobPriority = 'Low' | 'Medium' | 'High';

export interface AssignedWorker {
  workerId: string;
  workerName: string;
  workerStatus: 'Pending' | 'In Progress' | 'Completed';
  timeStarted?: string;
  timeEnded: string | null;
  role?: string;
  isOnline: boolean;
}

export interface Contact {
  contactFullname: string;
  contactID: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  mobilePhone: string;
  phoneNumber: string;
}

export interface Equipment {
  [x: string]: string;
  brand: string;
  equipmentLocation: string;
  equipmentType: string;
  itemCode: string;
  itemGroup: string;
  itemName: string;
  modelSeries: string;
  notes: string;
  serialNo: string;
  warrantyEndDate: string;
  warrantyStartDate: string;
}

export interface Location {
  city: ReactNode;
  stateProvince: ReactNode;
  postalCode: ReactNode;
  country: ReactNode;
  fullAddress: string;
  address: {
    block: string;
    buildingNo: string;
    city: string;
    country: string;
    postalCode: string;
    stateProvince: string;
    streetAddress: string;
    streetNo: string;
  };
  addressType: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  displayAddress: string;
  locationName: string;
  siteId: string;
}

export interface Task {
  assignedTo: string;
  completionDate: string;
  isDone: boolean;
  isPriority: boolean;
  taskDescription: string;
  taskID: string;
  taskName: string;
}

export interface Timestamp {
  toDate(): unknown;
  nanoseconds: number;
  seconds: number;
}

export interface CreatedBy {
  fullName: string;
  timestamp: Timestamp;
  workerId: string;
}

export interface JobContact {
  code: number;
  name: string;
}

export interface FollowUpWorker {
  workerId: string;
  workerName: string;
}

export interface FollowUpCreatedBy {
  email: string;
  workerId: string;
}

export interface FollowUp {
  assignedCSOId: string | null;
  assignedCSOName: string | null;
  assignedWorkers: FollowUpWorker[];
  createdAt: string;
  createdBy: FollowUpCreatedBy;
  customerID: string;
  customerName: string;
  dueDate: string;
  id: string;
  jobID: string;
  jobName: string;
  notes: string;
  priority: number;
  status: string;
  type: string;
  updatedAt: string;
  updatedBy: FollowUpCreatedBy;
}

export interface Job {
  assignedWorkers: {
    timeEnded: null;
    isOnline: boolean;
    timeStarted?: string;
    workerId: string;
    workerName: string;
    workerStatus: string;
  }[];
  contact: Contact;
  notification: {
    notifyCustomer: boolean;
  };
  createdAt: {
    nanoseconds: number;
    seconds: number;
  };
  createdBy: {
    fullName: string;
    timestamp: {
      nanoseconds: number;
      seconds: number;
    };
    workerId: string;
  };
  customerID: string;
  customerName: string;
  customerSignature: {
    signatureTimestamp: string | null;
    signatureURL: string;
    signedBy: string;
  };
  endDate: string;
  endTime: string;
  equipments: {
    brand: string;
    equipmentLocation: string;
    equipmentType: string;
    itemCode: string;
    itemGroup: string;
    itemName: string;
    modelSeries: string;
    notes: string;
    serialNo: string;
    warrantyEndDate: string;
    warrantyStartDate: string;
  }[];
  estimatedDurationHours: number;
  estimatedDurationMinutes: number;
  followUpCount: number;
  jobContactType: JobContact;
  jobDescription: string;
  jobID: string;
  jobName: string;
  jobNo: string;
  jobStatus: string;
  lastFollowUp: Timestamp;
  lastModifiedAt: Timestamp;
  lastUpdated: Timestamp;
  location: {
    address: {
      block: string;
      buildingNo: string;
      city: string;
      country: string;
      postalCode: string;
      stateProvince: string;
      streetAddress: string;
      streetNo: string;
    };
    coordinates: {
      latitude: number;
      longitude: number;
    };
    locationName: string;
  };
  priority: string;
  salesOrderID: string;
  scheduleSession: string;
  serviceCallID: string;
  startDate: string;
  startTime: string;
  taskList: {
    assignedTo: string;
    completionDate: string;
    isDone: boolean;
    isPriority: boolean;
    taskDescription: string;
    taskID: string;
    taskName: string;
  }[];
  updatedAt: Timestamp;
  followUps?: {
    [key: string]: FollowUp;
  };
} 