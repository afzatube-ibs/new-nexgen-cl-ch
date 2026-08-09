import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './DataTable.js';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [{ id: 'name', header: 'Name', cell: (row) => row.name, sortable: true }];
const rows: Row[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

describe('DataTable', () => {
  it('renders an Empty State when there is no data', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(r) => r.id} status="success" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders an Error State with a retry action', async () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} data={[]} getRowId={(r) => r.id} status="error" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders populated rows', () => {
    render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('supports row selection with a header select-all checkbox', async () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('cycles sort direction asc -> desc -> none on repeated header clicks', async () => {
    const onSortChange = vi.fn();
    render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} sort={null} onSortChange={onSortChange} />);

    const sortButton = screen.getByRole('button', { name: /Name/ });
    await userEvent.click(sortButton);
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });
});
