# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | -------------------- |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x: |

## Reporting a Vulnerability

**Please do not open public issues for security vulnerabilities.**

Report privately via GitHub Security Advisories:
https://github.com/isatimur/claims-ledger/security/advisories/new

Or email the maintainer through their GitHub profile.

We aim to acknowledge within 48 hours and provide a fix or mitigation timeline within 7 days.

## Scope

- `@claims-ledger/edt` CLI (local file access, git operations)
- `@claims-ledger/ledger-core` parser/resolver
- `auto-ledger-verify` GitHub Action (runs in your CI — review `openrouter-api-key` handling)
- MCP server (`edt mcp serve`) — stdio only, no network by default

## Safe defaults

- Quote-resolution anti-fabrication: anchors without resolvable quotes are rejected or flagged
- No API key ⇒ scoring/extract skipped, never fabricated
- Action uses `github.token` with minimal permissions (contents read, checks/PR write)
