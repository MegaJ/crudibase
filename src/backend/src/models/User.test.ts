import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { User } from './User';
import { getDatabase, closeDatabase } from '../utils/database';
import type Database from 'better-sqlite3';

describe('User Model', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Use in-memory database for testing
    process.env.DATABASE_PATH = ':memory:';
    db = getDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const user = await User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('SecurePass123!'); // Should be hashed
      expect(user.created_at).toBeDefined();
      expect(user.email_verified).toBe(0);
    });

    it('should reject duplicate email addresses', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
      };

      await User.create(userData);

      // Try to create another user with same email
      await expect(User.create(userData)).rejects.toThrow(
        /email already exists/i
      );
    });

    it('should reject invalid email format', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'Password123!',
      };

      await expect(User.create(userData)).rejects.toThrow(/invalid email/i);
    });

    it('should reject weak passwords', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
      };

      await expect(User.create(userData)).rejects.toThrow(
        /password must be at least 8 characters/i
      );
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const userData = {
        email: 'find@example.com',
        password: 'Password123!',
      };

      const created = await User.create(userData);
      const found = await User.findByEmail('find@example.com');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('find@example.com');
    });

    it('should return null if user not found', async () => {
      const found = await User.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'Password123!',
      };

      const created = await User.create(userData);
      const found = await User.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('findbyid@example.com');
    });

    it('should return null if user not found', async () => {
      const found = await User.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const userData = {
        email: 'verify@example.com',
        password: 'CorrectPassword123!',
      };

      const user = await User.create(userData);
      const isValid = await User.verifyPassword(user, 'CorrectPassword123!');

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        email: 'verify2@example.com',
        password: 'CorrectPassword123!',
      };

      const user = await User.create(userData);
      const isValid = await User.verifyPassword(user, 'WrongPassword123!');

      expect(isValid).toBe(false);
    });
  });
});
