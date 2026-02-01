---
depends_on:
  - ./data-model.md
  - ./authorization.md
  - ./definition-of-done.md
  - ./scope-control.md
tags: [details, settings, configuration, schema]
ai_summary: "Project設定（settings）のキー体系、値スキーマ、デフォルト、変更の扱い（runスナップショット）を定義"
---

# Project設定（Settings）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、Projectごとの設定（settings）の設計を定義する。
settingsは「可変なルール」をDBで管理するための仕組みである。

---

## 目的

- ProjectごとにDoDやスコープのデフォルト等を変更可能にする。
- 変更履歴の参照点をDBに集約し、UI/APIの唯一の参照元にする。
- 設定変更がrunの解釈を壊さないように、スナップショット戦略を定義する。

---

## 前提

| 項目 | 方針 |
|------|------|
| スコープ | Project単位である（project_idを持つ） |
| 保存場所 | DBである（状態のSSoT） |
| 形式 | `key` + `value(JSON)` の組である |
| 秘密情報 | settingsに保存しない（APIキー等） |

---

## キー体系（命名規則）

設定キーは「ドット区切りの名前空間」を持つ。

| ルール | 内容 |
|--------|------|
| 形式 | `<namespace>.<name>` |
| namespace | 小文字英字から始める（例: `dod`, `scope`） |
| name | lowerCamelCaseを使用する（例: `requiredChecks`） |
| 互換性 | 既存キーの意味変更はしない（新キー追加で対応する） |

注:
- MVPはProject設定のみを扱う。Daemon全体設定は対象外とする。

---

## MVPで使用するキー

### `scope.defaultExclude`

Project共通のexclude（アクセス不可）を定義する。
Agent Profileの`default_exclude`と合成して最終excludeを作る（→スコープ制御）。

| 項目 | 内容 |
|------|------|
| 値 | glob配列 |
| デフォルト | 空配列 |

### `dod.requiredChecks`

DoDの必須チェック定義（コマンド等）を定義する（→DoD）。

| 項目 | 内容 |
|------|------|
| 値 | check定義配列（check_key/label/command等） |
| デフォルト | 未定義（DoDは`pending`になる） |

---

## スナップショット戦略（再現性）

settingsは変更可能である。
一方で、過去runの評価が「現在の設定」に引きずられると再現性が壊れる。
MVPでは、runに影響する設定はrun開始時点でスナップショットとして保存する。

| 対象 | 保存先 | 目的 |
|------|--------|------|
| 有効スコープ | runs.scope_snapshot | 違反判定と再現性 |
| DoD定義 | runs.dod_snapshot | 過去runのDoD判定の再現性 |

注:
- スナップショットの具体は各詳細ドキュメントに従う（スコープ制御/DoD）。

---

## 変更の取り扱い（MVP）

| 事項 | 方針 |
|------|------|
| 変更主体 | Human User（UI操作）である |
| 変更単位 | key単位のupsertである |
| 影響範囲 | 以降のrunに適用する。過去runはsnapshotで解釈する |

---

## 関連ドキュメント

- [データモデル](./data-model.md) - settingsテーブル
- [認証・認可](./authorization.md) - settings変更はHuman主体
- [スコープ制御](./scope-control.md) - `scope.defaultExclude`
- [DoD（Definition of Done）](./definition-of-done.md) - `dod.requiredChecks`
