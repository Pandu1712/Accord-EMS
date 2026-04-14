# ACCORD EMS - Setup Guide

Welcome to the ACCORD Employee Management System! This guide will help you set up and configure the system.

## Quick Start

### 1. Default Super Admin Account

A default Super Admin account is already configured:
- **Username**: `ACCORD123`
- **Password**: `AccordPandu`

Use these credentials to log in to the system as a Super Admin from the login page.

### 2. Employee Login

Employees can log in using:
- **Employee ID**: Their assigned Employee ID (e.g., EMP001)
- **Password**: Their assigned password

### 3. Adding Employees

To add sample employees to the system:

1. **Via Firestore Console** (Easiest):
   - Go to your Firebase Console
   - Navigate to Firestore Database
   - Create a new collection called `employees`
   - Add documents with the following structure:
     ```json
     {
       "employeeId": "EMP001",
       "name": "John Doe",
       "email": "john.doe@company.com",
       "password": "password123",
       "department": "Engineering",
       "designation": "Senior Developer",
       "joiningDate": "2024-01-15",
       "phone": "+1-234-567-8901",
       "address": "123 Main St, City",
       "status": "active"
     }
     ```

2. **Via Node Script** (If you have Firebase Admin SDK):
   - Download your Firebase service account key from Firebase Console
   - Save it as `firebase-service-account.json` in the project root
   - Run: `node scripts/init-employees.js`

## User Roles & Permissions

### Super Admin
- Full system access
- Manage other admins
- Manage system users
- Access system settings
- View all reports

**Login**: Username/Password (ACCORD123 / AccordPandu)

### Admin
- Manage employees
- View and approve attendance
- Handle leave approvals
- Manage holidays
- Generate reports
- View analytics

**Login**: Firebase Email/Password (set up in Firebase Console)

### Employee
- View personal attendance
- Submit leave requests
- View leave status
- Update own profile
- View personal analytics

**Login**: Employee ID/Password

## Database Collections

The system uses the following Firestore collections:

### 1. `users`
- Super Admin and Admin accounts
- Structure:
  ```
  {
    email: string,
    displayName: string,
    role: "super-admin" | "admin" | "employee",
    createdAt: timestamp,
    updatedAt: timestamp
  }
  ```

### 2. `employees`
- Employee information
- Structure:
  ```
  {
    employeeId: string,
    name: string,
    email: string,
    password: string,
    department: string,
    designation: string,
    joiningDate: date,
    phone: string,
    address: string,
    status: "active" | "inactive",
    createdAt: timestamp,
    updatedAt: timestamp
  }
  ```

### 3. `attendance`
- Daily attendance records
- Structure:
  ```
  {
    employeeId: string,
    date: date,
    checkInTime: timestamp,
    checkOutTime: timestamp,
    workingHours: number,
    breaks: {
      startTime: timestamp,
      endTime: timestamp
    }[],
    status: "present" | "absent" | "leave" | "half-day",
    notes: string
  }
  ```

### 4. `leaves`
- Leave requests and records
- Structure:
  ```
  {
    employeeId: string,
    startDate: date,
    endDate: date,
    leaveType: "casual" | "sick" | "annual" | "maternity" | "paternity",
    reason: string,
    status: "pending" | "approved" | "rejected",
    approvedBy: string,
    createdAt: timestamp
  }
  ```

### 5. `holidays`
- Company holidays
- Structure:
  ```
  {
    name: string,
    date: date,
    description: string,
    createdAt: timestamp
  }
  ```

### 6. `leaveTypes`
- Leave type configurations
- Structure:
  ```
  {
    name: string,
    annualLimit: number,
    createdAt: timestamp
  }
  ```

## Firestore Security Rules (Optional)

For production, implement these security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public routes
    match /public/{document=**} {
      allow read, write;
    }

    // User data
    match /users/{userId} {
      allow read, update: if request.auth.uid == userId;
      allow read: if request.auth.token.role == "super-admin";
    }

    // Employee data
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == "admin" || 
                      request.auth.token.role == "super-admin";
    }

    // Attendance records
    match /attendance/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == "admin" || 
                      request.auth.token.role == "super-admin" ||
                      (request.auth.token.role == "employee" && 
                       request.resource.data.employeeId == request.auth.uid);
    }

    // Leave requests
    match /leaves/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.role == "employee";
      allow update, delete: if request.auth.token.role == "admin" || 
                                request.auth.token.role == "super-admin";
    }

    // Holidays
    match /holidays/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == "admin" || 
                      request.auth.token.role == "super-admin";
    }
  }
}
```

## Features Overview

### Dashboard
- Role-based dashboard with KPIs
- Quick statistics and insights
- Navigation to all features

### Attendance Management
- Daily check-in/check-out
- Break tracking
- Working hours calculation
- Attendance history and analytics

### Leave Management
- Leave request submission
- Leave approval workflow
- Leave balance tracking
- Multiple leave types support

### Holiday Management
- Create and manage company holidays
- Holiday calendar view
- Automatic leave calculation for holidays

### Employee Management (Admin Only)
- Add/edit/delete employees
- Department and designation management
- Employee profile management
- Employee list with search and filters

### Analytics & Reports
- Attendance analytics with charts
- Department-wise statistics
- Leave statistics
- Monthly/quarterly reports
- PDF/Excel export capabilities

### Admin Management (Super Admin Only)
- Create and manage admin accounts
- User role management
- System-wide settings
- Audit logs and monitoring

## Environment Variables

The following environment variables are required:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

These are already configured in your project settings.

## Testing the System

### Test Super Admin Login
1. Go to login page
2. Select "Super Admin" tab
3. Username: `ACCORD123`
4. Password: `AccordPandu`
5. Click "Sign In"

### Test Employee Login
1. First, add an employee to Firestore
2. Go to login page
3. Select "Employee" tab
4. Employee ID: `EMP001` (or your employee's ID)
5. Password: (the password set for the employee)
6. Click "Sign In"

### Test Admin Login
1. Create an admin account via Super Admin dashboard
2. Use Firebase email/password authentication
3. Log in with admin email and password

## Troubleshooting

### "Invalid username or password" (Super Admin)
- Ensure you're using exactly: `ACCORD123` (username) and `AccordPandu` (password)
- Username is case-sensitive
- Check for extra spaces

### "Employee ID not found"
- Verify the employee exists in Firestore `employees` collection
- Check that the `employeeId` field matches exactly (case-sensitive)
- Make sure you're on the "Employee" login tab

### "Firebase Connection Error"
- Verify all environment variables are set correctly
- Check Firebase project ID matches your console
- Ensure Firebase Firestore is enabled in your project

### "Permission Denied" errors
- Check Firestore Security Rules are properly configured
- Verify user role is set correctly in the database
- Try clearing browser cache and session storage

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Console for error messages
3. Check browser console for detailed error logs
4. Verify all environment variables are correctly set

---

**Happy using ACCORD EMS!**
