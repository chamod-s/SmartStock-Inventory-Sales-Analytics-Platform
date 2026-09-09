import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';
import { IAuthResponse, IJwtPayload, ISanitizedUser } from '../types/auth.types';

export class AuthService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  public async register(input: RegisterInput): Promise<IAuthResponse> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const newUser = await this.userRepo.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      phone: input.phone || null,
    });

    const token = this.generateToken(newUser);
    const sanitizedUser = this.sanitizeUser(newUser);

    return {
      token,
      user: sanitizedUser,
    };
  }

  public async login(input: LoginInput): Promise<IAuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact an administrator');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = this.generateToken(user);
    const sanitizedUser = this.sanitizeUser(user);

    return {
      token,
      user: sanitizedUser,
    };
  }

  public async getCurrentUser(userId: string): Promise<ISanitizedUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Account is inactive');
    }
    return this.sanitizeUser(user);
  }

  public generateToken(user: User): string {
    const payload: IJwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: (env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  public verifyToken(token: string): IJwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as IJwtPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }
  }

  public sanitizeUser(user: User): ISanitizedUser {
    // Explicitly omit passwordHash to strictly enforce rule 15
    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
