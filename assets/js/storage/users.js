/**
 * UsersManager - Gestao de usuarios com CRUD, hash SHA-256 e RBAC
 * Chave: users
 */

const UsersManager = (() => {
  const STORE_KEY = 'users';

  const _generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

  const _hashSHA256 = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const _apiSync = (method, path, body) => {
    try {
      const token = typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body) opts.body = JSON.stringify(body);
      fetch(path, opts).catch(e => console.warn('[UsersManager] API sync falhou:', e.message));
    } catch (e) {
      console.warn('[UsersManager] _apiSync error:', e.message);
    }
  };

  const init = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tursoUsers = data.users || [];
      if (tursoUsers.length > 0) {
        StorageEngine.set(STORE_KEY, tursoUsers);
        console.log('[UsersManager] ' + tursoUsers.length + ' usuario(s) carregados do Turso');
      } else {
        const localUsers = StorageEngine.get(STORE_KEY, []);
        if (localUsers.length > 0) {
          console.log('[UsersManager] Turso vazio - migrando ' + localUsers.length + ' usuario(s)...');
          const migrRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _migrate: true, users: localUsers })
          });
          if (migrRes.ok) {
            const migrData = await migrRes.json();
            console.log('[UsersManager] Migracao concluida:', migrData.migrated, 'usuario(s)');
            StorageEngine.set(STORE_KEY, migrData.users || localUsers);
          }
        }
      }
    } catch (e) {
      console.warn('[UsersManager] Turso indisponivel, usando localStorage:', e.message);
    }
  };

  const list = () => StorageEngine.get(STORE_KEY, []);
  const getById = (id) => list().find(u => u.id === id) || null;
  const getByUsername = (username) => {
    const normalized = String(username || '').trim().toLowerCase();
    return list().find(u => u.usuario === normalized) || null;
  };
  const getByEmail = (email) => list().find(u => u.email === email) || null;

  const create = async (userData) => {
    const { nome, email, usuario, senha, nivel } = userData;
    if (!nome || !email || !usuario || !senha || !nivel) {
      console.error('[UsersManager] Campos obrigatorios faltando'); return null;
    }
    if (getByUsername(usuario)) { console.error('[UsersManager] Usuario ja existe:', usuario); return null; }
    if (getByEmail(email))      { console.error('[UsersManager] Email ja existe:', email);    return null; }
    const niveis = ['admin', 'operador', 'visualizador'];
    if (!niveis.includes(nivel)) { console.error('[UsersManager] Nivel invalido:', nivel); return null; }
    try {
      const senhaHash = await _hashSHA256(senha);
      const newUser = {
        id: _generateUUID(), nome: nome.trim(),
        email: email.trim().toLowerCase(), usuario: usuario.trim().toLowerCase(),
        senhaHash, nivel, ativo: true, criadoEm: new Date().toISOString()
      };
      const users = list(); users.push(newUser); StorageEngine.set(STORE_KEY, users);
      _apiSync('POST', '/api/users', newUser);
      const { senhaHash: _, ...userWithoutHash } = newUser;
      return userWithoutHash;
    } catch (error) { console.error('[UsersManager] Erro ao criar usuario:', error); return null; }
  };

  const validate = async (usuario, senha) => {
    try {
      const user = getByUsername(usuario);
      if (!user || !user.ativo) return null;
      const senhaHash = await _hashSHA256(senha);
      if (senhaHash !== user.senhaHash) return null;
      const { senhaHash: _, ...userWithoutHash } = user;
      return userWithoutHash;
    } catch (error) { console.error('[UsersManager] Erro ao validar:', error); return null; }
  };

  const update = async (id, updates) => {
    try {
      const users = list();
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) return null;
      const user = users[userIndex];
      if (updates.senha) { updates.senhaHash = await _hashSHA256(updates.senha); delete updates.senha; }
      if (updates.email && updates.email !== user.email && getByEmail(updates.email)) return null;
      if (updates.usuario && updates.usuario !== user.usuario && getByUsername(updates.usuario)) return null;
      if (updates.nivel) {
        const niveis = ['admin', 'operador', 'visualizador'];
        if (!niveis.includes(updates.nivel)) return null;
      }
      const updatedUser = { ...user, ...updates };
      users[userIndex] = updatedUser; StorageEngine.set(STORE_KEY, users);
      _apiSync('PUT', '/api/users/' + id, updates);
      const { senhaHash: _, ...userWithoutHash } = updatedUser;
      return userWithoutHash;
    } catch (error) { console.error('[UsersManager] Erro ao atualizar:', error); return null; }
  };

  const setActive = (id, ativo) => update(id, { ativo });

  const delete_ = (id) => {
    try {
      const users = list();
      const filtered = users.filter(u => u.id !== id);
      if (filtered.length === users.length) return false;
      StorageEngine.set(STORE_KEY, filtered);
      _apiSync('DELETE', '/api/users/' + id);
      return true;
    } catch (error) { console.error('[UsersManager] Erro ao deletar:', error); return false; }
  };

  const isEmpty = () => list().length === 0;
  const count = () => list().length;

  return {
    init, list, getById, getByUsername, getByEmail,
    create, validate, update, setActive, delete_, isEmpty, count
  };
})();