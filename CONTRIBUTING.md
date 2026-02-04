# コントリビューションガイド / Contributing Guide

AgentMineへのコントリビューションに興味を持っていただきありがとうございます。

Thank you for your interest in contributing to AgentMine.

---

## 目次 / Table of Contents

- [プロジェクト概要 / Project Overview](#プロジェクト概要--project-overview)
- [開発環境セットアップ / Development Setup](#開発環境セットアップ--development-setup)
- [コントリビューションの流れ / Contribution Workflow](#コントリビューションの流れ--contribution-workflow)
- [コミット規範 / Commit Conventions](#コミット規範--commit-conventions)
- [コードスタイル / Code Style](#コードスタイル--code-style)
- [モノレポ構成 / Monorepo Structure](#モノレポ構成--monorepo-structure)
- [設計ドキュメント / Design Documents](#設計ドキュメント--design-documents)

---

## プロジェクト概要 / Project Overview

AgentMineは、ソフトウェア開発のための「プロジェクト管理 + AI実行基盤」です。Web UIで監視・介入し、Local Daemonがタスク実行を担います。

AgentMine is a "Project Management + AI Execution Platform" for software development. It provides a Web UI for monitoring and intervention, with a Local Daemon handling task execution.

---

## 開発環境セットアップ / Development Setup

セットアップ手順の詳細は [docs/development-setup.md](docs/development-setup.md) を参照してください。

For detailed setup instructions, see [docs/development-setup.md](docs/development-setup.md).

---

## コントリビューションの流れ / Contribution Workflow

1. リポジトリをForkする / Fork the repository
2. フィーチャーブランチを作成する / Create a feature branch
   ```bash
   git checkout -b feat/your-feature
   ```
3. 変更をコミットする / Commit your changes
   ```bash
   git commit -m "feat(scope): 変更内容の要約"
   ```
4. ブランチをプッシュする / Push your branch
   ```bash
   git push origin feat/your-feature
   ```
5. Pull Requestを作成する / Create a Pull Request

### Pull Requestのガイドライン / PR Guidelines

- PRの説明に変更の目的と内容を記載してください / Describe the purpose and content of your changes
- 1つのPRでは1つの論理的な変更に留めてください / Keep each PR focused on a single logical change
- ビルドが通る状態でPRを出してください / Ensure the build passes before submitting

---

## コミット規範 / Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) に準拠します。詳細は [docs/00-git-guide.md](docs/00-git-guide.md) を参照してください。

We follow [Conventional Commits](https://www.conventionalcommits.org/). See [docs/00-git-guide.md](docs/00-git-guide.md) for details.

### フォーマット / Format

```
<type>(<scope>): <subject>
```

### type一覧 / Types

| type | 用途 / Usage |
|------|-------------|
| `feat` | 新機能 / New feature |
| `fix` | バグ修正 / Bug fix |
| `docs` | ドキュメント / Documentation |
| `refactor` | リファクタリング / Refactoring |
| `test` | テスト / Tests |
| `chore` | ビルド・依存関係 / Build, dependencies |

### ブランチ命名 / Branch Naming

```
<type>/<short-description>
```

例 / Examples: `feat/oauth-login`, `fix/cart-zero-quantity`, `docs/api-rate-limit`

---

## コードスタイル / Code Style

- TypeScriptを使用 / Use TypeScript
- ESModules (`import`/`export`) を使用 / Use ESModules
- 明示的な型定義を推奨（`any` の使用は避ける）/ Prefer explicit types, avoid `any`
- 既存コードのスタイルに合わせる / Follow existing code conventions

---

## モノレポ構成 / Monorepo Structure

```
packages/
├── daemon/   # Hono API サーバー (port 3001)
├── web/      # Next.js フロントエンド (port 3000)
├── shared/   # 共通型定義 / Shared type definitions
└── db/       # Drizzle ORM + SQLite スキーマ
```

| パッケージ / Package | 責務 / Responsibility |
|---------------------|----------------------|
| `@agentmine/daemon` | HTTP API + タスク実行管理 / HTTP API + Task execution |
| `@agentmine/web` | Web UI（React 19 + Next.js 15）|
| `@agentmine/shared` | API型定義 / API type definitions |
| `@agentmine/db` | DBスキーマ + マイグレーション / DB schema + migrations |

---

## 設計ドキュメント / Design Documents

設計ドキュメントは `docs/` ディレクトリに整理されています。全体のナビゲーションは [docs/00-index.md](docs/00-index.md) を参照してください。

Design documents are organized in the `docs/` directory. See [docs/00-index.md](docs/00-index.md) for the full navigation.

### 初めて読む場合 / Getting Started

1. [docs/01-overview/summary.md](docs/01-overview/summary.md) — プロジェクト概要 / Project overview
2. [docs/01-overview/goals.md](docs/01-overview/goals.md) — 目的 / Goals
3. [docs/02-architecture/principles.md](docs/02-architecture/principles.md) — 設計原則 / Design principles

### 実装時に参照する場合 / For Implementation

1. [docs/03-details/data-model.md](docs/03-details/data-model.md) — データモデル / Data model
2. [docs/03-details/flows.md](docs/03-details/flows.md) — 処理フロー / Processing flows
3. [docs/99-appendix/glossary.md](docs/99-appendix/glossary.md) — 用語集 / Glossary
