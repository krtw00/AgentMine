---
depends_on:
  - ../03-details/ui-mvp.md
  - ../03-details/daemon.md
  - ../03-details/api.md
  - ./0003-local-daemon-and-web-ui.md
  - ./0007-event-stream-uses-sse.md
tags: [decisions, adr, ui, daemon, deployment]
ai_summary: "開発はUI dev server分離、本番はDaemonがUI+API+SSEを同一originで配信するハイブリッド方式を採用する"
---

# ADR-0011: UI提供方式は開発分離 + 本番同一プロセス（ハイブリッド）を採用する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPはローカル一人運用で開始する。
Web UIで監視・介入し、Local Daemonが実行基盤を担う。

一方でWeb UIは実装の試行錯誤が多く、開発時はHMR等で高速に反復したい。
しかし運用時に「UIサーバ + Daemon」の2プロセス構成にすると、起動手順と疎通（CORS等）が複雑になる。

## 決定事項

UI提供方式はハイブリッドとする。

- 本番（運用）では、DaemonがWeb UIを配信する（単一プロセスである）
- APIとSSEはDaemonが提供し、Web UIと同一originである（`/api/*` と `/api/events`）
- Web UIはAPI/SSEを相対パス（`/api/...`）で参照する。UIにDaemonのホスト/ポート設定を持ち込まない
- 開発時は、Web UIを別ポートのdev serverで起動してよい。dev serverは `/api/*` と `/api/events` をDaemonへプロキシする

## 検討した選択肢

### 選択肢1: 常にDaemonがUIを配信（不採用）

| 項目 | 内容 |
|------|------|
| 概要 | 開発時も運用時もDaemonがUIを配信する |
| メリット | 1URL/単一originで単純である。CORS不要である |
| デメリット | UI開発時の反復が遅い。ビルドと再配信が必要になる |

### 選択肢2: 常にUIとDaemonを分離（不採用）

| 項目 | 内容 |
|------|------|
| 概要 | UIサーバとDaemonを常に別プロセス/別ポートで動かす |
| メリット | UI開発が速い（HMR等） |
| デメリット | 2プロセス運用になる。CORSやプロキシ、互換性管理が必要になる |

### 選択肢3: ハイブリッド（採用）

| 項目 | 内容 |
|------|------|
| 概要 | 本番はDaemon配信、開発はdev server + プロキシとする |
| メリット | 運用の単純さと開発速度を両立できる |
| デメリット | dev serverのプロキシ設定が必要になる |

## 決定理由

- 運用時に単一プロセス/単一URLで起動できる状態を優先するため
- UI開発の反復速度（HMR等）を確保するため
- UIのAPI参照を相対パスに固定し、CORSや設定分岐を避けるため

## 結果

### ポジティブな影響

- 運用時はDaemonの起動だけでUI/API/SSEが利用できる
- Web UIは本番/開発で同じAPIパスを利用できる
- UI開発はdev serverで高速に反復できる

### ネガティブな影響

- UIビルド成果物をDaemonが配信する仕組みが必要になる
- 開発時のプロキシ設定が追加の構成要素になる

## 関連ADR

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
- [ADR-0007](./0007-event-stream-uses-sse.md) - イベント配信はSSE

