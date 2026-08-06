#!/usr/bin/env node
// ============================================================
//  FORMICA — COMPREHENSIVE E2E TEST SUITE
//  Production Readiness Verification
//  Tests ALL modules: Pheromones · Chambers · Foragers
//                     Soldiers · Legionarys · Providers
//
//  Flow:
//    1. SDK — Create entities for each module
//    2. SDK — Verify state reads + logic (WAF eval, TTL, etc.)
//    3. CLI — Simulate CLI commands via spawn
//    4. Web — Simulate console-style JS (same API, no browser)
//    5. Legionarys — Purge all test data (self-cleaning test)
//    6. Report — Pass/Fail with detailed results
//
//  Run:  node formica-e2e-test.mjs
//        GITHUB_TOKEN=<token> node formica-e2e-test.mjs
// ============================================================

import { Formica } from '../Formica/dist/index.js';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────
//  ANSI Colors
// ─────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

// ─────────────────────────────────────────────
//  Test Harness
// ─────────────────────────────────────────────
const results = [];
let passed = 0;
let failed = 0;
let currentSection = '';

function section(name) {
  currentSection = name;
  console.log(`\n${c.bold}${c.cyan}${'═'.repeat(60)}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ${name}${c.reset}`);
  console.log(`${c.cyan}${'═'.repeat(60)}${c.reset}`);
}

function assert(label, condition, detail = '') {
  const icon = condition ? `${c.green}✔${c.reset}` : `${c.red}✖${c.reset}`;
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`  ${icon} ${label}${detail ? c.dim + '  (' + detail + ')' + c.reset : ''}`);
  results.push({ section: currentSection, label, status, detail });
  if (condition) passed++; else failed++;
}

function info(msg) {
  console.log(`  ${c.dim}→ ${msg}${c.reset}`);
}

function warn(msg) {
  console.log(`  ${c.yellow}⚠ ${msg}${c.reset}`);
}

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const USE_GITHUB   = !!GITHUB_TOKEN;
const TEST_VAULT   = 'formica-e2e-test-colony';
const CLI_PATH     = join(__dirname, '../Formica/bin/formica.js');

// ─────────────────────────────────────────────
//  MAIN TEST RUNNER
// ─────────────────────────────────────────────
async function runTests() {
  console.log(`\n${c.bold}${c.magenta}${'▓'.repeat(60)}`);
  console.log(`  🐜  FORMICA — E2E Production Readiness Test Suite`);
  console.log(`${'▓'.repeat(60)}${c.reset}`);

  if (!USE_GITHUB) {
    warn('No GITHUB_TOKEN set — running in LOCAL (offline) mode. Persistence tests skipped.');
    warn('Set GITHUB_TOKEN env var to test full GitHub persistence.');
  } else {
    info(`GitHub persistence ENABLED — vault: "${TEST_VAULT}"`);
  }

  // ════════════════════════════════════════════
  //  [0] SDK INIT
  // ════════════════════════════════════════════
  section('[0] SDK INITIALIZATION');

  const formica = new Formica({
    githubToken: GITHUB_TOKEN,
    storageRepo: USE_GITHUB ? '.formica-storage' : undefined,
    vaultId: TEST_VAULT,
  });

  let state;
  try {
    state = await formica.init();
    assert('Formica.init() resolves successfully', !!state, `vaultId=${state?.vaultId}`);
    assert('State has correct vaultId', state.vaultId === TEST_VAULT, state.vaultId);
    assert('State.subscriptions initialized', typeof state.subscriptions === 'object');
    assert('State.chambers initialized',      typeof state.chambers === 'object');
    assert('State.logs initialized',           Array.isArray(state.logs));
    assert('State.soldierRules initialized',   typeof state.soldierRules === 'object');
    assert('State.legionaryAdapters initialized', typeof state.legionaryAdapters === 'object');
  } catch (e) {
    assert('Formica.init() resolves successfully', false, String(e));
    console.error('\n❌ Fatal: SDK init failed. Aborting test suite.\n');
    process.exit(1);
  }

  // ════════════════════════════════════════════
  //  [1] PHEROMONES — Event Mesh & Pub/Sub
  // ════════════════════════════════════════════
  section('[1] PHEROMONES — Event Mesh & Pub/Sub');

  // Create subscriptions
  const sub1 = await formica.subscribe('test.orders', 'OrderServiceE2E');
  const sub2 = await formica.subscribe('test.orders', 'AuditServiceE2E', undefined, 'payment');
  const sub3 = await formica.subscribe('test.alerts', 'AlertServiceE2E', 'https://httpbin.org/post');

  assert('subscribe() returns valid subId',  sub1.subId?.startsWith('sub_'), sub1.subId);
  assert('subscribe() sets correct topic',   sub1.topic === 'test.orders', sub1.topic);
  assert('subscribe() sets subscriberName',  sub1.subscriberName === 'OrderServiceE2E');
  assert('subscribe() with filter pattern',  sub2.filterPattern === 'payment', sub2.filterPattern);
  assert('subscribe() with webhook URL',     sub3.targetWebhookUrl?.includes('httpbin'), sub3.targetWebhookUrl);
  assert('subscribe() marks active=true',    sub1.active === true);

  // List subscriptions
  const subs = formica.listSubscriptions();
  assert('listSubscriptions() returns array',   Array.isArray(subs));
  assert('listSubscriptions() has 3 entries',   subs.length >= 3, `found: ${subs.length}`);

  // Publish event (local dispatch, no real webhook needed)
  let event;
  try {
    event = await formica.publishEvent('test.orders', 'E2ETestSuite', {
      orderId: 'e2e-order-001',
      amount: 99.99,
      currency: 'EUR'
    });
    assert('publishEvent() returns valid eventId', event.eventId?.startsWith('event_'), event.eventId);
    assert('publishEvent() topic matches',         event.topic === 'test.orders', event.topic);
    assert('publishEvent() sender matches',        event.sender === 'E2ETestSuite');
    assert('publishEvent() deliveredTo is array',  Array.isArray(event.deliveredTo), `delivered=${event.deliveredTo?.length}`);
  } catch (e) {
    assert('publishEvent() resolves',              false, String(e));
  }

  // Unsubscribe
  await formica.unsubscribe(sub2.subId);
  const subsAfter = formica.listSubscriptions();
  assert('unsubscribe() removes subscription',  !subsAfter.find(s => s.subId === sub2.subId));

  // ════════════════════════════════════════════
  //  [2] CHAMBERS — Distributed K/V Store
  // ════════════════════════════════════════════
  section('[2] CHAMBERS — Distributed K/V Store');

  // Create a Chamber Database
  const db = await formica.createChamberDatabase(
    'e2e-test-db',
    'E2E Test Database',
    'Created by the Formica E2E test suite'
  );
  assert('createChamberDatabase() returns chamberId', db.chamberId === 'e2e-test-db', db.chamberId);
  assert('createChamberDatabase() returns name',      db.name === 'E2E Test Database');
  assert('createChamberDatabase() has entries map',   typeof db.entries === 'object');

  // Set entries with TTL
  const entry1 = await formica.setChamberEntry('e2e-test-db', 'config:timeout', 30000);
  const entry2 = await formica.setChamberEntry('e2e-test-db', 'config:maxRetries', 5);
  const entry3 = await formica.setChamberEntry('e2e-test-db', 'session:token', 'tok_e2e_test_abc123', 5); // 5s TTL

  assert('setChamberEntry() returns entry with key',  entry1.key === 'config:timeout', entry1.key);
  assert('setChamberEntry() stores value correctly',  entry2.value === 5, String(entry2.value));
  assert('setChamberEntry() sets TTL expiresAt',      entry3.expiresAt !== null, entry3.expiresAt);

  // Get entries
  const val1 = formica.getChamberEntry('e2e-test-db', 'config:timeout');
  const val2 = formica.getChamberEntry('e2e-test-db', 'nonexistent:key');
  assert('getChamberEntry() returns correct value',  val1 === 30000, String(val1));
  assert('getChamberEntry() returns null for missing key', val2 === null);

  // Legacy K/V API
  const kvItem = await formica.setKV('e2e-legacy-key', 'hello-formica');
  assert('setKV() (legacy) returns item',   kvItem.key === 'e2e-legacy-key', kvItem.key);
  const kvVal = formica.getKV('e2e-legacy-key');
  assert('getKV() (legacy) retrieves value', kvVal === 'hello-formica', String(kvVal));

  // List chambers
  const chambers = formica.listChambers();
  assert('listChambers() returns array', Array.isArray(chambers));
  assert('listChambers() includes test db', chambers.some(c => c.chamberId === 'e2e-test-db' || c.key === 'e2e-legacy-key'));

  // TTL expiry test
  info('Waiting 6s to test TTL expiry on session:token entry...');
  await new Promise(r => setTimeout(r, 6100));
  const expiredVal = formica.getChamberEntry('e2e-test-db', 'session:token');
  assert('getChamberEntry() returns null after TTL expiry', expiredVal === null, String(expiredVal));

  // ════════════════════════════════════════════
  //  [3] FORAGERS — Telemetry & Log Aggregator
  // ════════════════════════════════════════════
  section('[3] FORAGERS — Telemetry & Log Aggregator');

  const log1 = await formica.log('info',  'E2ETestSuite', 'Test started successfully', 'e2e-corr-001');
  const log2 = await formica.log('warn',  'E2ETestSuite', 'Rate limit approaching threshold', 'e2e-corr-001', { limit: 100, current: 87 });
  const log3 = await formica.log('error', 'E2ETestSuite', 'Simulated error for test coverage', 'e2e-corr-002');
  const log4 = await formica.log('debug', 'E2ETestSuite', 'Debug data: config loaded', undefined, { configVersion: '2.1.0' });

  assert('log(info) returns logId',    log1.logId?.startsWith('log_'), log1.logId);
  assert('log(warn) level correct',    log2.level === 'warn', log2.level);
  assert('log(error) source correct',  log3.source === 'E2ETestSuite');
  assert('log(debug) with metadata',   log4.metadata?.configVersion === '2.1.0', JSON.stringify(log4.metadata));
  assert('log(info) correlationId set', log1.correlationId === 'e2e-corr-001');

  const logs = formica.listLogs(10);
  assert('listLogs() returns array',        Array.isArray(logs));
  assert('listLogs() most recent is first', logs[0]?.logId === log4.logId, `first=${logs[0]?.logId}`);
  assert('listLogs() contains 4 entries',   logs.length >= 4, `found: ${logs.length}`);

  // ════════════════════════════════════════════
  //  [4] SOLDIERS — WAF Security Gateway
  // ════════════════════════════════════════════
  section('[4] SOLDIERS — WAF Security Gateway');

  // Rule 1: ALLOW internal IPs (highest priority)
  const ruleAllow = await formica.createSoldierRule(
    'E2E Allow Internal IPs',
    'allow',
    '*',
    1,
    '10.0.0.'
  );

  // Rule 2: BLOCK known attacker IP
  const ruleBlock = await formica.createSoldierRule(
    'E2E Block Attacker',
    'block',
    '*',
    5,
    '192.168.99.99'
  );

  // Rule 3: RATE LIMIT suspicious bot
  const ruleRateLimit = await formica.createSoldierRule(
    'E2E Rate Limit Bot UA',
    'rate_limit',
    'test-api',
    10,
    undefined,
    'user-agent',
    'BadBot.*'
  );

  // Rule 4: CUSTOM PAYLOAD for maintenance page
  const ruleCustom = await formica.createSoldierRule(
    'E2E Maintenance Mode',
    'custom_payload',
    'test-app',
    20,
    undefined,
    undefined,
    undefined,
    { error: 'Service under maintenance', code: 503 },
    503,
    '/api/*'
  );

  assert('createSoldierRule(allow) ruleId set',   ruleAllow.ruleId?.startsWith('rule_'), ruleAllow.ruleId);
  assert('createSoldierRule(allow) priority=1',   ruleAllow.priority === 1, String(ruleAllow.priority));
  assert('createSoldierRule(block) action=block', ruleBlock.action === 'block');
  assert('createSoldierRule(block) ipPattern set',ruleBlock.ipPattern === '192.168.99.99');
  assert('createSoldierRule(rate_limit) headerName set', ruleRateLimit.headerName === 'user-agent');
  assert('createSoldierRule(custom_payload) customStatusCode=503', ruleCustom.customStatusCode === 503, String(ruleCustom.customStatusCode));
  assert('createSoldierRule() active=true by default', ruleAllow.active === true);

  // List rules sorted by priority
  const rules = formica.listSoldierRules();
  assert('listSoldierRules() returns array', Array.isArray(rules));
  assert('listSoldierRules() has 4 rules',   rules.length >= 4, `found: ${rules.length}`);
  assert('listSoldierRules() sorted by priority', rules[0].priority <= rules[1].priority, `[0]=${rules[0].priority} [1]=${rules[1].priority}`);

  // Evaluate requests
  const evalAllowed = formica.evaluateRequest({ ip: '10.0.0.25', app: 'any' });
  assert('evaluateRequest: internal IP is ALLOWED (priority rule)',
    evalAllowed.allowed === true,
    `allowed=${evalAllowed.allowed}, rule=${evalAllowed.matchedRule?.name}`
  );

  const evalBlocked = formica.evaluateRequest({ ip: '192.168.99.99', app: 'any' });
  assert('evaluateRequest: attacker IP is BLOCKED',
    evalBlocked.allowed === false && evalBlocked.statusCode === 403,
    `allowed=${evalBlocked.allowed}, status=${evalBlocked.statusCode}`
  );

  const evalRateLimit = formica.evaluateRequest({
    app: 'test-api',
    headers: { 'user-agent': 'BadBot/2.0 crawler' }
  });
  assert('evaluateRequest: bot UA is RATE LIMITED',
    evalRateLimit.allowed === false && evalRateLimit.statusCode === 429,
    `allowed=${evalRateLimit.allowed}, status=${evalRateLimit.statusCode}`
  );

  const evalCustom = formica.evaluateRequest({ app: 'test-app', path: '/api/v1/data' });
  assert('evaluateRequest: maintenance custom_payload returned',
    evalCustom.allowed === false && evalCustom.responsePayload?.code === 503,
    `payload=${JSON.stringify(evalCustom.responsePayload)}`
  );

  const evalNormal = formica.evaluateRequest({ ip: '8.8.8.8', app: 'other-app', path: '/public' });
  assert('evaluateRequest: unmatched request is ALLOWED (default)',
    evalNormal.allowed === true,
    `allowed=${evalNormal.allowed}`
  );

  // ════════════════════════════════════════════
  //  [5] CONNECTED PROVIDERS
  // ════════════════════════════════════════════
  section('[5] CONNECTED PROVIDERS HUB');

  const providerA = await formica.connectProvider('e2e-sinchlor', 'Sinchlor E2E', 'terra', '🧪');
  const providerB = await formica.connectProvider('e2e-rolla',    'Rolla E2E',    'terra', '🎱');
  const providerC = await formica.connectProvider('e2e-custom',   'My Custom API','custom','⚡');

  assert('connectProvider() returns id',       providerA.id === 'e2e-sinchlor');
  assert('connectProvider() returns name',     providerA.name === 'Sinchlor E2E');
  assert('connectProvider() active=true',      providerA.active === true);
  assert('connectProvider() connectedAt set',  !!providerA.connectedAt);

  const providers = formica.listConnectedProviders();
  assert('listConnectedProviders() returns array', Array.isArray(providers));
  assert('listConnectedProviders() has 3 entries', providers.length >= 3, `found: ${providers.length}`);

  // Toggle provider
  const toggledActive = await formica.toggleProviderActive('e2e-custom');
  assert('toggleProviderActive() pauses provider', toggledActive === false, `active=${toggledActive}`);
  const toggledBack = await formica.toggleProviderActive('e2e-custom');
  assert('toggleProviderActive() re-enables provider', toggledBack === true, `active=${toggledBack}`);

  // Disconnect
  const disconnected = await formica.disconnectProvider('e2e-custom');
  assert('disconnectProvider() returns true', disconnected === true);
  const providersAfter = formica.listConnectedProviders();
  assert('disconnectProvider() removes provider', !providersAfter.find(p => p.id === 'e2e-custom'));

  // ════════════════════════════════════════════
  //  [6] LEGIONARYS — Purge Engine Setup
  // ════════════════════════════════════════════
  section('[6] LEGIONARYS — Purge Adapter Registration');

  // Register adapters for test providers
  const adapterAll = await formica.registerLegionaryAdapter(
    'E2E Universal Cleaner',
    'all',
    undefined,
    'daily_00',
    [
      { groupName: 'Expired Sinchlor Nectars', provider: 'sinchlor', filter: 'expired_only' },
      { groupName: 'Expired Ballom Shortlinks', provider: 'ballom', filter: 'expired_only' },
    ]
  );

  const adapterSinchlor = await formica.registerLegionaryAdapter(
    'E2E Sinchlor Nectar Purger',
    'sinchlor',
    'https://sinchlor.amglogicalis.com/api/purge',
    'hourly',
    []
  );

  assert('registerLegionaryAdapter() returns adapterId', adapterAll.adapterId?.startsWith('adapter_'), adapterAll.adapterId);
  assert('registerLegionaryAdapter() name correct',      adapterAll.name === 'E2E Universal Cleaner');
  assert('registerLegionaryAdapter() provider correct',  adapterAll.provider === 'all');
  assert('registerLegionaryAdapter() groups array',      Array.isArray(adapterAll.groups), `groups=${adapterAll.groups?.length}`);
  assert('registerLegionaryAdapter() 2nd adapter active',adapterSinchlor.active === true);

  const adapters = formica.listLegionaryAdapters();
  assert('listLegionaryAdapters() returns array',   Array.isArray(adapters));
  assert('listLegionaryAdapters() has 2 entries',   adapters.length >= 2, `found: ${adapters.length}`);

  // ════════════════════════════════════════════
  //  [7] LEGIONARYS — Purge Dry-Run
  // ════════════════════════════════════════════
  section('[7] LEGIONARYS — Purge Dry-Run (Simulation)');

  // Inject stale data into state for simulation
  info('Injecting stale test data into state for purge simulation...');
  const state2 = formica.getState();

  // Add expired nectar
  state2.nectars = {
    'nectar-e2e-001': {
      alias: 'Test Nectar (Expired)',
      expiresAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
      singleUse: false,
      used: false
    },
    'nectar-e2e-002': {
      alias: 'Test Nectar (Single-Use Used)',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),  // future, but used
      singleUse: true,
      used: true
    }
  };

  // Add expired shortlink
  state2.shortlinks = {
    'link-e2e-001': {
      alias: 'e2e-test-link',
      expiresAt: new Date(Date.now() - 3600000).toISOString()  // 1 hour ago
    }
  };

  // Add expired chamber entry
  state2.chambers['e2e-expired-chamber'] = {
    key: 'e2e-expired-chamber',
    value: 'this is stale',
    expiresAt: new Date(Date.now() - 1000).toISOString()
  };

  const dryRun = await formica.runPurgeDryRun();
  assert('runPurgeDryRun() returns PurgeReport',         !!dryRun, 'no report returned');
  assert('runPurgeDryRun() isDryRun=true',               dryRun.isDryRun === true, String(dryRun.isDryRun));
  assert('runPurgeDryRun() detects expired nectar',      dryRun.items.some(i => i.provider === 'sinchlor'), `items=${dryRun.items.length}`);
  assert('runPurgeDryRun() detects single-use nectar',   dryRun.items.some(i => i.id === 'nectar-e2e-002'));
  assert('runPurgeDryRun() detects expired shortlink',   dryRun.items.some(i => i.provider === 'ballom'));
  assert('runPurgeDryRun() detects expired chamber entry',dryRun.items.some(i => i.provider === 'formica_chambers'));
  assert('runPurgeDryRun() totalItemsPurged correct',    dryRun.totalItemsPurged >= 4, `total=${dryRun.totalItemsPurged}`);
  assert('runPurgeDryRun() bytesSaved > 0',              dryRun.bytesSaved > 0, `bytes=${dryRun.bytesSaved}`);
  assert('runPurgeDryRun() breakdownByProvider exists',  typeof dryRun.breakdownByProvider === 'object');

  info(`Dry-run result: ${dryRun.totalItemsPurged} items, ${(dryRun.bytesSaved / 1024).toFixed(1)}KB freeable`);
  for (const [prov, stats] of Object.entries(dryRun.breakdownByProvider)) {
    info(`  ${prov}: ${stats.count} items, ${(stats.bytes / 1024).toFixed(1)}KB`);
  }

  // ════════════════════════════════════════════
  //  [8] LEGIONARYS — Execute Real Purge (Self-Clean)
  // ════════════════════════════════════════════
  section('[8] LEGIONARYS — Execute Purge (Self-Cleaning Verification)');

  info('Executing real purge to clean up all injected stale data...');
  const purgeReport = await formica.executePurge();

  assert('executePurge() returns PurgeReport',       !!purgeReport);
  assert('executePurge() isDryRun=false',            purgeReport.isDryRun === false, String(purgeReport.isDryRun));
  assert('executePurge() totalItemsPurged correct',  purgeReport.totalItemsPurged >= 4, `total=${purgeReport.totalItemsPurged}`);

  // Verify stale items were actually removed from state
  const stateAfterPurge = formica.getState();
  assert('executePurge() removed expired nectar-001',      !stateAfterPurge.nectars?.['nectar-e2e-001']);
  assert('executePurge() removed single-use nectar-002',   !stateAfterPurge.nectars?.['nectar-e2e-002']);
  assert('executePurge() removed expired shortlink',       !stateAfterPurge.shortlinks?.['link-e2e-001']);
  assert('executePurge() removed expired chamber entry',   !stateAfterPurge.chambers?.['e2e-expired-chamber']);

  info(`✅ Purge freed ${(purgeReport.bytesSaved / 1024).toFixed(1)}KB across ${purgeReport.totalItemsPurged} items`);

  // ════════════════════════════════════════════
  //  [9] CLI SIMULATION
  // ════════════════════════════════════════════
  section('[9] CLI — Command Line Interface Simulation');

  // Helper to run CLI commands
  function runCLI(...args) {
    const result = spawnSync('node', [CLI_PATH, ...args], {
      env: { ...process.env, GITHUB_TOKEN: '' },
      encoding: 'utf-8',
      timeout: 15000
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status
    };
  }

  const versionResult = runCLI('--version');
  assert('CLI --version exits cleanly',         versionResult.status === 0, `exit=${versionResult.status}`);
  assert('CLI --version shows package name',    versionResult.stdout.includes('terra-formica'), versionResult.stdout.trim());

  const helpResult = runCLI('help');
  assert('CLI help exits cleanly',              helpResult.status === 0, `exit=${helpResult.status}`);
  assert('CLI help shows "studio" command',     helpResult.stdout.includes('studio'), helpResult.stdout.slice(0, 100));
  assert('CLI help shows "purge" command',      helpResult.stdout.includes('purge'));
  assert('CLI help shows "providers" command',  helpResult.stdout.includes('providers'));
  assert('CLI help shows "pub" command',        helpResult.stdout.includes('pub'));
  assert('CLI help shows "kv" command',         helpResult.stdout.includes('kv'));

  // CLI pub (offline mode, no token)
  const pubResult = runCLI('pub', '--topic', 'test.e2e', '--message', 'CLI test message', '--sender', 'E2ECLI');
  // Will fail to save (no token) but shouldn't crash hard
  info(`CLI pub result: exit=${pubResult.status}, stdout="${pubResult.stdout.trim().slice(0, 80)}"`);

  // CLI kv set (offline)
  const kvSetResult = runCLI('kv', 'set', '--key', 'e2e-cli-key', '--value', 'hello-from-cli');
  assert('CLI kv set exits cleanly',    kvSetResult.status === 0, `exit=${kvSetResult.status}`);
  assert('CLI kv set shows success msg',kvSetResult.stdout.includes('e2e-cli-key'), kvSetResult.stdout.trim());

  // CLI providers connect (offline)
  const provConnResult = runCLI('providers', 'connect', '--name', 'E2E CLI Provider', '--type', 'custom');
  assert('CLI providers connect exits cleanly', provConnResult.status === 0, `exit=${provConnResult.status}`);

  // CLI purge dry-run (offline)
  const purgeCliResult = runCLI('purge', 'dry-run');
  assert('CLI purge dry-run exits cleanly',    purgeCliResult.status === 0, `exit=${purgeCliResult.status}`);
  assert('CLI purge dry-run shows header',     purgeCliResult.stdout.includes('Legionarys') || purgeCliResult.stdout.includes('Purge'), purgeCliResult.stdout.trim().slice(0, 80));

  // ════════════════════════════════════════════
  //  [10] WEB CONSOLE SIMULATION
  // ════════════════════════════════════════════
  section('[10] WEB CONSOLE — JavaScript API Simulation');

  info('Simulating consoleApp.state operations (same API used by the web UI)...');

  // Simulate what the web console does via consoleApp methods
  const consoleSimFormica = new Formica({
    githubToken: '',
    vaultId: 'web-console-sim-colony'
  });
  await consoleSimFormica.init();

  // --- Simulate: User opens Soldiers tab, creates WAF rule ---
  const webWafRule = await consoleSimFormica.createSoldierRule(
    'WebConsole Block Rule',
    'block',
    'my-api',
    5,
    '1.2.3.4'
  );
  assert('[Web] WAF rule created via SDK (as console does)', !!webWafRule.ruleId, webWafRule.ruleId);

  // --- Simulate: User goes to Chambers, creates a DB + entry ---
  const webDb = await consoleSimFormica.createChamberDatabase('web-db-001', 'Web Console DB', 'Sim');
  const webEntry = await consoleSimFormica.setChamberEntry('web-db-001', 'user:pref:theme', 'dark');
  assert('[Web] Chamber DB created',        !!webDb.chamberId);
  assert('[Web] Chamber entry set to dark', webEntry.value === 'dark', String(webEntry.value));
  const webRead = consoleSimFormica.getChamberEntry('web-db-001', 'user:pref:theme');
  assert('[Web] Chamber entry readable',    webRead === 'dark', String(webRead));

  // --- Simulate: User opens Pheromones, subscribes ---
  const webSub = await consoleSimFormica.subscribe('user.events', 'WebMonitor');
  assert('[Web] Subscription created',      !!webSub.subId, webSub.subId);

  // --- Simulate: User publishes an event ---
  const webEvent = await consoleSimFormica.publishEvent('user.events', 'WebConsole', { action: 'login', userId: 'u-001' });
  assert('[Web] Event published',           !!webEvent.eventId, webEvent.eventId);
  assert('[Web] Event delivered to subs',   webEvent.deliveredTo?.length >= 1, `delivered=${webEvent.deliveredTo?.length}`);

  // --- Simulate: User views Foragers logs ---
  const webLog = await consoleSimFormica.log('info', 'WebConsole', 'User u-001 logged in', webEvent.eventId);
  const webLogs = consoleSimFormica.listLogs(5);
  assert('[Web] Log written and listed',    webLogs.some(l => l.logId === webLog.logId));

  // --- Simulate: User registers Legionarys adapter ---
  const webAdapter = await consoleSimFormica.registerLegionaryAdapter(
    'WebConsole Nightly Purger',
    'all',
    undefined,
    'daily_00',
    [{ groupName: 'Expired Nectars', provider: 'sinchlor', filter: 'expired_only' }]
  );
  assert('[Web] Legionarys adapter registered', !!webAdapter.adapterId, webAdapter.adapterId);

  // --- Simulate: User hits "Dry Run Purge" button ---
  const webDryRun = await consoleSimFormica.runPurgeDryRun();
  assert('[Web] Dry run returns report', !!webDryRun && typeof webDryRun.totalItemsPurged === 'number');

  // --- Simulate: User connects a provider ---
  const webProv = await consoleSimFormica.connectProvider('web-provider-01', 'Web Provider', 'custom', '🌐');
  assert('[Web] Provider connected', !!webProv.id && webProv.active);
  await consoleSimFormica.disconnectProvider('web-provider-01');
  assert('[Web] Provider disconnected', !consoleSimFormica.listConnectedProviders().find(p => p.id === 'web-provider-01'));

  // ════════════════════════════════════════════
  //  [11] FINAL REPORT
  // ════════════════════════════════════════════
  console.log(`\n\n${c.bold}${c.magenta}${'▓'.repeat(60)}`);
  console.log(`  🐜  FORMICA E2E TEST RESULTS`);
  console.log(`${'▓'.repeat(60)}${c.reset}\n`);

  const total = passed + failed;
  const pct   = ((passed / total) * 100).toFixed(1);

  console.log(`  ${c.bold}Total Tests :${c.reset} ${total}`);
  console.log(`  ${c.green}${c.bold}✔ Passed    :${c.reset} ${c.green}${passed}${c.reset}`);
  console.log(`  ${c.red}${failed > 0 ? c.bold : ''}✖ Failed    :${c.reset} ${failed > 0 ? c.red + failed + c.reset : c.dim + failed + c.reset}`);
  console.log(`  ${c.bold}Score       :${c.reset} ${parseFloat(pct) >= 90 ? c.green : c.yellow}${pct}%${c.reset}\n`);

  // Print sections summary
  const sections = [...new Set(results.map(r => r.section))];
  for (const sec of sections) {
    const secResults = results.filter(r => r.section === sec);
    const secPassed  = secResults.filter(r => r.status === 'PASS').length;
    const secFailed  = secResults.filter(r => r.status === 'FAIL').length;
    const icon = secFailed === 0 ? `${c.green}✔${c.reset}` : `${c.red}✖${c.reset}`;
    console.log(`  ${icon} ${sec}  ${c.dim}(${secPassed}/${secResults.length})${c.reset}`);
  }

  // List any failures
  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log(`\n${c.red}${c.bold}Failed Tests:${c.reset}`);
    for (const f of failures) {
      console.log(`  ${c.red}✖${c.reset} ${f.section} → ${f.label}${f.detail ? c.dim + ' (' + f.detail + ')' + c.reset : ''}`);
    }
  }

  const isReady = failed === 0;
  console.log(`\n${c.bold}${'─'.repeat(60)}${c.reset}`);
  if (isReady) {
    console.log(`\n  ${c.green}${c.bold}🚀 FORMICA IS PRODUCTION READY!${c.reset}`);
    console.log(`  ${c.green}All ${total} tests passed. Legionarys self-cleanup verified.${c.reset}`);
  } else {
    console.log(`\n  ${c.yellow}${c.bold}⚠ ${failed} test(s) failed — review before production.${c.reset}`);
  }
  console.log(`${c.bold}${'─'.repeat(60)}${c.reset}\n`);

  process.exit(isReady ? 0 : 1);
}

runTests().catch(e => {
  console.error(`\n${c.red}${c.bold}💥 Unhandled error in test suite:${c.reset}`, e);
  process.exit(1);
});
