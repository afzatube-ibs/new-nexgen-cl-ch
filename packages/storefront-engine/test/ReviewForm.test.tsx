// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReviewForm } from '../src/reviews/ReviewForm.js';
import * as reviewFormClient from '../src/reviews/reviewFormClient.js';

vi.mock('next/navigation', () => ({ usePathname: () => '/products/widget-1' }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('reviews/ReviewForm', () => {
  it('rejects submission with no rating chosen, never calling the real client', () => {
    const spy = vi.spyOn(reviewFormClient, 'submitReviewForm');
    render(<ReviewForm productId="product-1" />);

    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'A genuinely great product overall.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(screen.getByText('Choose a star rating.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a body shorter than 10 characters client-side, never calling the real client', () => {
    const spy = vi.spyOn(reviewFormClient, 'submitReviewForm');
    render(<ReviewForm productId="product-1" />);

    fireEvent.click(screen.getByRole('radio', { name: '5 out of 5 stars' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'too short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(screen.getByText('Your review needs at least 10 characters.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('submits a real rating/body and shows the honest moderation-pending confirmation', async () => {
    const spy = vi.spyOn(reviewFormClient, 'submitReviewForm').mockResolvedValue({
      id: 'r1',
      authorName: 'Jamie',
      rating: 5,
      body: 'A genuinely great product overall.',
      createdAt: '2026-08-30T00:00:00Z',
      verifiedPurchase: false,
    });
    render(<ReviewForm productId="product-1" />);

    fireEvent.click(screen.getByRole('radio', { name: '5 out of 5 stars' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'A genuinely great product overall.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(screen.getByText(/awaiting moderation/)).toBeTruthy());
    expect(spy).toHaveBeenCalledWith({ productId: 'product-1', rating: 5, title: undefined, body: 'A genuinely great product overall.' });
  });

  it('switches to a real sign-in prompt on a real 401, never a generic error message', async () => {
    vi.spyOn(reviewFormClient, 'submitReviewForm').mockRejectedValue(new reviewFormClient.ReviewSubmissionError(401, 'You must be signed in to write a review.'));
    render(<ReviewForm productId="product-1" />);

    fireEvent.click(screen.getByRole('radio', { name: '4 out of 5 stars' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'A genuinely great product overall.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(screen.getByText('Sign in to review')).toBeTruthy());
    const link = screen.getByRole('link', { name: 'Sign in to review' });
    expect(link.getAttribute('href')).toBe('/login?redirect=%2Fproducts%2Fwidget-1');
  });

  it('shows the real, specific error message on a non-401 failure, staying on the form', async () => {
    vi.spyOn(reviewFormClient, 'submitReviewForm').mockRejectedValue(new reviewFormClient.ReviewSubmissionError(409, 'You have already reviewed this product.'));
    render(<ReviewForm productId="product-1" />);

    fireEvent.click(screen.getByRole('radio', { name: '3 out of 5 stars' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'A genuinely great product overall.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(screen.getByText('You have already reviewed this product.')).toBeTruthy());
    expect(screen.queryByText('Sign in to review')).toBeNull();
  });
});
