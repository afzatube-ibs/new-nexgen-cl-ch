// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordForm } from '../src/auth/ResetPasswordForm.js';
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

describe('auth/ResetPasswordForm', () => {
  it('rejects a password/confirmation mismatch client-side, never calling the real client', () => {
    const spy = vi.spyOn(authClient, 'resetPassword');
    render(<ResetPasswordForm email="jane@example.test" token="real-token" />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('resets with the real email/token from props and redirects into the real account area', async () => {
    const spy = vi.spyOn(authClient, 'resetPassword').mockResolvedValue({ ok: true });
    render(<ResetPasswordForm email="jane@example.test" token="real-token" />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('jane@example.test', 'real-token', 'Str0ng!Passw0rd#1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/account'));
  });

  it('shows the real, generic error on an invalid/expired token', async () => {
    vi.spyOn(authClient, 'resetPassword').mockRejectedValue(new authClient.AuthRequestError(422, 'This password reset link is invalid or has expired.'));
    render(<ResetPasswordForm email="jane@example.test" token="wrong-token" />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Str0ng!Passw0rd#1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(screen.getByText('This password reset link is invalid or has expired.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
