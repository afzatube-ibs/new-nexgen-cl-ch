// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '../src/auth/ForgotPasswordForm.js';
import * as authClient from '../src/auth/authClient.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('auth/ForgotPasswordForm', () => {
  it('shows the identical success message regardless of what the real backend actually did', async () => {
    vi.spyOn(authClient, 'requestPasswordReset').mockResolvedValue({ message: 'anything' });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(screen.getByText(/If that email has an account/)).toBeTruthy());
  });

  it('rejects an empty email client-side, never calling the real client', () => {
    const spy = vi.spyOn(authClient, 'requestPasswordReset');
    render(<ForgotPasswordForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(screen.getByText('Enter your email address.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });
});
