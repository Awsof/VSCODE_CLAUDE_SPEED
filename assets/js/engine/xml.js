/**
 * XMLEngine — Parsing e extração de dados XML
 */
const XMLEngine = (() => {
  /**
   * Parse XML string para Document
   */
  const parse = (xmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      
      // Verificar se houve erro no parsing
      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing error');
      }
      
      return doc;
    } catch (error) {
      console.error('[XMLEngine] Erro ao fazer parse de XML:', error);
      return null;
    }
  };

  /**
   * Extrair valor de tag XML
   * Suporta: tag simples, namespace (ns:tag)
   */
  const extractTag = (xmlString, tagName, defaultValue = null) => {
    if (!xmlString || !tagName) return defaultValue;

    try {
      const doc = parse(xmlString);
      if (!doc) return defaultValue;

      // Dividir namespace se presente
      const [ns, localName] = tagName.includes(':') 
        ? tagName.split(':') 
        : [null, tagName];

      // Procurar por tag
      let nodes;
      if (ns) {
        // Com namespace
        nodes = doc.getElementsByTagNameNS('*', localName);
      } else {
        // Sem namespace (mais tolerante)
        nodes = doc.getElementsByTagName(tagName);
        if (nodes.length === 0) {
          // Tentar sem namespace mesmo que haja prefixo
          nodes = doc.getElementsByTagNameNS('*', tagName);
        }
      }

      if (nodes.length > 0) {
        const value = nodes[0].textContent.trim();
        return value || defaultValue;
      }

      // Fallback: regex simples
      const regex = new RegExp(`<${tagName}[^>]*>([^<]+)<\/${tagName}>`, 'i');
      const match = xmlString.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }

      return defaultValue;
    } catch (error) {
      console.error(`[XMLEngine] Erro ao extrair tag ${tagName}:`, error);
      return defaultValue;
    }
  };

  /**
   * Verificar se XML contém SOAP Fault
   */
  const hasFault = (xmlString) => {
    if (!xmlString) return false;
    return /(<soap:Fault>|<faultcode>|:Fault>)/i.test(xmlString);
  };

  /**
   * Extrair mensagem de erro de SOAP Fault
   */
  const extractFaultString = (xmlString) => {
    if (!xmlString) return null;
    
    const match = xmlString.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
    return match ? match[1].trim() : null;
  };

  /**
   * Extrair status code de response (se disponível em header)
   */
  const extractStatusCode = (responseHeaders, defaultCode = 200) => {
    if (!responseHeaders) return defaultCode;
    
    // Se headers for string, parsing manual
    if (typeof responseHeaders === 'string') {
      const match = responseHeaders.match(/^HTTP\/[\d.]+ (\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    
    return defaultCode;
  };

  /**
   * Validar se XML é bem-formado
   */
  const isValid = (xmlString) => {
    if (!xmlString) return false;
    const doc = parse(xmlString);
    return doc !== null && doc.getElementsByTagName('parsererror').length === 0;
  };

  return {
    parse,
    extractTag,
    hasFault,
    extractFaultString,
    extractStatusCode,
    isValid
  };
})();
