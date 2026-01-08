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

  test('get_all_marks paginates with cursor and omits meta by default', async () => {
    const firstPage = JSON.parse(
      await handleToolCall('get_all_marks', { limit: 10 }, baseEnv)
    );

    expect(firstPage.meta).toBeUndefined();
    expect(Array.isArray(firstPage.data.items)).toBe(true);
    expect(firstPage.data.items.length).toBeGreaterThan(0);

    const nextCursor = firstPage.data.next_cursor;
    if (nextCursor) {
      const secondPage = JSON.parse(
        await handleToolCall('get_all_marks', { limit: 10, cursor: nextCursor }, baseEnv)
      );
      expect(secondPage.data.total).toBe(firstPage.data.total);
      expect(Array.isArray(secondPage.data.items)).toBe(true);
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

