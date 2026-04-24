import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { LoginPage } from '../../pages/LoginPage';
import { RegisterPage } from '../../pages/RegisterPage';

describe('Authentication Flow', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    );
  };

  describe('Login', () => {
    it('should login user with valid credentials', async () => {
      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });

    it('should show error with invalid credentials', async () => {
      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration', () => {
    it('should register new user', async () => {
      renderWithProviders(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'newuser@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Password123!' }
      });

      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });
  });
});
