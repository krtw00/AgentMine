---
depends_on:
  - ./0003-local-daemon-and-web-ui.md
tags: [decisions, adr, daemon, lifecycle]
ai_summary: "Daemonをlocalhost単一インスタンスで起動し、同一originでUIとAPIを提供することを決定する"
---

# ADR-0010: Daemonはlocalhost単一インスタンスで起動し、UIとAPIを提供する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPはローカル一人運用である。
UIとAPIが別originだとCORSや設定が増える。
また、複数起動は状態の競合を生む。

## 決定事項

Daemonは `127.0.0.1` にバインドする。
Daemonは単一インスタンスである。
MVPでは同一originでWeb UIとAPIを提供する。

## 検討した選択肢

### 選択肢1: UIとAPIを別プロセス/別origin（不採用）

- 長所: 開発体験が良い場合がある
- 短所: CORSと設定が増える。MVPでは過剰である

### 選択肢2: 単一Daemonで提供（採用）

- 長所: 設定が少ない。運用が単純である
- 短所: Daemonに責務が集まる

## 決定理由

- MVPでの運用負荷を下げるため
- DB正（SSoT）と整合する単一の制御点を作るため

## 結果

### ポジティブな影響

- UI起動が単純になる
- 競合が起きにくい

### ネガティブな影響

- Daemon停止でUIも停止する

## 関連ドキュメント

- [Local Daemon（起動・停止）](../03-details/daemon.md) - 起動/停止
- [API設計](../03-details/api.md) - ベースURL

