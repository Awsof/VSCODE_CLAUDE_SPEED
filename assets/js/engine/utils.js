/**
 * UtilsEngine — Funções utilitárias para execução de testes
 */
const UtilsEngine = (() => {
  /**
   * Gerar número de atendimento único
   * Formato: {CODIGO}{YYYYMMDD}{SEQ:003}
   */
  const generateAttendanceNumber = () => {
    const key = 'stp_attendance_seq';
    const current = parseInt(localStorage.getItem(key) || '100000', 10);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return String(next);
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
