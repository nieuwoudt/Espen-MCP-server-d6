/**
 * Admin tool authentication (enable_d6_client, bulk_enable_d6_schools).
 *
 * Every test goes through handleMcpRequest with a real Request, the way the
 * Vercel entry point calls it. D6 is never contacted: global fetch is replaced
 * with a stub that records calls, and the base URL points at a .invalid host.
 *
 * Needs Node 20 or later: the handler uses the global Web Crypto object, which
 * Node 18 only exposes behind --experimental-global-webcrypto.
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
let logLines: string[] = [];
let warnLines: string[] = [];
const realFetch = globalThis.fetch;
const realLog = console.log;
const realWarn = console.warn;
const realDigest = crypto.subtle.digest;
let digestCalls = 0;

beforeEach(() => {
  fetchCalls = [];
  logLines = [];
  warnLines = [];
  digestCalls = 0;
  globalThis.fetch = (async (input: any, init?: any) => {
    fetchCalls.push({ url: String(input), method: init?.method ?? 'GET' });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  console.log = (...parts: unknown[]) => {
    logLines.push(parts.map(String).join(' '));
  };
  console.warn = (...parts: unknown[]) => {
    warnLines.push(parts.map(String).join(' '));
  };
  // Counts SHA-256 calls; the real digest still runs.
  (crypto.subtle as any).digest = function (this: SubtleCrypto, ...digestArgs: any[]) {
    digestCalls++;
    return (realDigest as any).apply(crypto.subtle, digestArgs);
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
  console.warn = realWarn;
  delete (crypto.subtle as any).digest;
  if (crypto.subtle.digest !== realDigest) (crypto.subtle as any).digest = realDigest;
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

describe('admin tools only switch allow-listed schools', () => {
  const bulkFor = (ids: unknown[], extra: Record<string, unknown> = {}) =>
    toolCall('bulk_enable_d6_schools', { school_login_ids: ids, api_type_id: 8, ...extra });

  test.each([
    ['one school not on the list', [9999], /School login id 9999 is not in D6_ALLOWED_SCHOOL_LOGIN_IDS/],
    ['a mix of listed and unlisted schools', [1450, 9999, 8888], /School login ids 9999, 8888 are not in/],
    ['a non-numeric id', ['abc'], /School login id NaN is not in/],
  ])('bulk_enable_d6_schools with %s refuses the whole call before any PATCH', async (_label, ids, message) => {
    for (const extra of [{}, { use_whitelist: false }]) {
      const result = await send(rpc(bulkFor(ids, extra), bearer(ADMIN_SECRET)), liveEnv);
      expect(result.status).toBe(200);
      expect(result.body.result.content[0].text).toMatch(message);
      expect(result.body.result.content[0].text).toContain('No school was changed');
    }
    expect(fetchCalls).toHaveLength(0);
  });

  test('bulk_enable_d6_schools with only allow-listed school_login_ids sends one PATCH each', async () => {
    const result = await send(rpc(bulkFor([1450]), bearer(ADMIN_SECRET)), liveEnv);
    expect(result.status).toBe(200);
    expect(result.body.result.content[0].text).toContain('Bulk D6 School Activation Enabled');
    expect(fetchCalls).toEqual([
      { url: 'https://d6-api.test.invalid/api/v1/settings/clients/1450', method: 'PATCH' },
    ]);
  });

  test.each([
    ['unset', undefined],
    ['empty', ''],
  ])('with D6_ALLOWED_SCHOOL_LOGIN_IDS %s both admin tools refuse every school', async (_label, allowList) => {
    const env: EnvLike = { ...liveEnv, D6_ALLOWED_SCHOOL_LOGIN_IDS: allowList };
    for (const [call, message] of [
      [enableBergsig, /D6_ALLOWED_SCHOOL_LOGIN_IDS is empty/],
      [bulkFor([1450]), /D6_ALLOWED_SCHOOL_LOGIN_IDS is empty/],
      [bulkFor([]), /D6_ALLOWED_SCHOOL_LOGIN_IDS is empty/],
      [bulkEnable, /No schools in D6_ALLOWED_SCHOOL_LOGIN_IDS/],
    ] as const) {
      const result = await send(rpc(call, bearer(ADMIN_SECRET)), env);
      expect(result.status).toBe(200);
      expect(result.body.result.content[0].text).toMatch(/^❌/);
      expect(result.body.result.content[0].text).toMatch(message);
    }
    expect(fetchCalls).toHaveLength(0);

    // Read tools keep the old behaviour: an empty allow-list allows every school.
    const read = await send(rpc(toolCall('get_schools', { school_login_id: 1352 })), env);
    expect(read.status).toBe(200);
    expect(fetchCalls).toEqual([
      { url: 'https://d6-api.test.invalid/api/v1/adminplus/school/1352', method: 'GET' },
    ]);
  });
});

describe('the gate runs before the production mock-mode guard', () => {
  test.each([
    ['NODE_ENV', { NODE_ENV: 'production' }],
    ['ESPEN_ENV', { ESPEN_ENV: 'production' }],
  ])('with %s=production and mock mode on', async (_label, prodVars) => {
    const env: EnvLike = { ...mockEnv, ...prodVars };

    // No valid secret: the same 401 as everywhere else, nothing about the server's mode.
    expectRefused(await send(rpc(enableBergsig), env));
    expectRefused(await send(rpc(bulkEnable, bearer('not-the-secret')), env));

    // Valid secret: the production guard is unchanged and still answers.
    const admin = await send(rpc(enableBergsig, bearer(ADMIN_SECRET)), env);
    expect(admin.status).toBe(200);
    expect(admin.body.error).toEqual({ code: -32603, message: 'Mock mode is not allowed in production.' });

    // Non-admin tools are unchanged.
    const read = await send(rpc(toolCall('get_schools', {})), env);
    expect(read.status).toBe(200);
    expect(read.body.error).toEqual({ code: -32603, message: 'Mock mode is not allowed in production.' });
    expect(fetchCalls).toHaveLength(0);
  });
});

describe('logging', () => {
  test('a refused admin call logs one line naming the tool, and nothing about the header or the secret', async () => {
    const sent = 'caller-sent-this-value';
    await send(rpc(enableBergsig, bearer(sent)), liveEnv);
    const withSecret = [...warnLines];
    warnLines = [];
    await send(rpc(enableBergsig, bearer(sent)), { ...liveEnv, D6_ADMIN_SECRET: undefined });

    expect(withSecret).toEqual(['[AUTH] refused admin tool enable_d6_client']);
    expect(warnLines).toEqual(withSecret);
    for (const line of [...withSecret, ...logLines]) {
      expect(line).not.toContain(sent);
      expect(line).not.toContain(ADMIN_SECRET);
    }
  });

  test('an allowed admin call logs that it was authenticated, without the secret', async () => {
    await send(rpc(enableBergsig, bearer(ADMIN_SECRET)), mockEnv);
    expect(logLines).toContain('[AUTH] admin tool allowed enable_d6_client');
    expect(warnLines).toEqual([]);
    for (const line of logLines) expect(line).not.toContain(ADMIN_SECRET);
  });
});

describe('isAdminRequest cost and failure', () => {
  const listTools = { jsonrpc: '2.0', id: 1, method: 'tools/list' };

  test.each([
    ['set, with a header', ADMIN_SECRET, bearer('not-the-secret')],
    ['unset, with a header', undefined, bearer('not-the-secret')],
    ['set, with no header', ADMIN_SECRET, {}],
    ['unset, with no header', undefined, {}],
  ])('hashes both values whether the secret is %s', async (_label, secret, headers) => {
    await send(rpc(listTools, headers), { ...liveEnv, D6_ADMIN_SECRET: secret });
    expect(digestCalls).toBe(2);
  });

  test('non-admin tool calls do not resolve admin auth at all', async () => {
    await send(rpc(toolCall('get_schools', {}), bearer('not-the-secret')), mockEnv);
    expect(digestCalls).toBe(0);
  });

  test('if Web Crypto fails, admin tools are refused and every other tool is unaffected', async () => {
    (crypto.subtle as any).digest = () => {
      throw new Error('no web crypto here');
    };

    expectRefused(await send(rpc(enableBergsig, bearer(ADMIN_SECRET)), liveEnv));

    const list = await send(rpc(listTools, bearer(ADMIN_SECRET)), liveEnv);
    expect(list.status).toBe(200);
    expect(list.body.result.tools.map((tool: { name: string }) => tool.name)).not.toContain('enable_d6_client');

    const read = await send(rpc(toolCall('get_schools', {}), bearer(ADMIN_SECRET)), mockEnv);
    expect(read.status).toBe(200);
    expect(read.body.error).toBeUndefined();
    expect(read.body.result.content[0].text).toContain('Schools/Client Integrations');
  });
});

describe('regression: the tools espen-os calls with no header', () => {
  const D6 = 'https://d6-api.test.invalid/api';

  // [tool, arguments, D6 URL every request must start with, whether the learner id is in the query]
  test.each([
    ['get_learner_absentees', { school_login_id: 1352 }, `${D6}/v1/adminplus/learnerabsentees/1352`, false],
    ['get_learner_discipline', { school_login_id: 1352 }, `${D6}/v1/adminplus/learnerdiscipline/1352`, false],
    ['get_learner_marks', { school_login_id: 1352, learnerId: 3043 }, `${D6}/v1/currplus/learnersubjectmarks/1352`, true],
    [
      'get_marks_for_learners',
      { school_login_id: 1352, learner_ids: [3043] },
      `${D6}/v1/currplus/learnersubjectmarks/1352`,
      true,
    ],
    [
      'get_learners_attendance_batch',
      { school_login_id: 1352, learner_ids: [3043] },
      `${D6}/v1/adminplus/learnerabsentees/1352`,
      true,
    ],
    [
      'get_learners_discipline_batch',
      { school_login_id: 1352, learner_ids: [3043] },
      `${D6}/v1/adminplus/learnerdiscipline/1352`,
      true,
    ],
  ])('%s works with no Authorization header and reaches D6 (stubbed)', async (name, args, urlPrefix, learnerInQuery) => {
    const result = await send(rpc(toolCall(name, args)), liveEnv);
    expect(result.status).toBe(200);
    expect(result.body.error).toBeUndefined();
    expect(result.body.result.content[0].text).not.toMatch(/^❌|unauthorized/);
    expect(fetchCalls.length).toBeGreaterThan(0);
    for (const call of fetchCalls) {
      expect(call.method).toBe('GET');
      expect(call.url.startsWith(urlPrefix)).toBe(true);
      expect(call.url.includes('learner_id=3043')).toBe(learnerInQuery);
    }
    expect(warnLines).toEqual([]);
    expect(digestCalls).toBe(0);
  });

  test('the unauthenticated tools/list is exactly the 24 non-admin tools, with the same definitions', async () => {
    const listTools = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
    const anonymous = await send(rpc(listTools), liveEnv);
    const admin = await send(rpc(listTools, bearer(ADMIN_SECRET)), liveEnv);

    expect(anonymous.body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'get_schools',
      'get_learners',
      'get_staff',
      'get_parents',
      'get_learner_marks',
      'get_marks_for_learners',
      'get_learner_subjects',
      'get_learner_subjects_per_term',
      'get_lookup_data',
      'get_system_health',
      'get_integration_info',
      'get_all_learners',
      'get_all_subjects',
      'get_all_marks',
      'get_learners_by_language',
      'get_learners_by_grade',
      'get_data_summary',
      'd6_get_school_info',
      'd6_get_learners',
      'list_d6_schools',
      'get_learner_absentees',
      'get_learner_discipline',
      'get_learners_attendance_batch',
      'get_learners_discipline_batch',
    ]);
    expect(anonymous.body.result.tools).toEqual(
      admin.body.result.tools.filter((tool: { name: string }) => !ADMIN_TOOLS.has(tool.name))
    );
  });
});
