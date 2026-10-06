import assert from 'assert';
import { UserRole, User } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { registerSchema } from '../validators/auth.validator';

// In-Memory Mock Repository for User Unit Testing
class MockUserRepository extends UserRepository {
  private users: User[] = [];

  public async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  public async create(data: any): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || UserRole.CASHIER,
      phone: data.phone || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  public async updateStatus(id: string, isActive: boolean): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    user.isActive = isActive;
    return user;
  }

  public async updateRole(id: string, role: UserRole): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    user.role = role;
    return user;
  }

  public getAll(): User[] {
    return this.users;
  }
}

async function runUsersTestSuite() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Users & RBAC Test Suite');
  console.log('🧪 ===============================================\n');

  let passed = 0;
  let total = 0;

  const mockRepo = new MockUserRepository();
  const authService = new AuthService(mockRepo);

  // Test 1: User Registration Schema Validation
  total++;
  try {
    const valid = registerSchema.parse({
      email: 'alex.ops@smartstock.com',
      password: 'SecurePassword123!',
      name: 'Alex Operator',
      role: UserRole.MANAGER,
      phone: '+1-555-4433',
    });
    assert.strictEqual(valid.email, 'alex.ops@smartstock.com');
    assert.strictEqual(valid.role, UserRole.MANAGER);
    console.log('  ✅ PASS: 1. Validation: Valid user registration schema passes');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 1. Validation schema failed:', e.message);
  }

  // Test 2: Reject Weak Password (< 8 chars)
  total++;
  try {
    registerSchema.parse({
      email: 'weak@example.com',
      password: '123',
      name: 'Weak Pass',
      role: UserRole.CASHIER,
    });
    console.error('  ❌ FAIL: 2. Weak password was unexpectedly accepted');
  } catch {
    console.log('  ✅ PASS: 2. Validation: Rejects short password (< 8 chars)');
    passed++;
  }

  // Test 3: Reject Invalid Email Format
  total++;
  try {
    registerSchema.parse({
      email: 'not-an-email',
      password: 'SecurePassword123!',
      name: 'Bad Email',
    });
    console.error('  ❌ FAIL: 3. Invalid email was unexpectedly accepted');
  } catch {
    console.log('  ✅ PASS: 3. Validation: Rejects invalid email format');
    passed++;
  }

  // Test 4: Create User with ADMIN Role
  total++;
  try {
    const result = await authService.register({
      email: 'superadmin@smartstock.com',
      password: 'AdminPassword2026!',
      name: 'Super Administrator',
      role: UserRole.ADMIN,
      phone: '+1-555-9999',
    });
    assert.ok(result.token);
    assert.strictEqual(result.user.role, UserRole.ADMIN);
    assert.strictEqual((result.user as any).passwordHash, undefined, 'passwordHash must be stripped');
    console.log('  ✅ PASS: 4. Service: Successfully registers ADMIN user with stripped hash');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 4. Registration failed:', e.message);
  }

  // Test 5: Create User with CASHIER Role Default
  total++;
  try {
    const result = await authService.register({
      email: 'cashier.test@smartstock.com',
      password: 'CashierPassword2026!',
      name: 'Test Cashier',
      role: UserRole.CASHIER,
    });
    assert.strictEqual(result.user.role, UserRole.CASHIER);
    console.log('  ✅ PASS: 5. Service: Successfully registers CASHIER user');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 5. Cashier registration failed:', e.message);
  }

  // Test 6: Duplicate Email Conflict (409)
  total++;
  try {
    await authService.register({
      email: 'superadmin@smartstock.com',
      password: 'AnotherPassword!',
      name: 'Imposter Admin',
      role: UserRole.ADMIN,
    });
    console.error('  ❌ FAIL: 6. Duplicate email was unexpectedly allowed');
  } catch (e: any) {
    assert.strictEqual(e.statusCode, 409);
    console.log('  ✅ PASS: 6. Conflict: Strictly rejects duplicate user email with 409 Conflict');
    passed++;
  }

  // Test 7: Retrieve Current User Profile
  total++;
  try {
    const users = mockRepo.getAll();
    const adminUser = users[0];
    const profile = await authService.getCurrentUser(adminUser.id);
    assert.strictEqual(profile.email, 'superadmin@smartstock.com');
    assert.strictEqual(profile.name, 'Super Administrator');
    assert.strictEqual((profile as any).passwordHash, undefined);
    console.log('  ✅ PASS: 7. Profile: Retrieves authenticated user profile without exposing credentials');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 7. Profile retrieval failed:', e.message);
  }

  // Test 8: Deactivated User Login Blocked (403)
  total++;
  try {
    const users = mockRepo.getAll();
    const cashierUser = users[1];
    await mockRepo.updateStatus(cashierUser.id, false);

    await authService.login({
      email: 'cashier.test@smartstock.com',
      password: 'CashierPassword2026!',
    });
    console.error('  ❌ FAIL: 8. Deactivated user was unexpectedly allowed to login');
  } catch (e: any) {
    assert.strictEqual(e.statusCode, 403);
    console.log('  ✅ PASS: 8. Security: Deactivated user is blocked with 403 Forbidden');
    passed++;
  }

  // Test 9: Reactivate User Allows Login
  total++;
  try {
    const users = mockRepo.getAll();
    const cashierUser = users[1];
    await mockRepo.updateStatus(cashierUser.id, true);

    const loginRes = await authService.login({
      email: 'cashier.test@smartstock.com',
      password: 'CashierPassword2026!',
    });
    assert.ok(loginRes.token);
    console.log('  ✅ PASS: 9. Lifecycle: Reactivated user can login successfully');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 9. Reactivated login failed:', e.message);
  }

  // Test 10: Role Update
  total++;
  try {
    const users = mockRepo.getAll();
    const cashierUser = users[1];
    await mockRepo.updateRole(cashierUser.id, UserRole.MANAGER);
    const updated = await mockRepo.findById(cashierUser.id);
    assert.strictEqual(updated?.role, UserRole.MANAGER);
    console.log('  ✅ PASS: 10. RBAC: Successfully updates user role from CASHIER to MANAGER');
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAIL: 10. Role update failed:', e.message);
  }

  console.log(`\n📊 Users Test Suite Results: ${passed}/${total} Passed.\n`);
  if (passed !== total) process.exit(1);
}

runUsersTestSuite().catch((err) => {
  console.error('Test Suite crashed:', err);
  process.exit(1);
});
