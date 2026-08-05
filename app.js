// FORMICA Queen Studio — Web Console Application

class FormicaQueenConsole {
  constructor() {
    this.token = localStorage.getItem('formica_gh_token') || '';
    this.currentUser = null;
    this.TERRA_APPS = [
      { id: 'sinchlor', name: 'Sinchlor', icon: '🐝', relativePath: 'sinchlor/Sinchlor', entryFile: 'app.js' },
      { id: 'lumina', name: 'Lumina', icon: '💡', relativePath: 'lumina/Lumina', entryFile: 'app.js' },
      { id: 'ballom', name: 'Ballom', icon: '🎈', relativePath: 'ballom/Ballom', entryFile: 'app.js' },
      { id: 'rolla', name: 'Rolla', icon: '🎲', relativePath: 'rolla/Rolla', entryFile: 'app.js' },
      { id: 'termes', name: 'Termes', icon: '🐜', relativePath: 'termes/Termes', entryFile: 'app.js' },
      { id: 'combase', name: 'Combase', icon: '📦', relativePath: 'combase/Combase', entryFile: 'app.js' },
      { id: 'webbl', name: 'WEBBL', icon: '🌐', relativePath: 'webbl/Webbl', entryFile: 'app.js' }
    ];

    this.state = {
      subscriptions: {},
      chambers: {},
      logs: [],
      soldierRules: {},
      legionaryAdapters: {},
      connectedProviders: {}
    };

    this.editingSubId = null;
    this.editingWafId = null;
    this.editingAdapterId = null;
    this.editingChamberId = null;
    this.editingEntryIndex = null;
    this.currentChamberEntries = [];
    this.currentAdapterGroups = [];
    this.simulatedAdapterGroups = [];

    // Anthill
    this.anthillRepo = null;
    this.anthillStatus = null;
    this.anthillRuns = [];

    this.init();
  }

  init() {
    this.bindEvents();
    if (this.token) {
      this.verifyAndConnect(this.token);
    } else {
      this.showDisconnectedState();
    }
  }

  bindEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
      });
    });

    document.getElementById('btn-connect').addEventListener('click', () =>
      this.verifyAndConnect(document.getElementById('gh-token').value.trim()));
    document.getElementById('btn-connect-gate').addEventListener('click', () =>
      this.verifyAndConnect(document.getElementById('gh-token-gate').value.trim()));
    document.getElementById('btn-disconnect').addEventListener('click', () => this.disconnect());

    document.getElementById('btn-new-sub').addEventListener('click', () => this.openSubModal());
    document.getElementById('btn-sub-cancel').addEventListener('click', () => this.closeSubModal());
    document.getElementById('btn-sub-save').addEventListener('click', () => this.saveSub());
    document.getElementById('btn-test-webhook')?.addEventListener('click', () => this.testSubWebhook());

    document.getElementById('btn-pub-event').addEventListener('click', () => this.openEventModal());
    document.getElementById('btn-event-cancel').addEventListener('click', () => this.closeEventModal());
    document.getElementById('btn-event-pub').addEventListener('click', () => this.pubEvent());
    document.getElementById('btn-event-dryrun')?.addEventListener('click', () => this.runEventDryRun());
    document.getElementById('btn-format-json')?.addEventListener('click', () => this.formatEventJsonPayload());

    document.getElementById('event-topic')?.addEventListener('input', () => this.updateEventMatchingPreview());
    document.getElementById('event-payload-json')?.addEventListener('input', () => this.validateEventJsonPayload());

    document.getElementById('btn-connect-provider')?.addEventListener('click', () => this.switchToDashboardTab());
    document.getElementById('btn-provider-close')?.addEventListener('click', () => this.closeProviderModal());
    document.getElementById('btn-register-provider')?.addEventListener('click', () => this.registerProvider());
    document.getElementById('provider-type-select')?.addEventListener('change', () => this.updateProviderSnippet());
    document.getElementById('provider-name-input')?.addEventListener('input', () => this.updateProviderSnippet());

    document.getElementById('btn-hub-tab-terra')?.addEventListener('click', () => this.switchHubTab('terra'));
    document.getElementById('btn-hub-tab-custom')?.addEventListener('click', () => this.switchHubTab('custom'));
    document.getElementById('btn-hub-connect-custom')?.addEventListener('click', () => this.connectCustomProvider());

    document.getElementById('btn-onboarding-close')?.addEventListener('click', () => this.closeOnboardingModal());
    document.getElementById('btn-onboarding-copy')?.addEventListener('click', () => this.copyOnboardingSnippet());

    document.getElementById('btn-new-kv').addEventListener('click', () => this.openKvModal());
    document.getElementById('btn-kv-cancel').addEventListener('click', () => this.closeKvModal());
    document.getElementById('btn-kv-save').addEventListener('click', () => this.saveKv());
    document.getElementById('btn-add-chamber-entry').addEventListener('click', () => this.addChamberEntryToBuilder());

    document.getElementById('btn-new-log').addEventListener('click', () => this.openLogModal());
    document.getElementById('btn-log-cancel').addEventListener('click', () => this.closeLogModal());
    document.getElementById('btn-log-save').addEventListener('click', () => this.saveLog());
    document.getElementById('log-filter-source')?.addEventListener('change', () => this.renderLogs());
    document.getElementById('log-filter-level')?.addEventListener('change', () => this.renderLogs());

    document.getElementById('btn-new-waf').addEventListener('click', () => this.openWafModal());
    document.getElementById('btn-waf-cancel').addEventListener('click', () => this.closeWafModal());
    document.getElementById('btn-waf-save').addEventListener('click', () => this.saveWaf());

    document.getElementById('btn-new-adapter').addEventListener('click', () => this.openAdapterModal());
    document.getElementById('btn-adapter-cancel').addEventListener('click', () => this.closeAdapterModal());
    document.getElementById('btn-adapter-save').addEventListener('click', () => this.saveAdapter());
    document.getElementById('btn-add-resource-group').addEventListener('click', () => this.addResourceGroupToBuilder());

    document.getElementById('btn-purge-dryrun').addEventListener('click', () => this.runPurgeDryRun());
    document.getElementById('btn-purge-execute').addEventListener('click', () => this.executeSelectedPurge());

    document.getElementById('btn-wake-anthill').addEventListener('click', () => this.wakeAnthill());
    document.getElementById('btn-refresh-anthill').addEventListener('click', () => this.refreshAnthillStatus());
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────

  async verifyAndConnect(token) {
    if (!token) { this.toast('Por favor, ingresa un GitHub Personal Access Token (PAT).'); return; }
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Formica-Queen-Studio' }
      });
      if (!res.ok) throw new Error('PAT de GitHub no válido o expirado.');

      const userData = await res.json();
      this.currentUser = userData.login;
      this.token = token;
      localStorage.setItem('formica_gh_token', token);
      this.showConnectedState();
      await this.loadColonyState();
      this.initAnthill(); // Non-blocking: check/create anthill repo
      this.toast(`¡Bienvenido @${this.currentUser}! Bóveda conectada.`);
    } catch (e) {
      this.toast(e.message || 'Error al conectar con GitHub API');
      this.showDisconnectedState();
    }
  }

  disconnect() {
    this.token = '';
    this.currentUser = null;
    this.state = { subscriptions: {}, chambers: {}, logs: [], soldierRules: {}, legionaryAdapters: {} };
    localStorage.removeItem('formica_gh_token');
    localStorage.removeItem('formica_colony_state');
    document.getElementById('gh-token').value = '';
    document.getElementById('gh-token-gate').value = '';
    this.showDisconnectedState();
    this.toast('Bóveda desconectada.');
  }

  showConnectedState() {
    document.getElementById('login-gate').classList.add('hidden');
    document.getElementById('protected-console').classList.remove('hidden');
    document.getElementById('auth-input-container').classList.add('hidden');
    document.getElementById('user-profile-container').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = `👤 @${this.currentUser}`;
  }

  showDisconnectedState() {
    document.getElementById('login-gate').classList.remove('hidden');
    document.getElementById('protected-console').classList.add('hidden');
    document.getElementById('auth-input-container').classList.remove('hidden');
    document.getElementById('user-profile-container').classList.add('hidden');
  }

  // ─── PERSISTENCE ──────────────────────────────────────────────────────────

  async loadColonyState() {
    // 1. Try GitHub (correct URL with owner)
    if (this.token && this.currentUser) {
      try {
        const apiUrl = `https://api.github.com/repos/${this.currentUser}/.formica-storage/contents/formica-colony-default-colony.json`;
        const res = await fetch(apiUrl, {
          headers: { 'Authorization': `Bearer ${this.token}`, 'User-Agent': 'Formica-Queen-Studio' }
        });
        if (res.ok) {
          const data = await res.json();
          const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
          const loaded = JSON.parse(decoded);
          this.state = { ...this.state, ...loaded };
          this.renderAll();
          return;
        }
      } catch {}
    }

    // 2. Fallback: localStorage
    const saved = localStorage.getItem('formica_colony_state');
    if (saved) {
      try {
        this.state = { ...this.state, ...JSON.parse(saved) };
        this.renderAll();
        return;
      } catch {}
    }

    // 3. Last resort: demo default state
    this.loadDefaultState();
    this.renderAll();
  }

  persistState() {
    // Always save to localStorage immediately
    localStorage.setItem('formica_colony_state', JSON.stringify(this.state));
    // Try async GitHub save (fire and forget)
    this.saveToGitHub().catch(() => {});
  }

  async saveToGitHub() {
    if (!this.token || !this.currentUser) return;
    const apiUrl = `https://api.github.com/repos/${this.currentUser}/.formica-storage/contents/formica-colony-default-colony.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(this.state, null, 2))));

    let sha;
    try {
      const getRes = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${this.token}`, 'User-Agent': 'Formica-Queen-Studio' }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }
    } catch {}

    try {
      const body = { message: '🐜 [FORMICA] Update Colony State', content };
      if (sha) body.sha = sha;
      await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Formica-Queen-Studio'
        },
        body: JSON.stringify(body)
      });
    } catch {}
  }

  loadDefaultState() {
    this.state = {
      subscriptions: {
        'sub_sinchlor': { subId: 'sub_sinchlor', topic: 'secret.triggered', subscriberName: 'Sinchlor-Honeytraps', targetWebhookUrl: 'https://api.myterra.org/webhook', active: true },
        'sub_lumina': { subId: 'sub_lumina', topic: 'user.signup', subscriberName: 'Lumina-IAM', active: true }
      },
      chambers: {
        'chamber_sessions': {
          chamberId: 'chamber_sessions',
          name: 'Bóveda de Sesiones y Tokens',
          description: 'Caché Redis de tokens JWT de producción y sesiones activas',
          entries: {
            'session_usr_9981': { key: 'session_usr_9981', value: { role: 'admin', ip: '192.168.1.50' }, ttlSeconds: 3600, expiresAt: new Date(Date.now() + 3600000).toISOString() },
            'otp_usr_1022': { key: 'otp_usr_1022', value: '884920', ttlSeconds: 300, expiresAt: new Date(Date.now() + 300000).toISOString() }
          },
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      },
      logs: [
        { level: 'info', source: 'Pheromones', message: 'Event Published on topic secret.triggered', timestamp: new Date().toISOString() },
        { level: 'warn', source: 'Legionarys', message: 'Detected expired items ready for purging', timestamp: new Date().toISOString() }
      ],
      soldierRules: {
        'rule_whitelist': {
          ruleId: 'rule_whitelist', name: 'Whitelist Subred Confiable', targetApp: 'sinchlor-api',
          pathPattern: '/api/v1/*', priority: 1, action: 'allow', ipPattern: '10.0.0.', active: true, createdAt: new Date().toISOString()
        },
        'rule_block_scrapers': {
          ruleId: 'rule_block_scrapers', name: 'Bloqueo Scrapers SQLmap', targetApp: '*',
          pathPattern: '*', priority: 10, action: 'custom_payload', headerName: 'User-Agent',
          headerValuePattern: 'sqlmap', customStatusCode: 403,
          customPayload: { error: 'Acceso denegado por Formica WAF Guard', code: 'CUSTOM_GUARD_403' },
          active: true, createdAt: new Date().toISOString()
        }
      },
      legionaryAdapters: {
        'adapter_prod': {
          adapterId: 'adapter_prod', name: 'Adaptador Bóvedas Producción',
          groups: [
            { groupName: 'Néctares Expirados Sinchlor', provider: 'sinchlor', filter: 'expired_only' },
            { groupName: 'MagicLinks Agotados Lumina', provider: 'lumina', filter: 'used_or_expired' }
          ],
          active: true
        }
      }
    };
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  renderAll() {
    document.getElementById('stat-subs-count').textContent = Object.keys(this.state.subscriptions || {}).length;
    document.getElementById('stat-kv-count').textContent = Object.keys(this.state.chambers || {}).length;
    document.getElementById('stat-logs-count').textContent = (this.state.logs || []).length;
    document.getElementById('stat-adapters-count').textContent = Object.keys(this.state.legionaryAdapters || {}).length;

    this.renderProviderHub();
    this.populateConnectedProviderSelects();
    this.renderSubs();
    this.renderKv();
    this.renderLogs();
    this.renderWaf();
    this.renderAdapters();
    this.renderAnthill();
  }

  // ─── PROVIDER CONNECTION HUB & AUTO-INJECTOR ─────────────────────────────

  switchToDashboardTab() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="tab-overview"]')?.classList.add('active');
    document.getElementById('tab-overview')?.classList.add('active');
  }

  switchHubTab(mode) {
    const btnTerra = document.getElementById('btn-hub-tab-terra');
    const btnCustom = document.getElementById('btn-hub-tab-custom');
    const viewTerra = document.getElementById('hub-view-terra');
    const viewCustom = document.getElementById('hub-view-custom');

    if (mode === 'terra') {
      btnTerra.style.background = 'rgba(99,102,241,0.2)';
      btnTerra.style.borderColor = 'var(--primary)';
      btnCustom.style.background = 'transparent';
      btnCustom.style.borderColor = 'var(--border)';
      viewTerra?.classList.remove('hidden');
      viewCustom?.classList.add('hidden');
    } else {
      btnCustom.style.background = 'rgba(99,102,241,0.2)';
      btnCustom.style.borderColor = 'var(--primary)';
      btnTerra.style.background = 'transparent';
      btnTerra.style.borderColor = 'var(--border)';
      viewCustom?.classList.remove('hidden');
      viewTerra?.classList.add('hidden');
    }
  }

  renderProviderHub() {
    const connected = this.state.connectedProviders || {};

    // 1. Render Terra Apps Grid
    const terraGrid = document.getElementById('terra-apps-grid');
    if (terraGrid) {
      terraGrid.innerHTML = '';
      this.TERRA_APPS.forEach(app => {
        const isConnected = !!connected[app.id];
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="resource-card-title" style="font-size:1.05rem;">${app.icon} ${app.name}</div>
            <span class="badge-tag" style="color:${isConnected ? 'var(--accent)' : 'var(--text-muted)'}; border-color:${isConnected ? 'var(--accent)' : 'var(--border)'}">
              ${isConnected ? '🔌 Conectada' : '⚪ No Conectada'}
            </span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">App Oficial del Ecosistema Terra (Local)</div>
          <div class="resource-card-actions">
            <button class="btn ${isConnected ? 'btn-secondary' : 'btn-accent'} btn-sm" onclick="consoleApp.connectTerraApp('${app.id}')">
              ${isConnected ? '🔄 Reconectar App' : '🔌 Conectar App (1-Clic)'}
            </button>
          </div>`;
        terraGrid.appendChild(card);
      });
    }

    // 2. Render Custom External Providers Grid
    const customGrid = document.getElementById('custom-providers-grid');
    if (customGrid) {
      customGrid.innerHTML = '';
      const customProviders = Object.values(connected).filter(p => p.type !== 'terra-app');

      if (!customProviders.length) {
        customGrid.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No hay providers externos registrados aún.</p>`;
      } else {
        customProviders.forEach(p => {
          const card = document.createElement('div');
          card.className = 'resource-card';
          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="color:var(--primary); font-size:1rem;">${p.icon || '⚡'} ${p.name}</strong>
              <span class="badge-tag" style="background:rgba(99,102,241,0.15); color:var(--primary);">${p.type}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;">Conectado: ${new Date(p.connectedAt).toLocaleDateString()}</div>
            <div class="resource-card-actions" style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="consoleApp.openOnboardingModalById('${p.id}')">📖 Guía Conexión</button>
              <button class="btn btn-danger btn-sm" onclick="consoleApp.disconnectProvider('${p.id}')">🗑️ Desconectar</button>
            </div>`;
          customGrid.appendChild(card);
        });
      }
    }
  }

  disconnectProvider(providerId) {
    if (this.state.connectedProviders && this.state.connectedProviders[providerId]) {
      const name = this.state.connectedProviders[providerId].name;
      delete this.state.connectedProviders[providerId];
      this.renderAll();
      this.persistState();
      this.toast(`🗑️ Provider '${name}' desconectado`);
    }
  }

  connectTerraApp(appId) {
    const app = this.TERRA_APPS.find(a => a.id === appId);
    if (!app) return;

    this.state.connectedProviders = this.state.connectedProviders || {};
    this.state.connectedProviders[app.id] = {
      id: app.id,
      name: app.name,
      icon: app.icon,
      type: 'terra-app',
      connectedAt: new Date().toISOString()
    };

    const msg = `🔌 App Terra '${app.name}' conectada con éxito mediante Auto-Inyector Formica (SDK & WAF Guard activos).`;
    this.state.logs.unshift({
      level: 'info',
      source: app.name,
      message: msg,
      timestamp: new Date().toISOString()
    });

    this.dispatchToAnthill({ type: 'log', level: 'info', source: app.name, message: msg });
    this.renderAll();
    this.persistState();
    this.toast(`✅ App '${app.name}' conectada correctamente a Formica`);
  }

  connectCustomProvider() {
    const nameInput = (document.getElementById('hub-custom-name')?.value || '').trim();
    const type = document.getElementById('hub-custom-type')?.value || 'aws';

    if (!nameInput) {
      this.toast('Escribe un Nombre para el Provider Personalizado.');
      return;
    }

    const customId = `custom_${nameInput.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const providerObj = {
      id: customId,
      name: nameInput,
      icon: '⚡',
      type: `external-${type}`,
      connectedAt: new Date().toISOString()
    };

    this.state.connectedProviders = this.state.connectedProviders || {};
    this.state.connectedProviders[customId] = providerObj;

    const msg = `🔌 Provider Personalizado '${nameInput}' [${type.toUpperCase()}] registrado y conectado.`;
    this.state.logs.unshift({
      level: 'info',
      source: nameInput,
      message: msg,
      timestamp: new Date().toISOString()
    });

    this.dispatchToAnthill({ type: 'log', level: 'info', source: nameInput, message: msg });

    document.getElementById('hub-custom-name').value = '';
    this.renderAll();
    this.persistState();
    this.toast(`✅ Provider '${nameInput}' registrado correctamente`);

    // 🚀 ALWAYS OPEN ONBOARDING INTEGRATION GUIDE MODAL UPON CREATION
    this.openOnboardingModal(providerObj);
  }

  openOnboardingModalById(providerId) {
    if (this.state.connectedProviders && this.state.connectedProviders[providerId]) {
      this.openOnboardingModal(this.state.connectedProviders[providerId]);
    }
  }

  openOnboardingModal(provider) {
    const modal = document.getElementById('modal-provider-onboarding');
    const title = document.getElementById('onboarding-provider-title');
    const badge = document.getElementById('onboarding-provider-badge');
    const snippetPre = document.getElementById('onboarding-code-snippet');

    if (!modal || !provider) return;

    title.textContent = `🔌 Guía de Conexión — ${provider.name}`;
    badge.textContent = provider.type || 'external';
    snippetPre.textContent = this.generateOnboardingSnippet(provider);

    modal.classList.remove('hidden');
  }

  closeOnboardingModal() {
    document.getElementById('modal-provider-onboarding')?.classList.add('hidden');
  }

  copyOnboardingSnippet() {
    const code = document.getElementById('onboarding-code-snippet')?.textContent || '';
    if (code) {
      navigator.clipboard.writeText(code);
      this.toast('📋 Snippet copiado al portapapeles');
    }
  }

  generateOnboardingSnippet(provider) {
    const name = provider.name || 'Mi-Provider';
    const type = (provider.type || '').replace('external-', '');

    if (type === 'node-fetch' || type === 'express') {
      return `// 🐜 FORMICA SDK (Node.js / Express Backend)
import { Formica, createExpressWaf } from 'terra-formica';

const formica = new Formica({
  githubToken: process.env.FORMICA_PAT || 'ghp_TU_PAT',
  storageRepo: 'amglogicalis/.formica-storage',
  anthillRepo: 'amglogicalis/formica-anthill'
});

// 🛡️ 1. Proteger servidor con WAF Guard Firewall
app.use(createExpressWaf(formica, { appName: '${name}' }));

// 🍃 2. Emitir log telemétrico a Foragers
await formica.log('info', '${name}', 'Servicio iniciado y escuchando peticiones');

// 🧪 3. Publicar evento a Pheromones Bus
await formica.publishEvent('user.signup', '${name}', { userId: 'usr_99' });`;
    }

    if (type === 'python') {
      return `# 🐜 FORMICA TELEMETRY (Python FastAPI / Flask / Django)
import requests
import json

FORMICA_PAT = "TU_GITHUB_PAT_AQUI"
ANTHILL_URL = "https://api.github.com/repos/amglogicalis/formica-anthill/dispatches"

def emit_formica_telemetry(level: str, message: str, payload: dict = None):
    headers = {
        "Authorization": f"token {FORMICA_PAT}",
        "Accept": "application/vnd.github.v3+json"
    }
    body = {
        "event_type": "formica-ingest",
        "client_payload": {
            "type": "log",
            "level": level,
            "source": "${name}",
            "message": message,
            "payload": payload or {}
        }
    }
    requests.post(ANTHILL_URL, data=json.dumps(body), headers=headers)

# Ejemplo de uso en tu app Python:
emit_formica_telemetry("info", "Petición recibida en endpoint de ${name}")`;
    }

    if (type === 'aws') {
      return `// 🐜 FORMICA AWS LAMBDA TELEMETRY (Node.js AWS SDK)
const https = require('https');

exports.handler = async (event) => {
    const payload = JSON.stringify({
        event_type: 'formica-ingest',
        client_payload: {
            type: 'log',
            level: 'info',
            source: '${name}',
            message: \`AWS Lambda ejecutada con exito (Request ID: \${event.requestContext?.requestId})\`
        }
    });

    const req = https.request('https://api.github.com/repos/amglogicalis/formica-anthill/dispatches', {
        method: 'POST',
        headers: {
            'Authorization': 'token ' + process.env.FORMICA_PAT,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Formica-AWS-Lambda'
        }
    });
    req.write(payload);
    req.end();
};`;
    }

    // Default cURL / Webhook / Slack / Discord
    return `# 🐜 FORMICA TELEMETRY (cURL / HTTP POST Webhook)
curl -X POST https://api.github.com/repos/amglogicalis/formica-anthill/dispatches \\
  -H "Authorization: token TU_GITHUB_PAT" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -d '{
    "event_type": "formica-ingest",
    "client_payload": {
      "type": "log",
      "level": "info",
      "source": "${name}",
      "message": "Peticion procesada correctamente desde ${name}"
    }
  }'`;
  }

  populateConnectedProviderSelects() {
    const connectedList = Object.values(this.state.connectedProviders || {});

    // Target selects: #waf-target-app, #event-sender, #sub-name, #log-source
    const wafSelect = document.getElementById('waf-target-app');
    if (wafSelect) {
      wafSelect.innerHTML = '';
      if (!connectedList.length) {
        wafSelect.innerHTML = `<option value="">⚠️ No hay providers conectados. [🔌 Conectar Provider en Dashboard]</option>`;
      } else {
        const globalOpt = document.createElement('option');
        globalOpt.value = '*';
        globalOpt.textContent = '🌐 Todos los Providers (* - Global)';
        wafSelect.appendChild(globalOpt);

        connectedList.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.name;
          opt.textContent = `${p.icon || '🔌'} ${p.name}`;
          wafSelect.appendChild(opt);
        });
      }
    }
  }


  renderSubs() {
    const grid = document.getElementById('subs-grid');
    grid.innerHTML = '';
    const subs = Object.values(this.state.subscriptions || {});
    if (!subs.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay suscripciones. Haz clic en '+ Nueva Suscripción'.</p>`;
      return;
    }
    subs.forEach(s => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      const isActive = s.active !== false;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="resource-card-title">${s.subscriberName}</div>
          <span class="badge-tag" style="color:${isActive ? 'var(--accent)' : 'var(--danger)'}; border-color:${isActive ? 'var(--accent)' : 'var(--danger)'}">
            ${isActive ? '🟢 Activa' : '⏸️ Pausada'}
          </span>
        </div>
        <div class="resource-card-sub" style="font-size:0.82rem; margin-top:4px;">Tópico: <code>${s.topic}</code></div>
        <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">${s.targetWebhookUrl ? 'Webhook: ' + s.targetWebhookUrl : 'Internal Dispatcher'}</div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.toggleSubActive('${s.subId}')">${isActive ? '⏸️ Pausar' : '▶️ Activar'}</button>
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editSub('${s.subId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delSub('${s.subId}')">🗑️ Eliminar</button>
        </div>`;
      grid.appendChild(card);
    });
  }

  toggleSubActive(subId) {
    if (this.state.subscriptions[subId]) {
      this.state.subscriptions[subId].active = !this.state.subscriptions[subId].active;
      this.renderAll();
      this.persistState();
      this.toast(`Suscripción '${this.state.subscriptions[subId].subscriberName}' ${this.state.subscriptions[subId].active ? 'activada' : 'pausada'}`);
    }
  }

  renderKv() {
    const grid = document.getElementById('kv-grid');
    grid.innerHTML = '';
    const chambers = Object.values(this.state.chambers || {});
    if (!chambers.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay Cámaras K/V registradas. Haz clic en '+ Nueva Cámara K/V'.</p>`;
      return;
    }
    chambers.forEach(c => {
      const isDb = 'entries' in c;
      const entries = isDb ? Object.values(c.entries || {}) : [{ key: c.key, value: c.value, expiresAt: c.expiresAt }];
      const activeCount = entries.filter(e => !e.expiresAt || new Date() <= new Date(e.expiresAt)).length;
      const id = isDb ? c.chamberId : c.key;
      const name = isDb ? c.name : `Cámara ${c.key}`;

      const entriesHtml = entries.map(e => {
        const isExp = e.expiresAt && new Date() > new Date(e.expiresAt);
        return `
          <div style="font-size:0.8rem; margin-bottom:5px; background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
            <div style="min-width:0; overflow:hidden;">
              <strong style="color:var(--text);">${e.key}</strong>:
              <span style="color:var(--text-muted); font-size:0.75rem;">${JSON.stringify(e.value)}</span>
            </div>
            <span style="font-size:0.72rem; color:${isExp ? 'var(--danger)' : 'var(--accent)'}; font-weight:600; flex-shrink:0; margin-left:8px;">
              ${isExp ? '⚠️ EXPIRADO' : (e.expiresAt ? '⏱️ TTL' : '♾️')}
            </span>
          </div>`;
      }).join('');

      const card = document.createElement('div');
      card.className = 'resource-card';
      card.innerHTML = `
        <div class="resource-card-title">🕳️ ${name}</div>
        <div class="resource-card-sub" style="font-size:0.8rem; margin-bottom:8px;">ID: <code>${id}</code> · ${activeCount}/${entries.length} claves activas</div>
        <div style="margin-bottom:12px;">${entriesHtml || '<span style="color:var(--text-muted); font-size:0.8rem;">Sin claves guardadas</span>'}</div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editKv('${id}')">✏️ Configurar Claves</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delKv('${id}')">🗑️ Eliminar Cámara</button>
        </div>`;
      grid.appendChild(card);
    });
  }

  renderLogs() {
    const logs = this.state.logs || [];

    // 1. Detect unique provider sources & build statistics
    const sourcesMap = {};
    logs.forEach(l => {
      const src = l.source || 'Unknown';
      if (!sourcesMap[src]) {
        sourcesMap[src] = { count: 0, lastSeen: l.timestamp, levels: { info: 0, warn: 0, error: 0, debug: 0 } };
      }
      sourcesMap[src].count++;
      if (l.level && sourcesMap[src].levels[l.level] !== undefined) {
        sourcesMap[src].levels[l.level]++;
      }
    });

    // 2. Render Connected Providers Grid
    const provGrid = document.getElementById('forager-providers-grid');
    if (provGrid) {
      provGrid.innerHTML = '';
      const sources = Object.keys(sourcesMap);
      if (!sources.length) {
        provGrid.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No se han detectado fuentes de logs todavía.</p>`;
      } else {
        sources.forEach(src => {
          const data = sourcesMap[src];
          const errCount = data.levels.error;
          const warnCount = data.levels.warn;
          const card = document.createElement('div');
          card.className = 'resource-card';
          card.style.cssText = 'cursor:pointer; transition: transform 0.15s ease, border-color 0.15s ease;';
          card.onclick = () => {
            const select = document.getElementById('log-filter-source');
            if (select) { select.value = src; this.renderLogs(); }
          };

          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="color:var(--primary); font-size:1rem;">🔌 ${src}</strong>
              <span class="badge-tag" style="background:rgba(99,102,241,0.15); color:var(--primary);">${data.count} logs</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">Última señal: ${new Date(data.lastSeen).toLocaleTimeString()}</div>
            <div style="display:flex; gap:6px; font-size:0.72rem;">
              ${data.levels.info ? `<span style="color:var(--accent);">ℹ️ ${data.levels.info} info</span>` : ''}
              ${warnCount ? `<span style="color:#f59e0b;">⚠️ ${warnCount} warn</span>` : ''}
              ${errCount ? `<span style="color:var(--danger); font-weight:700;">🚨 ${errCount} error</span>` : ''}
            </div>`;
          provGrid.appendChild(card);
        });
      }
    }

    // 3. Populate Source Dropdown (preserving current selection)
    const sourceSelect = document.getElementById('log-filter-source');
    if (sourceSelect) {
      const currentVal = sourceSelect.value || 'ALL';
      sourceSelect.innerHTML = '<option value="ALL">Todas las fuentes (ALL)</option>';
      Object.keys(sourcesMap).forEach(src => {
        const opt = document.createElement('option');
        opt.value = src;
        opt.textContent = `${src} (${sourcesMap[src].count})`;
        if (src === currentVal) opt.selected = true;
        sourceSelect.appendChild(opt);
      });
    }

    // 4. Filter and Render Logs Feed
    const list = document.getElementById('logs-list');
    if (!list) return;
    list.innerHTML = '';

    const selectedSource = sourceSelect?.value || 'ALL';
    const levelSelect = document.getElementById('log-filter-level');
    const selectedLevel = levelSelect?.value || 'ALL';

    const filteredLogs = logs.filter(l => {
      const matchSource = selectedSource === 'ALL' || l.source === selectedSource;
      const matchLevel = selectedLevel === 'ALL' || l.level === selectedLevel;
      return matchSource && matchLevel;
    });

    if (!filteredLogs.length) {
      list.innerHTML = `<div style="padding:16px; color:var(--text-muted); font-size:0.85rem;">No hay logs que coincidan con los filtros seleccionados.</div>`;
      return;
    }

    filteredLogs.slice(0, 100).forEach(l => {
      const row = document.createElement('div');
      row.className = 'log-row';
      row.innerHTML = `
        <span class="log-level ${l.level}">${l.level}</span>
        <span style="color:var(--text-muted); font-size:0.78rem;">${new Date(l.timestamp).toLocaleTimeString()}</span>
        <strong style="color:var(--primary); font-size:0.85rem;">${l.source}:</strong>
        <span style="font-size:0.85rem;">${l.message}</span>
        ${l.correlationId ? `<span style="color:var(--accent); font-size:0.75rem; margin-left:auto;">(${l.correlationId})</span>` : ''}`;
      list.appendChild(row);
    });
  }

  renderWaf() {
    const grid = document.getElementById('waf-grid');
    grid.innerHTML = '';
    const rules = Object.values(this.state.soldierRules || {}).sort((a, b) => (a.priority || 50) - (b.priority || 50));
    if (!rules.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay reglas WAF configuradas.</p>`;
      return;
    }
    rules.forEach(r => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      const actionBadge = r.action === 'allow'
        ? '<span class="badge-tag" style="background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;">ALLOW</span>'
        : r.action === 'custom_payload'
        ? '<span class="badge-tag" style="background:rgba(167,139,250,0.2); color:var(--primary); border-color:var(--primary);">CUSTOM PAYLOAD</span>'
        : `<span class="badge-tag" style="background:rgba(244,63,94,0.2); color:var(--danger); border-color:var(--danger);">${r.action.toUpperCase()}</span>`;
      card.innerHTML = `
        <span class="priority-badge">Prioridad #${r.priority || 10}</span>
        <div class="resource-card-title">${r.name}</div>
        <div style="margin-bottom:8px;">${actionBadge}<span class="badge-tag" style="margin-left:4px;">App: ${r.targetApp || '*'}</span></div>
        <div class="resource-card-sub" style="font-size:0.8rem;">${r.pathPattern ? 'Path: ' + r.pathPattern : 'Ruta: Global'}</div>
        <div style="font-size:0.78rem; color:var(--text-muted);">${r.ipPattern ? 'IP: ' + r.ipPattern : (r.headerName ? 'Header: ' + r.headerName + ' ~ ' + r.headerValuePattern : 'Criterio General')}</div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editWaf('${r.ruleId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delWaf('${r.ruleId}')">🗑️ Eliminar</button>
        </div>`;
      grid.appendChild(card);
    });
  }

  renderAdapters() {
    const grid = document.getElementById('adapters-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const adapters = Object.values(this.state.legionaryAdapters || {});
    if (!adapters.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay adaptadores de purga. Haz clic en '+ Nuevo Adaptador de Purga'.</p>`;
      return;
    }
    adapters.forEach(a => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      const groupsList = (a.groups || []).map(g => `
        <div style="font-size:0.82rem; margin-bottom:4px; color:var(--text-muted);">
          📦 <strong>${g.groupName}</strong> <span class="badge-tag">${g.provider.toUpperCase()}</span>
        </div>`).join('');
      card.innerHTML = `
        <div class="resource-card-title">${a.name}</div>
        <div style="margin-bottom:12px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
          ${groupsList || '<span style="color:var(--text-muted);">Sin grupos de recursos</span>'}
        </div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editAdapter('${a.adapterId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delAdapter('${a.adapterId}')">🗑️ Eliminar</button>
        </div>`;
      grid.appendChild(card);
    });
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

  openSubModal(subId = null) {
    this.editingSubId = subId;
    const testResultEl = document.getElementById('sub-webhook-test-result');
    if (testResultEl) testResultEl.innerHTML = '';

    if (subId) {
      const s = this.state.subscriptions[subId];
      document.getElementById('modal-sub-title').textContent = 'Editar Suscripción';
      document.getElementById('sub-topic').value = s.topic;
      document.getElementById('sub-name').value = s.subscriberName;
      document.getElementById('sub-webhook').value = s.targetWebhookUrl || '';
    } else {
      document.getElementById('modal-sub-title').textContent = 'Nueva Suscripción Pub/Sub';
      document.getElementById('sub-topic').value = 'security.alert';
      document.getElementById('sub-name').value = '';
      document.getElementById('sub-webhook').value = '';
    }
    document.getElementById('modal-sub').classList.remove('hidden');
  }

  closeSubModal() { document.getElementById('modal-sub').classList.add('hidden'); }

  async testSubWebhook() {
    const url = document.getElementById('sub-webhook').value.trim();
    const resultEl = document.getElementById('sub-webhook-test-result');
    if (!resultEl) return;

    if (!url) {
      resultEl.innerHTML = `<span style="color:var(--danger);">⚠️ Escribe una URL de Webhook para probar.</span>`;
      return;
    }

    resultEl.innerHTML = `<span style="color:var(--accent);">⏱️ Probando conexión POST con ${url}...</span>`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Formica-Queen-Studio/1.0' },
        body: JSON.stringify({ event: 'formica.ping', sender: 'Queen-Studio-Tester', timestamp: new Date().toISOString() }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      if (res.ok || res.status < 400) {
        resultEl.innerHTML = `<span style="color:var(--accent); font-weight:700;">✅ Webhook Activo (${res.status} ${res.statusText || 'OK'} — ${duration}ms)</span>`;
      } else {
        resultEl.innerHTML = `<span style="color:var(--danger); font-weight:700;">⚠️ Webhook respondió con código ${res.status} (${duration}ms)</span>`;
      }
    } catch (e) {
      const duration = Date.now() - startTime;
      if (e.name === 'AbortError') {
        resultEl.innerHTML = `<span style="color:var(--danger);">❌ Timeout: El webhook tardó más de 4000ms en responder.</span>`;
      } else {
        resultEl.innerHTML = `<span style="color:var(--danger);">❌ Error de conexión / CORS: ${e.message || 'Fallo de red'} (${duration}ms)</span>`;
      }
    }
  }

  saveSub() {
    const topic = document.getElementById('sub-topic').value.trim();
    const name = document.getElementById('sub-name').value.trim();
    const webhook = document.getElementById('sub-webhook').value.trim();
    if (!topic || !name) { this.toast('Tópico y Nombre son requeridos.'); return; }
    const id = this.editingSubId || `sub_${Date.now()}`;
    const existing = this.state.subscriptions[id];
    this.state.subscriptions[id] = {
      subId: id, topic, subscriberName: name, targetWebhookUrl: webhook || undefined,
      active: existing ? existing.active : true,
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    this.closeSubModal();
    this.renderAll();
    this.persistState();
    this.toast('Suscripción guardada');
  }

  editSub(id) { this.openSubModal(id); }
  delSub(id) {
    delete this.state.subscriptions[id];
    this.renderAll();
    this.persistState();
    this.toast('Suscripción eliminada');
  }

  // ─── EVENT PUBLISHING & LIVE MATCHING ─────────────────────────────────────

  openEventModal() {
    const topicEl = document.getElementById('event-topic');
    const senderEl = document.getElementById('event-sender');
    const payloadEl = document.getElementById('event-payload-json');

    if (topicEl && !topicEl.value) topicEl.value = '';
    if (senderEl && !senderEl.value) senderEl.value = '';
    if (payloadEl && !payloadEl.value) {
      payloadEl.value = '{\n  \n}';
    }

    this.validateEventJsonPayload();
    this.updateEventMatchingPreview();
    document.getElementById('modal-event').classList.remove('hidden');
  }

  closeEventModal() { document.getElementById('modal-event').classList.add('hidden'); }

  updateEventMatchingPreview() {
    const topic = (document.getElementById('event-topic')?.value || '').trim();
    const previewEl = document.getElementById('event-matching-preview');
    if (!previewEl) return;

    if (!topic) {
      previewEl.innerHTML = `<span style="color:var(--text-muted);">Escribe un tópico para ver suscriptores coincidentes en tiempo real.</span>`;
      return;
    }

    const allSubs = Object.values(this.state.subscriptions || {}).filter(s => s.active !== false);
    const matched = allSubs.filter(s => s.topic === '*' || s.topic === topic);

    if (!matched.length) {
      previewEl.innerHTML = `<span style="color:var(--danger); font-size:0.8rem;">⚠️ Ninguna suscripción activa coincide actualmente con el tópico '<strong>${topic}</strong>'.</span>`;
    } else {
      const listStr = matched.map(m => `<strong>${m.subscriberName}</strong> (${m.targetWebhookUrl ? 'Webhook' : 'Internal'})`).join(', ');
      previewEl.innerHTML = `<span style="color:var(--accent); font-size:0.8rem;">🎯 <strong>${matched.length} suscriptor(es) coincidente(s)</strong>: ${listStr}</span>`;
    }
  }

  validateEventJsonPayload() {
    const raw = (document.getElementById('event-payload-json')?.value || '').trim();
    const badgeEl = document.getElementById('json-valid-badge');
    if (!badgeEl) return true;

    if (!raw) {
      badgeEl.textContent = 'Payload Vacío';
      badgeEl.style.color = 'var(--text-muted)';
      badgeEl.style.borderColor = 'var(--border)';
      return true;
    }

    try {
      JSON.parse(raw);
      badgeEl.textContent = 'JSON Válido ✓';
      badgeEl.style.color = 'var(--accent)';
      badgeEl.style.borderColor = 'var(--accent)';
      return true;
    } catch (e) {
      badgeEl.textContent = '⚠️ JSON Inválido';
      badgeEl.style.color = 'var(--danger)';
      badgeEl.style.borderColor = 'var(--danger)';
      return false;
    }
  }

  formatEventJsonPayload() {
    const el = document.getElementById('event-payload-json');
    if (!el) return;
    try {
      const parsed = JSON.parse(el.value.trim());
      el.value = JSON.stringify(parsed, null, 2);
      this.validateEventJsonPayload();
      this.toast('✨ JSON formateado correctamente');
    } catch {
      this.toast('⚠️ No se pudo formatear: Corrige los errores de sintaxis JSON.');
    }
  }

  runEventDryRun() {
    const topic = (document.getElementById('event-topic')?.value || '').trim();
    const sender = (document.getElementById('event-sender')?.value || '').trim();
    const channel = document.getElementById('event-delivery-channel')?.value || 'direct';
    const rawPayload = (document.getElementById('event-payload-json')?.value || '').trim();

    if (!topic) { this.toast('Escribe un Tópico para simular.'); return; }
    if (!this.validateEventJsonPayload()) { this.toast('Corrige el JSON del Payload antes de simular.'); return; }

    const allSubs = Object.values(this.state.subscriptions || {}).filter(s => s.active !== false);
    const matched = allSubs.filter(s => s.topic === '*' || s.topic === topic);

    let payloadObj = rawPayload;
    try { payloadObj = JSON.parse(rawPayload); } catch {}

    const summary = [
      `🔍 SIMULACIÓN DRY-RUN DE EVENTO PHEROMONES:`,
      `• Tópico: ${topic}`,
      `• Emisor: ${sender || 'Queen-Studio'}`,
      `• Canal elegido: ${channel === 'anthill' ? '🐜 Anthill Processing Server' : '⚡ Inmediato (Consola Directa)'}`,
      `• Suscriptores alcanzados: ${matched.length}`,
      matched.length ? matched.map(m => `   ↳ ${m.subscriberName} [${m.targetWebhookUrl ? 'Webhook: ' + m.targetWebhookUrl : 'Interno'}]`).join('\n') : '   (Sin receptores registrados)',
      `• Payload: ${JSON.stringify(payloadObj)}`
    ].join('\n');

    alert(summary);
  }

  async pubEvent() {
    const topic = (document.getElementById('event-topic')?.value || '').trim();
    const sender = (document.getElementById('event-sender')?.value || '').trim() || 'Queen-Studio';
    const channel = document.getElementById('event-delivery-channel')?.value || 'direct';
    const rawPayload = (document.getElementById('event-payload-json')?.value || '').trim();

    if (!topic) { this.toast('El Tópico del evento es requerido.'); return; }
    if (!this.validateEventJsonPayload()) { this.toast('El Payload JSON contiene errores de sintaxis.'); return; }

    let payload = rawPayload;
    try { payload = JSON.parse(rawPayload); } catch {}

    // Find active matched subscriptions
    const allSubs = Object.values(this.state.subscriptions || {}).filter(s => s.active !== false);
    const matched = allSubs.filter(s => s.topic === '*' || s.topic === topic);
    const deliveredNames = [];

    if (channel === 'direct') {
      // Direct HTTP dispatch from browser context
      for (const sub of matched) {
        if (sub.targetWebhookUrl) {
          try {
            fetch(sub.targetWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': 'Formica-Queen-Studio/1.0' },
              body: JSON.stringify({ topic, sender, payload, timestamp: new Date().toISOString() })
            }).catch(() => {});
            deliveredNames.push(`${sub.subscriberName} (HTTP POST)`);
          } catch {}
        } else {
          deliveredNames.push(`${sub.subscriberName} (Interno)`);
        }
      }
    } else {
      // Anthill server dispatch
      this.dispatchToAnthill({ type: 'pheromone', topic, sender, payload });
      deliveredNames.push(`Enviado a Anthill Server para ${matched.length} suscriptores`);
    }

    // Add Forager Log
    const msg = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    this.state.logs.unshift({
      level: 'info',
      source: sender,
      message: `[Event '${topic}'] ${msg}`,
      timestamp: new Date().toISOString()
    });

    this.closeEventModal();
    this.renderAll();
    this.persistState();
    this.toast(`🚀 Evento '${topic}' publicado (${matched.length} suscriptores notificados)`);
  }

  // ─── PROVIDER CONNECT MODAL ───────────────────────────────────────────────

  openProviderModal() {
    document.getElementById('modal-connect-provider').classList.remove('hidden');
    this.updateProviderSnippet();
  }

  closeProviderModal() {
    document.getElementById('modal-connect-provider').classList.add('hidden');
  }

  registerProvider() {
    const type = document.getElementById('provider-type-select')?.value || 'terra-sdk';
    const nameInput = (document.getElementById('provider-name-input')?.value || '').trim();
    const typeLabelMap = {
      'terra-sdk': 'Terra-SDK-App',
      'aws': 'AWS-Lambda',
      'node-fetch': 'Node-Backend',
      'python': 'Python-Service',
      'azure': 'Azure-Function',
      'slack-discord': 'Webhook-Relay'
    };
    const providerName = nameInput || typeLabelMap[type] || 'Custom-Provider';

    // Log registration signal to state and Anthill
    const logItem = {
      level: 'info',
      source: providerName,
      message: `🔌 Provider '${providerName}' [${type.toUpperCase()}] registrado mediante Asistente de Conexión`,
      timestamp: new Date().toISOString()
    };

    this.state.logs.unshift(logItem);
    this.dispatchToAnthill({ type: 'log', level: 'info', source: providerName, message: logItem.message });

    this.closeProviderModal();
    this.renderAll();
    this.persistState();

    // Select the newly registered provider in Foragers log filter
    const sourceSelect = document.getElementById('log-filter-source');
    if (sourceSelect) {
      sourceSelect.value = providerName;
      this.renderLogs();
    }

    this.toast(`🔌 Provider '${providerName}' registrado con éxito. ¡Ya visible en Foragers!`);
  }

  updateProviderSnippet() {
    const type = document.getElementById('provider-type-select')?.value || 'terra-sdk';
    const name = (document.getElementById('provider-name-input')?.value || 'mi-servicio-prod').trim();
    const snippetEl = document.getElementById('provider-snippet-code');
    if (!snippetEl) return;

    const anthillRepo = this.anthillRepo || `${this.currentUser || 'user'}/formica-anthill`;

    let code = '';
    if (type === 'terra-sdk') {
      code = `// Formica SDK (Node.js / TypeScript)
import { Formica } from 'terra-formica';

const formica = new Formica({
  githubToken: process.env.FORMICA_PAT,
  anthillRepo: '${anthillRepo}'
});

// 🍃 Enviar log de telemetría a Foragers
await formica.emitLog('info', '${name}', 'Servicio iniciado correctamente');

// 🧪 Publicar evento Pub/Sub en Pheromones
await formica.emit('user.signup', '${name}', { userId: 'usr_99', role: 'customer' });`;
    } else if (type === 'aws') {
      code = `// AWS Lambda (Node.js / Python / EventBridge)
import requests # o fetch en Node.js

url = "https://api.github.com/repos/${anthillRepo}/dispatches"
headers = {
    "Authorization": "Bearer YOUR_GITHUB_PAT",
    "Content-Type": "application/json"
}
payload = {
    "event_type": "formica-ingest",
    "client_payload": {
        "type": "log",
        "level": "info",
        "source": "${name}",
        "message": "AWS Lambda triggered successfully"
    }
}
requests.post(url, headers=headers, json=payload)`;
    } else if (type === 'node-fetch') {
      code = `// cURL / Node.js Native HTTP POST (sin SDK)
await fetch('https://api.github.com/repos/${anthillRepo}/dispatches', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_GITHUB_PAT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_type: 'formica-ingest',
    client_payload: {
      type: 'log',
      level: 'info',
      source: '${name}',
      message: 'Operación ejecutada con éxito'
    }
  })
});`;
    } else if (type === 'python') {
      code = `# Python (requests)
import requests

requests.post(
    'https://api.github.com/repos/${anthillRepo}/dispatches',
    headers={
        'Authorization': 'Bearer YOUR_GITHUB_PAT',
        'Content-Type': 'application/json'
    },
    json={
        'event_type': 'formica-ingest',
        'client_payload': {
            'type': 'log',
            'level': 'info',
            'source': '${name}',
            'message': 'Proceso completado'
        }
    }
)`;
    } else if (type === 'azure') {
      code = `# Azure Functions / Event Grid (Python / Node.js)
import requests

def main(mytimer):
    requests.post(
        'https://api.github.com/repos/${anthillRepo}/dispatches',
        headers={'Authorization': 'Bearer YOUR_GITHUB_PAT'},
        json={'event_type': 'formica-ingest', 'client_payload': {'type': 'pheromone', 'topic': 'azure.timer', 'sender': '${name}', 'payload': {'status': 'ok'}}}
    )`;
    } else if (type === 'slack-discord') {
      code = `# Configuración de Webhook de Discord / Slack en Formica
1. En Formica Queen Studio, ve a la pestaña 🧪 Pheromones -> + Nueva Suscripción
2. Tópico: 'security.alert' (o cualquier evento que quieras recibir)
3. Nombre: '${name}-Webhook'
4. Webhook Target URL: Pega tu Discord Webhook / Slack Incoming Webhook URL
5. Pulsa 🧪 Probar Webhook para verificar la respuesta HTTP!`;
    }

    snippetEl.textContent = code;
  }

  // ─── CHAMBERS (REDIS-LIKE MULTI-KEY DB) ───────────────────────────────────

  openKvModal(chamberId = null) {
    this.editingChamberId = chamberId;
    this.editingEntryIndex = null;

    // Always clear builder inputs
    document.getElementById('builder-entry-key').value = '';
    document.getElementById('builder-entry-val').value = '';
    document.getElementById('builder-entry-ttl').value = '';

    if (chamberId && this.state.chambers[chamberId]) {
      const c = this.state.chambers[chamberId];
      const isDb = 'entries' in c;
      document.getElementById('modal-kv-title').textContent = 'Editar Cámara K/V';
      document.getElementById('chamber-name').value = isDb ? c.name : `Cámara ${c.key}`;
      document.getElementById('chamber-id').value = isDb ? c.chamberId : c.key;
      document.getElementById('chamber-desc').value = isDb ? (c.description || '') : '';
      this.currentChamberEntries = isDb
        ? Object.values(c.entries || {}).map(e => ({ ...e }))
        : [{ key: c.key, value: c.value, expiresAt: c.expiresAt, ttlSeconds: c.ttlSeconds }];
    } else {
      document.getElementById('modal-kv-title').textContent = 'Nueva Cámara K/V (Redis DB)';
      document.getElementById('chamber-name').value = '';
      document.getElementById('chamber-id').value = '';
      document.getElementById('chamber-desc').value = '';
      this.currentChamberEntries = [];
    }

    this.renderAddedChamberEntriesList();
    document.getElementById('modal-kv').classList.remove('hidden');
  }
  closeKvModal() { document.getElementById('modal-kv').classList.add('hidden'); }

  addChamberEntryToBuilder() {
    const keyEl = document.getElementById('builder-entry-key');
    const valEl = document.getElementById('builder-entry-val');
    const ttlEl = document.getElementById('builder-entry-ttl');
    const key = keyEl.value.trim();
    const rawVal = valEl.value.trim();
    const ttlSeconds = parseInt(ttlEl.value || '0', 10);
    if (!key || !rawVal) { this.toast('Clave y Valor son requeridos.'); return; }
    let value = rawVal;
    try { value = JSON.parse(rawVal); } catch {}
    const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

    // Check for duplicate key (update existing)
    const existingIdx = this.currentChamberEntries.findIndex(e => e.key === key);
    if (existingIdx >= 0) {
      this.currentChamberEntries[existingIdx] = { key, value, ttlSeconds, expiresAt };
    } else {
      this.currentChamberEntries.push({ key, value, ttlSeconds, expiresAt });
    }

    keyEl.value = '';
    valEl.value = '';
    ttlEl.value = '';
    this.editingEntryIndex = null;
    this.renderAddedChamberEntriesList();
    this.toast(`Clave '${key}' ${existingIdx >= 0 ? 'actualizada' : 'añadida'}`);
  }

  openEntryInlineEdit(idx) {
    this.editingEntryIndex = (this.editingEntryIndex === idx) ? null : idx;
    this.renderAddedChamberEntriesList();
  }

  saveEntryInlineEdit(idx) {
    const keyEl = document.getElementById(`inline-key-${idx}`);
    const valEl = document.getElementById(`inline-val-${idx}`);
    const ttlEl = document.getElementById(`inline-ttl-${idx}`);
    if (!keyEl || !valEl) return;

    const key = keyEl.value.trim();
    const rawVal = valEl.value.trim();
    const ttlSeconds = parseInt(ttlEl.value || '0', 10);
    if (!key || !rawVal) { this.toast('Clave y Valor son requeridos.'); return; }
    let value = rawVal;
    try { value = JSON.parse(rawVal); } catch {}
    const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

    this.currentChamberEntries[idx] = { key, value, ttlSeconds, expiresAt };
    this.editingEntryIndex = null;
    this.renderAddedChamberEntriesList();
    this.toast(`Clave '${key}' actualizada`);
  }

  removeChamberEntryFromBuilder(idx) {
    this.currentChamberEntries.splice(idx, 1);
    if (this.editingEntryIndex === idx) this.editingEntryIndex = null;
    this.renderAddedChamberEntriesList();
  }


  renderAddedChamberEntriesList() {
    const container = document.getElementById('chamber-added-entries-list');
    container.innerHTML = '';

    if (!this.currentChamberEntries.length) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">No hay claves añadidas aún.</p>`;
      return;
    }

    this.currentChamberEntries.forEach((e, idx) => {
      const isExp = e.expiresAt && new Date() > new Date(e.expiresAt);
      const isEditing = this.editingEntryIndex === idx;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom:6px;';

      // Main row — two-line layout to avoid horizontal squeeze
      const row = document.createElement('div');
      row.className = 'added-group-row';
      row.style.cssText = `
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
        ${isEditing ? 'border-bottom-left-radius:0; border-bottom-right-radius:0; border-bottom: 1px solid var(--primary);' : ''}
      `;

      // Line 1: key name + TTL badge + action buttons
      const line1 = document.createElement('div');
      line1.style.cssText = 'display:flex; align-items:center; gap:6px;';
      line1.innerHTML = `
        <strong style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔑 ${e.key}</strong>
        <span class="badge-tag" style="flex-shrink:0; color:${isExp ? 'var(--danger)' : 'var(--accent)'}; border-color:${isExp ? 'var(--danger)' : 'var(--accent)'}">
          ${isExp ? '⚠️ EXPIRADO' : (e.expiresAt ? '⏱️ TTL' : '♾️')}
        </span>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.openEntryInlineEdit(${idx})" type="button">
            ${isEditing ? '✖' : '✏️'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.removeChamberEntryFromBuilder(${idx})" type="button">🗑️</button>
        </div>`;

      // Line 2: value preview, truncated with ellipsis
      const line2 = document.createElement('div');
      const rawPreview = typeof e.value === 'object' ? JSON.stringify(e.value) : String(e.value);
      line2.style.cssText = 'font-size:0.77rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; padding: 0 2px;';
      line2.title = rawPreview; // full value on hover
      line2.textContent = rawPreview;

      row.appendChild(line1);
      row.appendChild(line2);
      wrapper.appendChild(row);

      // Inline edit panel — values set via .value to avoid HTML quoting issues
      if (isEditing) {
        const panel = document.createElement('div');
        panel.style.cssText = `
          background: rgba(88,61,161,0.15);
          border: 1px solid var(--primary);
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 12px;
        `;

        // Build the panel HTML structure (no value attributes — set via JS below)
        panel.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Clave (Key):</label>
              <input type="text" id="inline-key-${idx}" style="width:100%; box-sizing:border-box;" />
            </div>
            <div>
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Valor (Value / JSON):</label>
              <input type="text" id="inline-val-${idx}" style="width:100%; box-sizing:border-box;" />
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-end;">
            <div style="flex:1;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">TTL en Segundos (0 = Permanente):</label>
              <input type="number" id="inline-ttl-${idx}" style="width:100%; box-sizing:border-box;" />
            </div>
            <button class="btn btn-primary btn-sm" onclick="consoleApp.saveEntryInlineEdit(${idx})" type="button" style="height:38px; padding:0 16px;">💾 Guardar</button>
            <button class="btn btn-secondary btn-sm" onclick="consoleApp.openEntryInlineEdit(${idx})" type="button" style="height:38px;">✖ Cerrar</button>
          </div>`;

        wrapper.appendChild(panel);

        // Set input values safely via JS (avoids JSON quote escaping issues in HTML attributes)
        requestAnimationFrame(() => {
          const keyInput = document.getElementById(`inline-key-${idx}`);
          const valInput = document.getElementById(`inline-val-${idx}`);
          const ttlInput = document.getElementById(`inline-ttl-${idx}`);
          if (keyInput) keyInput.value = e.key;
          if (valInput) valInput.value = typeof e.value === 'object' ? JSON.stringify(e.value, null, 2) : String(e.value);
          if (ttlInput) ttlInput.value = e.ttlSeconds || 0;
        });
      }

      container.appendChild(wrapper);
    });
  }



  saveKv() {
    const name = document.getElementById('chamber-name').value.trim();
    const chamberId = document.getElementById('chamber-id').value.trim() || `chamber_${Date.now()}`;
    const description = document.getElementById('chamber-desc').value.trim();
    if (!name) { this.toast('El nombre de la Cámara es requerido.'); return; }

    const entriesObj = {};
    this.currentChamberEntries.forEach(e => { entriesObj[e.key] = e; });

    this.state.chambers[chamberId] = {
      chamberId, name, description, entries: entriesObj,
      createdAt: this.state.chambers[chamberId]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.closeKvModal();
    this.renderAll();
    this.persistState();
    this.toast(`Cámara K/V '${name}' guardada con ${Object.keys(entriesObj).length} claves`);
  }
  editKv(id) { this.openKvModal(id); }
  delKv(id) {
    delete this.state.chambers[id];
    this.renderAll();
    this.persistState();
    this.toast('Cámara K/V eliminada');
  }

  // ─── FORAGERS ─────────────────────────────────────────────────────────────

  openLogModal() { document.getElementById('modal-log').classList.remove('hidden'); }
  closeLogModal() { document.getElementById('modal-log').classList.add('hidden'); }
  saveLog() {
    const level = document.getElementById('log-level-select').value;
    const source = document.getElementById('log-source').value.trim() || 'CustomApp';
    const message = document.getElementById('log-message').value.trim();
    const correlationId = document.getElementById('log-correlation').value.trim();
    if (!message) { this.toast('El mensaje del log es requerido.'); return; }
    this.state.logs.unshift({ level, source, message, correlationId: correlationId || undefined, timestamp: new Date().toISOString() });
    this.closeLogModal();
    this.renderAll();
    this.persistState();
    // Also send to Anthill for real-time ingestion
    this.dispatchToAnthill({ type: 'log', level, source, message });
    this.toast('Log enviado a Foragers');
  }

  // ─── SOLDIERS WAF ─────────────────────────────────────────────────────────

  openWafModal(ruleId = null) {
    this.editingWafId = ruleId;
    if (ruleId) {
      const r = this.state.soldierRules[ruleId];
      document.getElementById('modal-waf-title').textContent = 'Editar Regla WAF';
      document.getElementById('waf-name').value = r.name;
      document.getElementById('waf-target-app').value = r.targetApp || '';
      document.getElementById('waf-priority').value = r.priority || '';
      document.getElementById('waf-action').value = r.action;
      document.getElementById('waf-path').value = r.pathPattern || '';
      document.getElementById('waf-ip').value = r.ipPattern || '';
      document.getElementById('waf-header-name').value = r.headerName || '';
      document.getElementById('waf-custom-status').value = r.customStatusCode || '';
      document.getElementById('waf-custom-payload-json').value = typeof r.customPayload === 'object'
        ? JSON.stringify(r.customPayload, null, 2) : (r.customPayload || '');
    } else {
      document.getElementById('modal-waf-title').textContent = 'Nueva Regla WAF';
      ['waf-name','waf-target-app','waf-priority','waf-path','waf-ip','waf-header-name','waf-custom-status','waf-custom-payload-json'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('waf-action').value = 'block';
    }
    this.toggleWafCustomPayloadField();
    document.getElementById('modal-waf').classList.remove('hidden');
  }

  toggleWafCustomPayloadField() {
    const act = document.getElementById('waf-action').value;
    document.getElementById('waf-custom-payload-container').classList.toggle('hidden', act !== 'custom_payload');
  }
  closeWafModal() { document.getElementById('modal-waf').classList.add('hidden'); }

  saveWaf() {
    const name = document.getElementById('waf-name').value.trim();
    const targetApp = document.getElementById('waf-target-app').value.trim() || '*';
    const priority = parseInt(document.getElementById('waf-priority').value || '10', 10);
    const action = document.getElementById('waf-action').value;
    const pathPattern = document.getElementById('waf-path').value.trim();
    const ipPattern = document.getElementById('waf-ip').value.trim();
    const headerName = document.getElementById('waf-header-name').value.trim();
    const customStatus = parseInt(document.getElementById('waf-custom-status').value || '403', 10);
    const rawPayload = document.getElementById('waf-custom-payload-json').value.trim();
    if (!name) { this.toast('El nombre de la regla es requerido.'); return; }
    let customPayload;
    if (action === 'custom_payload' && rawPayload) {
      try { customPayload = JSON.parse(rawPayload); } catch { customPayload = rawPayload; }
    }
    const id = this.editingWafId || `rule_${Date.now()}`;
    this.state.soldierRules[id] = {
      ruleId: id, name, targetApp, priority, action,
      pathPattern: pathPattern || '*', ipPattern: ipPattern || undefined,
      headerName: headerName || undefined, customStatusCode: customStatus,
      customPayload, active: true, createdAt: new Date().toISOString()
    };
    this.closeWafModal();
    this.renderAll();
    this.persistState();
    this.toast('Regla WAF guardada');
  }
  editWaf(id) { this.openWafModal(id); }
  delWaf(id) {
    delete this.state.soldierRules[id];
    this.renderAll();
    this.persistState();
    this.toast('Regla WAF eliminada');
  }

  // ─── LEGIONARYS ───────────────────────────────────────────────────────────

  openAdapterModal(adapterId = null) {
    this.editingAdapterId = adapterId;
    if (adapterId) {
      const a = this.state.legionaryAdapters[adapterId];
      document.getElementById('modal-adapter-title').textContent = 'Editar Adaptador de Purga';
      document.getElementById('adapter-name').value = a.name;
      document.getElementById('adapter-endpoint').value = a.targetEndpoint || '';
      this.currentAdapterGroups = [...(a.groups || [])];
    } else {
      document.getElementById('modal-adapter-title').textContent = 'Adaptador de Purga Programado';
      document.getElementById('adapter-name').value = '';
      document.getElementById('adapter-endpoint').value = '';
      this.currentAdapterGroups = [];
    }
    this.renderAddedGroupsList();
    document.getElementById('modal-adapter').classList.remove('hidden');
  }
  closeAdapterModal() { document.getElementById('modal-adapter').classList.add('hidden'); }

  addResourceGroupToBuilder() {
    const nameInput = document.getElementById('builder-group-name');
    const provSelect = document.getElementById('builder-group-provider');
    const filterInput = document.getElementById('builder-group-filter');
    const groupName = nameInput.value.trim();
    if (!groupName) { this.toast('Escribe un nombre para el grupo.'); return; }
    this.currentAdapterGroups.push({ groupName, provider: provSelect.value, filter: filterInput.value.trim() || 'default' });
    nameInput.value = '';
    filterInput.value = '';
    this.renderAddedGroupsList();
    this.toast(`Grupo '${groupName}' añadido`);
  }

  removeResourceGroupFromBuilder(idx) {
    this.currentAdapterGroups.splice(idx, 1);
    this.renderAddedGroupsList();
  }

  renderAddedGroupsList() {
    const container = document.getElementById('adapter-added-groups-list');
    container.innerHTML = '';
    if (!this.currentAdapterGroups.length) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">No hay grupos añadidos aún.</p>`;
      return;
    }
    this.currentAdapterGroups.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'added-group-row';
      row.innerHTML = `
        <div>
          <strong>📦 ${g.groupName}</strong>
          <span class="badge-tag" style="margin-left:6px;">${g.provider.toUpperCase()}</span>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">(${g.filter})</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="consoleApp.removeResourceGroupFromBuilder(${idx})" type="button">🗑️</button>`;
      container.appendChild(row);
    });
  }

  saveAdapter() {
    const name = document.getElementById('adapter-name').value.trim();
    const endpoint = document.getElementById('adapter-endpoint').value.trim();
    if (!name) { this.toast('El nombre del adaptador es requerido.'); return; }
    if (!this.currentAdapterGroups.length) { this.toast('Añade al menos un grupo de recursos.'); return; }
    const id = this.editingAdapterId || `adapter_${Date.now()}`;
    this.state.legionaryAdapters[id] = {
      adapterId: id, name, groups: [...this.currentAdapterGroups],
      targetEndpoint: endpoint || undefined, active: true
    };
    this.closeAdapterModal();
    this.renderAll();
    this.persistState();
    this.toast('Adaptador guardado correctamente');
  }
  editAdapter(id) { this.openAdapterModal(id); }
  delAdapter(id) {
    delete this.state.legionaryAdapters[id];
    this.renderAll();
    this.persistState();
    this.toast('Adaptador eliminado');
  }

  // ─── PURGE SIMULATION ─────────────────────────────────────────────────────

  runPurgeDryRun() {
    this.simulatedAdapterGroups = [
      {
        adapterId: 'adapter_prod', adapterName: 'Adaptador Bóvedas Producción',
        resourceGroups: [
          { groupName: 'Néctares Expirados Sinchlor', provider: 'SINCHLOR',
            items: [{ id: 'item_1', provider: 'SINCHLOR', desc: 'Néctar efímero \'prod_db_temp\' (Expirado por TTL)', bytes: 2048, selected: true }] },
          { groupName: 'MagicLinks Agotados Lumina', provider: 'LUMINA',
            items: [{ id: 'item_2', provider: 'LUMINA', desc: 'LanternLink \'usr_9981\' (Agotado)', bytes: 1024, selected: true }] }
        ]
      },
      {
        adapterId: 'adapter_storage', adapterName: 'Adaptador Caché & Storage Global',
        resourceGroups: [
          { groupName: 'Entradas K/V Expiradas', provider: 'CHAMBERS',
            items: [{ id: 'item_3', provider: 'CHAMBERS', desc: 'Entrada K/V \'temp_cache\' (Expirada por TTL)', bytes: 512, selected: true }] },
          { groupName: 'Rolla Balls Obsoletas', provider: 'ROLLA',
            items: [{ id: 'item_4', provider: 'ROLLA', desc: 'Rolla-Ball \'old_assets_v1\' (Obsoleta)', bytes: 10485760, selected: true }] }
        ]
      }
    ];
    this.renderPurgeReport();
    this.toast('Simulación Dry-Run ejecutada.');
  }

  renderPurgeReport() {
    const listContainer = document.getElementById('purge-report-items');
    listContainer.innerHTML = '';
    if (!this.simulatedAdapterGroups.length) {
      document.getElementById('purge-report-summary').innerHTML = 'Haz clic en \'Simular Purga\' para detectar recursos caducados.';
      return;
    }
    this.simulatedAdapterGroups.forEach((adapter, aIdx) => {
      let total = 0, selected = 0, bytes = 0;
      adapter.resourceGroups.forEach(rg => rg.items.forEach(i => { total++; if (i.selected) { selected++; bytes += i.bytes; } }));

      const card = document.createElement('div');
      card.className = 'purge-accordion-card';
      card.id = `accordion-card-${aIdx}`;
      card.innerHTML = `
        <div class="purge-accordion-header" onclick="consoleApp.toggleAccordion(${aIdx}, event)">
          <input type="checkbox" id="master-chk-${aIdx}" ${selected === total ? 'checked' : ''} onclick="event.stopPropagation(); consoleApp.toggleMasterAdapter(${aIdx})" />
          <div class="purge-accordion-title">⚙️ ${adapter.adapterName}</div>
          <div class="purge-accordion-meta">${selected}/${total} ítems (${bytes.toLocaleString()} B)</div>
          <span class="purge-accordion-chevron">▼</span>
        </div>
        <div class="purge-accordion-body">
          ${adapter.resourceGroups.map((rg, rgIdx) => `
            <div class="purge-group-box">
              <div class="purge-group-title">📦 ${rg.groupName} <span class="badge-tag">${rg.provider}</span></div>
              ${rg.items.map((item, iIdx) => `
                <div class="purge-item-row">
                  <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="consoleApp.togglePurgeItem(${aIdx}, ${rgIdx}, ${iIdx})" />
                  <span class="purge-item-badge">${item.provider}</span>
                  <span style="flex:1;">${item.desc}</span>
                  <span style="color:var(--primary); font-family:monospace; font-weight:600;">+${item.bytes.toLocaleString()} B</span>
                </div>`).join('')}
            </div>`).join('')}
        </div>`;
      listContainer.appendChild(card);
    });
    this.updatePurgeSummary();
  }

  toggleAccordion(aIdx, event) {
    if (event.target.tagName === 'INPUT') return;
    document.getElementById(`accordion-card-${aIdx}`)?.classList.toggle('collapsed');
  }
  toggleMasterAdapter(aIdx) {
    const isChecked = document.getElementById(`master-chk-${aIdx}`)?.checked;
    this.simulatedAdapterGroups[aIdx]?.resourceGroups.forEach(rg => rg.items.forEach(i => { i.selected = isChecked; }));
    this.renderPurgeReport();
  }
  togglePurgeItem(aIdx, rgIdx, iIdx) {
    const item = this.simulatedAdapterGroups[aIdx]?.resourceGroups[rgIdx]?.items[iIdx];
    if (item) { item.selected = !item.selected; this.renderPurgeReport(); }
  }
  updatePurgeSummary() {
    let totalSelected = 0, totalItems = 0, totalBytes = 0;
    this.simulatedAdapterGroups.forEach(a => a.resourceGroups.forEach(rg => rg.items.forEach(i => {
      totalItems++;
      if (i.selected) { totalSelected++; totalBytes += i.bytes; }
    })));
    document.getElementById('purge-report-summary').innerHTML = `
      <strong style="color:var(--primary);">Simulación Activa:</strong>
      <span style="color:var(--accent); font-weight:700;">${totalSelected} de ${totalItems} elementos</span> seleccionados
      · <span style="color:var(--primary); font-weight:700;">${totalBytes.toLocaleString()} bytes</span> a liberar.`;
  }
  executeSelectedPurge() {
    let count = 0, bytes = 0;
    this.simulatedAdapterGroups.forEach(a => a.resourceGroups.forEach(rg => rg.items.forEach(i => {
      if (i.selected) { count++; bytes += i.bytes; }
    })));
    if (!count) { this.toast('Marca al menos un elemento.'); return; }
    this.simulatedAdapterGroups.forEach(a => a.resourceGroups.forEach(rg => { rg.items = rg.items.filter(i => !i.selected); }));
    this.renderAll();
    this.renderPurgeReport();
    this.persistState();
    this.toast(`⚡ Purga ejecutada: ${bytes.toLocaleString()} bytes liberados`);
  }

  // ─── UTILS ────────────────────────────────────────────────────────────────

  toast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ─── ANTHILL ──────────────────────────────────────────────────────────────

  get _ghHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Formica-Queen-Studio'
    };
  }

  async initAnthill() {
    if (!this.token || !this.currentUser) return;
    const repoName = 'formica-anthill';
    const fullName = `${this.currentUser}/${repoName}`;

    // Check if repo exists
    const check = await fetch(`https://api.github.com/repos/${fullName}`, { headers: this._ghHeaders });

    if (!check.ok) {
      // Create repo
      this.toast('🐜 Creando formica-anthill...');
      const create = await fetch('https://api.github.com/user/repos', {
        method: 'POST', headers: this._ghHeaders,
        body: JSON.stringify({
          name: repoName,
          description: '🐜 Formica Anthill — Personal Event Processing Server',
          private: false, auto_init: true
        })
      });
      if (!create.ok) { this.toast('No se pudo crear formica-anthill'); return; }
      await new Promise(r => setTimeout(r, 2500)); // wait for GitHub to init
      await this.pushAnthillFiles(fullName);
      await this.setAnthillVars(fullName);
      this.toast('🐜 Anthill creado y configurado en tu cuenta GitHub!');
    } else {
      await this.setAnthillVars(fullName); // ensure vars are current
    }

    this.anthillRepo = fullName;
    await this.refreshAnthillStatus();
  }

  async pushAnthillFiles(fullName) {
    const workflowYml = `name: Formica Anthill — Event Processing Server

on:
  repository_dispatch:
    types: [formica-ingest]

concurrency:
  group: anthill-server
  cancel-in-progress: false

jobs:
  anthill:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run Anthill Server
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          FORMICA_TOKEN: \${{ vars.FORMICA_TOKEN }}
          FORMICA_STORAGE_REPO: \${{ vars.FORMICA_STORAGE_REPO }}
          INITIAL_PAYLOAD: \${{ toJson(github.event.client_payload) }}
          ANTHILL_REPO: \${{ github.repository }}
          IDLE_TIMEOUT_MIN: '10'
          POLL_INTERVAL_SEC: '20'
        run: node anthill.js
`;

    const anthillJs = `// Formica Anthill Server v1.0
// Self-contained event processor — runs inside GitHub Actions

const GH_TOKEN = process.env.FORMICA_TOKEN || process.env.GH_TOKEN;
const STORAGE_REPO = process.env.FORMICA_STORAGE_REPO;
const ANTHILL_REPO = process.env.ANTHILL_REPO || process.env.GITHUB_REPOSITORY;
const IDLE_MS = parseInt(process.env.IDLE_TIMEOUT_MIN || '10') * 60 * 1000;
const POLL_MS = parseInt(process.env.POLL_INTERVAL_SEC || '20') * 1000;

const H = {
  'Authorization': \`Bearer \${GH_TOKEN}\`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'Formica-Anthill/1.0'
};

async function ghGet(path) {
  try { const r = await fetch(\`https://api.github.com\${path}\`, { headers: H }); return r.ok ? r.json() : null; } catch { return null; }
}

async function getFile(repo, path) {
  const d = await ghGet(\`/repos/\${repo}/contents/\${path}\`);
  if (!d) return { data: null, sha: null };
  try { return { data: JSON.parse(Buffer.from(d.content.replace(/\\n/g,''), 'base64').toString()), sha: d.sha }; }
  catch { return { data: null, sha: d.sha }; }
}

async function putFile(repo, path, data, sha, msg) {
  const body = { message: \`[Anthill] \${msg}\`, content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  try { const r = await fetch(\`https://api.github.com/repos/\${repo}/contents/\${path}\`, { method:'PUT', headers:H, body:JSON.stringify(body) }); return r.ok; }
  catch { return false; }
}

async function processEvent(event) {
  if (!STORAGE_REPO) { console.log('No FORMICA_STORAGE_REPO'); return; }
  const { type, topic, sender, payload, level, source, message } = event || {};
  const vaultPath = 'formica-colony-default-colony.json';
  let { data: state, sha } = await getFile(STORAGE_REPO, vaultPath);
  if (!state) state = { subscriptions: {}, chambers: {}, logs: [], soldierRules: {}, legionaryAdapters: {} };
  const now = new Date().toISOString();

  if (type === 'log' || type === 'forager') {
    const log = { logId: \`log_\${Date.now()}\`, level: level || 'info', source: source || sender || 'external', message: message || JSON.stringify(payload || {}), timestamp: now };
    state.logs = [log, ...(state.logs || [])].slice(0, 500);
    await putFile(STORAGE_REPO, vaultPath, state, sha, \`Log from \${log.source}\`);
    console.log(\`[LOG] \${log.source}: \${log.message}\`);
    return;
  }

  if (type === 'event' || type === 'pheromone') {
    const subs = Object.values(state.subscriptions || {}).filter(s => s.active && (s.topic === '*' || s.topic === topic));
    const delivered = [];
    for (const sub of subs) {
      if (sub.targetWebhookUrl) {
        try {
          await fetch(sub.targetWebhookUrl, { method:'POST', headers:{'Content-Type':'application/json','User-Agent':'Formica-Anthill/1.0'}, body: JSON.stringify({ topic, sender, payload, timestamp: now }) });
          delivered.push(sub.subscriberName);
        } catch (e) { console.log(\`Failed: \${sub.subscriberName}: \${e.message}\`); }
      } else { delivered.push(sub.subscriberName); }
    }
    const log = { logId: \`log_\${Date.now()}\`, level: 'info', source: 'Anthill-Pheromones', message: \`Event [\${topic}] from '\${sender}' -> \${delivered.length} subscribers\`, timestamp: now };
    state.logs = [log, ...(state.logs || [])].slice(0, 500);
    await putFile(STORAGE_REPO, vaultPath, state, sha, \`Pheromone: \${topic}\`);
    console.log(\`[EVENT] \${topic}: \${delivered.join(', ')}\`);
  }
  if (type === 'ping') { console.log(\`[PING] from \${sender || 'Studio'}\`); }
}

async function hb(alive) {
  const { sha } = await getFile(ANTHILL_REPO, 'heartbeat.json');
  await putFile(ANTHILL_REPO, 'heartbeat.json', { alive, timestamp: new Date().toISOString() }, sha, alive ? 'Heartbeat' : 'Sleep');
}

async function main() {
  console.log('Formica Anthill starting...');
  if (!GH_TOKEN) { console.error('No token'); process.exit(1); }

  const raw = process.env.INITIAL_PAYLOAD;
  if (raw && raw !== 'null' && raw !== '{}') {
    try { await processEvent(JSON.parse(raw)); } catch (e) { console.log(\`Init payload error: \${e.message}\`); }
  }

  await hb(true);
  let lastActivity = Date.now();
  console.log('Polling loop active...');

  while (true) {
    await new Promise(r => setTimeout(r, POLL_MS));
    const { data: queue, sha } = await getFile(ANTHILL_REPO, 'queue.json');
    if (queue && Array.isArray(queue) && queue.length > 0) {
      console.log(\`Processing \${queue.length} queued events\`);
      await putFile(ANTHILL_REPO, 'queue.json', [], sha, 'Clear queue');
      for (const ev of queue) { await processEvent(ev); }
      lastActivity = Date.now();
      await hb(true);
    }
    if (Date.now() - lastActivity > IDLE_MS) {
      console.log('Idle timeout. Sleeping.');
      await hb(false);
      break;
    }
    process.stdout.write(\`Idle: \${Math.round((Date.now()-lastActivity)/1000)}s\\r\`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
`;

    const files = [
      { path: '.github/workflows/anthill.yml', content: workflowYml, msg: 'Add Anthill workflow' },
      { path: 'anthill.js', content: anthillJs, msg: 'Add Anthill server script' },
      { path: 'queue.json', content: '[]', msg: 'Init queue', raw: true },
      { path: 'heartbeat.json', content: JSON.stringify({ alive: false, timestamp: new Date().toISOString() }), msg: 'Init heartbeat', raw: true }
    ];

    for (const f of files) {
      const content = f.raw ? btoa(f.content) : btoa(unescape(encodeURIComponent(f.content)));
      // Check if file exists to get SHA
      const existing = await fetch(`https://api.github.com/repos/${fullName}/contents/${f.path}`, { headers: this._ghHeaders });
      const body = { message: `🐜 [Anthill] ${f.msg}`, content };
      if (existing.ok) { const d = await existing.json(); body.sha = d.sha; }
      await fetch(`https://api.github.com/repos/${fullName}/contents/${f.path}`, {
        method: 'PUT', headers: this._ghHeaders, body: JSON.stringify(body)
      });
    }
  }

  async setAnthillVars(fullName) {
    // Set repository variables (no encryption needed unlike secrets)
    const vars = [
      { name: 'FORMICA_TOKEN', value: this.token },
      { name: 'FORMICA_STORAGE_REPO', value: `${this.currentUser}/.formica-storage` }
    ];
    for (const v of vars) {
      const check = await fetch(`https://api.github.com/repos/${fullName}/actions/variables/${v.name}`, { headers: this._ghHeaders });
      const method = check.ok ? 'PATCH' : 'POST';
      const url = check.ok
        ? `https://api.github.com/repos/${fullName}/actions/variables/${v.name}`
        : `https://api.github.com/repos/${fullName}/actions/variables`;
      await fetch(url, { method, headers: this._ghHeaders, body: JSON.stringify({ name: v.name, value: v.value }) });
    }
  }

  async refreshAnthillStatus() {
    if (!this.anthillRepo || !this.token) return;

    // Read heartbeat
    try {
      const hbRes = await fetch(`https://api.github.com/repos/${this.anthillRepo}/contents/heartbeat.json`, { headers: this._ghHeaders });
      if (hbRes.ok) {
        const d = await hbRes.json();
        this.anthillStatus = JSON.parse(atob(d.content.replace(/\n/g, '')));
      }
    } catch {}

    // Read last runs
    try {
      const runsRes = await fetch(`https://api.github.com/repos/${this.anthillRepo}/actions/runs?per_page=5`, { headers: this._ghHeaders });
      if (runsRes.ok) { const d = await runsRes.json(); this.anthillRuns = d.workflow_runs || []; }
    } catch {}

    this.renderAnthill();
  }

  async wakeAnthill() {
    if (!this.anthillRepo) { this.toast('Anthill no configurado aún'); return; }
    const res = await fetch(`https://api.github.com/repos/${this.anthillRepo}/dispatches`, {
      method: 'POST', headers: this._ghHeaders,
      body: JSON.stringify({ event_type: 'formica-ingest', client_payload: { type: 'ping', sender: 'Queen-Studio', timestamp: new Date().toISOString() } })
    });
    if (res.ok || res.status === 204) {
      this.toast('⚡ Señal enviada. Cold start ~20-30s...');
      setTimeout(() => this.refreshAnthillStatus(), 5000);
    } else {
      this.toast('Error al despertar el Anthill');
    }
  }

  async dispatchToAnthill(event) {
    if (!this.anthillRepo || !this.token) return;
    // If anthill is alive: write to queue; otherwise dispatch directly (which also wakes it)
    const alive = this.anthillStatus?.alive;
    if (alive) {
      // Append to queue.json
      try {
        const qRes = await fetch(`https://api.github.com/repos/${this.anthillRepo}/contents/queue.json`, { headers: this._ghHeaders });
        if (qRes.ok) {
          const d = await qRes.json();
          const queue = JSON.parse(atob(d.content.replace(/\n/g, '')));
          queue.push({ ...event, queuedAt: new Date().toISOString() });
          await fetch(`https://api.github.com/repos/${this.anthillRepo}/contents/queue.json`, {
            method: 'PUT', headers: this._ghHeaders,
            body: JSON.stringify({ message: '🐜 [Queue] Add event', content: btoa(JSON.stringify(queue, null, 2)), sha: d.sha })
          });
          return;
        }
      } catch {}
    }
    // Wake + dispatch via repository_dispatch
    fetch(`https://api.github.com/repos/${this.anthillRepo}/dispatches`, {
      method: 'POST', headers: this._ghHeaders,
      body: JSON.stringify({ event_type: 'formica-ingest', client_payload: event })
    }).catch(() => {});
  }

  renderAnthill() {
    const container = document.getElementById('anthill-content');
    if (!container) return;
    if (!this.anthillRepo) {
      container.innerHTML = `<p style="color:var(--text-muted);">Inicializando Anthill... Si acaba de conectar, espere unos segundos.</p>`;
      return;
    }

    const hb = this.anthillStatus;
    const isAlive = hb?.alive === true;
    const lastSeen = hb?.timestamp ? new Date(hb.timestamp).toLocaleString() : 'Desconocido';
    const lastRun = this.anthillRuns[0];
    const runStatus = lastRun ? lastRun.status : 'none';
    const runConclusion = lastRun ? lastRun.conclusion : null;

    const statusColor = isAlive ? 'var(--accent)' : 'var(--text-muted)';
    const statusIcon = isAlive ? '🟢' : '⚫';
    const statusLabel = isAlive ? 'ACTIVO — Procesando eventos' : 'DORMIDO — Se despertará al recibir eventos';

    const repoUrl = `https://github.com/${this.anthillRepo}`;
    const actionsUrl = `${repoUrl}/actions`;

    container.innerHTML = `
      <!-- Status Card -->
      <div class="glass-card" style="margin-bottom:24px; display:grid; grid-template-columns:1fr auto; gap:20px; align-items:center;">
        <div>
          <div style="font-size:1.1rem; font-weight:700; margin-bottom:6px;">${statusIcon} ${statusLabel}</div>
          <div style="font-size:0.82rem; color:var(--text-muted);">Repo: <a href="${repoUrl}" target="_blank" style="color:var(--primary);">${this.anthillRepo}</a></div>
          <div style="font-size:0.82rem; color:var(--text-muted);">Último heartbeat: ${lastSeen}</div>
          ${lastRun ? `<div style="font-size:0.82rem; color:var(--text-muted);">Último job: <span style="color:${runConclusion==='success'?'var(--accent)':runConclusion==='failure'?'var(--danger)':'var(--text-muted)'};">${runStatus} ${runConclusion || ''}</span> — <a href="${actionsUrl}" target="_blank" style="color:var(--primary);">Ver Actions →</a></div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:2.5rem; opacity:0.2;">🐜</div>
          <div style="font-size:0.75rem; color:${statusColor}; font-weight:700;">${isAlive ? 'RUNNING' : 'IDLE'}</div>
        </div>
      </div>

      <!-- Cold start info -->
      <div class="glass-card" style="margin-bottom:24px; border-color:rgba(167,139,250,0.2);">
        <h3 style="margin-bottom:12px; font-size:1rem;">⚡ Ciclo de Vida del Anthill</h3>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; text-align:center;">
          ${[['💤','DORMIDO','Esperando tráfico'],['🚀','COLD START','~20-30s arranque'],['🔄','PROCESANDO','Eventos en cola'],['💤','AUTO-SLEEP','10 min sin tráfico']].map(([icon,label,desc])=>`
            <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:12px;">
              <div style="font-size:1.5rem;">${icon}</div>
              <div style="font-size:0.75rem; font-weight:700; color:var(--primary); margin:4px 0;">${label}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${desc}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Provider Integration -->
      <h3 style="margin-bottom:16px; font-size:1rem; color:var(--primary);">🔌 Conectar Providers Externos</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; margin-bottom:24px;">
        ${[
          { icon: '🟠', name: 'AWS Lambda / EventBridge', color: '#FF9900', code: `await fetch('https://api.github.com/repos/${this.anthillRepo}/dispatches', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer YOUR_PAT', 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    event_type: 'formica-ingest',\n    client_payload: { type: 'event', topic: 'aws.event', sender: 'lambda', payload: event }\n  })\n});` },
          { icon: '🔵', name: 'Azure Functions / Event Grid', color: '#0078D4', code: `# En tu Azure Function:\nimport requests\nrequests.post(\n  'https://api.github.com/repos/${this.anthillRepo}/dispatches',\n  headers={'Authorization': 'Bearer YOUR_PAT'},\n  json={'event_type': 'formica-ingest', 'client_payload': {'type': 'log', 'source': 'azure', 'message': 'Event received'}}\n)` },
          { icon: '⚡', name: 'Cualquier App / Servicio Propio', color: '#F7DF1E', code: `curl -X POST https://api.github.com/repos/${this.anthillRepo}/dispatches \\\n  -H "Authorization: Bearer YOUR_FORMICA_PAT" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event_type":"formica-ingest","client_payload":{"type":"log","source":"mi-app","level":"info","message":"Hola Formica"}}'` }
        ].map(p => `
          <div class="glass-card" style="border-color:${p.color}33;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="font-size:1.3rem;">${p.icon}</span>
              <strong style="font-size:0.9rem;">${p.name}</strong>
            </div>
            <pre style="background:rgba(0,0,0,0.4); border-radius:6px; padding:10px; font-size:0.68rem; color:var(--text-muted); overflow-x:auto; white-space:pre-wrap; margin:0;">${p.code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
          </div>`).join('')}
      </div>

      <!-- Variables info -->
      <div class="glass-card" style="background:rgba(16,185,129,0.05); border-color:rgba(16,185,129,0.2);">
        <h3 style="margin-bottom:10px; font-size:0.95rem;">✅ Variables configuradas automáticamente en tu Anthill</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <span class="badge-tag" style="color:var(--accent); border-color:var(--accent);">FORMICA_TOKEN ✓</span>
          <span class="badge-tag" style="color:var(--accent); border-color:var(--accent);">FORMICA_STORAGE_REPO → ${this.currentUser}/.formica-storage ✓</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">Reemplaza <code>YOUR_PAT</code> en los ejemplos con tu token de GitHub (el mismo que usas aquí en Formica Queen Studio).</p>
      </div>
    `;
  }
}

window.consoleApp = new FormicaQueenConsole();

