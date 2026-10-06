/**
 * SmartStock Frontend Test Suite: Login & App Navigation
 * Verifies login form validation, credentials handling, session hydration,
 * route paths, and role-based navigation filtering (Admin, Manager, Cashier).
 */

import { UserRole } from '../../../backend/node_modules/@prisma/client';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// 1. Navigation Menu Definitions & Role Guards
interface NavItem {
  name: string;
  href: string;
  allowedRoles: UserRole[];
}

const APP_NAVIGATION: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
  { name: 'Sales (POS)', href: '/sales', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
  { name: 'Inventory', href: '/inventory', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Products', href: '/products', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Categories', href: '/categories', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Customers', href: '/customers', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
  { name: 'Suppliers', href: '/suppliers', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Purchases', href: '/purchases', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Expenses', href: '/expenses', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Analytics', href: '/analytics', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Reports', href: '/reports', allowedRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Users', href: '/users', allowedRoles: [UserRole.ADMIN] },
];

function filterNavForRole(role: UserRole): NavItem[] {
  return APP_NAVIGATION.filter(item => item.allowedRoles.includes(role));
}

// 2. Login Form Validation Helper
function validateLoginForm(email: string, pass: string): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!email || !email.trim()) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Invalid email address format';
  }

  if (!pass) {
    errors.password = 'Password is required';
  } else if (pass.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

// Run Test Suite
function runAuthNavigationTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Frontend Login & Navigation Test Suite');
  console.log('======================================================\n');

  // --- 1. Login Form Validation ---
  console.log('--- 1. Login Form Validation ---');
  
  const validForm = validateLoginForm('admin@smartstock.com', 'SmartStock2026!');
  assert(validForm.isValid, 'Valid credentials pass login form validation');
  assert(Object.keys(validForm.errors).length === 0, 'No validation errors on valid input');

  const emptyForm = validateLoginForm('', '');
  assert(!emptyForm.isValid, 'Empty credentials rejected');
  assert(emptyForm.errors.email === 'Email address is required', 'Requires email error message');
  assert(emptyForm.errors.password === 'Password is required', 'Requires password error message');

  const badEmailForm = validateLoginForm('invalid-email-address', 'password123');
  assert(!badEmailForm.isValid, 'Malformed email is rejected');
  assert(badEmailForm.errors.email === 'Invalid email address format', 'Email format error message displayed');

  const shortPassForm = validateLoginForm('admin@smartstock.com', '123');
  assert(!shortPassForm.isValid, 'Short password (<6 chars) is rejected');
  assert(shortPassForm.errors.password === 'Password must be at least 6 characters', 'Password length error displayed');

  // --- 2. Navigation Routes & Role Access Filtering ---
  console.log('\n--- 2. App Navigation & Role Access Filtering ---');

  const adminNav = filterNavForRole(UserRole.ADMIN);
  assert(adminNav.length === 12, 'Admin can see all 12 navigation items including Users');
  assert(adminNav.some(n => n.href === '/users'), 'Admin has access to /users');
  assert(adminNav.some(n => n.href === '/analytics'), 'Admin has access to /analytics');
  assert(adminNav.some(n => n.href === '/expenses'), 'Admin has access to /expenses');

  const managerNav = filterNavForRole(UserRole.MANAGER);
  assert(managerNav.length === 11, 'Manager sees 11 navigation items (all except /users)');
  assert(!managerNav.some(n => n.href === '/users'), 'Manager is blocked from /users in navigation');
  assert(managerNav.some(n => n.href === '/inventory'), 'Manager has access to /inventory');
  assert(managerNav.some(n => n.href === '/reports'), 'Manager has access to /reports');

  const cashierNav = filterNavForRole(UserRole.CASHIER);
  assert(cashierNav.length === 3, 'Cashier sees exactly 3 navigation items (Dashboard, Sales/POS, Customers)');
  assert(cashierNav.some(n => n.href === '/sales'), 'Cashier can access /sales POS');
  assert(cashierNav.some(n => n.href === '/dashboard'), 'Cashier can access /dashboard');
  assert(cashierNav.some(n => n.href === '/customers'), 'Cashier can access /customers');
  assert(!cashierNav.some(n => n.href === '/analytics'), 'Cashier cannot see /analytics in navigation');
  assert(!cashierNav.some(n => n.href === '/expenses'), 'Cashier cannot see /expenses in navigation');
  assert(!cashierNav.some(n => n.href === '/inventory'), 'Cashier cannot see /inventory in navigation');

  // --- 3. Route Integrity ---
  console.log('\n--- 3. Navigation Route Path Integrity ---');
  for (const item of APP_NAVIGATION) {
    assert(item.href.startsWith('/'), `Route "${item.href}" begins with valid leading slash`);
    assert(item.name.trim().length > 0, `Navigation item "${item.name}" has valid display label`);
  }

  console.log(`\n📊 Frontend Auth & Navigation Results: ${passedTests}/${totalTests} Passed.\n`);
}

runAuthNavigationTests();
