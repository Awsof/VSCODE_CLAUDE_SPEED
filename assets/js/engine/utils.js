/**
 * UtilsEngine — Funções utilitárias para execução de testes
 */
const UtilsEngine = (() => {
  /**
   * Gerar número de atendimento único
   * Formato: {CODIGO}{YYYYMMDD}{SEQ:003}
   */
  const generateAttendanceNumber = (profileCode) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const date = `${year}${month}${day}`;
    
    // Obter sequência do dia
    const storageKey = `stp_counter_${profileCode}_${date}`;
    const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const nextSeq = currentSeq + 1;
    localStorage.setItem(storageKey, String(nextSeq));
    
    const seq = String(nextSeq).padStart(3, '0');
    return `${profileCode.toUpperCase()}${date}${seq}`;
  };

  /**
   * Sleep/delay
   */
  const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Medir tempo em ms
   */
  const measureTime = (fn) => {
    const start = performance.now();
    const result = fn();
    const duration = Math.round(performance.now() - start);
    return { result, duration };
  };

  /**
   * Medir tempo assíncrono
   */
  const measureTimeAsync = async (fn) => {
    const start = performance.now();
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    return { result, duration };
  };

  /**
   * Escapar XML
   */
  const escapeXML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  /**
   * Validar URL
   */
  const isValidURL = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Formatar duração em string legível
   */
  const formatDuration = (ms) => {
    if (ms >= 60000) {
      return `${(ms / 60000).toFixed(1)}m`;
    } else if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  return {
    generateAttendanceNumber,
    sleep,
    measureTime,
    measureTimeAsync,
    escapeXML,
    isValidURL,
    formatDuration
  };
})();
