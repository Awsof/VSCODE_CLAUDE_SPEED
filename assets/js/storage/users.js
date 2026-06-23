/**
 * UsersManager — Gestão de usuários com CRUD, hash SHA-256 e RBAC
 * Chave: users
 * 
 * Schema do usuário:
 * {
 *   id: "uuid",
 *   nome: "João Silva",
 *   email: "joao@empresa.com",
 *   usuario: "joao.silva",
 *   senhaHash: "sha256_hex",
 *   nivel: "admin|operador|visualizador",
 *   ativo: true,
 *   criadoEm: "2026-05-07T10:00:00"
 * }
 */

const UsersManager = (() => {
  const STORE_KEY = 'users';

  /**
   * Gerar UUID v4 simples
   */
  const _generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  /**
   * Hash SHA-256 de uma string
   * Retorna Promise com hex string
   */
  const _hashSHA256 = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Obter lista de usuários
   */
  const list = () => {
    return StorageEngine.get(STORE_KEY, []);
  };

  /**
   * Obter um usuário por ID
   */
  const getById = (id) => {
    const users = list();
    return users.find(u => u.id === id) || null;
  };

  /**
   * Obter um usuário por nome de usuário
   */
  const getByUsername = (username) => {
    const normalized = String(username || '').trim().toLowerCase();
    const users = list();
    return users.find(u => u.usuario === normalized) || null;
  };

  /**
   * Obter um usuário por email
   */
  const getByEmail = (email) => {
    const users = list();
    return users.find(u => u.email === email) || null;
  };

  /**
   * Criar novo usuário
   * @param {Object} userData - {nome, email, usuario, senha, nivel}
   * @returns {Object|null} - Usuário criado ou null se erro
   */
  const create = async (userData) => {
    const { nome, email, usuario, senha, nivel } = userData;

    // Validações
    if (!nome || !email || !usuario || !senha || !nivel) {
      console.error('[UsersManager] Campos obrigatórios faltando');
      return null;
    }

    // Verificar duplicidade
    if (getByUsername(usuario)) {
      console.error('[UsersManager] Usuário já existe:', usuario);
      return null;
    }

    if (getByEmail(email)) {
      console.error('[UsersManager] Email já existe:', email);
      return null;
    }

    // Validar nível
    const niveis = ['admin', 'operador', 'visualizador'];
    if (!niveis.includes(nivel)) {
      console.error('[UsersManager] Nível inválido:', nivel);
      return null;
    }

    try {
      const senhaHash = await _hashSHA256(senha);
      const newUser = {
        id: _generateUUID(),
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        usuario: usuario.trim().toLowerCase(),
        senhaHash,
        nivel,
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      const users = list();
      users.push(newUser);
      StorageEngine.set(STORE_KEY, users);

      // Retornar sem o hash da senha
      const { senhaHash: _, ...userWithoutHash } = newUser;
      return userWithoutHash;
    } catch (error) {
      console.error('[UsersManager] Erro ao criar usuário:', error);
      return null;
    }
  };

  /**
   * Validar credenciais
   * @param {string} usuario - Nome de usuário
   * @param {string} senha - Senha em texto claro
   * @returns {Object|null} - Usuário se válido, null se não
   */
  const validate = async (usuario, senha) => {
    try {
      const user = getByUsername(usuario);
      if (!user) {
        console.warn('[UsersManager] Usuário não encontrado:', usuario);
        return null;
      }

      if (!user.ativo) {
        console.warn('[UsersManager] Usuário inativo:', usuario);
        return null;
      }

      const senhaHash = await _hashSHA256(senha);
      if (senhaHash !== user.senhaHash) {
        console.warn('[UsersManager] Senha incorreta para:', usuario);
        return null;
      }

      // Retornar sem o hash
      const { senhaHash: _, ...userWithoutHash } = user;
      return userWithoutHash;
    } catch (error) {
      console.error('[UsersManager] Erro ao validar:', error);
      return null;
    }
  };

  /**
   * Atualizar usuário
   * @param {string} id - ID do usuário
   * @param {Object} updates - Campos a atualizar (não inclui senhaHash diretamente)
   * @returns {Object|null} - Usuário atualizado
   */
  const update = async (id, updates) => {
    try {
      const users = list();
      const userIndex = users.findIndex(u => u.id === id);

      if (userIndex === -1) {
        console.error('[UsersManager] Usuário não encontrado:', id);
        return null;
      }

      const user = users[userIndex];

      // Se houver nova senha, hashear
      if (updates.senha) {
        updates.senhaHash = await _hashSHA256(updates.senha);
        delete updates.senha;
      }

      // Verificar duplicidade de email/usuario se forem atualizados
      if (updates.email && updates.email !== user.email && getByEmail(updates.email)) {
        console.error('[UsersManager] Email já existe:', updates.email);
        return null;
      }

      if (updates.usuario && updates.usuario !== user.usuario && getByUsername(updates.usuario)) {
        console.error('[UsersManager] Usuário já existe:', updates.usuario);
        return null;
      }

      // Validar nível
      if (updates.nivel) {
        const niveis = ['admin', 'operador', 'visualizador'];
        if (!niveis.includes(updates.nivel)) {
          console.error('[UsersManager] Nível inválido:', updates.nivel);
          return null;
        }
      }

      // Atualizar
      const updatedUser = { ...user, ...updates };
      users[userIndex] = updatedUser;
      StorageEngine.set(STORE_KEY, users);

      // Retornar sem hash
      const { senhaHash: _, ...userWithoutHash } = updatedUser;
      return userWithoutHash;
    } catch (error) {
      console.error('[UsersManager] Erro ao atualizar:', error);
      return null;
    }
  };

  /**
   * Ativar/Desativar usuário
   */
  const setActive = (id, ativo) => {
    return update(id, { ativo });
  };

  /**
   * Excluir usuário
   */
  const delete_ = (id) => {
    try {
      const users = list();
      const filtered = users.filter(u => u.id !== id);
      if (filtered.length === users.length) {
        console.error('[UsersManager] Usuário não encontrado:', id);
        return false;
      }
      StorageEngine.set(STORE_KEY, filtered);
      return true;
    } catch (error) {
      console.error('[UsersManager] Erro ao deletar:', error);
      return false;
    }
  };

  /**
   * Verificar se há usuários cadastrados
   */
  const isEmpty = () => {
    return list().length === 0;
  };

  /**
   * Contar usuários
   */
  const count = () => {
    return list().length;
  };

  return {
    init,
    list,
    getById,
    getByUsername,
    getByEmail,
    create,
    validate,
    update,
    setActive,
    delete_,
    isEmpty,
    count
  };
})();


