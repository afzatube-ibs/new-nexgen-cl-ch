import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, DataTable, type DataTableColumn } from '@nexgen/ui';
import { ConfirmDialog } from './ConfirmDialog.js';

interface Row {
  id: string;
  name: string;
}

/**
 * Regression test for the bug found live-verifying Milestone 16
 * (Notifications Admin UI, 2026-09-01): `DialogContent` renders via a
 * React portal, so a click on any of `ConfirmDialog`'s own footer buttons
 * still bubbles — through the *component* tree, not the DOM tree — past
 * the portal boundary to a `DataTable` row's `onClick`. In production this
 * meant confirming "Cancel notification" from the Notifications list
 * force-navigated to that row's detail page right after the cancel
 * succeeded — a merchant clicking "Cancel notification" got yanked to an
 * unrelated screen with no warning. Reproduces the exact composition
 * (`DataTable` row with `onRowClick`, wrapping a `ConfirmDialog`) rather
 * than testing `ConfirmDialog` in isolation, since isolation is exactly
 * what let this ship unnoticed.
 */
describe('ConfirmDialog inside a DataTable row', () => {
  function renderRowWithConfirmDialog(onConfirm: () => void, onRowClick: () => void) {
    const columns: DataTableColumn<Row>[] = [
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                Cancel
              </Button>
            }
            title={`Cancel ${row.name}?`}
            description="This cannot be undone."
            confirmLabel="Cancel notification"
            destructive
            onConfirm={onConfirm}
          />
        ),
      },
    ];
    render(
      <DataTable columns={columns} data={[{ id: '1', name: 'Welcome email' }]} getRowId={(r) => r.id} onRowClick={onRowClick} />,
    );
  }

  it('does not fire the row click when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const onRowClick = vi.fn();
    renderRowWithConfirmDialog(onConfirm, onRowClick);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel notification' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('does not fire the row click when the dialog\'s own Cancel button is clicked', async () => {
    const onConfirm = vi.fn();
    const onRowClick = vi.fn();
    renderRowWithConfirmDialog(onConfirm, onRowClick);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    // The dialog renders its own footer "Cancel" (dismiss) button, same accessible name as the row's trigger — scope the query to the dialog itself.
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
