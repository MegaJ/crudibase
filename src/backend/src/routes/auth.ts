import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/AuthService';
import { z } from 'zod';

export const authRouter = Router();
const authService = new AuthService();

// Validation schema for registration
const registerSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .min(1, 'Email is required'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(1, 'Password is required'),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          field: firstError.path[0],
        },
      });
    }

    const { email, password } = validation.data;

    // Register user
    const result = await authService.register({ email, password });

    return res.status(201).json(result);
  } catch (error) {
    // Handle known errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Duplicate email (409 Conflict)
      if (message.includes('email already exists')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        });
      }

      // Validation errors (400 Bad Request)
      if (
        message.includes('invalid email') ||
        message.includes('password must be')
      ) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Unknown error
    console.error('Registration error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during registration',
      },
    });
  }
});

// Validation schema for login
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * Log in a user
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          field: firstError.path[0],
        },
      });
    }

    const { email, password } = validation.data;

    // Log in user
    const result = await authService.login({ email, password });

    return res.status(200).json(result);
  } catch (error) {
    // Handle known errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Invalid credentials (401 Unauthorized)
      if (message.includes('invalid email or password')) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
          },
        });
      }
    }

    // Unknown error
    console.error('Login error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
});
