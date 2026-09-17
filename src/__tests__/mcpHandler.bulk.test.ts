import { EnvLike, handleToolCall } from '../mcpHandler.js';

const baseEnv: EnvLike = {
  D6_MOCK_MODE: 'true',
  D6_ALLOWED_SCHOOL_LOGIN_IDS: '1352',
};

describe('bulk MCP tools (mock mode)', () => {
  test('get_all_subjects paginates and can include meta', async () => {
    const response = await handleToolCall(
      'get_all_subjects',
      { limit: 5, include_meta: true },
      baseEnv
    );
    const parsed = JSON.parse(response);

    expect(parsed.meta?.synced_at).toBeDefined();
    expect(Array.isArray(parsed.data.items)).toBe(true);
    expect(parsed.data.items.length).toBeLessThanOrEqual(5);
    expect(parsed.data.total).toBeGreaterThan(0);
  });

  // Envelope since 67d0eae (guarded fallback): { data: [...], next_cursor, meta: { mode, ... } },
  // with meta.synced_at only when include_meta is true.
  test('get_all_marks paginates with cursor and omits synced_at by default', async () => {
    const firstPage = JSON.parse(
      await handleToolCall('get_all_marks', { limit: 10 }, baseEnv)
    );

    expect(firstPage.meta?.synced_at).toBeUndefined();
    expect(Array.isArray(firstPage.data)).toBe(true);
    expect(firstPage.data.length).toBeGreaterThan(0);

    const nextCursor = firstPage.next_cursor;
    if (nextCursor) {
      const secondPage = JSON.parse(
        await handleToolCall('get_all_marks', { limit: 10, cursor: nextCursor }, baseEnv)
      );
      expect(Array.isArray(secondPage.data)).toBe(true);
      expect(secondPage.data).not.toEqual(firstPage.data);
    }
  });

  test('bulk tools enforce school allowlist', async () => {
    const env: EnvLike = {
      ...baseEnv,
      D6_ALLOWED_SCHOOL_LOGIN_IDS: '1352',
    };
    const error = await handleToolCall('get_all_marks', { school_login_id: 9999 }, env);
    expect(typeof error).toBe('string');
    expect(error).toMatch(/not in D6_ALLOWED_SCHOOL_LOGIN_IDS/i);
  });
});

