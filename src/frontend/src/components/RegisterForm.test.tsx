import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterForm from './RegisterForm';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {component}
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('should render registration form with all fields', () => {
      renderWithRouter(<RegisterForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /register/i })
      ).toBeInTheDocument();
    });

    it('should show link to login page', () => {
      renderWithRouter(<RegisterForm />);

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Validation', () => {
    it('should show error for invalid email format', async () => {
      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error for weak password', async () => {
      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty fields', async () => {
      renderWithRouter(<RegisterForm />);

      const submitButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should call registration API with form data', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          token: 'fake-jwt-token',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/auth/register',
          {
            email: 'test@example.com',
            password: 'ValidPassword123',
          }
        );
      });
    });

    it('should show success message on successful registration', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          token: 'fake-jwt-token',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/registration successful/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error message for duplicate email', async () => {
      const mockError = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already exists',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, {
        target: { value: 'existing@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('should show generic error message for server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An internal error occurred',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
