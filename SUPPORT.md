# Support

- **Docs:** [README](README.md) · [LAUNCH.md](LAUNCH.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issues:** [GitHub Issues](https://github.com/isatimur/claims-ledger/issues)
- **Security:** [SECURITY.md](SECURITY.md) — please report vulnerabilities privately

## FAQ

**Q: Do I need OpenRouter?**  
No. Verify mode is fully local. Extract/scoring skip gracefully without a key.

**Q: Can I use this on a private repo?**  
Yes. The Action runs in your CI; badge uses raw.githubusercontent (public repos only for the free badge URL).

**Q: How is this different from linters?**  
Linters check syntax. This checks that *declarative claims in your docs* still point at evidence that exists.
