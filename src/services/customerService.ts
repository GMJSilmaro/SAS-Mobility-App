import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Customer } from '../types/customer';

export const getCustomers = async () => {
  try {
    const jobsRef = collection(db, 'jobs');
    const querySnapshot = await getDocs(jobsRef);
    
    const customersMap = new Map();
    
    querySnapshot.docs.forEach(doc => {
      const job = doc.data();
      const customerId = job.customerID;
      
      if (customerId) {
        // If contact information exists in this job
        if (job.contact?.contactFullname) {
          if (!customersMap.has(customerId)) {
            // Create new customer entry
            customersMap.set(customerId, {
              id: customerId,
              name: job.customerName,
              contact: job.contact,
              location: job.location || {},
              jobCount: 1
            });
          } else {
            // Update existing customer's contact and increment job count
            const customer = customersMap.get(customerId);
            customer.contact = job.contact; // Update with latest contact info
            customer.jobCount += 1;
          }
        } else if (!customersMap.has(customerId)) {
          // Create entry without contact if none exists
          customersMap.set(customerId, {
            id: customerId,
            name: job.customerName,
            contact: {},
            location: job.location || {},
            jobCount: 1
          });
        } else {
          // Just increment job count if customer exists
          customersMap.get(customerId).jobCount += 1;
        }
      }
    });

    const customers = Array.from(customersMap.values());
    console.log('Final processed customers:', customers);
    return customers;
  } catch (error) {
    console.error('Error fetching customers from jobs:', error);
    return [];
  }
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const jobsRef = collection(db, 'jobs');
    const querySnapshot = await getDocs(query(jobsRef, where('customerID', '==', id)));
    
    if (querySnapshot.empty) {
      return null;
    }

    let customerData: any = null;

    querySnapshot.docs.forEach(doc => {
      const job = doc.data();
      console.log('Processing job data:', job); // Debug log
      
      // Initialize customer data if not set
      if (!customerData) {
        customerData = {
          id: job.customerID,
          name: job.customerName,
          contact: job.contact || {}, // Keep the original contact
          location: job.location || {},
          jobCount: 0
        };
      }

      // Update contact if this job has contact information and current is empty
      if (job.contact?.contactFullname && !customerData.contact?.contactFullname) {
        customerData.contact = job.contact;
      }

      customerData.jobCount++;
    });

    console.log('Final customer data:', customerData); // Debug log
    return customerData;
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    return null;
  }
}; 