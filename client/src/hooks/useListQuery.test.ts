import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_QUERY, readListQuery, toSearchParams } from './useListQuery';

describe('readListQuery', () => {
  it('uses defaults for an empty URL', () => {
    expect(readListQuery(new URLSearchParams())).toEqual(DEFAULT_LIST_QUERY);
    expect(DEFAULT_LIST_QUERY).toEqual({ status: 'all', sortBy: 'createdAt', order: 'asc' });
  });

  it('reads every parameter', () => {
    expect(readListQuery(new URLSearchParams('status=overdue&sortBy=dueDate&order=desc'))).toEqual({
      status: 'overdue',
      sortBy: 'dueDate',
      order: 'desc',
    });
  });

  it('falls back to the default for each unknown value, keeping the valid ones', () => {
    expect(readListQuery(new URLSearchParams('status=done&sortBy=title&order=sideways'))).toEqual({
      status: 'all',
      sortBy: 'title',
      order: 'asc',
    });
  });
});

describe('toSearchParams', () => {
  it('leaves out default values', () => {
    expect(toSearchParams(DEFAULT_LIST_QUERY).toString()).toBe('');
  });

  it('writes non-default values', () => {
    expect(
      toSearchParams({ status: 'completed', sortBy: 'createdAt', order: 'desc' }).toString(),
    ).toBe('status=completed&order=desc');
  });

  it('round-trips through readListQuery', () => {
    const query = { status: 'overdue', sortBy: 'title', order: 'desc' } as const;

    expect(readListQuery(toSearchParams(query))).toEqual(query);
  });
});
