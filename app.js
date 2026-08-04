// FORMICA Queen Studio — Web Console Application with Redis-like Multi-Key Chambers & WAF Soldiers

class FormicaQueenConsole {
  constructor() {
    this.token = localStorage.getItem('formica_gh_token') || '';
    this.currentUser = null;
    this.state = {
      subscriptions: {},
      chambers: {},
      logs: [],
      soldierRules: {},
      legionaryAdapters: {}
    };

    this.editingSubId = null;
    this.editingWafId = null;
    this.editingAdapterId = null;
    this.editingChamberId = null;
    this.currentChamberEntries = [];
    this.currentAdapterGroups = [];
    this.simulatedAdapterGroups = [];

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
    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Connect Token from Header
    document.getElementById('btn-connect').addEventListener('click', () => {
      const val = document.getElementById('gh-token').value.trim();
      this.verifyAndConnect(val);
    });

    // Connect Token from Gate
    document.getElementById('btn-connect-gate').addEventListener('click', () => {
      const val = document.getElementById('gh-token-gate').value.trim();
      this.verifyAndConnect(val);
    });

    // Disconnect Token
    document.getElementById('btn-disconnect').addEventListener('click', () => {
      this.disconnect();
    });

    // Modal 1: Subscriptions
    document.getElementById('btn-new-sub').addEventListener('click', () => this.openSubModal());
    document.getElementById('btn-sub-cancel').addEventListener('click', () => this.closeSubModal());
    document.getElementById('btn-sub-save').addEventListener('click', () => this.saveSub());

    // Modal 2: Publish Event
    document.getElementById('btn-pub-event').addEventListener('click', () => this.openEventModal());
    document.getElementById('btn-event-cancel').addEventListener('click', () => this.closeEventModal());
    document.getElementById('btn-event-pub').addEventListener('click', () => this.pubEvent());

    // Modal 3: Redis-like Chamber Multi-Key DB
    document.getElementById('btn-new-kv').addEventListener('click', () => this.openKvModal());
    document.getElementById('btn-kv-cancel').addEventListener('click', () => this.closeKvModal());
    document.getElementById('btn-kv-save').addEventListener('click', () => this.saveKv());
    document.getElementById('btn-add-chamber-entry').addEventListener('click', () => this.addChamberEntryToBuilder());

    // Modal 4: Foragers Test Log
    document.getElementById('btn-new-log').addEventListener('click', () => this.openLogModal());
    document.getElementById('btn-log-cancel').addEventListener('click', () => this.closeLogModal());
    document.getElementById('btn-log-save').addEventListener('click', () => this.saveLog());

    // Modal 5: Soldiers WAF Rule
    document.getElementById('btn-new-waf').addEventListener('click', () => this.openWafModal());
    document.getElementById('btn-waf-cancel').addEventListener('click', () => this.closeWafModal());
    document.getElementById('btn-waf-save').addEventListener('click', () => this.saveWaf());

    // Modal 6: Legionarys Purge Adapter & Group Builder
    document.getElementById('btn-new-adapter').addEventListener('click', () => this.openAdapterModal());
    document.getElementById('btn-adapter-cancel').addEventListener('click', () => this.closeAdapterModal());
    document.getElementById('btn-adapter-save').addEventListener('click', () => this.saveAdapter());
    document.getElementById('btn-add-resource-group').addEventListener('click', () => this.addResourceGroupToBuilder());

    // Purge Simulation & Execution
    document.getElementById('btn-purge-dryrun').addEventListener('click', () => this.runPurgeDryRun());
    document.getElementById('btn-purge-execute').addEventListener('click', () => this.executeSelectedPurge());
  }

  async verifyAndConnect(token) {
    if (!token) {
      this.toast('Por favor, ingresa un GitHub Personal Access Token (PAT).');
      return;
    }

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Formica-Queen-Studio'
        }
      });

      if (!userRes.ok) {
        throw new Error('PAT de GitHub no válido o expirado.');
      }

      const userData = await userRes.json();
      this.currentUser = userData.login;
      this.token = token;
      localStorage.setItem('formica_gh_token', token);

      this.showConnectedState();
      await this.loadColonyState();
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

  async loadColonyState() {
    if (!this.token) return;

    try {
      const res = await fetch('https://api.github.com/repos/.formica-storage/contents/formica-colony-default-colony.json', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const decoded = atob(data.content);
        const loaded = JSON.parse(decoded);
        this.state = { ...this.state, ...loaded };
      } else {
        this.loadDefaultState();
      }
    } catch {
      this.loadDefaultState();
    }
    this.renderAll();
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'chamber_global_cache': {
          chamberId: 'chamber_global_cache',
          name: 'Caché Global y Feature Flags',
          description: 'Respuestas pre-renderizadas de API y banderas de producción',
          entries: {
            'feature_maintenance': { key: 'feature_maintenance', value: false, expiresAt: null },
            'dom_scraped_data': { key: 'dom_scraped_data', value: 'temp_raw_content', ttlSeconds: -10, expiresAt: new Date(Date.now() - 3600000).toISOString() }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      logs: [
        { level: 'info', source: 'Pheromones', message: 'Event Published on topic secret.triggered', timestamp: new Date().toISOString() },
        { level: 'warn', source: 'Legionarys', message: 'Detected 3 expired items ready for purging', timestamp: new Date().toISOString() }
      ],
      soldierRules: {
        'rule_whitelist': {
          ruleId: 'rule_whitelist',
          name: 'Whitelist Subred Confiable',
          targetApp: 'sinchlor-api',
          pathPattern: '/api/v1/*',
          priority: 1,
          action: 'allow',
          ipPattern: '10.0.0.',
          active: true,
          createdAt: new Date().toISOString()
        },
        'rule_block_scrapers': {
          ruleId: 'rule_block_scrapers',
          name: 'Bloqueo Scrapers SQLmap',
          targetApp: '*',
          pathPattern: '*',
          priority: 10,
          action: 'custom_payload',
          headerName: 'User-Agent',
          headerValuePattern: 'sqlmap',
          customStatusCode: 403,
          customPayload: { error: 'Acceso denegado por Formica WAF Guard', code: 'CUSTOM_GUARD_403' },
          active: true,
          createdAt: new Date().toISOString()
        }
      },
      legionaryAdapters: {
        'adapter_prod': {
          adapterId: 'adapter_prod',
          name: 'Adaptador Bóvedas Producción',
          groups: [
            { groupName: 'Néctares Expirados Sinchlor', provider: 'sinchlor', filter: 'expired_only' },
            { groupName: 'Enlaces Larvae Caducados', provider: 'ballom', filter: 'ttl_expired' },
            { groupName: 'MagicLinks Agotados Lumina', provider: 'lumina', filter: 'used_or_expired' }
          ],
          active: true
        },
        'adapter_storage': {
          adapterId: 'adapter_storage',
          name: 'Adaptador Caché & Storage Global',
          groups: [
            { groupName: 'Entradas K/V Expiradas', provider: 'chambers', filter: 'ttl_zero' },
            { groupName: 'Rolla Balls Obsoletas', provider: 'rolla', filter: 'old_releases' }
          ],
          active: true
        }
      }
    };
  }

  renderAll() {
    document.getElementById('stat-subs-count').textContent = Object.keys(this.state.subscriptions || {}).length;
    document.getElementById('stat-kv-count').textContent = Object.keys(this.state.chambers || {}).length;
    document.getElementById('stat-logs-count').textContent = (this.state.logs || []).length;
    document.getElementById('stat-adapters-count').textContent = Object.keys(this.state.legionaryAdapters || {}).length;

    this.renderSubs();
    this.renderKv();
    this.renderLogs();
    this.renderWaf();
    this.renderAdapters();
  }

  renderSubs() {
    const grid = document.getElementById('subs-grid');
    grid.innerHTML = '';
    const subs = Object.values(this.state.subscriptions || {});
    if (subs.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay suscripciones creadas. Haz clic en '+ Nueva Suscripción'.</p>`;
      return;
    }

    subs.forEach(s => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.innerHTML = `
        <div class="resource-card-title">${s.subscriberName}</div>
        <div class="resource-card-sub">Topic: ${s.topic}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${s.targetWebhookUrl ? 'Webhook: ' + s.targetWebhookUrl : 'Internal Dispatcher'}</div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editSub('${s.subId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delSub('${s.subId}')">🗑️ Eliminar</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  renderKv() {
    const grid = document.getElementById('kv-grid');
    grid.innerHTML = '';
    const chambers = Object.values(this.state.chambers || {});
    if (chambers.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay Cámaras K/V registradas. Haz clic en '+ Nueva Cámara K/V'.</p>`;
      return;
    }

    chambers.forEach(c => {
      const isDb = 'entries' in c;
      const entries = isDb ? Object.values(c.entries || {}) : [{ key: c.key, value: c.value, expiresAt: c.expiresAt }];
      const activeCount = entries.filter(e => !e.expiresAt || new Date() <= new Date(e.expiresAt)).length;
      const id = isDb ? c.chamberId : c.key;
      const name = isDb ? c.name : `Cámara ${c.key}`;

      const card = document.createElement('div');
      card.className = 'resource-card';

      const entriesHtml = entries.map(e => {
        const isExp = e.expiresAt && new Date() > new Date(e.expiresAt);
        return `
          <div style="font-size:0.8rem; margin-bottom:6px; background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text);">${e.key}</strong>: <span style="color:var(--text-muted);">${JSON.stringify(e.value)}</span>
            </div>
            <span style="font-size:0.75rem; color:${isExp ? 'var(--danger)' : 'var(--accent)'}; font-weight:600;">
              ${isExp ? '⚠️ EXPIRADO' : (e.expiresAt ? '⏱️ Expira' : '♾️ PERMANENTE')}
            </span>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="resource-card-title">🕳️ ${name}</div>
        <div class="resource-card-sub" style="font-size:0.8rem;">ID: <code>${id}</code> (${activeCount}/${entries.length} claves activas)</div>
        <div style="margin-bottom:12px; margin-top:8px;">
          ${entriesHtml || '<span style="color:var(--text-muted); font-size:0.8rem;">Sin claves guardadas</span>'}
        </div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editKv('${id}')">✏️ Configurar Claves</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delKv('${id}')">🗑️ Eliminar Cámara</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  renderLogs() {
    const list = document.getElementById('logs-list');
    list.innerHTML = '';
    const logs = this.state.logs || [];
    if (logs.length === 0) {
      list.innerHTML = `<div style="padding:16px; color:var(--text-muted);">No hay logs registrados. Haz clic en '+ Enviar Log de Prueba'.</div>`;
      return;
    }

    logs.forEach(l => {
      const row = document.createElement('div');
      row.className = 'log-row';
      row.innerHTML = `
        <span class="log-level ${l.level}">${l.level}</span>
        <span style="color:var(--text-muted);">${new Date(l.timestamp).toLocaleTimeString()}</span>
        <strong style="color:var(--primary);">${l.source}:</strong>
        <span>${l.message}</span>
        ${l.correlationId ? `<span style="color:var(--accent); font-size:0.75rem; margin-left:auto;">(${l.correlationId})</span>` : ''}
      `;
      list.appendChild(row);
    });
  }

  renderWaf() {
    const grid = document.getElementById('waf-grid');
    grid.innerHTML = '';

    const rules = Object.values(this.state.soldierRules || {})
      .sort((a, b) => (a.priority || 50) - (b.priority || 50));

    if (rules.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay reglas WAF configuradas. Haz clic en '+ Nueva Regla WAF'.</p>`;
      return;
    }

    rules.forEach(r => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      const actionBadge = r.action === 'allow'
        ? '<span class="badge-tag" style="background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;">ALLOW</span>'
        : r.action === 'custom_payload'
        ? '<span class="badge-tag" style="background:rgba(167,139,250,0.2); color:var(--primary); border-color:var(--primary);">CUSTOM PAYLOAD</span>'
        : '<span class="badge-tag" style="background:rgba(244,63,94,0.2); color:var(--danger); border-color:var(--danger);">' + r.action.toUpperCase() + '</span>';

      card.innerHTML = `
        <span class="priority-badge">Prioridad #${r.priority || 10}</span>
        <div class="resource-card-title">${r.name}</div>
        <div style="margin-bottom:8px;">
          ${actionBadge}
          <span class="badge-tag" style="margin-left:4px;">App: ${r.targetApp || '*'}</span>
        </div>
        <div class="resource-card-sub" style="font-size:0.8rem;">
          ${r.pathPattern ? 'Path: ' + r.pathPattern : 'Ruta: Global'}
        </div>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          ${r.ipPattern ? 'IP: ' + r.ipPattern : (r.headerName ? 'Header: ' + r.headerName + ' ~ ' + r.headerValuePattern : 'Criterio General')}
        </div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editWaf('${r.ruleId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delWaf('${r.ruleId}')">🗑️ Eliminar</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  renderAdapters() {
    const grid = document.getElementById('adapters-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const adapters = Object.values(this.state.legionaryAdapters || {});
    if (adapters.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay adaptadores de purga programados. Haz clic en '+ Nuevo Adaptador de Purga'.</p>`;
      return;
    }

    adapters.forEach(a => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      const groupsList = (a.groups || [])
        .map(g => `<div style="font-size:0.82rem; margin-bottom:4px; color:var(--text-muted);">📦 <strong>${g.groupName}</strong> <span class="badge-tag">${g.provider.toUpperCase()}</span></div>`)
        .join('');

      card.innerHTML = `
        <div class="resource-card-title">${a.name}</div>
        <div style="margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
          ${groupsList || '<span style="color:var(--text-muted);">Sin grupos de recursos</span>'}
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${a.targetEndpoint ? 'Target: ' + a.targetEndpoint : 'Integrado Out-of-the-Box'}</div>
        <div class="resource-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="consoleApp.editAdapter('${a.adapterId}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delAdapter('${a.adapterId}')">🗑️ Eliminar</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- MODAL HANDLERS ---
  openSubModal(subId = null) {
    this.editingSubId = subId;
    if (subId) {
      const s = this.state.subscriptions[subId];
      document.getElementById('modal-sub-title').textContent = 'Editar Suscripción';
      document.getElementById('sub-topic').value = s.topic;
      document.getElementById('sub-name').value = s.subscriberName;
      document.getElementById('sub-webhook').value = s.targetWebhookUrl || '';
    } else {
      document.getElementById('modal-sub-title').textContent = 'Nueva Suscripción Pub/Sub';
      document.getElementById('sub-topic').value = '';
      document.getElementById('sub-name').value = '';
      document.getElementById('sub-webhook').value = '';
    }
    document.getElementById('modal-sub').classList.remove('hidden');
  }

  closeSubModal() { document.getElementById('modal-sub').classList.add('hidden'); }

  saveSub() {
    const topic = document.getElementById('sub-topic').value.trim();
    const name = document.getElementById('sub-name').value.trim();
    const webhook = document.getElementById('sub-webhook').value.trim();

    if (!topic || !name) { this.toast('Tópico y Nombre son requeridos.'); return; }

    const id = this.editingSubId || `sub_${Date.now()}`;
    this.state.subscriptions[id] = { subId: id, topic, subscriberName: name, targetWebhookUrl: webhook, active: true };
    this.closeSubModal();
    this.renderAll();
    this.toast('Suscripción guardada correctamente');
  }

  editSub(id) { this.openSubModal(id); }
  delSub(id) { delete this.state.subscriptions[id]; this.renderAll(); this.toast('Suscripción eliminada'); }

  openEventModal() { document.getElementById('modal-event').classList.remove('hidden'); }
  closeEventModal() { document.getElementById('modal-event').classList.add('hidden'); }

  pubEvent() {
    const topic = document.getElementById('event-topic').value.trim();
    const sender = document.getElementById('event-sender').value.trim();
    const msg = document.getElementById('event-msg').value.trim();

    if (!topic || !msg) { this.toast('Tópico y Mensaje son requeridos.'); return; }

    this.state.logs.unshift({
      level: 'info', source: sender || 'Queen-Studio', message: `[${topic}] ${msg}`, timestamp: new Date().toISOString()
    });

    this.closeEventModal();
    this.renderAll();
    this.toast(`Evento publicado en el tópico '${topic}'`);
  }

  // --- REDIS-LIKE CHAMBER MULTI-KEY DATABASE MODAL HANDLERS ---
  openKvModal(chamberId = null) {
    this.editingChamberId = chamberId;

    if (chamberId && this.state.chambers[chamberId]) {
      const c = this.state.chambers[chamberId];
      const isDb = 'entries' in c;

      document.getElementById('modal-kv-title').textContent = 'Editar Cámara K/V';
      document.getElementById('chamber-name').value = isDb ? c.name : `Cámara ${c.key}`;
      document.getElementById('chamber-id').value = isDb ? c.chamberId : c.key;
      document.getElementById('chamber-desc').value = isDb ? (c.description || '') : '';

      if (isDb) {
        this.currentChamberEntries = Object.values(c.entries || []);
      } else {
        this.currentChamberEntries = [{ key: c.key, value: c.value, expiresAt: c.expiresAt }];
      }
    } else {
      document.getElementById('modal-kv-title').textContent = 'Nueva Cámara K/V (Redis DB)';
      document.getElementById('chamber-name').value = '';
      document.getElementById('chamber-id').value = '';
      document.getElementById('chamber-desc').value = '';
      this.currentChamberEntries = [
        { key: 'session_usr_9981', value: { role: 'admin' }, ttlSeconds: 3600, expiresAt: new Date(Date.now() + 3600000).toISOString() },
        { key: 'feature_flag_darkmode', value: true, expiresAt: null }
      ];
    }

    this.renderAddedChamberEntriesList();
    document.getElementById('modal-kv').classList.remove('hidden');
  }

  closeKvModal() { document.getElementById('modal-kv').classList.add('hidden'); }

  addChamberEntryToBuilder() {
    const keyInput = document.getElementById('builder-entry-key');
    const valInput = document.getElementById('builder-entry-val');
    const ttlInput = document.getElementById('builder-entry-ttl');

    const key = keyInput.value.trim();
    const rawVal = valInput.value.trim();
    const ttlSeconds = parseInt(ttlInput.value || '0', 10);

    if (!key || !rawVal) {
      this.toast('Clave y Valor son requeridos.');
      return;
    }

    let value = rawVal;
    try { value = JSON.parse(rawVal); } catch {}

    const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

    this.currentChamberEntries.push({ key, value, ttlSeconds, expiresAt });
    keyInput.value = '';
    valInput.value = '';
    ttlInput.value = '';

    this.renderAddedChamberEntriesList();
    this.toast(`Clave '${key}' añadida a la cámara`);
  }

  removeChamberEntryFromBuilder(index) {
    this.currentChamberEntries.splice(index, 1);
    this.renderAddedChamberEntriesList();
  }

  renderAddedChamberEntriesList() {
    const container = document.getElementById('chamber-added-entries-list');
    container.innerHTML = '';

    if (this.currentChamberEntries.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">No hay claves añadidas aún.</p>`;
      return;
    }

    this.currentChamberEntries.forEach((e, idx) => {
      const isExp = e.expiresAt && new Date() > new Date(e.expiresAt);
      const row = document.createElement('div');
      row.className = 'added-group-row';
      row.innerHTML = `
        <div>
          <strong>🔑 ${e.key}</strong>: <span style="color:var(--text-muted);">${JSON.stringify(e.value)}</span>
          <span class="badge-tag" style="margin-left:6px; color:${isExp ? 'var(--danger)' : 'var(--accent)'}">
            ${isExp ? 'EXPIRES' : (e.expiresAt ? 'TTL Active' : 'PERMANENT')}
          </span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="consoleApp.removeChamberEntryFromBuilder(${idx})" type="button">🗑️</button>
      `;
      container.appendChild(row);
    });
  }

  saveKv() {
    const name = document.getElementById('chamber-name').value.trim();
    const chamberId = document.getElementById('chamber-id').value.trim() || `chamber_${Date.now()}`;
    const description = document.getElementById('chamber-desc').value.trim();

    if (!name) { this.toast('El nombre de la Cámara es requerido.'); return; }

    const entriesObj = {};
    this.currentChamberEntries.forEach(e => {
      entriesObj[e.key] = e;
    });

    this.state.chambers[chamberId] = {
      chamberId,
      name,
      description,
      entries: entriesObj,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.closeKvModal();
    this.renderAll();
    this.toast(`Cámara K/V '${name}' guardada con ${Object.keys(entriesObj).length} claves`);
  }

  editKv(id) { this.openKvModal(id); }
  delKv(id) { delete this.state.chambers[id]; this.renderAll(); this.toast('Cámara K/V eliminada'); }

  openLogModal() { document.getElementById('modal-log').classList.remove('hidden'); }
  closeLogModal() { document.getElementById('modal-log').classList.add('hidden'); }

  saveLog() {
    const level = document.getElementById('log-level-select').value;
    const source = document.getElementById('log-source').value.trim() || 'CustomApp';
    const message = document.getElementById('log-message').value.trim();
    const correlationId = document.getElementById('log-correlation').value.trim();

    if (!message) { this.toast('El mensaje del log es requerido.'); return; }

    this.state.logs.unshift({
      level, source, message, correlationId: correlationId || undefined, timestamp: new Date().toISOString()
    });

    this.closeLogModal();
    this.renderAll();
    this.toast('Log de prueba enviado a Foragers');
  }

  // Soldiers Refined WAF Modal Handler with Clean Placeholders
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
        ? JSON.stringify(r.customPayload, null, 2)
        : (r.customPayload || '');
    } else {
      document.getElementById('modal-waf-title').textContent = 'Nueva Regla WAF';
      document.getElementById('waf-name').value = '';
      document.getElementById('waf-target-app').value = '';
      document.getElementById('waf-priority').value = '';
      document.getElementById('waf-action').value = 'block';
      document.getElementById('waf-path').value = '';
      document.getElementById('waf-ip').value = '';
      document.getElementById('waf-header-name').value = '';
      document.getElementById('waf-custom-status').value = '';
      document.getElementById('waf-custom-payload-json').value = '';
    }

    this.toggleWafCustomPayloadField();
    document.getElementById('modal-waf').classList.remove('hidden');
  }

  toggleWafCustomPayloadField() {
    const act = document.getElementById('waf-action').value;
    const container = document.getElementById('waf-custom-payload-container');
    if (act === 'custom_payload') {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
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

    let customPayload = undefined;
    if (action === 'custom_payload' && rawPayload) {
      try {
        customPayload = JSON.parse(rawPayload);
      } catch {
        customPayload = rawPayload;
      }
    }

    const id = this.editingWafId || `rule_${Date.now()}`;
    this.state.soldierRules[id] = {
      ruleId: id,
      name,
      targetApp,
      priority,
      action,
      pathPattern: pathPattern || '*',
      ipPattern: ipPattern || undefined,
      headerName: headerName || undefined,
      customStatusCode: customStatus,
      customPayload,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.closeWafModal();
    this.renderAll();
    this.toast('Regla WAF guardada y ordenada por prioridad');
  }

  editWaf(id) { this.openWafModal(id); }
  delWaf(id) { delete this.state.soldierRules[id]; this.renderAll(); this.toast('Regla WAF eliminada'); }

  // Legionarys Purge Adapter & Dynamic Resource Group Builder
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
      this.currentAdapterGroups = [
        { groupName: 'Néctares Expirados Sinchlor', provider: 'sinchlor', filter: 'expired_only' },
        { groupName: 'MagicLinks Agotados Lumina', provider: 'lumina', filter: 'used_or_expired' }
      ];
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
    const provider = provSelect.value;
    const filter = filterInput.value.trim();

    if (!groupName) {
      this.toast('Escribe un nombre para el grupo de recursos.');
      return;
    }

    this.currentAdapterGroups.push({ groupName, provider, filter: filter || 'default' });
    nameInput.value = '';
    filterInput.value = '';
    this.renderAddedGroupsList();
    this.toast(`Grupo '${groupName}' añadido al adaptador`);
  }

  removeResourceGroupFromBuilder(index) {
    this.currentAdapterGroups.splice(index, 1);
    this.renderAddedGroupsList();
  }

  renderAddedGroupsList() {
    const container = document.getElementById('adapter-added-groups-list');
    container.innerHTML = '';

    if (this.currentAdapterGroups.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">No hay grupos de recursos añadidos aún.</p>`;
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
        <button class="btn btn-danger btn-sm" onclick="consoleApp.removeResourceGroupFromBuilder(${idx})" type="button">🗑️</button>
      `;
      container.appendChild(row);
    });
  }

  saveAdapter() {
    const name = document.getElementById('adapter-name').value.trim();
    const endpoint = document.getElementById('adapter-endpoint').value.trim();

    if (!name) { this.toast('El nombre del adaptador es requerido.'); return; }
    if (this.currentAdapterGroups.length === 0) { this.toast('Añade al menos un grupo de recursos al adaptador.'); return; }

    const id = this.editingAdapterId || `adapter_${Date.now()}`;
    this.state.legionaryAdapters[id] = {
      adapterId: id,
      name,
      groups: [...this.currentAdapterGroups],
      targetEndpoint: endpoint || undefined,
      active: true
    };

    this.closeAdapterModal();
    this.renderAll();
    this.toast('Adaptador de purga guardado correctamente');
  }

  editAdapter(id) { this.openAdapterModal(id); }
  delAdapter(id) { delete this.state.legionaryAdapters[id]; this.renderAll(); this.toast('Adaptador eliminado'); }

  // --- ACCORDION PURGE SIMULATION BY ADAPTER & NAMED RESOURCE GROUPS ---
  runPurgeDryRun() {
    this.simulatedAdapterGroups = [
      {
        adapterId: 'adapter_prod',
        adapterName: 'Adaptador Bóvedas Producción',
        resourceGroups: [
          {
            groupName: 'Néctares Expirados Sinchlor',
            provider: 'SINCHLOR',
            items: [
              { id: 'item_1', provider: 'SINCHLOR', desc: 'Néctar efímero \'prod_db_temp\' (Expirado por TTL = 0 / Uso)', bytes: 2048, selected: true }
            ]
          },
          {
            groupName: 'Enlaces Larvae Caducados',
            provider: 'BALLOM',
            items: [
              { id: 'item_2', provider: 'BALLOM', desc: 'Enlace corto Larvae \'tmp-promo\' (Caducado hace 24h)', bytes: 1024, selected: true }
            ]
          },
          {
            groupName: 'MagicLinks Agotados',
            provider: 'LUMINA',
            items: [
              { id: 'item_3', provider: 'LUMINA', desc: 'LanternLink MagicLink \'usr_9981\' (Agotado)', bytes: 1024, selected: true }
            ]
          }
        ]
      },
      {
        adapterId: 'adapter_storage',
        adapterName: 'Adaptador Caché & Storage Global',
        resourceGroups: [
          {
            groupName: 'Entradas K/V Expiradas',
            provider: 'CHAMBERS',
            items: [
              { id: 'item_4', provider: 'CHAMBERS', desc: 'Entrada K/V \'temp_cache\' (Expirada por TTL)', bytes: 512, selected: true }
            ]
          },
          {
            groupName: 'Rolla Balls Obsoletas',
            provider: 'ROLLA',
            items: [
              { id: 'item_5', provider: 'ROLLA', desc: 'Rolla-Ball \'old_assets_v1\' (Obsoleta/Expirada)', bytes: 10485760, selected: true }
            ]
          }
        ]
      }
    ];

    this.renderPurgeReport();
    this.toast('Simulación Dry-Run ejecutada. Despliega cada adaptador y grupo para configurar.');
  }

  renderPurgeReport() {
    const listContainer = document.getElementById('purge-report-items');
    listContainer.innerHTML = '';

    if (this.simulatedAdapterGroups.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--primary);">✔ Limpieza completada. No hay recursos expirados detectados.</p>`;
      document.getElementById('purge-report-summary').innerHTML = 'Haz clic en \'Simular Purga\' para detectar recursos caducados.';
      return;
    }

    this.simulatedAdapterGroups.forEach((adapter, aIdx) => {
      const card = document.createElement('div');
      card.className = 'purge-accordion-card';
      card.id = `accordion-card-${aIdx}`;

      let adapterTotalItems = 0;
      let adapterSelectedItems = 0;
      let adapterBytes = 0;

      adapter.resourceGroups.forEach(rg => {
        rg.items.forEach(i => {
          adapterTotalItems++;
          if (i.selected) {
            adapterSelectedItems++;
            adapterBytes += i.bytes;
          }
        });
      });

      const allSelected = adapterSelectedItems === adapterTotalItems;

      card.innerHTML = `
        <div class="purge-accordion-header" onclick="consoleApp.toggleAccordion(${aIdx}, event)">
          <input type="checkbox" id="master-chk-${aIdx}" ${allSelected ? 'checked' : ''} onclick="event.stopPropagation(); consoleApp.toggleMasterAdapter(${aIdx})" />
          <div class="purge-accordion-title">⚙️ ${adapter.adapterName}</div>
          <div class="purge-accordion-meta">${adapterSelectedItems}/${adapterTotalItems} ítems (${adapterBytes.toLocaleString()} B)</div>
          <span class="purge-accordion-chevron">▼</span>
        </div>
        <div class="purge-accordion-body">
          ${adapter.resourceGroups.map((rg, rgIdx) => `
            <div class="purge-group-box">
              <div class="purge-group-title">
                📦 ${rg.groupName} <span class="badge-tag">${rg.provider}</span>
              </div>
              ${rg.items.map((item, iIdx) => `
                <div class="purge-item-row">
                  <input type="checkbox" id="chk-${aIdx}-${rgIdx}-${iIdx}" ${item.selected ? 'checked' : ''} onchange="consoleApp.togglePurgeItem(${aIdx}, ${rgIdx}, ${iIdx})" />
                  <span class="purge-item-badge">${item.provider}</span>
                  <span style="flex:1;">${item.desc}</span>
                  <span style="color:var(--primary); font-family:monospace; font-weight:600;">+${item.bytes.toLocaleString()} B</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `;
      listContainer.appendChild(card);
    });

    this.updatePurgeSummary();
  }

  toggleAccordion(aIdx, event) {
    if (event.target.tagName === 'INPUT') return;
    const card = document.getElementById(`accordion-card-${aIdx}`);
    if (card) card.classList.toggle('collapsed');
  }

  toggleMasterAdapter(aIdx) {
    const adapter = this.simulatedAdapterGroups[aIdx];
    if (!adapter) return;

    const masterChk = document.getElementById(`master-chk-${aIdx}`);
    const isChecked = masterChk ? masterChk.checked : false;

    adapter.resourceGroups.forEach(rg => {
      rg.items.forEach(item => { item.selected = isChecked; });
    });
    this.renderPurgeReport();
  }

  togglePurgeItem(aIdx, rgIdx, iIdx) {
    const item = this.simulatedAdapterGroups[aIdx]?.resourceGroups[rgIdx]?.items[iIdx];
    if (item) {
      item.selected = !item.selected;
      this.renderPurgeReport();
    }
  }

  updatePurgeSummary() {
    let totalSelected = 0;
    let totalItems = 0;
    let totalBytes = 0;

    this.simulatedAdapterGroups.forEach(a => {
      a.resourceGroups.forEach(rg => {
        rg.items.forEach(i => {
          totalItems++;
          if (i.selected) {
            totalSelected++;
            totalBytes += i.bytes;
          }
        });
      });
    });

    document.getElementById('purge-report-summary').innerHTML = `
      <strong style="color:var(--primary);">Simulación Activa:</strong> Seleccionados
      <span style="color:var(--accent); font-weight:700;">${totalSelected} de ${totalItems} elementos</span>
      en <span style="color:var(--primary); font-weight:700;">${this.simulatedAdapterGroups.length} adaptadores</span>
      (Total: <span style="color:var(--primary); font-weight:700;">${totalBytes.toLocaleString()} bytes</span> a liberar).
    `;
  }

  executeSelectedPurge() {
    let selectedCount = 0;
    let bytesFreed = 0;

    this.simulatedAdapterGroups.forEach(a => {
      a.resourceGroups.forEach(rg => {
        rg.items.forEach(i => {
          if (i.selected) {
            selectedCount++;
            bytesFreed += i.bytes;
          }
        });
      });
    });

    if (selectedCount === 0) {
      this.toast('Marca al menos un elemento para ejecutar la purga.');
      return;
    }

    delete this.state.chambers['chamber_global_cache'];

    this.simulatedAdapterGroups.forEach(a => {
      a.resourceGroups.forEach(rg => {
        rg.items = rg.items.filter(i => !i.selected);
      });
    });

    this.renderAll();
    this.renderPurgeReport();
    this.toast(`⚡ Purga ejecutada con éxito! Se liberaron ${bytesFreed.toLocaleString()} bytes.`);
  }

  toast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
}

window.consoleApp = new FormicaQueenConsole();
