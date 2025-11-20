import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Vault,
	TAbstractFile,
	Notice,
	MarkdownView
} from "obsidian";

interface WebhookOnSaveSettings {
	webhookUrl: string;
	enabled: boolean;
	showNotices: boolean;
	autoMode: boolean;
	sendOnFileOpen: boolean;
	sendOnLeafChange: boolean;
}

const DEFAULT_SETTINGS: WebhookOnSaveSettings = {
	webhookUrl: "",
	enabled: true,
	showNotices: false,
	autoMode: true,
	sendOnFileOpen: false,
	sendOnLeafChange: false
};

type VaultEventType = "modify" | "create" | "delete" | "rename";
type HookEventType = VaultEventType | "file-open" | "leaf-change";

interface BasePayload {
	event: HookEventType;
	vaultName: string;
	timestamp: string;
}

interface FilePayload extends BasePayload {
	path: string;
	name: string;
	extension: string | null;
	size: number | null;
}

interface RenamePayload extends BasePayload {
	oldPath: string;
	newPath: string;
	oldName: string;
	newName: string;
}

export default class WebhookOnSavePlugin extends Plugin {
	settings!: WebhookOnSaveSettings;
	ribbonIconEl?: HTMLElement;

	private onModifyRef?: (file: TAbstractFile) => void;
	private onCreateRef?: (file: TAbstractFile) => void;
	private onDeleteRef?: (file: TAbstractFile) => void;
	private onRenameRef?: (file: TAbstractFile, oldPath: string) => void;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new WebhookOnSaveSettingTab(this.app, this));

		this.registerVaultEvents();
		this.registerWorkspaceEvents();

		this.addCommand({
			id: "send-webhook-on-save-now",
			name: "Send webhook for the active note",
			checkCallback: (checking) => {
				if (!this.canUseManualControls()) {
					return false;
				}
				if (!checking) {
					this.triggerManualWebhook();
				}
				return true;
			}
		});

		this.refreshManualControls();

		this.addCommand({
			id: "toggle-webhook-on-save",
			name: "Toggle webhook sending",
			callback: () => {
				this.settings.enabled = !this.settings.enabled;
				this.saveSettings();
				if (this.settings.showNotices) {
					new Notice(
						`Simple Webhook ${this.settings.enabled ? "enabled" : "disabled"}`
					);
				}
			}
		});
	}

	onunload() {
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = undefined;
		}
	}

	private registerVaultEvents() {
		const vault: Vault = this.app.vault;

		this.onModifyRef = (file) => this.handleFileEvent("modify", file);
		this.onCreateRef = (file) => this.handleFileEvent("create", file);
		this.onDeleteRef = (file) => this.handleFileEvent("delete", file);
		this.onRenameRef = (file, oldPath) => this.handleRenameEvent(file, oldPath);

		this.registerEvent(vault.on("modify", this.onModifyRef));
		this.registerEvent(vault.on("create", this.onCreateRef));
		this.registerEvent(vault.on("delete", this.onDeleteRef));
		this.registerEvent(vault.on("rename", this.onRenameRef));
	}

	private async handleFileEvent(event: VaultEventType, file: TAbstractFile) {
		if (!this.shouldSend()) return;

		if (!(file instanceof TFile)) {
			return;
		}

		const payload: FilePayload = {
			event,
			vaultName: this.app.vault.getName(),
			timestamp: new Date().toISOString(),
			path: file.path,
			name: file.name,
			extension: file.extension ?? null,
			size: await this.getFileSizeSafe(file)
		};

		this.sendWebhook(payload);
	}

	private handleRenameEvent(file: TAbstractFile, oldPath: string) {
		if (!this.shouldSend()) return;
		if (!(file instanceof TFile)) {
			return;
		}

		const payload: RenamePayload = {
			event: "rename",
			vaultName: this.app.vault.getName(),
			timestamp: new Date().toISOString(),
			oldPath,
			newPath: file.path,
			oldName: this.getNameFromPath(oldPath),
			newName: file.name
		};

		this.sendWebhook(payload);
	}

	private registerWorkspaceEvents() {
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!this.settings.sendOnFileOpen || !file) return;
				this.handleWorkspaceFileTrigger("file-open", file);
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (!this.settings.sendOnLeafChange) return;
				const view = leaf?.view;
				const maybeMarkdown = view as MarkdownView | undefined;
				const file = maybeMarkdown?.file;
				if (!file) return;
				this.handleWorkspaceFileTrigger("leaf-change", file);
			})
		);
	}

	private async handleWorkspaceFileTrigger(label: HookEventType, file: TFile) {
		if (!this.settings.enabled) return;
		if (!this.settings.webhookUrl || this.settings.webhookUrl.trim() === "") {
			if (this.settings.showNotices) {
				new Notice("Simple Webhook: webhook URL not configured.");
			}
			return;
		}

		const payload: FilePayload = {
			event: label,
			vaultName: this.app.vault.getName(),
			timestamp: new Date().toISOString(),
			path: file.path,
			name: file.name,
			extension: file.extension ?? null,
			size: await this.getFileSizeSafe(file)
		};

		this.sendWebhook(payload);
	}

	private shouldSend(manual = false): boolean {
		if (!this.settings.enabled) return false;
		if (!manual && !this.settings.autoMode) return false;
		if (!this.settings.webhookUrl || this.settings.webhookUrl.trim() === "") {
			if (this.settings.showNotices) {
				new Notice("Simple Webhook: webhook URL not configured.");
			}
			return false;
		}
		return true;
	}

	private async getFileSizeSafe(file: TFile): Promise<number | null> {
		try {
			const stat = await this.app.vault.adapter.stat(file.path);
			return stat?.size ?? null;
		} catch {
			return null;
		}
	}

	private getNameFromPath(path: string): string {
		const parts = path.split("/");
		return parts[parts.length - 1] ?? path;
	}

	private async sendWebhook(body: unknown): Promise<void> {
		const url = this.settings.webhookUrl.trim();
		if (!url) return;

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});

			if (!response.ok && this.settings.showNotices) {
				new Notice(
					`Simple Webhook: HTTP ${response.status} ${response.statusText}`
				);
			}
		} catch (error) {
			if (this.settings.showNotices) {
				console.error("Simple Webhook error:", error);
				new Notice("Simple Webhook: request failed (see console).");
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async triggerManualWebhook() {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice("Simple Webhook: no active note.");
			return;
		}

		if (!this.shouldSend(true)) return;

		const payload: FilePayload = {
			event: "modify",
			vaultName: this.app.vault.getName(),
			timestamp: new Date().toISOString(),
			path: file.path,
			name: file.name,
			extension: file.extension ?? null,
			size: await this.getFileSizeSafe(file)
		};

		await this.sendWebhook(payload);
		new Notice("Simple Webhook: webhook sent for the active note.");
	}

	private canUseManualControls(): boolean {
		return this.settings.enabled && !this.settings.autoMode;
	}

	refreshManualControls() {
		if (this.canUseManualControls()) {
			if (!this.ribbonIconEl) {
				this.ribbonIconEl = this.addRibbonIcon(
					"paper-plane",
					"Send webhook for the active note",
					() => this.triggerManualWebhook()
				);
			}
		} else if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = undefined;
		}
	}
}

class WebhookOnSaveSettingTab extends PluginSettingTab {
	plugin: WebhookOnSavePlugin;

	constructor(app: App, plugin: WebhookOnSavePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Simple Webhook – Settings" });

		new Setting(containerEl)
			.setName("Webhook URL")
			.setDesc(
				"HTTP endpoint that will receive JSON payloads when files change."
			)
			.addText((text) =>
				text
					.setPlaceholder("https://example.com/webhook")
					.setValue(this.plugin.settings.webhookUrl)
					.onChange(async (value) => {
						this.plugin.settings.webhookUrl = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Send a test webhook")
			.setDesc(
				"Immediately send a minimal payload to verify your endpoint."
			)
			.addButton((button) =>
				button
					.setButtonText("Send test")
					.setCta()
					.onClick(async () => {
						const url = this.plugin.settings.webhookUrl.trim();
						if (!url) {
							new Notice("Simple Webhook: configure the webhook URL first.");
							return;
						}

						const body = {
							_event: "test",
							message: "Simple Webhook test payload",
							vaultName: this.app.vault.getName(),
							timestamp: new Date().toISOString()
						};

						try {
							const res = await fetch(url, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(body)
							});
							if (res.ok) {
								new Notice("Simple Webhook: test webhook sent.");
							} else {
								new Notice(
									`Simple Webhook: test failed (HTTP ${res.status}).`
								);
							}
						} catch (e) {
							console.error("Simple Webhook test error", e);
							new Notice("Simple Webhook: unable to send the test webhook.");
						}
					})
			);

		new Setting(containerEl)
			.setName("Vault event webhooks")
			.setDesc(
				"Automatically send webhooks when files are created, modified, deleted, or renamed. Turn it off to rely on manual or workspace triggers only."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoMode)
					.onChange(async (value) => {
						this.plugin.settings.autoMode = value;
						await this.plugin.saveSettings();
						this.plugin.refreshManualControls();
					})
			);

		new Setting(containerEl)
			.setName("Send on file change")
			.setDesc("Fire a webhook whenever a different note becomes active (workspace file-open event).")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.sendOnFileOpen)
					.onChange(async (value) => {
						this.plugin.settings.sendOnFileOpen = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Send on pane change")
			.setDesc("Fire a webhook whenever the focused pane changes (workspace active-leaf-change event).")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.sendOnLeafChange)
					.onChange(async (value) => {
						this.plugin.settings.sendOnLeafChange = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show notices")
			.setDesc(
				"Show Obsidian notices for errors and state changes. Recommended to keep disabled for a quiet experience."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showNotices)
					.onChange(async (value) => {
						this.plugin.settings.showNotices = value;
						await this.plugin.saveSettings();
					})
			);

		const preview = containerEl.createEl("pre", {
			cls: "webhook-on-save-json-preview"
		});
		preview.textContent = JSON.stringify(
			{
				event: "modify",
				vaultName: "My Vault",
				timestamp: new Date().toISOString(),
				path: "folder/note.md",
				name: "note.md",
				extension: "md",
				size: 1234
			},
			null,
			2
		);
	}
}
