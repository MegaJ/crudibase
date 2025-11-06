import bcrypt from 'bcrypt';
import { getDatabase } from '../utils/database';

export interface UserData {
  id: number;
  email: string;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
  email_verified: number;
  reset_token: string | null;
  reset_token_expires: string | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
}

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export class User {
  /**
   * Validate email format
   */
  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    // Add more password requirements here if needed
    // For now, just check length
  }

  /**
   * Create a new user
   */
  static async create(input: CreateUserInput): Promise<UserData> {
    const { email, password } = input;

    // Validate input
    this.validateEmail(email);
    this.validatePassword(password);

    const db = getDatabase();

    // Check if email already exists
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as { id: number } | undefined;

    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, email_verified)
         VALUES (?, ?, 0)`
      )
      .run(email, password_hash);

    // Fetch and return the created user
    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as UserData;

    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<UserData | null> {
    const db = getDatabase();
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserData | undefined;

    return user || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<UserData | null> {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | UserData
      | undefined;

    return user || null;
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    user: UserData,
    password: string
  ): Promise<boolean> {
    if (!user.password_hash) {
      return false;
    }
    return bcrypt.compare(password, user.password_hash);
  }
}
