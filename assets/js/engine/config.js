/**
 * ConfigEngine — Constantes e configurações globais
 */
const ConfigEngine = (() => {
  const config = {
    // Timeouts
    DEFAULT_REQUEST_TIMEOUT: 120000, // 120 segundos
    DEFAULT_CONNECTION_TIMEOUT: 30000, // 30 segundos
    
    // Concorrência
    DEFAULT_CONCURRENCY: 3,
    MAX_CONCURRENCY: 20,
    
    // Ramp-up
    DEFAULT_RAMP_UP: 0, // 0 = desativado
    MAX_RAMP_UP: 300, // 300 segundos
    
    // Limite de resultados
    MAX_RESULTS_PER_EXECUTION: 5000,
    
    // Formato de dados
    XML_PARSER_TYPE: 'DOMParser', // Usar DOMParser para XML
    
    // Endpoints
    SOAP_CONTENT_TYPE: 'text/xml; charset=utf-8',
    
    // Retry
    MAX_RETRIES: 0, // Sem retry automático por padrão
    RETRY_DELAY: 1000 // ms entre tentativas
  };

  const get = (key) => config[key];
  const set = (key, value) => {
    if (key in config) {
      config[key] = value;
      return true;
    }
    return false;
  };

  return {
    get,
    set,
    all: () => ({ ...config })
  };
})();
