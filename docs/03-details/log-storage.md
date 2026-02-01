---
depends_on:
  - ../04-decisions/0004-agentmine-home-dir.md
  - ../04-decisions/0008-log-storage-as-files.md
  - ./data-model.md
tags: [details, logs, storage, audit]
ai_summary: "run/checkのログ保存方式（~/.agentmine/logs、参照フィールド、保持方針）を定義"
---

# ログ保存

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、ログの保存方式を定義する。
MVPではログをファイルとして保存し、DBは参照を保持する。

---

## 目的

- 監査と再現性のためにrunの出力を保存する
- Web UIでrunログを参照できるようにする
- DBを巨大なログで肥大化させない

---

## ログの種類

| 種類 | 単位 | 内容 |
|------|------|------|
| run log | run | runnerのstdout/stderr |
| check log | check | DoD等の検証出力 |
| daemon log | daemon | 起動/停止/エラー等 |

---

## 保存場所（MVP）

AgentMine Home配下に保存する。

```
~/.agentmine/
  logs/
    runs/
    checks/
    daemon/
```

---

## 参照方法

ログファイルは参照文字列（log_ref / output_ref）で特定する。
参照はDBに保存する。

| 対象 | フィールド | 用途 |
|------|-----------|------|
| run | log_ref | runログ参照 |
| check | output_ref | checkログ参照 |

---

## フォーマット（MVP）

ログは追記のみである。
1行1レコードの形式とする。

| フィールド | 説明 |
|-----------|------|
| timestamp | 出力時刻 |
| stream | stdout / stderr |
| data | 出力テキスト |

---

## 保持と削除

MVPではログを自動削除しない。
削除は明示操作で行う。

注:
- 将来、保持期間やサイズ上限をProject設定に追加する。

---

## 関連ドキュメント

- [データモデル](./data-model.md) - log_ref / output_ref
- [ADR-0004](../04-decisions/0004-agentmine-home-dir.md) - `~/.agentmine`
- [ADR-0008](../04-decisions/0008-log-storage-as-files.md) - ログ保存方式
