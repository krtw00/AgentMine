---
depends_on:
  - ../01-overview/scope.md
tags: [decisions, adr, filesystem]
ai_summary: "AgentMineの管理データ（DB/ログ/worktrees等）を~/.agentmineに集約することを決定する"
---

# ADR-0004: AgentMine Homeは `~/.agentmine` とする

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPは複数Project（複数Gitリポジトリ）を扱う。
Project配下に状態やログを置く方式は、リポジトリ汚染と運用の分散を招きやすい。
一方で、worktreeはGitリポジトリ外にも作成できる。

## 決定事項

AgentMineが管理するデータ（DB、ログ、worktrees等）の置き場所を `~/.agentmine` に集約する。

## 検討した選択肢

### 選択肢1: 各Project配下に配置（不採用）

- 長所: 参照しやすい。移動が単純である
- 短所: リポジトリが汚れる。Projectが増えると運用が分散する

### 選択肢2: 任意の専用ディレクトリを指定（保留）

- 長所: 企業運用等で柔軟性がある
- 短所: 初期設定が必要である

### 選択肢3: `~/.agentmine` に集約（採用）

- 長所: 設定なしで開始できる。複数Projectでも一貫する
- 短所: worktreeがリポジトリ外になる。ディスク管理が必要になる

## 決定理由

- まずは設定なしでMVPを動かすため
- 複数Projectで状態が散らばらないようにするため

## 結果

### ポジティブな影響

- DB/ログ/worktreesの探索が簡単になる
- リポジトリを汚さない

### ネガティブな影響

- ディスク使用量の管理とクリーンアップが必要になる
- 将来、パスを設定可能にする要望が出る可能性がある

## 関連ADR

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
