---
type: knowledge-technique
tags: [full_stack_dev, api_integration]
summary: Instructions pour générer avec Copilot un plugin Obsidian Webhook On Save minimaliste en TypeScript avec envoi de POST JSON
date_processed: 20/11/2025 15:17
---

# Copilot Instructions – Obsidian Plugin: Webhook On Save

## Projet
Développer un plugin Obsidian minimaliste qui :
- écoute les événements `modify`, `create`, `delete`, `rename`
- envoie un webhook HTTP POST avec JSON
- permet une configuration utilisateur (webhook URL, enable/disable, verbose logs)
- utilise TypeScript
- utilise esbuild pour bundler
- doit rester simple, clair, lisible
- pas de dépendances inutiles

## Style
- Utiliser TypeScript strict
- Code concis, commenté, facile à lire
- Suivre les conventions Obsidian Plugin API
- Classe `Plugin` avec `onload()` et `onunload()`
- Pas de classes ou abstractions inutiles

## Structure attendue
- main.ts
- manifest.json
- package.json
- tsconfig.json
- styles.css
- (optionnel) settings.ts + interface Settings

## Ce que je veux que tu fasses
- Quand je tape // TODO ou une fonction vide → Proposer la suite logique
- Me proposer automatiquement le code Obsidian API (Vault events, Workspace)
- Me rappeler la syntaxe correcte de fetch (Node Fetch dans Obsidian)
- Compléter les exemples de JSON envoyés
- Générer les types de settings
- M’aider à organiser les events et logs
- Ne jamais proposer de Node FS ou modules non compatibles avec Obsidian

## Ce que tu dois éviter
- Ne pas proposer de code hors API Obsidian (pas de window.require)
- Pas de modules externes sauf fetch natif
- Pas d’async non awaited
- Pas d’accès direct au DOM Obsidian