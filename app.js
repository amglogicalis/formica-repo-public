// FORMICA Queen Studio — Web Console Application with Full Modals & Selective Purging

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
    this.simulatedPurgeItems = [];

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

    // Modal 3: K/V Chambers
    document.getElementById('btn-new-kv').addEventListener('click', () => this.openKvModal());
    document.getElementById('btn-kv-cancel').addEventListener('click', () => this.closeKvModal());
    document.getElementById('btn-kv-save').addEventListener('click', () => this.saveKv());

    // Modal 4: Foragers Test Log
    document.getElementById('btn-new-log').addEventListener('click', () => this.openLogModal());
    document.getElementById('btn-log-cancel').addEventListener('click', () => this.closeLogModal());
    document.getElementById('btn-log-save').addEventListener('click', () => this.saveLog());

    // Modal 5: Soldiers WAF Rule
    document.getElementById('btn-new-waf').addEventListener('click', () => this.openWafModal());
    document.getElementById('btn-waf-cancel').addEventListener('click', () => this.closeWafModal());
    document.getElementById('btn-waf-save').addEventListener('click', () => this.saveWaf());

    // Modal 6: Legionarys Purge Adapter
    document.getElementById('btn-new-adapter').addEventListener('click', () => this.openAdapterModal());
    document.getElementById('btn-adapter-cancel').addEventListener('click', () => this.closeAdapterModal());
    document.getElementById('btn-adapter-save').addEventListener('click', () => this.saveAdapter());

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
        'session_active': { key: 'session_active', value: 'authenticated', expiresAt: null },
        'temp_cache': { key: 'temp_cache', value: 'dom_scraped_data', expiresAt: new Date(Date.now() - 3600000).toISOString() }
      },
      logs: [
        { level: 'info', source: 'Pheromones', message: 'Event Published on topic secret.triggered', timestamp: new Date().toISOString() },
        { level: 'warn', source: 'Legionarys', message: 'Detected 3 expired items ready for purging', timestamp: new Date().toISOString() }
      ],
      soldierRules: {
        'rule_1': { ruleId: 'rule_1', name: 'Rate Limiter High Frequency', action: 'block', ipPattern: '192.168.1.100', active: true }
      },
      legionaryAdapters: {
        'adapter_sinchlor': { adapterId: 'adapter_sinchlor', name: 'Sinchlor Ephemeral Nectars', provider: 'sinchlor', active: true },
        'adapter_ballom': { adapterId: 'adapter_ballom', name: 'Ballom Larvae Shortlinks', provider: 'ballom', active: true },
        'adapter_lumina': { adapterId: 'adapter_lumina', name: 'Lumina MagicLinks', provider: 'lumina', active: true }
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
    const items = Object.values(this.state.chambers || {});
    if (items.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay entradas K/V en Chambers. Haz clic en '+ Nueva Entrada K/V'.</p>`;
      return;
    }

    items.forEach(i => {
      const isExp = i.expiresAt && new Date() > new Date(i.expiresAt);
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.innerHTML = `
        <div class="resource-card-title">${i.key}</div>
        <div class="resource-card-sub">Valor: ${JSON.stringify(i.value)}</div>
        <div style="font-size:0.8rem; color:${isExp ? 'var(--danger)' : 'var(--primary)'};">
          ${isExp ? '⚠️ EXPIRADO' : (i.expiresAt ? 'Expira: ' + new Date(i.expiresAt).toLocaleTimeString() : '♾️ PERMANENTE')}
        </div>
        <div class="resource-card-actions">
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delKv('${i.key}')">🗑️ Eliminar</button>
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
    const rules = Object.values(this.state.soldierRules || {});
    if (rules.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-muted);">No hay reglas WAF configuradas. Haz clic en '+ Nueva Regla WAF'.</p>`;
      return;
    }

    rules.forEach(r => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.innerHTML = `
        <div class="resource-card-title">${r.name}</div>
        <div class="resource-card-sub">Acción: ${r.action.toUpperCase()}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${r.ipPattern ? 'IP: ' + r.ipPattern : 'Regla General'}</div>
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
      card.innerHTML = `
        <div class="resource-card-title">${a.name}</div>
        <div class="resource-card-sub">Proveedor: ${a.provider.toUpperCase()}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${a.targetEndpoint ? 'Target: ' + a.targetEndpoint : 'Integrado Out-of-the-Box'}</div>
        <div class="resource-card-actions">
          <button class="btn btn-danger btn-sm" onclick="consoleApp.delAdapter('${a.adapterId}')">🗑️ Eliminar</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- MODAL HANDLERS ---
  // Subscriptions
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

  // Publish Event
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

  // K/V Chambers
  openKvModal() { document.getElementById('modal-kv').classList.remove('hidden'); }
  closeKvModal() { document.getElementById('modal-kv').classList.add('hidden'); }

  saveKv() {
    const key = document.getElementById('kv-key').value.trim();
    const val = document.getElementById('kv-value').value.trim();
    const ttl = parseInt(document.getElementById('kv-ttl').value || '0', 10);

    if (!key || !val) { this.toast('Clave y Valor son requeridos.'); return; }

    const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null;
    this.state.chambers[key] = { key, value: val, expiresAt };

    this.closeKvModal();
    this.renderAll();
    this.toast(`Entrada K/V '${key}' guardada`);
  }

  delKv(key) { delete this.state.chambers[key]; this.renderAll(); this.toast(`Clave '${key}' eliminada`); }

  // Foragers Logs
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

  // Soldiers WAF Rules
  openWafModal(ruleId = null) {
    this.editingWafId = ruleId;
    if (ruleId) {
      const r = this.state.soldierRules[ruleId];
      document.getElementById('modal-waf-title').textContent = 'Editar Regla WAF';
      document.getElementById('waf-name').value = r.name;
      document.getElementById('waf-action').value = r.action;
      document.getElementById('waf-ip').value = r.ipPattern || '';
    } else {
      document.getElementById('modal-waf-title').textContent = 'Nueva Regla WAF';
      document.getElementById('waf-name').value = '';
      document.getElementById('waf-action').value = 'block';
      document.getElementById('waf-ip').value = '';
    }
    document.getElementById('modal-waf').classList.remove('hidden');
  }

  closeWafModal() { document.getElementById('modal-waf').classList.add('hidden'); }

  saveWaf() {
    const name = document.getElementById('waf-name').value.trim();
    const action = document.getElementById('waf-action').value;
    const ipPattern = document.getElementById('waf-ip').value.trim();

    if (!name) { this.toast('El nombre de la regla es requerido.'); return; }

    const id = this.editingWafId || `rule_${Date.now()}`;
    this.state.soldierRules[id] = { ruleId: id, name, action, ipPattern: ipPattern || undefined, active: true };

    this.closeWafModal();
    this.renderAll();
    this.toast('Regla WAF guardada correctamente');
  }

  editWaf(id) { this.openWafModal(id); }
  delWaf(id) { delete this.state.soldierRules[id]; this.renderAll(); this.toast('Regla WAF eliminada'); }

  // Legionarys Adapters
  openAdapterModal() {
    document.getElementById('adapter-name').value = '';
    document.getElementById('adapter-endpoint').value = '';
    document.getElementById('modal-adapter').classList.remove('hidden');
  }

  closeAdapterModal() { document.getElementById('modal-adapter').classList.add('hidden'); }

  saveAdapter() {
    const name = document.getElementById('adapter-name').value.trim();
    const provider = document.getElementById('adapter-provider').value;
    const endpoint = document.getElementById('adapter-endpoint').value.trim();

    if (!name) { this.toast('El nombre del adaptador es requerido.'); return; }

    const id = `adapter_${Date.now()}`;
    this.state.legionaryAdapters[id] = { adapterId: id, name, provider, targetEndpoint: endpoint || undefined, active: true };

    this.closeAdapterModal();
    this.renderAll();
    this.toast('Adaptador de purga registrado correctamente');
  }

  delAdapter(id) { delete this.state.legionaryAdapters[id]; this.renderAll(); this.toast('Adaptador eliminado'); }

  // --- SELECTIVE PURGE SIMULATION & EXECUTION ---
  runPurgeDryRun() {
    this.simulatedPurgeItems = [
      { id: 'item_1', provider: 'SINCHLOR', desc: 'Néctar efímero \'prod_db_temp\' (Expirado por TTL = 0 / Uso)', bytes: 2048, selected: true },
      { id: 'item_2', provider: 'BALLOM', desc: 'Enlace corto Larvae \'tmp-promo\' (Caducado hace 24h)', bytes: 1024, selected: true },
      { id: 'item_3', provider: 'LUMINA', desc: 'LanternLink MagicLink \'usr_9981\' (Agotado)', bytes: 1024, selected: true },
      { id: 'item_4', provider: 'CHAMBERS', desc: 'Entrada K/V \'temp_cache\' (Expirada)', bytes: 512, selected: true }
    ];

    this.renderPurgeReport();
    this.toast('Simulación Dry-Run ejecutada. Selecciona los elementos a purgar.');
  }

  renderPurgeReport() {
    const listContainer = document.getElementById('purge-report-items');
    listContainer.innerHTML = '';

    if (this.simulatedPurgeItems.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--primary);">✔ Limpieza completada. No hay recursos expirados detectados.</p>`;
      document.getElementById('purge-report-summary').innerHTML = 'Haz clic en \'Simular Purga\' para detectar elementos expirados.';
      return;
    }

    this.simulatedPurgeItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'purge-item-row';
      row.innerHTML = `
        <input type="checkbox" id="purge-chk-${index}" ${item.selected ? 'checked' : ''} onchange="consoleApp.togglePurgeItem(${index})" />
        <span class="purge-item-badge">${item.provider}</span>
        <span style="flex:1;">${item.desc}</span>
        <span style="color:var(--primary); font-family:monospace; font-weight:600;">+${item.bytes} B</span>
      `;
      listContainer.appendChild(row);
    });

    this.updatePurgeSummary();
  }

  togglePurgeItem(index) {
    if (this.simulatedPurgeItems[index]) {
      this.simulatedPurgeItems[index].selected = !this.simulatedPurgeItems[index].selected;
      this.updatePurgeSummary();
    }
  }

  updatePurgeSummary() {
    const selectedItems = this.simulatedPurgeItems.filter(i => i.selected);
    const totalBytes = selectedItems.reduce((sum, i) => sum + i.bytes, 0);

    document.getElementById('purge-report-summary').innerHTML = `
      <strong style="color:var(--primary);">Simulación Activa:</strong> Seleccionados
      <span style="color:var(--accent); font-weight:700;">${selectedItems.length} de ${this.simulatedPurgeItems.length} elementos</span>
      para purgar (Total: <span style="color:var(--primary); font-weight:700;">${totalBytes.toLocaleString()} bytes</span> a liberar).
    `;
  }

  executeSelectedPurge() {
    const selectedItems = this.simulatedPurgeItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      this.toast('Marca al menos un elemento para ejecutar la purga.');
      return;
    }

    delete this.state.chambers['temp_cache'];
    const bytesFreed = selectedItems.reduce((sum, i) => sum + i.bytes, 0);
    this.simulatedPurgeItems = this.simulatedPurgeItems.filter(i => !i.selected);

    this.renderAll();
    this.renderPurgeReport();
    this.toast(`⚡ Purga ejecutada con éxito! Se liberaron ${bytesFreed} bytes.`);
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
