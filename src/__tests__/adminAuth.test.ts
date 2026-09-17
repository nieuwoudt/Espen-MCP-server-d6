/**
 * Admin tool authentication (enable_d6_client, bulk_enable_d6_schools).
 *
 * Every test goes through handleMcpRequest with a real Request, the way the
 * Vercel entry point calls it. D6 is never contacted: global fetch is replaced
 * with a stub that records calls, and the base URL points at a .invalid host.
 */
import {
  ADMIN_TOOLS,
  AdminUnauthorizedError,
  EnvLike,
  handleMcpRequest,
  handleToolCall,
} from '../mcpHandler.js';

const ADMIN_SECRET = 'test-only-admin-secret';
const ENDPOINT = 'https://d6-mcp.test.invalid/sse';

// Live mode (D6_MOCK_MODE=false) so a call that got past the gate would reach fetch.
const liveEnv: EnvLike = {
  D6_MOCK_MODE: 'false',
  D6_API_USERNAME: 'stub-username',
  D6_API_PASSWORD: 'stub-password',
  D6_API_BASE_URL: 'https://d6-api.test.invalid/api',
  D6_ALLOWED_SCHOOL_LOGIN_IDS: '1352,1450',
  D6_ADMIN_SECRET: ADMIN_SECRET,
};

const mockEnv: EnvLike = { ...liveEnv, D6_MOCK_MODE: 'true' };

type FetchCall = { url: string; method: string };
let fetchCalls: FetchCall[] = [];
const realFetch = globalThis.fetch;
const realLog = console.log;

beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = (async (input: any, init?: any) => {
    fetchCalls.push({ url: String(input), method: init?.method ?? 'GET' });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  console.log = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
});

function rpc(body: unknown, headers: Record<string, string> = {}, url = ENDPOINT): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function toolCall(name: string, args: Record<string, unknown>, id = 1) {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } };
}

const bearer = (value: string) => ({ Authorization: `Bearer ${value}` });

const enableBergsig = toolCall('enable_d6_client', { school_login_id: 1450, api_type_id: 8, state: 1 });
const bulkEnable = toolCall('bulk_enable_d6_schools', { api_type_id: 8, state: 1 });

async function send(req: Request, env: EnvLike) {
  const res = await handleMcpRequest(req, env);
  return { status: res.status, headers: res.headers, body: await res.json() };
}

function expectRefused(result: { status: number; headers: Headers; body: any }) {
  expect(result.status).toBe(401);
  expect(result.headers.get('WWW-Authenticate')).toBe('Bearer');
  expect(result.body.result).toBeUndefined();
  expect(result.body.error.code).toBe(-32001);
  expect(result.body.error.message).toMatch(/^unauthorized/);
  expect(fetchCalls).toHaveLength(0);
}

describe('admin tools are refused without a valid secret', () => {
  test.each([
    ['enable_d6_client', enableBergsig],
    ['bulk_enable_d6_schools', bulkEnable],
  ])('%s with no Authorization header gets 401 / -32001', async (_name, call) => {
    expectRefused(await send(rpc(call), liveEnv));
  });

  test.each([
    ['a wrong secret', bearer('not-the-secret')],
    ['the secret plus a suffix', bearer(`${ADMIN_SECRET}x`)],
    ['an empty bearer token', { Authorization: 'Bearer ' }],
    ['the secret without the Bearer scheme', { Authorization: ADMIN_SECRET }],
    ['the secret under the Basic scheme', { Authorization: `Basic ${ADMIN_SECRET}` }],
  ])('enable_d6_client with %s is refused', async (_label, headers) => {
    expectRefused(await send(rpc(enableBergsig, headers), liveEnv));
  });

  test.each([
    ['unset', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
  ])('D6_ADMIN_SECRET %s on the server refuses even a request with a header', async (_label, secret) => {
    const env: EnvLike = { ...liveEnv, D6_ADMIN_SECRET: secret };
    expectRefused(await send(rpc(enableBergsig, bearer(secret ?? '')), env));
    expectRefused(await send(rpc(enableBergsig, bearer('anything')), env));
    expectRefused(await send(rpc(bulkEnable, bearer(ADMIN_SECRET)), env));
  });

  test('the secret is not accepted from the query string or the JSON body', async () => {
    expectRefused(await send(rpc(enableBergsig, {}, `${ENDPOINT}?token=${ADMIN_SECRET}`), liveEnv));
    expectRefused(
      await send(rpc(enableBergsig, {}, `${ENDPOINT}?authorization=Bearer%20${ADMIN_SECRET}`), liveEnv)
    );
    const inBody = {
      ...enableBergsig,
      authorization: `Bearer ${ADMIN_SECRET}`,
      params: {
        ...enableBergsig.params,
        authorization: `Bearer ${ADMIN_SECRET}`,
        arguments: { ...enableBergsig.params.arguments, D6_ADMIN_SECRET: ADMIN_SECRET },
      },
    };
    expectRefused(await send(rpc(inBody), liveEnv));
  });

  test('the refusal does not reveal whether a secret is configured or echo what was sent', async () => {
    const sent = 'caller-sent-this-value';
    const wrong = await send(rpc(enableBergsig, bearer(sent)), liveEnv);
    const unset = await send(rpc(enableBergsig, bearer(sent)), { ...liveEnv, D6_ADMIN_SECRET: undefined });
    const none = await send(rpc(enableBergsig), liveEnv);

    expect(wrong.body).toEqual(unset.body);
    expect(wrong.body).toEqual(none.body);
    expect(JSON.stringify(wrong.body)).not.toContain(sent);
    expect(JSON.stringify(wrong.body)).not.toContain(ADMIN_SECRET);
    expect(wrong.body.error.message).not.toMatch(/D6_ADMIN_SECRET|configured|not set/i);
  });

  test('the gate runs before the allow-list, so an unauthenticated caller learns nothing about it', async () => {
    const notAllowed = toolCall('enable_d6_client', { school_login_id: 9999, api_type_id: 8 });
    expectRefused(await send(rpc(notAllowed), liveEnv));
  });

  test('calling handleToolCall without an auth context fails closed', async () => {
    for (const name of ADMIN_TOOLS) {
      await expect(handleToolCall(name, { school_login_id: 1450, api_type_id: 8 }, liveEnv)).rejects.toBeInstanceOf(
        AdminUnauthorizedError
      );
      await expect(
        handleToolCall(name, { school_login_id: 1450, api_type_id: 8 }, liveEnv, undefined, { admin: false })
      ).rejects.toBeInstanceOf(AdminUnauthorizedError);
    }
    expect(fetchCalls).toHaveLength(0);
  });
});

describe('the correct secret passes the gate', () => {
  test.each([
    ['enable_d6_client', enableBergsig],
    ['bulk_enable_d6_schools', bulkEnable],
  ])('%s in mock mode reaches the tool, which returns its own mock-mode refusal', async (name, call) => {
    const result = await send(rpc(call, bearer(ADMIN_SECRET)), mockEnv);
    expect(result.status).toBe(200);
    expect(result.body.error).toBeUndefined();
    expect(result.body.result.content[0].text).toContain(`\`${name}\` should not be used in mock mode`);
    expect(fetchCalls).toHaveLength(0);
  });

  test('the Bearer scheme is matched case-insensitively and surrounding whitespace in the stored secret is ignored', async () => {
    const env: EnvLike = { ...mockEnv, D6_ADMIN_SECRET: `${ADMIN_SECRET}\n` };
    const result = await send(rpc(enableBergsig, { Authorization: `bearer ${ADMIN_SECRET}` }), env);
    expect(result.status).toBe(200);
    expect(result.body.result.content[0].text).toContain('should not be used in mock mode');
  });

  test('enable_d6_client in live mode sends the PATCH (to the stubbed fetch)', async () => {
    const result = await send(rpc(enableBergsig, bearer(ADMIN_SECRET)), liveEnv);
    expect(result.status).toBe(200);
    expect(result.body.result.content[0].text).toContain('D6 Client Integration Enabled');
    expect(fetchCalls).toEqual([
      { url: 'https://d6-api.test.invalid/api/v1/settings/clients/1450', method: 'PATCH' },
    ]);
  });

  test('the school allow-list still applies after the gate', async () => {
    const notAllowed = toolCall('enable_d6_client', { school_login_id: 9999, api_type_id: 8 });
    const result = await send(rpc(notAllowed, bearer(ADMIN_SECRET)), liveEnv);
    expect(result.status).toBe(200);
    expect(result.body.result.content[0].text).toMatch(/not in D6_ALLOWED_SCHOOL_LOGIN_IDS/);
    expect(fetchCalls).toHaveLength(0);
  });
});

describe('tools/list', () => {
  const listTools = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
  const names = (body: any): string[] => body.result.tools.map((tool: { name: string }) => tool.name);

  test('hides the admin tools without auth and shows them with it', async () => {
    const anonymous = await send(rpc(listTools), liveEnv);
    const wrong = await send(rpc(listTools, bearer('not-the-secret')), liveEnv);
    const unsetWithHeader = await send(rpc(listTools, bearer(ADMIN_SECRET)), {
      ...liveEnv,
      D6_ADMIN_SECRET: undefined,
    });
    const admin = await send(rpc(listTools, bearer(ADMIN_SECRET)), liveEnv);

    for (const result of [anonymous, wrong, unsetWithHeader]) {
      expect(result.status).toBe(200);
      expect(names(result.body)).not.toContain('enable_d6_client');
      expect(names(result.body)).not.toContain('bulk_enable_d6_schools');
    }
    expect(admin.status).toBe(200);
    expect(names(admin.body)).toEqual(expect.arrayContaining(['enable_d6_client', 'bulk_enable_d6_schools']));
    expect(names(admin.body).length).toBe(names(anonymous.body).length + ADMIN_TOOLS.size);
    expect(names(anonymous.body)).toContain('get_learners');
  });
});

describe('non-admin tools are unchanged for callers without a header', () => {
  test('a read tool works with no Authorization header', async () => {
    const result = await send(rpc(toolCall('get_schools', {})), mockEnv);
    expect(result.status).toBe(200);
    expect(result.body.error).toBeUndefined();
    expect(result.body.result.content[0].text).toContain('Schools/Client Integrations');
  });

  test('a live read tool with no header still reaches D6 (stubbed)', async () => {
    const result = await send(rpc(toolCall('get_schools', { school_login_id: 1352 })), liveEnv);
    expect(result.status).toBe(200);
    expect(result.body.error).toBeUndefined();
    expect(fetchCalls).toEqual([
      { url: 'https://d6-api.test.invalid/api/v1/adminplus/school/1352', method: 'GET' },
    ]);
  });

  test('a read tool still works when a wrong or unneeded header is sent', async () => {
    const result = await send(rpc(toolCall('get_schools', {}), bearer('not-the-secret')), mockEnv);
    expect(result.status).toBe(200);
    expect(result.body.result.content[0].text).toContain('Schools/Client Integrations');
  });
});

describe('JSON-RPC batch arrays', () => {
  test('a batch cannot carry an admin call past the gate', async () => {
    const batch = [toolCall('get_schools', {}, 1), toolCall('enable_d6_client', enableBergsig.params.arguments, 2)];
    const result = await send(rpc(batch), liveEnv);
    // The handler does not execute batches at all; nothing may run and nothing may succeed.
    expect(fetchCalls).toHaveLength(0);
    const replies = Array.isArray(result.body) ? result.body : [result.body];
    for (const reply of replies) {
      expect(reply.result).toBeUndefined();
      expect(reply.error).toBeDefined();
    }
  });
});
