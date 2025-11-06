import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './AuthService';
import { getDatabase, closeDatabase } from '../utils/database';
import type Database from 'better-sqlite3';

describe('AuthService', () => {
  let db: Database.Database;
  let authService: AuthService;

  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret-key';
    db = getDatabase();
    authService = new AuthService();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('register', () => {
    it('should register a new user and return user data with token', async () => {
      const email = `user${Date.now()}@example.com`;
      const result = await authService.register({
        email,
        password: 'SecurePass123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.password_hash).toBeUndefined(); // Should not expose password hash
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(20);
    });

    it('should create a session in the database', async () => {
      const email = `session${Date.now()}@example.com`;
      const result = await authService.register({
        email,
        password: 'SecurePass123!',
      });

      // Check session was created
      const session = db
        .prepare('SELECT * FROM sessions WHERE user_id = ?')
        .get(result.user.id);

      expect(session).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const email = `duplicate${Date.now()}@example.com`;
      await authService.register({
        email,
        password: 'Password123!',
      });

      try {
        await authService.register({
          email,
          password: 'AnotherPass123!',
        });
        // If we get here, the test should fail
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/email already exists/i);
      }
    });

    it('should reject invalid email', async () => {
      await expect(
        authService.register({
          email: 'not-an-email',
          password: 'Password123!',
        })
      ).rejects.toThrow(/invalid email/i);
    });

    it('should reject weak password', async () => {
      await expect(
        authService.register({
          email: `weak${Date.now()}@example.com`,
          password: 'weak',
        })
      ).rejects.toThrow(/password must be at least 8 characters/i);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return user data with token', async () => {
      // First register a user
      const email = `login${Date.now()}@example.com`;
      const password = 'SecurePass123!';
      await authService.register({ email, password });

      // Then login
      const result = await authService.login({ email, password });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.password_hash).toBeUndefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should create a session in the database on login', async () => {
      const email = `loginsession${Date.now()}@example.com`;
      const password = 'SecurePass123!';
      const registerResult = await authService.register({ email, password });

      // Login
      const loginResult = await authService.login({ email, password });

      // Check session was created
      const sessions = db
        .prepare('SELECT * FROM sessions WHERE user_id = ?')
        .all(registerResult.user.id);

      // Should have 2 sessions: one from register, one from login
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject login with non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(/invalid email or password/i);
    });

    it('should reject login with incorrect password', async () => {
      const email = `wrongpass${Date.now()}@example.com`;
      await authService.register({
        email,
        password: 'CorrectPass123!',
      });

      await expect(
        authService.login({
          email,
          password: 'WrongPass123!',
        })
      ).rejects.toThrow(/invalid email or password/i);
    });

    it('should reject login with empty email', async () => {
      await expect(
        authService.login({
          email: '',
          password: 'Password123!',
        })
      ).rejects.toThrow(/email is required/i);
    });

    it('should reject login with empty password', async () => {
      await expect(
        authService.login({
          email: 'test@example.com',
          password: '',
        })
      ).rejects.toThrow(/password is required/i);
    });
  });
});
