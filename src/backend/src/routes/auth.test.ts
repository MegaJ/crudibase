import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from './auth';
import { getDatabase, closeDatabase } from '../utils/database';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret-key';
    getDatabase(); // Initialize database
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should register a new user and return 201 with user and token', async () => {
    const email = `newuser${Date.now()}@example.com`;
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'SecurePass123!',
      })
      .expect(201);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.password_hash).toBeUndefined();
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe('string');
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'SecurePass123!',
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toMatch(/email.*required/i);
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test${Date.now()}@example.com`,
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toMatch(/password.*required/i);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: 'SecurePass123!',
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toMatch(/invalid email/i);
  });

  it('should return 400 for weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'weak',
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toMatch(
      /password must be at least 8 characters/i
    );
  });

  it('should return 409 for duplicate email', async () => {
    const email = `duplicate${Date.now()}@example.com`;

    // Register first user
    await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
    });

    // Try to register again with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'AnotherPass123!',
      })
      .expect(409);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toMatch(/email already exists/i);
  });
});

describe('POST /api/auth/login', () => {
  let email: string;
  const password = 'SecurePass123!';

  beforeEach(async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret-key';
    getDatabase(); // Initialize database

    // Create a user to test login
    email = `testuser${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ email, password });
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should log in an existing user and return 200 with user and token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.body.token).toBeDefined();
  });

  it('should return 401 for invalid password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);
  });

  it('should return 401 for non-existent email', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password })
      .expect(401);
  });

  it('should return 400 for missing email', async () => {
    await request(app).post('/api/auth/login').send({ password }).expect(400);
  });

  it('should return 400 for missing password', async () => {
    await request(app).post('/api/auth/login').send({ email }).expect(400);
  });
});
