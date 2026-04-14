#!/usr/bin/env node

/**
 * Initialize sample employees in Firestore
 * Run with: node scripts/init-employees.js
 * Make sure you have Firebase credentials set up
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// Make sure your service account key is available
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
  path.join(__dirname, '../firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
} catch (error) {
  console.log('Note: Firebase Admin SDK not initialized. This script requires service account credentials.');
  console.log('To use this script:');
  console.log('1. Download your Firebase service account key from Firebase Console');
  console.log('2. Save it as firebase-service-account.json in the project root');
  console.log('3. Or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
  process.exit(0);
}

const db = admin.firestore();

async function initializeEmployees() {
  console.log('Initializing sample employees...');

  const employees = [
    {
      employeeId: 'EMP001',
      name: 'John Doe',
      email: 'john.doe@accord.com',
      password: 'password123',
      department: 'Engineering',
      designation: 'Senior Developer',
      joiningDate: new Date('2022-01-15'),
      phone: '+1-234-567-8901',
      address: '123 Main St, City, Country',
      status: 'active',
    },
    {
      employeeId: 'EMP002',
      name: 'Jane Smith',
      email: 'jane.smith@accord.com',
      password: 'password123',
      department: 'Human Resources',
      designation: 'HR Manager',
      joiningDate: new Date('2021-06-10'),
      phone: '+1-234-567-8902',
      address: '456 Oak Ave, City, Country',
      status: 'active',
    },
    {
      employeeId: 'EMP003',
      name: 'Michael Johnson',
      email: 'michael.johnson@accord.com',
      password: 'password123',
      department: 'Sales',
      designation: 'Sales Executive',
      joiningDate: new Date('2023-03-20'),
      phone: '+1-234-567-8903',
      address: '789 Pine Rd, City, Country',
      status: 'active',
    },
    {
      employeeId: 'EMP004',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@accord.com',
      password: 'password123',
      department: 'Marketing',
      designation: 'Marketing Specialist',
      joiningDate: new Date('2022-09-05'),
      phone: '+1-234-567-8904',
      address: '321 Elm St, City, Country',
      status: 'active',
    },
    {
      employeeId: 'EMP005',
      name: 'David Brown',
      email: 'david.brown@accord.com',
      password: 'password123',
      department: 'Engineering',
      designation: 'Junior Developer',
      joiningDate: new Date('2023-07-01'),
      phone: '+1-234-567-8905',
      address: '654 Maple Dr, City, Country',
      status: 'active',
    },
  ];

  try {
    const batch = db.batch();

    for (const employee of employees) {
      const docRef = db.collection('employees').doc();
      batch.set(docRef, {
        ...employee,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await batch.commit();
    console.log(`✓ Successfully initialized ${employees.length} employees`);
    console.log('\nSample Employees:');
    employees.forEach((emp) => {
      console.log(`  - ${emp.employeeId}: ${emp.name} (${emp.designation})`);
      console.log(`    Password: ${emp.password}`);
    });
  } catch (error) {
    console.error('Error initializing employees:', error);
  } finally {
    process.exit(0);
  }
}

initializeEmployees();
