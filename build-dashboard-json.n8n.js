// n8n Code node: Build Dashboard JSON
// Settings: Language = JavaScript, Mode = Run Once for All Items
// Purpose: Build the single alerts.json payload consumed by the GitHub Pages dashboard.

const now = new Date();
const windowDays = 7;
const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };

const alerts = items
  .map(item => item.json)
  .filter(alert => {
    const published = new Date(alert.publishedAt || now);
    return !Number.isNaN(published.getTime()) && published >= cutoff;
  })
  .sort((a, b) => {
    const severityDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (severityDiff !== 0) return severityDiff;
    const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });

const counts = alerts.reduce((acc, alert) => {
  const severity = alert.severity || 'low';
  acc[severity] = (acc[severity] || 0) + 1;
  acc.total += 1;
  return acc;
}, { critical: 0, high: 0, medium: 0, low: 0, total: 0 });

function topValues(field, limit = 8) {
  const map = new Map();
  for (const alert of alerts) {
    for (const value of alert[field] || []) {
      map.set(value, (map.get(value) || 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

const immediateReview = alerts.filter(alert =>
  ['critical', 'high'].includes(alert.severity) || (alert.priorityScore || 0) >= 70
);

const topAlert = alerts[0] || null;

const dashboard = {
  schemaVersion: 3,
  generatedAt: now.toISOString(),
  source: 'BleepingComputer',
  sourceUrl: 'https://www.bleepingcomputer.com/rss-feeds/',
  windowDays,
  counts,
  summary: {
    immediateReviewCount: immediateReview.length,
    highestPriorityScore: topAlert ? topAlert.priorityScore || 0 : 0,
    topTags: topValues('tags'),
    topAffectedTechnology: topValues('affectedTechnology'),
    topThreatTypes: topValues('threatType')
  },
  topAlert,
  alerts
};

const dashboardJson = JSON.stringify(dashboard, null, 2);

return [
  {
    json: {
      dashboard,
      dashboardJson,
      dashboardBase64: Buffer.from(dashboardJson, 'utf8').toString('base64'),
      alertCount: counts.total,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowCount: counts.low,
      immediateReviewCount: immediateReview.length,
      shouldEmail: counts.critical > 0 || counts.high > 0
    }
  }
];
