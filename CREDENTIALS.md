# ACCORD EMS - Default Credentials

## Super Admin Account (Default)

This is the default Super Admin account that comes pre-configured with the system.

```
Role:     Super Admin
Username: ACCORD123
Password: AccordPandu
```

### Access Level:
- Full system access
- Manage other admins
- Manage system users and employees
- Access all system settings
- View all reports and analytics

### How to Login:
1. Go to the login page (`/login`)
2. Click on the "Super Admin" tab
3. Enter Username: `ACCORD123`
4. Enter Password: `AccordPandu`
5. Click "Sign In"

---

## Employee Accounts

Employees can log in using their **Employee ID** and **Password**.

### Sample Employee Credentials (after initialization):

```
Employee ID: EMP001
Password:    password123
```

```
Employee ID: EMP002
Password:    password123
```

### How Employee Login Works:
1. Go to the login page (`/login`)
2. Click on the "Employee" tab
3. Enter your **Employee ID** (e.g., EMP001)
4. Enter your **Password**
5. Click "Sign In"

### To Add More Employees:
1. Log in as Super Admin
2. Navigate to **Manage Users** → **Add Employee**
3. Fill in employee details
4. Set an Employee ID (e.g., EMP003)
5. Set a secure password
6. Click "Create Employee"

---

## Admin Accounts (Firebase-based)

Admin accounts are managed through Firebase Authentication and can be created from the Super Admin dashboard.

### How to Create an Admin Account:
1. Log in as **Super Admin** (ACCORD123 / AccordPandu)
2. Navigate to **Manage Admins**
3. Click **Create New Admin**
4. Enter email and password
5. Click **Add Admin**

### How Admin Login Works:
1. Go to the login page (`/login`)
2. Click on the "Super Admin" or "Employee" tab (depending on your account type)
3. If you're an Admin, use Firebase email/password
4. Enter your email and password
5. Click "Sign In"

---

## Key Differences Between Login Types

| Feature | Super Admin | Admin | Employee |
|---------|-----------|-------|----------|
| Login Method | Username/Password | Firebase Email/Password | Employee ID/Password |
| Can manage users | ✓ | ✗ | ✗ |
| Can manage admins | ✓ | ✗ | ✗ |
| Can manage employees | ✓ | ✓ | ✗ |
| Can view all reports | ✓ | ✓ | ✓ (own only) |
| Can approve leaves | ✓ | ✓ | ✗ |
| Can modify system settings | ✓ | ✗ | ✗ |

---

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. **Change Super Admin Password**: The default Super Admin password should be changed after initial setup
   - Only available through database modification
   - Store new credentials securely

2. **Employee Passwords**: Should be set securely during employee onboarding
   - Each employee gets a unique password
   - Employees can reset via "Forgot Password" if implemented

3. **Admin Accounts**: Use strong passwords for all admin accounts
   - Firebase handles authentication
   - Enable two-factor authentication in Firebase Console

4. **Session Management**:
   - Super Admin sessions expire after 8 hours
   - Employee sessions expire after 8 hours
   - All sessions are stored in browser sessionStorage
   - Clearing cookies/cache will log you out

---

## Forgot Password

- **Super Admin**: Contact system administrator to reset (requires database modification)
- **Employee**: Not implemented yet (manual reset via admin dashboard)
- **Admin**: Use Firebase "Forgot Password" link on login page

---

## Testing Credentials

When setting up test employees, you can use:

```
Test Employee 1:
  ID: EMP001
  Password: password123
  Name: John Doe
  Department: Engineering

Test Employee 2:
  ID: EMP002
  Password: password123
  Name: Jane Smith
  Department: HR
```

---

## Need Help?

Refer to `SETUP_GUIDE.md` for complete setup and configuration instructions.
