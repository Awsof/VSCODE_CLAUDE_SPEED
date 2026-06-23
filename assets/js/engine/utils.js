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
    const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const code = (profileCode || 'GEN').toUpperCase().replace(/\s+/g, '');
    const storageKey = `stp_counter_${code}_${date}`;
    const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const nextSeq = currentSeq + 1;
    localStorage.setItem(storageKey, String(nextSeq));
    return `${code}${date}${String(nextSeq).padStart(4, '0')}`;
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
