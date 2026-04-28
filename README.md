# Paperclip Docs

Source for the [Paperclip](https://github.com/paperclipai/paperclip) documentation site — user guides, API and CLI reference, adapter docs, and deployment notes.

**Read the docs:** https://docs.paperclip.ing/

## What's inside

- **Guides** — Getting started, core concepts, and day-to-day usage.
- **API reference** — Control-plane endpoints and payload schemas.
- **CLI reference** — `paperclip` command surface.
- **Adapters** — Plugin authoring and the integrations catalogue.
- **Deploy** — Self-hosting, upgrades, and operational guidance.

The site is a single static shell that renders the Markdown files in `docs/` directly — no framework, no build step required to read the raw pages.

## Contributing

Spotted a typo, a broken link, or something that could be clearer? There are two easy paths, both linked from the footer of every docs page:

- **Suggest an edit** — opens the underlying Markdown file in GitHub's web editor. Make the change and submit a PR without leaving the browser.
- **Report an issue** — opens a prefilled [Docs feedback](.github/ISSUE_TEMPLATE/03-docs-feedback.yml) issue with the page URL already attached.

For larger changes, fork the repo and open a PR against `main`. Screenshots live under `docs/user-guides/screenshots/{light,dark}/` and should be provided in both themes when replacing UI captures.

## Community

- [Discord](https://discord.gg/m4HZY7xNG3)
- [GitHub Discussions](https://github.com/paperclipai/paperclip/discussions)

## License

Copyright (c) 2026 Aron & Sharon ([aronandsharon.com](https://aronandsharon.com)).

The Paperclip **software** is open source — see the main [paperclip](https://github.com/paperclipai/paperclip) repository for its license.

The **documentation in this repository** is licensed under [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](https://creativecommons.org/licenses/by-nc-nd/4.0/). You may read and share it for non-commercial purposes with attribution. Commercial use of any kind requires prior written permission from the copyright holders. See [`LICENSE`](LICENSE) for the full text.
