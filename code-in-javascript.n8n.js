// n8n Code node: Code in JavaScript
// Settings: Language = JavaScript, Mode = Run Once for All Items
// Purpose: Enrich each RSS item with security-oriented metadata for the dashboard.

const now = new Date();

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function textHas(value, terms) {
  return terms.some(term => value.includes(term));
}

function classifySeverity(text) {
  const value = text.toLowerCase();
  const criticalTerms = [
    'actively exploited', 'mass exploitation', 'mass-exploitation', 'emergency patch',
    'zero-day', '0-day', 'critical vulnerability', 'remote code execution', 'rce',
    'authentication bypass', 'supply chain attack', 'domain admin', 'ransomware gang',
    'ransomware gangs', 'widespread exploitation'
  ];
  const highTerms = [
    'ransomware', 'data breach', 'data theft', 'exploit released', 'proof-of-concept',
    'poc exploit', 'cisa', 'kev catalog', 'credential theft', 'infostealer', 'backdoor',
    'botnet', 'malware campaign', 'sharepoint', 'exchange', 'fortinet', 'citrix',
    'vmware', 'palo alto', 'cisco', 'vpn', 'firewall', 'identity provider'
  ];
  const mediumTerms = [
    'vulnerability', 'cve-', 'patch', 'security update', 'phishing', 'windows',
    'microsoft', 'linux', 'router', 'firmware', 'security'
  ];

  if (textHas(value, criticalTerms)) return 'critical';
  if (textHas(value, highTerms)) return 'high';
  if (textHas(value, mediumTerms)) return 'medium';
  return 'low';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractTags(text) {
  const value = text.toLowerCase();
  const rules = [
    ['ransomware', 'Ransomware'], ['cve-', 'CVE'], ['zero-day', 'Zero-Day'], ['0-day', 'Zero-Day'],
    ['microsoft', 'Microsoft'], ['windows', 'Windows'], ['sharepoint', 'SharePoint'], ['exchange', 'Exchange'],
    ['active directory', 'Active Directory'], ['cisa', 'CISA'], ['kev', 'CISA KEV'], ['fortinet', 'Fortinet'],
    ['cisco', 'Cisco'], ['palo alto', 'Palo Alto'], ['citrix', 'Citrix'], ['vmware', 'VMware'],
    ['vpn', 'VPN'], ['firewall', 'Firewall'], ['malware', 'Malware'], ['phishing', 'Phishing'],
    ['credential', 'Credential Theft'], ['infostealer', 'Infostealer'], ['data breach', 'Data Breach'],
    ['data theft', 'Data Theft'], ['remote code execution', 'RCE'], ['rce', 'RCE'], ['botnet', 'Botnet'],
    ['backdoor', 'Backdoor'], ['firmware', 'Firmware'], ['router', 'Router'], ['linux', 'Linux']
  ];
  return unique(rules.filter(([needle]) => value.includes(needle)).map(([, label]) => label));
}

function affectedTechnology(text) {
  const value = text.toLowerCase();
  const rules = [
    ['microsoft', 'Microsoft'], ['windows', 'Windows'], ['sharepoint', 'SharePoint'], ['exchange', 'Exchange'],
    ['active directory', 'Active Directory'], ['entra', 'Microsoft Entra'], ['azure', 'Microsoft Azure'],
    ['fortinet', 'Fortinet'], ['cisco', 'Cisco'], ['palo alto', 'Palo Alto'], ['citrix', 'Citrix'],
    ['vmware', 'VMware'], ['linux', 'Linux'], ['router', 'Network Router'], ['vpn', 'VPN'],
    ['firewall', 'Firewall'], ['chrome', 'Google Chrome'], ['edge', 'Microsoft Edge'], ['wordpress', 'WordPress']
  ];
  return unique(rules.filter(([needle]) => value.includes(needle)).map(([, label]) => label));
}

function threatType(text) {
  const value = text.toLowerCase();
  const rules = [
    ['ransomware', 'Ransomware'], ['phishing', 'Phishing'], ['malware', 'Malware'],
    ['infostealer', 'Infostealer'], ['credential', 'Credential Theft'], ['data breach', 'Data Breach'],
    ['data theft', 'Data Theft'], ['vulnerability', 'Vulnerability'], ['cve-', 'Vulnerability'],
    ['remote code execution', 'Remote Code Execution'], ['rce', 'Remote Code Execution'],
    ['zero-day', 'Zero-Day'], ['0-day', 'Zero-Day'], ['botnet', 'Botnet'], ['backdoor', 'Backdoor'],
    ['supply chain', 'Supply Chain'], ['exploit', 'Exploitation']
  ];
  return unique(rules.filter(([needle]) => value.includes(needle)).map(([, label]) => label));
}

function priorityScore(severity, text, publishedAt) {
  const value = text.toLowerCase();
  let score = { critical: 55, high: 40, medium: 22, low: 8 }[severity] || 8;

  const boosts = [
    [['actively exploited', 'mass exploitation', 'widespread exploitation'], 25],
    [['zero-day', '0-day'], 22],
    [['ransomware'], 20],
    [['cisa', 'kev catalog', 'kev'], 18],
    [['remote code execution', 'rce'], 16],
    [['authentication bypass', 'credential theft', 'infostealer'], 14],
    [['microsoft', 'windows', 'sharepoint', 'exchange', 'active directory'], 10],
    [['vpn', 'firewall', 'fortinet', 'cisco', 'palo alto', 'citrix', 'vmware'], 10],
    [['data breach', 'data theft'], 10]
  ];

  for (const [terms, points] of boosts) {
    if (terms.some(term => value.includes(term))) score += points;
  }

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 36e5;
  if (!Number.isNaN(ageHours) && ageHours <= 24) score += 8;
  if (!Number.isNaN(ageHours) && ageHours <= 72) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function recommendedAction(severity, text) {
  const value = text.toLowerCase();
  if (severity === 'critical') {
    return 'Review immediately. Validate exposure, vendor advisory status, patch status, SIEM/EDR alerts, and known indicators of compromise.';
  }
  if (severity === 'high') {
    return 'Review today. Confirm whether affected products, vendors, services, or externally exposed systems exist in the environment.';
  }
  if (value.includes('microsoft') || value.includes('windows')) {
    return 'Review Microsoft patch applicability and confirm endpoint and server update status.';
  }
  if (value.includes('vpn') || value.includes('firewall')) {
    return 'Validate edge device exposure, firmware level, remote access logs, and vendor advisories.';
  }
  if (value.includes('phishing')) {
    return 'Review email security controls, user reporting, quarantine activity, and related indicators.';
  }
  return 'Review for awareness and determine whether the topic applies to the environment.';
}

function businessImpact(severity, text) {
  const value = text.toLowerCase();
  if (value.includes('ransomware')) return 'Potential business disruption, data loss, or extortion risk if related indicators or affected technologies are present.';
  if (value.includes('data breach') || value.includes('data theft')) return 'Potential confidentiality, compliance, and customer/vendor notification impact if exposure is confirmed.';
  if (value.includes('remote code execution') || value.includes('rce') || value.includes('authentication bypass')) return 'Potential unauthorized access or system compromise risk if vulnerable services are exposed.';
  if (value.includes('credential') || value.includes('infostealer')) return 'Potential account takeover and lateral movement risk if credentials are compromised.';
  if (severity === 'critical') return 'Potential high operational or security impact. Requires immediate validation against the environment.';
  if (severity === 'high') return 'Potential enterprise security relevance. Requires same-day applicability review.';
  return 'Awareness item. Review for relevance to managed systems, vendors, users, or exposed services.';
}

const alerts = items.map(item => {
  const j = item.json;
  const title = cleanText(j.title);
  const summary = cleanText(j.summary || j.contentSnippet || j.description || j.content);
  const rawText = cleanText(j.rawText || `${title} ${summary}`);
  const severity = classifySeverity(rawText);
  let publishedAt = j.publishedAt || j.isoDate || j.pubDate || now.toISOString();
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) publishedAt = now.toISOString();
  else publishedAt = parsed.toISOString();

  const dedupeKey = j.dedupeKey || j.guid || j.link || j.url || title;
  const id = Buffer.from(String(dedupeKey)).toString('base64url').slice(0, 24);
  const score = priorityScore(severity, rawText, publishedAt);

  return {
    json: {
      id,
      source: j.source || 'BleepingComputer',
      sourceType: j.sourceType || 'RSS',
      title,
      summary,
      url: j.url || j.link,
      publishedAt,
      severity,
      tags: extractTags(rawText),
      category: j.category || 'Cybersecurity News',
      recommendedAction: recommendedAction(severity, rawText),
      businessImpact: businessImpact(severity, rawText),
      affectedTechnology: affectedTechnology(rawText),
      threatType: threatType(rawText),
      reviewStatus: 'unreviewed',
      priorityScore: score,
      dedupeKey
    }
  };
});

return alerts;
