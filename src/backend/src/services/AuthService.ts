import { User, type CreateUserInput, type UserData } from '../models/User';
import { generateToken } from '../utils/jwt';
import { getDatabase } from '../utils/database';

export interface RegisterResponse {
  user: {
    id: number;
    email: string;
    created_at: string;
    email_verified: boolean;
  };
  token: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: CreateUserInput): Promise<RegisterResponse> {
    // Create user in database
    const user = await User.create(input);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Create session in database
    const db = getDatabase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

    db.prepare(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES (?, ?, ?)`
    ).run(user.id, token, expiresAt.toISOString());

    // Return user data (without password hash) and token
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_verified: Boolean(user.email_verified),
      },
      token,
    };
  }

  /**
   * Log in a user
   */
  async login(input: CreateUserInput): Promise<RegisterResponse> {
    // Validate input
    if (!input.email || input.email.trim() === '') {
      throw new Error('Email is required');
    }
    if (!input.password || input.password.trim() === '') {
      throw new Error('Password is required');
    }

    // Find user by email
    const user = await User.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(user, input.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Create session in database
    const db = getDatabase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

    db.prepare(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES (?, ?, ?)`
    ).run(user.id, token, expiresAt.toISOString());

    // Return user data (without password hash) and token
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_verified: Boolean(user.email_verified),
      },
      token,
    };
  }
}
