// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../src/auth/RegisterForm.js';
import * as authClient from '../src/auth/authClient.js';

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
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('registers, then immediately signs in with the same real credentials, and redirects to the real account area', async () => {
    vi.spyOn(authClient, 'registerAccount').mockResolvedValue({ email: 'jane@example.test' });
    const loginSpy = vi.spyOn(authClient, 'loginAccount').mockResolvedValue({ email: 'jane@example.test' });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith('jane@example.test', 'Str0ng!Passw0rd#1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/account'));
  });

  it('surfaces real per-field errors from the backend (e.g. a duplicate email) directly on the matching input', async () => {
    vi.spyOn(authClient, 'registerAccount').mockRejectedValue(
      new authClient.AuthRequestError(422, 'One or more fields failed validation.', { email: 'This email is already registered.' }),
    );
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'existing@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByText('This email is already registered.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
