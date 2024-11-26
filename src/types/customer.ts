import { Job } from "./job";

export interface CustomerAddress {
  block: string;
  buildingNo: string;
  city: string;
  country: string;
  postalCode: string;
  stateProvince: string;
  streetAddress: string;
  streetNo: string;
  addressType: string;
}

export interface CustomerLocation {
  address: CustomerAddress;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  displayAddress: string;
  fullAddress: string;
  locationName: string;
  siteId: string;
}

export interface CustomerContact {
  contactFullname: string;
  contactID: string;
  email: string;
  phoneNumber: string;
  mobileNumber: string;
  fullname: string;
  firstName: string;
  lastName: string;
  middleName: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: CustomerContact;
  location: CustomerLocation;
  jobCount: number;
  latestJobDate?: string;
  jobs?: Job[];
} 