/**
 * ScenariosManager — Gestão de cenários/checklists de teste sequencial
 * Chave: scenarios
 * 
 * Schema do cenário:
 * {
 *   id: "uuid",
 *   nome: "Teste Matutino - Produção",
 *   descricao: "Validação diária dos endpoints de produção",
 *   passos: [
 *     { ordem: 1, profileId: "uuid-perfil-1", requests: 5, concorrencia: 2 },
 *     { ordem: 2, profileId: "uuid-perfil-2", requests: 3, concorrencia: 1 }
 *   ],
 *   criadoPor: "usuario-id",
 *   criadoEm: "2026-05-07T10:00:00"
 * }
 */

const ScenariosManager = (() => {
  const STORE_KEY = 'scenarios';

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
   * Reordenar passos após alteração
   */
  const _reorderSteps = (passos) => {
    return passos
      .sort((a, b) => a.ordem - b.ordem)
      .map((passo, index) => ({ ...passo, ordem: index + 1 }));
  };

  /**
   * Obter lista de cenários
   */
  const list = () => {
    return StorageEngine.get(STORE_KEY, []);
  };

  /**
   * Obter um cenário por ID
   */
  const getById = (id) => {
    const scenarios = list();
    return scenarios.find(s => s.id === id) || null;
  };

  /**
   * Obter cenários de um usuário
   */
  const getByUser = (userId) => {
    const scenarios = list();
    return scenarios.filter(s => s.criadoPor === userId);
  };

  /**
   * Criar novo cenário
   */
  const create = (scenarioData) => {
    const { nome, descricao, passos, criadoPor } = scenarioData;

    // Validações
    if (!nome || !criadoPor) {
      console.error('[ScenariosManager] Nome e criadoPor obrigatórios');
      return null;
    }

    if (!Array.isArray(passos) || passos.length === 0) {
      console.error('[ScenariosManager] Cenário deve ter pelo menos um passo');
      return null;
    }

    // Validar passos
    for (let passo of passos) {
      if (!passo.profileId || !passo.requests || passo.requests < 1) {
        console.error('[ScenariosManager] Passo inválido:', passo);
        return null;
      }
      if (!passo.concorrencia || passo.concorrencia < 1) {
        console.error('[ScenariosManager] Concorrência mínima: 1');
        return null;
      }
    }

    try {
      const newScenario = {
        id: _generateUUID(),
        nome: nome.trim(),
        descricao: (descricao || '').trim(),
        passos: _reorderSteps(passos),
        criadoPor,
        criadoEm: new Date().toISOString()
      };

      const scenarios = list();
      scenarios.push(newScenario);
      StorageEngine.set(STORE_KEY, scenarios);

      return newScenario;
    } catch (error) {
      console.error('[ScenariosManager] Erro ao criar:', error);
      return null;
    }
  };

  /**
   * Atualizar cenário
   */
  const update = (id, updates) => {
    try {
      const scenarios = list();
      const index = scenarios.findIndex(s => s.id === id);

      if (index === -1) {
        console.error('[ScenariosManager] Cenário não encontrado:', id);
        return null;
      }

      // Validar passos se estão sendo atualizados
      if (updates.passos) {
        if (!Array.isArray(updates.passos) || updates.passos.length === 0) {
          console.error('[ScenariosManager] Cenário deve ter pelo menos um passo');
          return null;
        }

        for (let passo of updates.passos) {
          if (!passo.profileId || !passo.requests || passo.requests < 1) {
            console.error('[ScenariosManager] Passo inválido:', passo);
            return null;
          }
        }

        updates.passos = _reorderSteps(updates.passos);
      }

      const updatedScenario = { ...scenarios[index], ...updates };
      scenarios[index] = updatedScenario;
      StorageEngine.set(STORE_KEY, scenarios);

      return updatedScenario;
    } catch (error) {
      console.error('[ScenariosManager] Erro ao atualizar:', error);
      return null;
    }
  };

  /**
   * Adicionar passo ao cenário
   */
  const addStep = (id, passo) => {
    try {
      const scenario = getById(id);
      if (!scenario) return null;

      if (!passo.profileId || !passo.requests || !passo.concorrencia) {
        console.error('[ScenariosManager] Passo inválido');
        return null;
      }

      const novoPasso = {
        ...passo,
        ordem: (scenario.passos.length || 0) + 1
      };

      const updated = update(id, {
        passos: [...(scenario.passos || []), novoPasso]
      });

      return updated;
    } catch (error) {
      console.error('[ScenariosManager] Erro ao adicionar passo:', error);
      return null;
    }
  };

  /**
   * Remover passo do cenário
   */
  const removeStep = (id, ordem) => {
    try {
      const scenario = getById(id);
      if (!scenario) return null;

      const passos = (scenario.passos || []).filter(p => p.ordem !== ordem);

      if (passos.length === 0) {
        console.error('[ScenariosManager] Cenário deve ter pelo menos um passo');
        return null;
      }

      return update(id, { passos });
    } catch (error) {
      console.error('[ScenariosManager] Erro ao remover passo:', error);
      return null;
    }
  };

  /**
   * Reordenar passos
   */
  const reorderSteps = (id, passos) => {
    return update(id, { passos: _reorderSteps(passos) });
  };

  /**
   * Excluir cenário
   */
  const delete_ = (id) => {
    try {
      const scenarios = list();
      const filtered = scenarios.filter(s => s.id !== id);

      if (filtered.length === scenarios.length) {
        console.error('[ScenariosManager] Cenário não encontrado:', id);
        return false;
      }

      StorageEngine.set(STORE_KEY, filtered);
      return true;
    } catch (error) {
      console.error('[ScenariosManager] Erro ao deletar:', error);
      return false;
    }
  };

  /**
   * Contar cenários
   */
  const count = () => {
    return list().length;
  };

  return {
    list,
    getById,
    getByUser,
    create,
    update,
    addStep,
    removeStep,
    reorderSteps,
    delete_,
    count
  };
})();
