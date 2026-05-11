/**
 * StorageEngine — Abstração genérica do localStorage
 * Namespace: stp_v3_
 * 
 * Fornece interface padrão: get, set, remove, list, clear
 * com prefixo isolado para evitar conflito com dados legados
 */

const StorageEngine = (() => {
  const PREFIX = 'stp_v3_';

  /**
   * Construir a chave com namespace
   * @param {string} key - Chave sem namespace
   * @returns {string} - Chave com namespace
   */
  const _buildKey = (key) => `${PREFIX}${key}`;

  /**
   * Obter um item do localStorage
   * @param {string} key - Chave (sem namespace)
   * @param {*} defaultValue - Valor padrão se não existir
   * @returns {*} - Valor parseado ou padrão
   */
  const get = (key, defaultValue = null) => {
    try {
      const fullKey = _buildKey(key);
      const value = localStorage.getItem(fullKey);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`[StorageEngine] Erro ao ler '${key}':`, error);
      return defaultValue;
    }
  };

  /**
   * Definir um item no localStorage
   * @param {string} key - Chave (sem namespace)
   * @param {*} value - Valor a armazenar (será stringify)
   * @returns {boolean} - Sucesso
   */
  const set = (key, value) => {
    try {
      const fullKey = _buildKey(key);
      localStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[StorageEngine] Erro ao salvar '${key}':`, error);
      return false;
    }
  };

  /**
   * Remover um item do localStorage
   * @param {string} key - Chave (sem namespace)
   * @returns {boolean} - Sucesso
   */
  const remove = (key) => {
    try {
      const fullKey = _buildKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`[StorageEngine] Erro ao remover '${key}':`, error);
      return false;
    }
  };

  /**
   * Listar todas as chaves com nosso namespace
   * @returns {string[]} - Array de chaves (sem namespace)
   */
  const list = () => {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(PREFIX)) {
          // Remove o prefix para retornar só a chave
          keys.push(fullKey.substring(PREFIX.length));
        }
      }
    } catch (error) {
      console.error('[StorageEngine] Erro ao listar chaves:', error);
    }
    return keys;
  };

  /**
   * Limpar todos os itens do namespace
   * @returns {boolean} - Sucesso
   */
  const clear = () => {
    try {
      const keys = list();
      keys.forEach(key => remove(key));
      return true;
    } catch (error) {
      console.error('[StorageEngine] Erro ao limpar storage:', error);
      return false;
    }
  };

  /**
   * Verificar se uma chave existe
   * @param {string} key - Chave (sem namespace)
   * @returns {boolean}
   */
  const exists = (key) => {
    const fullKey = _buildKey(key);
    return localStorage.getItem(fullKey) !== null;
  };

  /**
   * Obter todas as chaves e valores como objeto
   * @returns {Object} - Dicionário {chave: valor}
   */
  const getAll = () => {
    const result = {};
    const keys = list();
    keys.forEach(key => {
      result[key] = get(key);
    });
    return result;
  };

  return {
    get,
    set,
    remove,
    list,
    clear,
    exists,
    getAll,
    PREFIX
  };
})();
