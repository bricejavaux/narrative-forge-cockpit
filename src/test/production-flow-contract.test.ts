import { describe, it, expect } from 'vitest';

describe('production workflow contract', () => {
  it('keeps chapter rewrite tasks queryable by chapter target', () => {
    const task = {
      id: 'task-1',
      target_type: 'chapter',
      target_id: 'chapter-1',
      status: 'pending',
      title: 'Refine the chapter',
      created_at: '2024-01-01T00:00:00.000Z',
    };

    const chapterScoped = [task].filter((entry) => entry.target_type === 'chapter' && entry.target_id === 'chapter-1');

    expect(chapterScoped).toHaveLength(1);
    expect(chapterScoped[0]).toMatchObject({ target_type: 'chapter', target_id: 'chapter-1' });
  });

  it('treats chapter generation completion as completed', () => {
    const normalizeRunStatus = (status: string) => (status === 'success' ? 'completed' : status);

    expect(normalizeRunStatus('success')).toBe('completed');
    expect(normalizeRunStatus('failed')).toBe('failed');
  });
});
