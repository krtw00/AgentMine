---
depends_on:
  - ../01-overview/scope.md
  - ../02-architecture/context.md
  - ../02-architecture/structure.md
tags: [decisions, adr, ui, daemon]
ai_summary: "MVPの主要インターフェースをWeb UIとし、ローカル常駐Daemonで実行基盤を提供することを決定する"
---

# ADR-0003: Web UIを主要インターフェースとし、Local Daemonを採用する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPはローカル一人運用で開始する。
AI実行をブラウザで可視化し、stop/retry/continueで介入したい。
tmux等の端末多重を前提にすると、運用と拡張が難しくなる。

## 決定事項

MVPの主要インターフェースをWeb UIとする。
実行基盤はローカル常駐のDaemonが提供する。
DaemonはHTTP APIとイベント配信を提供し、worktree作成、スコープ適用、runner起動、事実記録を担う。

## 検討した選択肢

### 選択肢1: tmuxベースの多重セッション（不採用）

- 長所: 既存手法の流用が容易である
- 短所: ブラウザでの監視・介入が成立しない。拡張が難しい

### 選択肢2: CLI中心（不採用）

- 長所: 実装が単純である
- 短所: 可視化と介入の体験が弱い。ログや状態が分散しやすい

### 選択肢3: Web UI + Local Daemon（採用）

- 長所: 監視・介入・承認を統合できる。複数Projectを扱いやすい
- 短所: 常駐プロセスとイベント配信の実装が必要になる

## 決定理由

- ブラウザでの監視・介入をMVPから成立させるため
- DB正（SSoT）と相性がよい単一の制御点を作るため
- runner（`claude`/`codex`）の違いをDaemonで吸収できるため

## 結果

### ポジティブな影響

- ログと状態が一箇所に集約される
- stop/retry/continue、違反承認がUIから一貫して操作できる

### ネガティブな影響

- Daemonの起動・停止・異常系の設計が必要になる

## 関連ADR

- [ADR-0004](./0004-agentmine-home-dir.md) - AgentMine Homeの決定
- [ADR-0005](./0005-continue-adds-new-run.md) - continueの扱い
