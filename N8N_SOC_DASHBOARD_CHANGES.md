# n8n Changes for the SOC-Style Security Alert Center

This update keeps the GitHub Pages site as a single-page dashboard and improves the security-triage interface. n8n should continue updating only `alerts.json`.

## Files to upload to GitHub

Upload or replace this file in the repository root:

```text
index.html
```

Keep this file in the repository root. It is updated by n8n:

```text
alerts.json
```

No additional website files are required.

## Required workflow order

Keep the workflow order:

```text
Schedule Trigger
→ RSS Read
→ Filter
→ Edit Fields
→ Code in JavaScript
→ Build Dashboard JSON
→ GitHub - Get alerts.json
→ GitHub - Update alerts.json
→ IF - Should Email
→ Send an Email
```

The Remove Duplicates node is still optional. Do not reintroduce it until the site and email are stable.

## Node update 1: Code in JavaScript

Replace the current `Code in JavaScript` node code with:

```text
code-in-javascript.n8n.js
```

Node settings:

```text
Language: JavaScript
Mode: Run Once for All Items
```

This adds these fields per alert:

```text
priorityScore
affectedTechnology
threatType
businessImpact
reviewStatus
```

These fields drive the dashboard buttons, details panel, copy notes function, escalation template, and review queue.

## Node update 2: Build Dashboard JSON

Replace the current `Build Dashboard JSON` node code with:

```text
build-dashboard-json.n8n.js
```

Node settings:

```text
Language: JavaScript
Mode: Run Once for All Items
```

This generates `alerts.json` with:

```text
schemaVersion
generatedAt
source
sourceUrl
windowDays
counts
summary
topAlert
alerts[]
```

It also returns:

```text
dashboardBase64
shouldEmail
criticalCount
highCount
mediumCount
lowCount
alertCount
```

These values are still used by the GitHub update and email nodes.

## GitHub - Get alerts.json

No change if it is already working.

```text
Method: GET
URL: https://api.github.com/repos/mypcmed/bleeping-alerts-dashboard/contents/alerts.json?ref=main
Authentication: Generic Credential Type
Generic Auth Type: Header Auth
```

Headers:

```text
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

## GitHub - Update alerts.json

No change if it is already working.

```text
Method: PUT
URL: https://api.github.com/repos/mypcmed/bleeping-alerts-dashboard/contents/alerts.json
Authentication: Generic Credential Type
Generic Auth Type: Header Auth
```

Body:

```json
{
  "message": "Update cybersecurity alert dashboard",
  "content": "{{ $('Build Dashboard JSON').item.json.dashboardBase64 }}",
  "sha": "{{ $('GitHub - Get alerts.json').item.json.sha }}",
  "branch": "main"
}
```

## Email node impact

If your email node references fields from `Build Dashboard JSON`, it should continue to work. Recommended subject:

```text
Cybersecurity Alert Dashboard: {{ $('Build Dashboard JSON').item.json.criticalCount }} Critical / {{ $('Build Dashboard JSON').item.json.highCount }} High
```

Recommended IF condition:

```text
{{ $('Build Dashboard JSON').item.json.shouldEmail }}
```

## Site features enabled by the new data

The single page now supports:

```text
Details button
Source button
Copy Notes button
Escalate button
View Critical button
View High button
Show All button
Copy Briefing button
Open JSON button
Search
Severity filter
10 / 12 / All selector
Immediate Review Queue
Security tag drill-down
Priority score
Business impact
Affected technology
Threat type
```

## Testing sequence

1. Run RSS Read.
2. Confirm RSS items are returned.
3. Run Filter.
4. Confirm security items remain.
5. Run Edit Fields.
6. Confirm normalized fields exist.
7. Run Code in JavaScript.
8. Confirm each alert has `priorityScore`, `businessImpact`, `affectedTechnology`, and `threatType`.
9. Run Build Dashboard JSON.
10. Confirm `dashboard.alerts` contains alerts and `dashboardBase64` exists.
11. Run GitHub - Get alerts.json.
12. Confirm `sha` is returned.
13. Run GitHub - Update alerts.json.
14. Confirm GitHub shows a new commit to `alerts.json`.
15. Refresh the site with Ctrl+F5.
