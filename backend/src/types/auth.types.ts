import { UserRole } from '@prisma/client';

export interface IJwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ISanitizedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthResponse {
  token: string;
  user: ISanitizedUser;
}
