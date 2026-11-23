---
"@usebruno/api-docs": minor
---

feat(playground): adds request search to the playground sidebar (filters by request and folder name) and moves the environment switcher to the playground header, with a "Configure" shortcut to the Environments page. Both environment switchers (docs header and playground) now have a "No environment" option. Sending a request whose URL host is still an unresolved `{{variable}}` now fails before sending with "Variable not found".
