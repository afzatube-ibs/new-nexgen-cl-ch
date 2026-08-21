// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuestOrderLookupForm } from '../src/order/GuestOrderLookupForm.js';

afterEach(() => {
  cleanup();
});

describe('order/GuestOrderLookupForm', () => {
  it('requires both fields before showing a result', () => {
    render(<GuestOrderLookupForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('shows the honest "not available yet" result on a valid submission — never a fabricated order', () => {
    render(<GuestOrderLookupForm />);
    fireEvent.change(screen.getByLabelText('Order number'), { target: { value: 'ORD-100234' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));

    expect(screen.getByText(/Order lookup isn't available yet/)).toBeTruthy();
  });
});
