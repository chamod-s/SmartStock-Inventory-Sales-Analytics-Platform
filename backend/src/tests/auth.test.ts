import { UserRole, User, Prisma } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

interface MockFn {
  (...args: any[]): any;
  calls: any[][];
}

function createMockFn(): MockFn {
  const calls: any[][] = [];
  const fn = (...args: any[]) => {
    calls.push(args);
    return fn;
  };
  fn.calls = calls;
  return fn as MockFn;
}

// Helper to create mock Express objects
const createMockReqRes = (options: { headers?: Record<string, string>; body?: unknown; user?: any } = {}) => {
  const req = {
    headers: options.headers || {},
    body: options.body || {},
    user: options.user,
  } as unknown as Request;

  const res = {
    status: createMockFn(),
    json: createMockFn(),
  } as unknown as Response;

  const next = createMockFn() as unknown as NextFunction & { calls: any[][] };

  return { req, res, next };
};

class MockUserRepository extends UserRepository {
  private users: User[] = [];

  public async findByEmail(email: string): Promise<User | null> {
    const formattedEmail = email.toLowerCase().trim();
    return this.users.find((u) => u.email === formattedEmail) || null;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  public async create(data: Prisma.UserCreateInput): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || UserRole.CASHIER,
      phone: (data.phone as string) || null,
      isActive: true,
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
}

export async function runAuthTests() {
  console.log('🧪 Starting Authentication & Authorization Automated Test Suite...\n');
  let passedTests = 0;
  let totalTests = 0;

  const mockRepo = new MockUserRepository();
  const testAuthService = new AuthService(mockRepo);

  function assert(condition: boolean, testName: string, errorDetails?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASSED: ${testName}`);
    } else {
      console.error(`  ❌ FAILED: ${testName} - ${errorDetails || 'Assertion failed'}`);
    }
  }

  const testEmail = `test.user.${Date.now()}@smartstock.com`;
  const testPassword = 'TestPassword123!';
  let createdUserToken = '';
  let createdUserId = '';

  // Test 1: Valid Registration
  try {
    const regResult = await testAuthService.register({
      email: testEmail,
      password: testPassword,
      name: 'Auth Test User',
      role: UserRole.CASHIER,
    });
    createdUserToken = regResult.token;
    createdUserId = regResult.user.id;

    assert(
      !!regResult.token &&
        regResult.user.email === testEmail.toLowerCase() &&
        !('passwordHash' in regResult.user),
      '1. Valid Registration (token issued, passwordHash omitted)'
    );
  } catch (err: any) {
    assert(false, '1. Valid Registration', err.message);
  }

  // Test 2: Duplicate Email Rejection
  try {
    await testAuthService.register({
      email: testEmail,
      password: testPassword,
      name: 'Duplicate User',
      role: UserRole.CASHIER,
    });
    assert(false, '2. Duplicate Email Rejection (should have thrown ApiError)');
  } catch (err: any) {
    assert(
      err.statusCode === 409 && err.message.includes('already exists'),
      '2. Duplicate Email Rejection (409 Conflict thrown correctly)'
    );
  }

  // Test 3: Valid Login
  try {
    const loginResult = await testAuthService.login({
      email: testEmail,
      password: testPassword,
    });
    assert(
      !!loginResult.token &&
        loginResult.user.id === createdUserId &&
        !('passwordHash' in loginResult.user),
      '3. Valid Login (valid token returned, passwordHash suppressed)'
    );
  } catch (err: any) {
    assert(false, '3. Valid Login', err.message);
  }

  // Test 4: Invalid Password Rejection
  try {
    await testAuthService.login({
      email: testEmail,
      password: 'WrongPassword999!',
    });
    assert(false, '4. Invalid Password Rejection (should have thrown 401)');
  } catch (err: any) {
    assert(
      err.statusCode === 401 && err.message.includes('Invalid email or password'),
      '4. Invalid Password Rejection (401 Unauthorized thrown correctly)'
    );
  }

  // Test 5: Token Verification (Valid & Invalid Token Rejection)
  try {
    const verifiedPayload = testAuthService.verifyToken(createdUserToken);
    const validTokenOk = verifiedPayload.id === createdUserId && verifiedPayload.role === UserRole.CASHIER;

    let invalidTokenRejected = false;
    try {
      testAuthService.verifyToken('invalid.jwt.token.string');
    } catch (err: any) {
      invalidTokenRejected = err.statusCode === 401 && err.message.includes('Invalid or expired');
    }

    assert(
      validTokenOk && invalidTokenRejected,
      '5. Token Verification (Valid token payload verified, invalid token rejected with 401)'
    );
  } catch (err: any) {
    assert(false, '5. Token Verification', err.message);
  }

  // Test 6: Unauthorized Request (Middleware missing token)
  {
    const { req, res, next } = createMockReqRes({ headers: {} });
    authenticate(req, res, next);
    const errorPassed = next.calls[0]?.[0];
    assert(
      errorPassed && errorPassed.statusCode === 401,
      '6. Unauthorized Request (Middleware blocks request without Bearer token)'
    );
  }

  // Test 7: Role Restrictions (RBAC Middleware enforcement)
  {
    // Test CASHIER trying to access ADMIN-only endpoint
    const cashierPayload = { id: createdUserId, email: testEmail, role: UserRole.CASHIER };
    const { req, res, next } = createMockReqRes({ user: cashierPayload });

    const adminOnlyMiddleware = authorize(UserRole.ADMIN);
    adminOnlyMiddleware(req, res, next);

    const forbiddenError = next.calls[0]?.[0];

    assert(
      forbiddenError &&
        forbiddenError.statusCode === 403 &&
        forbiddenError.message.includes("Role 'CASHIER' does not have sufficient permissions"),
      '7. Role Restrictions (RBAC Middleware blocks CASHIER from ADMIN resources)'
    );
  }

  console.log(`\n📊 Authentication Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Auth Test Suite failed');
  }
}

// Execute if run directly via CLI
if (require.main === module) {
  runAuthTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
