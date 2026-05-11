/**
 * GroupsManager — Gestão de grupos de perfis
 * Chave: groups
 * 
 * Schema do grupo:
 * {
 *   id: "uuid",
 *   nome: "Produção",
 *   cor: "#0F9B94",
 *   descricao: "Endpoints de produção",
 *   criadoPor: "usuario-id",
 *   criadoEm: "2026-05-07T10:00:00"
 * }
 */

const GroupsManager = (() => {
  const STORE_KEY = 'groups';
  const LEGACY_KEY = 'stp_groups_v2';

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
   * Migrar dados legados v2 → v3
   * Executado na primeira carga
   */
  const _migrateLegacy = () => {
    try {
      const legacyData = localStorage.getItem(LEGACY_KEY);
      if (!legacyData) return;

      const groups = JSON.parse(legacyData);
      if (!Array.isArray(groups) || groups.length === 0) return;

      console.log('[GroupsManager] Migrando dados legados v2 → v3...');

      // Converter e adicionar campo criadoPor (admin default)
      const migrated = groups.map(g => ({
        ...g,
        criadoPor: 'admin', // Padrão para dados legados
        criadoEm: g.criadoEm || new Date().toISOString()
      }));

      StorageEngine.set(STORE_KEY, migrated);
      console.log(`[GroupsManager] ${migrated.length} grupos migrados`);

      // Manter backup read-only da v2
      // localStorage.removeItem(LEGACY_KEY); // Descomentar para remover legado
    } catch (error) {
      console.error('[GroupsManager] Erro na migração:', error);
    }
  };

  // Executar migração na inicialização
  _migrateLegacy();

  /**
   * Obter lista de grupos
   */
  const list = () => {
    return StorageEngine.get(STORE_KEY, []);
  };

  /**
   * Obter um grupo por ID
   */
  const getById = (id) => {
    const groups = list();
    return groups.find(g => g.id === id) || null;
  };

  /**
   * Obter um grupo por nome
   */
  const getByName = (nome) => {
    const groups = list();
    return groups.find(g => g.nome === nome) || null;
  };

  /**
   * Obter grupos de um usuário
   */
  const getByUser = (userId) => {
    const groups = list();
    return groups.filter(g => g.criadoPor === userId);
  };

  /**
   * Criar novo grupo
   */
  const create = (groupData) => {
    const { nome, cor, descricao, criadoPor } = groupData;

    // Validações
    if (!nome || !criadoPor) {
      console.error('[GroupsManager] Nome e criadoPor obrigatórios');
      return null;
    }

    // Verificar duplicidade por nome
    if (getByName(nome)) {
      console.error('[GroupsManager] Grupo com este nome já existe:', nome);
      return null;
    }

    try {
      const newGroup = {
        id: _generateUUID(),
        nome: nome.trim(),
        cor: cor || '#0F9B94',
        descricao: (descricao || '').trim(),
        criadoPor,
        criadoEm: new Date().toISOString()
      };

      const groups = list();
      groups.push(newGroup);
      StorageEngine.set(STORE_KEY, groups);

      return newGroup;
    } catch (error) {
      console.error('[GroupsManager] Erro ao criar:', error);
      return null;
    }
  };

  /**
   * Atualizar grupo
   */
  const update = (id, updates) => {
    try {
      const groups = list();
      const index = groups.findIndex(g => g.id === id);

      if (index === -1) {
        console.error('[GroupsManager] Grupo não encontrado:', id);
        return null;
      }

      // Validar nome se está sendo atualizado
      if (updates.nome && updates.nome !== groups[index].nome) {
        if (getByName(updates.nome)) {
          console.error('[GroupsManager] Grupo com este nome já existe:', updates.nome);
          return null;
        }
      }

      const updatedGroup = { ...groups[index], ...updates };
      groups[index] = updatedGroup;
      StorageEngine.set(STORE_KEY, groups);

      return updatedGroup;
    } catch (error) {
      console.error('[GroupsManager] Erro ao atualizar:', error);
      return null;
    }
  };

  /**
   * Excluir grupo
   * Remove referências do grupo em todos os perfis
   */
  const delete_ = (id) => {
    try {
      const groups = list();
      const filtered = groups.filter(g => g.id !== id);

      if (filtered.length === groups.length) {
        console.error('[GroupsManager] Grupo não encontrado:', id);
        return false;
      }

      // Limpar referências em perfis (se ProfilesManager estiver disponível)
      if (typeof ProfilesManager !== 'undefined') {
        ProfilesManager.list().forEach(profile => {
          if (profile.groupId === id) {
            ProfilesManager.update(profile.id, { groupId: null });
          }
        });
      }

      StorageEngine.set(STORE_KEY, filtered);
      return true;
    } catch (error) {
      console.error('[GroupsManager] Erro ao deletar:', error);
      return false;
    }
  };

  /**
   * Contar grupos
   */
  const count = () => {
    return list().length;
  };

  return {
    list,
    getById,
    getByName,
    getByUser,
    create,
    update,
    delete_,
    count
  };
})();
