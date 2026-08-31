// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../src/auth/RegisterForm.js';
import * as authClient from '../src/auth/authClient.js';

/**
 * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — mobile number is
 * now the required, primary field; email is optional and hidden behind
 * a "+ Add an email address (optional)" progressive-disclosure toggle.
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

describe('auth/RegisterForm', () => {
  it('rejects a password/confirmation mismatch client-side, never calling the real client', () => {
    const registerSpy = vi.spyOn(authClient, 'registerAccount');
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+8801700000000' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('registers with a mobile number and no email at all, then immediately signs in and redirects to the real account area', async () => {
    vi.spyOn(authClient, 'registerAccount').mockResolvedValue({ phone: '+8801700000000', email: null });
    const loginSpy = vi.spyOn(authClient, 'loginAccount').mockResolvedValue({ phone: '+8801700000000', email: null });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+8801700000000' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith('+8801700000000', 'Str0ng!Passw0rd#1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/account'));
  });

  it('reveals an optional email field on request, and includes it when registering', async () => {
    vi.spyOn(authClient, 'registerAccount').mockResolvedValue({ phone: '+8801700000000', email: 'jane@example.test' });
    vi.spyOn(authClient, 'loginAccount').mockResolvedValue({ phone: '+8801700000000', email: 'jane@example.test' });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+8801700000000' } });
    fireEvent.click(screen.getByText('+ Add an email address (optional)'));
    fireEvent.change(screen.getByLabelText('Email address (optional)'), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(authClient.registerAccount).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+8801700000000', email: 'jane@example.test' }),
      ),
    );
  });

  it('surfaces real per-field errors from the backend (e.g. a duplicate phone) directly on the matching input', async () => {
    vi.spyOn(authClient, 'registerAccount').mockRejectedValue(
      new authClient.AuthRequestError(422, 'One or more fields failed validation.', { phone: 'This mobile number is already registered.' }),
    );
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '+8801700000000' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByText('This mobile number is already registered.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
