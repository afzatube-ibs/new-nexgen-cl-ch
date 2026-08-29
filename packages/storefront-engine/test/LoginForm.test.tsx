// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../src/auth/LoginForm.js';
import * as authClient from '../src/auth/authClient.js';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Same
 * "mock the client module at the boundary, not fetch itself" approach
 * `CheckoutForm.test.tsx` established — this file's own concern is
 * `LoginForm`'s own behavior, not `authClient.ts`'s real HTTP contract
 * with `/api/auth/login` (a Route Handler, exercised for real in this
 * milestone's own live browser verification, not re-mocked here).
 */
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('auth/LoginForm', () => {
  it('rejects submission with empty fields, never calling the real client', () => {
    const loginSpy = vi.spyOn(authClient, 'loginAccount');
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email and password.')).toBeTruthy();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('signs in with real credentials and redirects to the real destination on success', async () => {
    vi.spyOn(authClient, 'loginAccount').mockResolvedValue({ email: 'jane@example.test' });
    render(<LoginForm redirectTo="/account/orders" />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/account/orders'));
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the real, specific error message on a failed sign-in — never a fabricated success', async () => {
    vi.spyOn(authClient, 'loginAccount').mockRejectedValue(new authClient.AuthRequestError(422, 'The provided credentials are incorrect.'));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('The provided credentials are incorrect.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
