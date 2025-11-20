# Simple Webhook

Simple Webhook is a lightweight Obsidian plugin that sends JSON payloads to your automation stack whenever something interesting happens in your vault.

## Features
- Listens to `modify`, `create`, `delete`, and `rename` vault events
- Optional triggers for `file-open` and `active-leaf-change`
- Manual ribbon/command to ping the endpoint on demand
- Built-in test button to validate your webhook URL
- TypeScript + esbuild stack with no runtime dependencies beyond the Obsidian API

## Installation
### Community Plugins (store submission)
1. Open **Settings → Community plugins**.
2. Search for **“Simple Webhook”** in the browse tab.
3. Install and enable the plugin.

### Manual installation (development / beta)
1. Clone this repo inside your vault under `.obsidian/plugins/simple-webhook`.
2. Run `npm install`.
3. Run `npm run build` to produce `main.js`.
4. Reload Obsidian and enable the plugin from **Installed plugins**.

## Settings
- **Webhook URL** – HTTP endpoint that will receive JSON payloads.
- **Send a test webhook** – Sends a one-off payload to make sure the endpoint responds as expected.
- **Vault event webhooks** – Toggle automatic sending for `modify`, `create`, `delete`, and `rename`.
- **Send on file change** – Fire when the focused file changes (workspace `file-open`).
- **Send on pane change** – Fire when the active leaf changes.
- **Show notices** – Enable Obsidian notices for errors and toggles.

## Screenshots
Add at least one screenshot of the plugin’s settings panel to help reviewers and users. Place PNGs in `docs/` and reference them here, for example:

```
docs/
  screenshot-settings.png
```

Then embed with:

```markdown
![Simple Webhook settings](docs/screenshot-settings.png)
```

## JSON payloads
### File events (`modify`, `create`, `delete`, `file-open`, `leaf-change`)
```json
{
  "event": "modify",
  "vaultName": "My Vault",
  "timestamp": "2025-11-20T10:00:00.000Z",
  "path": "folder/note.md",
  "name": "note.md",
  "extension": "md",
  "size": 1234
}
```

### Rename events
```json
{
  "event": "rename",
  "vaultName": "My Vault",
  "timestamp": "2025-11-20T10:00:00.000Z",
  "oldPath": "old-folder/old-note.md",
  "newPath": "new-folder/new-note.md",
  "oldName": "old-note.md",
  "newName": "new-note.md"
}
```

## Development
1. `npm install`
2. `npm run dev` to watch with esbuild or `npm run build` for a production bundle
3. `npm run lint` to type-check via `tsc`

## Release checklist
1. Update the version in `manifest.json`, `package.json`, and `versions.json`.
2. Run `npm run build` to refresh `main.js`.
3. Zip `main.js`, `manifest.json`, and `styles.css` and attach the archive to the GitHub release.
4. Tag the release with the same version number and submit a PR to `obsidianmd/obsidian-releases` with the updated `manifest.json` and `versions.json`.

## Changelog
### 1.0.0
- Initial public release.

## License
Released under the [MIT License](./LICENSE).