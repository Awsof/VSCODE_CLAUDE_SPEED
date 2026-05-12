/**
 * ProfilesManager — Gestão de perfis (endpoints SOAP)
 * Chave: profiles
 * 
 * Schema do perfil:
 * {
 *   id: "uuid",
 *   nome: "Endpoint Produção",
 *   codigo: "PRD",
 *   url: "https://api.empresa.com/soap",
 *   version: "1.0",
 *   payloadTemplate: "<soap:Envelope>...</soap:Envelope>",
 *   xmlTag: "diag:NumeroAtendimentoApoiado",
 *   cor: "#0F9B94",
 *   groupId: "uuid" (opcional),
 *   criadoPor: "usuario-id",
 *   criadoEm: "2026-05-07T10:00:00"
 * }
 */

const ProfilesManager = (() => {
  const STORE_KEY = 'profiles';
  const LEGACY_KEY = 'stp_profiles_v2';

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

      const profiles = JSON.parse(legacyData);
      if (!Array.isArray(profiles) || profiles.length === 0) return;

      console.log('[ProfilesManager] Migrando dados legados v2 → v3...');

      // Converter e adicionar campo criadoPor (admin default)
      const migrated = profiles.map(p => ({
        ...p,
        criadoPor: 'admin', // Padrão para dados legados
        criadoEm: p.criadoEm || new Date().toISOString()
      }));

      StorageEngine.set(STORE_KEY, migrated);
      console.log(`[ProfilesManager] ${migrated.length} perfis migrados`);

      // Manter backup read-only da v2
      // localStorage.removeItem(LEGACY_KEY); // Descomentar para remover legado
    } catch (error) {
      console.error('[ProfilesManager] Erro na migração:', error);
    }
  };

  // Executar migração na inicialização
  _migrateLegacy();

  /**
   * Obter lista de perfis
   */
  const list = () => {
    return StorageEngine.get(STORE_KEY, []);
  };

  /**
   * Obter um perfil por ID
   */
  const getById = (id) => {
    const profiles = list();
    return profiles.find(p => p.id === id) || null;
  };

  /**
   * Obter um perfil por código
   */
  const getByCode = (codigo) => {
    const profiles = list();
    return profiles.find(p => p.codigo === codigo) || null;
  };

  /**
   * Obter perfis de um usuário
   */
  const getByUser = (userId) => {
    const profiles = list();
    return profiles.filter(p => p.criadoPor === userId);
  };

  /**
   * Obter perfis de um grupo
   */
  const getByGroup = (groupId) => {
    const profiles = list();
    return profiles.filter(p => p.groupId === groupId);
  };

  /**
   * Criar novo perfil
   */
  const create = (profileData) => {
    const { nome, codigo, url, version, payloadTemplate, xmlTag, soapAction, cor, groupId, criadoPor, codigoApoiado, codigoSenha } = profileData;

    // Validações
    if (!nome || !codigo || !url || !criadoPor) {
      console.error('[ProfilesManager] Campos obrigatórios faltando');
      return null;
    }

    // Verificar duplicidade por código (normalizado)
    const profiles = list();
    const normalizedCodigo = codigo.trim().toUpperCase();
    if (profiles.find(p => p.codigo === normalizedCodigo)) {
      console.error('[ProfilesManager] Código já existe:', normalizedCodigo);
      return null;
    }

    try {
      const newProfile = {
        id: _generateUUID(),
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        url: url.trim(),
        version: version || '1.0',
        payloadTemplate: payloadTemplate ? payloadTemplate.trim() : null,
        xmlTag: xmlTag || 'diag:NumeroAtendimentoApoiado',
        soapAction: soapAction || null,
        codigoApoiado: codigoApoiado || null,
        codigoSenha: codigoSenha || null,
        cor: cor || '#0F9B94',
        groupId: groupId || null,
        criadoPor,
        criadoEm: new Date().toISOString()
      };

      profiles.push(newProfile);
      StorageEngine.set(STORE_KEY, profiles);

      return newProfile;
    } catch (error) {
      console.error('[ProfilesManager] Erro ao criar:', error);
      return null;
    }
  };

  /**
   * Atualizar perfil
   */
  const update = (id, updates) => {
    try {
      const profiles = list();
      const index = profiles.findIndex(p => p.id === id);

      if (index === -1) {
        console.error('[ProfilesManager] Perfil não encontrado:', id);
        return null;
      }

      // Validar duplicidade se codigo ou url estão sendo atualizados
      if (updates.codigo || updates.url) {
        const newCodigo = updates.codigo || profiles[index].codigo;
        const newUrl = updates.url || profiles[index].url;
        
        if (profiles.find(p => p.id !== id && p.codigo === newCodigo && p.url === newUrl)) {
          console.error('[ProfilesManager] Perfil com código+URL já existe');
          return null;
        }
      }

      const updatedProfile = { ...profiles[index], ...updates };
      
      // Garantir que certos campos não sejam undefined
      if (updates.codigo) updatedProfile.codigo = updates.codigo.toUpperCase();
      if (updates.url) updatedProfile.url = updates.url.trim();
      
      profiles[index] = updatedProfile;
      StorageEngine.set(STORE_KEY, profiles);

      return updatedProfile;
    } catch (error) {
      console.error('[ProfilesManager] Erro ao atualizar:', error);
      return null;
    }
  };

  /**
   * Excluir perfil
   */
  const delete_ = (id) => {
    try {
      const profiles = list();
      const filtered = profiles.filter(p => p.id !== id);

      if (filtered.length === profiles.length) {
        console.error('[ProfilesManager] Perfil não encontrado:', id);
        return false;
      }

      StorageEngine.set(STORE_KEY, filtered);
      return true;
    } catch (error) {
      console.error('[ProfilesManager] Erro ao deletar:', error);
      return false;
    }
  };

  /**
   * Contar perfis
   */
  const count = () => {
    return list().length;
  };

  /**
   * Contar perfis de um usuário
   */
  const countByUser = (userId) => {
    return getByUser(userId).length;
  };

  /**
   * Obter template de payload com placeholder para numeração
   */
  const getPayloadTemplate = (id) => {
    const profile = getById(id);
    return profile ? profile.payloadTemplate : null;
  };

  /**
   * Substituir placeholders no payload
   */
  const fillPayload = (id, placeholders = {}) => {
    const profile = getById(id);
    if (!profile) return null;

    let filled = profile.payloadTemplate;
    
    // Padrão: {{NUM_ATENDIMENTO}}, {{LOGIN}}, {{SENHA}}
    Object.entries(placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      filled = filled.replace(regex, value || '');
    });

    return filled;
  };

  return {
    list,
    getById,
    getByCode,
    getByUser,
    getByGroup,
    create,
    update,
    delete_,
    count,
    countByUser,
    getPayloadTemplate,
    fillPayload
  };
})();
