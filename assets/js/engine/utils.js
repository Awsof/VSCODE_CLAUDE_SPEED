/**
 * UtilsEngine — Funções utilitárias para execução de testes
 */
const UtilsEngine = (() => {
  // Tags especiais e como mapeá-las para placeholders canônicos
  const SPECIAL_TAG_TYPES = {
    NumeroAtendimento:        'atendimento',
    NumeroAtendimentoApoiado: 'atendimento_apoiado',
    Codigo:                   'global',
    Login:                    'global',
    Senha:                    'global',
    DataHoje:                 'execution_auto',
    TimestampAgora:           'execution_auto',
  };

  const _TAG_TO_PLACEHOLDER = {
    NumeroAtendimento: 'NUM_ATENDIMENTO',
    Codigo:            'CODIGO_APOIADO',
    Login:             'LOGIN',
    Senha:             'CODIGO_SENHA',
    DataHoje:          'DATA_HOJE',
    TimestampAgora:    'TIMESTAMP_AGORA',
  };

  // Tags estruturais SOAP que não devem ser detectadas como campos variáveis
  const _SOAP_STRUCTURAL = new Set([
    'Envelope', 'Body', 'Header', 'Fault', 'faultcode', 'faultstring', 'detail',
  ]);

  /**
   * Detecta tags XML vazias (<Tag></Tag>) e retorna lista tipada de campos.
   * Formato novo conforme TAG_DETECTION_PATTERN.md.
   */
  const extractTags = (xml) => {
    if (!xml) return [];
    const emptyTagRegex = /<([\w][\w:.-]*)(\s[^>]*)?>(\s*)<\/\1>/g;
    const seen = {};
    const tags = [];
    for (const [, rawTag] of xml.matchAll(emptyTagRegex)) {
      const local = rawTag.includes(':') ? rawTag.split(':').pop() : rawTag;
      if (_SOAP_STRUCTURAL.has(local)) continue;
      seen[local] = (seen[local] || 0) + 1;
      const seq = seen[local];
      tags.push({
        name:       seq > 1 ? `${local}_${seq}` : local,
        xmlTagName: rawTag,
        localName:  local,
        type:       SPECIAL_TAG_TYPES[local] || 'custom',
        seq,
      });
    }
    return tags;
  };

  /**
   * Detecta placeholders {{variavel}} e retorna lista tipada de campos.
   * Formato legado conforme TAG_DETECTION_PATTERN.md.
   */
  const extractVariables = (xml) => {
    if (!xml) return [];
    const matches = [...xml.matchAll(/\{\{([^}]+)\}\}/g)];
    const names = [...new Set(matches.map(m => m[1].trim()))];
    return names.map(name => ({
      name,
      xmlTagName: name,
      localName:  name,
      type:       SPECIAL_TAG_TYPES[name] || 'custom',
      seq:        1,
    }));
  };

  /**
   * Converte tags vazias detectadas em placeholders {{...}} no XML.
   * Chamado ao salvar o método para normalizar o template.
   */
  const convertEmptyTagsToPlaceholders = (xml, variables) => {
    if (!xml || !variables || !variables.length) return xml;
    let result = xml;
    for (const v of variables) {
      const placeholder = _TAG_TO_PLACEHOLDER[v.localName] || v.name;
      const esc = v.xmlTagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(<${esc}(?:\\s[^>]*)?>)(\\s*)(<\\/${esc}>)`, 'g');
      result = result.replace(re, `$1{{${placeholder}}}$3`);
    }
    return result;
  };

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

  /**
   * Gerar número de atendimento aleatório (4 dígitos).
   * Formato: {CODIGO}{YYYYMMDD}{RAND4}
   */
  const generateRandomAttendanceNumber = (profileCode) => {
    const today = new Date();
    const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const code = (profileCode || 'GEN').toUpperCase().replace(/\s+/g, '');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `${code}${date}${rand}`;
  };

  return {
    SPECIAL_TAG_TYPES,
    generateAttendanceNumber,
    generateRandomAttendanceNumber,
    extractTags,
    extractVariables,
    convertEmptyTagsToPlaceholders,
    sleep,
    measureTime,
    measureTimeAsync,
    escapeXML,
    isValidURL,
    formatDuration
  };
})();
