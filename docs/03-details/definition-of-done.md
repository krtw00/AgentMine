---
depends_on:
  - ../04-decisions/0002-definition-of-done.md
  - ./data-model.md
  - ./observable-facts.md
  - ./log-storage.md
  - ./business-rules.md
tags: [details, dod, checks, quality-gate]
ai_summary: "DoD（Definition of Done）の具体仕様（必須チェック定義、実行タイミング、結果記録、集計ルール）を定義"
---

# DoD（Definition of Done）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、DoD（Definition of Done）の具体仕様を定義する。
done判定が「マージ」かつ「DoD passed」であること自体はADR-0002で決定済みである。

---

## 目的

- プロジェクトごとに「完了に必要な検証（チェック）」を定義できるようにする。
- runの成果物に対してチェックを実行し、結果を観測可能な事実として記録する。
- done判定を再現可能にし、人間の主観に依存しない完了基準にする。

---

## 前提（MVP）

| 項目 | 方針 |
|------|------|
| 定義場所 | DB（Project設定）で管理する |
| 実行主体 | Local Daemon（DoD Runner）が実行する |
| 実行場所 | 対象runのworktreeで実行する |
| 失敗判定 | exit code ≠ 0 を failed とする |
| ログ | checkログはファイル保存し、DBは参照を保持する |

---

## チェック定義（Project設定）

DoDは「必須チェックの集合」である。
必須チェックはProject設定（settings）として保持する。

### チェック定義の要素（論理モデル）

| 要素 | 必須 | 説明 |
|------|:---:|------|
| check_key | ○ | チェック識別子（Project内で一意） |
| label | ○ | UI表示名 |
| command | ○ | 実行コマンド（シェル1行） |
| timeout_sec | - | タイムアウト（任意） |
| working_dir | - | worktree内の相対パス（任意、未指定はルート） |
| required | ○ | DoDに必須か（MVPでは必須チェックのみを扱う） |

注:
- コマンドの内容はプロジェクトに依存する。pnpm等には固定しない。

---

## 実行タイミング（MVP）

DoD Runnerは、run終了後に必須チェックを実行する。
追加で「手動再実行」を許容する。

| タイミング | 実行 | 目的 |
|-----------|------|------|
| run終了後 | 自動 | 事実としての検証結果を必ず残す |
| 手動操作 | 任意 | 環境復旧や再確認のため |

---

## 結果の記録（Checks）

チェック結果はDBの`checks`として記録する。
checkログはファイルとして保存し、DBは参照（output_ref）を保持する。
チェックは「runが指すコード（HEAD）」に対して実行される。

| 記録項目 | 保存先 | 備考 |
|----------|--------|------|
| status | DB（checks） | pending/passed/failed |
| exit_code | DB（checks） | 0=passed、それ以外=failed |
| output_ref | DB（checks） | ログ参照 |
| stdout/stderr | ファイル（check log） | 監査・可視化用途 |

注:
- 実行対象のコミットは`runs.head_sha`として記録する（→データモデル）。

---

## 集計ルール（DoD status）

DoD statusは「必須チェックの集計結果」である。
集計に必要な「必須チェック一覧」はProject設定から決まる。

| dod.status | 条件 |
|------------|------|
| pending | 必須チェックが未実行、または結果が揃っていない |
| failed | 必須チェックのうち1つでも failed |
| passed | 必須チェックがすべて passed |

決定:
- 必須チェックが未定義のProjectは`pending`とする（DoDが成立しない）。

---

## done判定との関係

done判定はADR-0002に従い、以下の両方を満たす場合に成立する。

1. baseブランチにマージ済み
2. DoD status が passed

注:
- mergeの方式（squash等）により、DoDをどのコミットに紐づけるかが変化する。
- MVPでは`runs.head_sha`がbaseブランチに到達していることを「DoD結果が統合された」根拠として扱う。

---

## 関連ドキュメント

- [ADR-0002](../04-decisions/0002-definition-of-done.md) - done判定（マージ+DoD）
- [観測可能な事実](./observable-facts.md) - DoD statusの導出
- [データモデル](./data-model.md) - checks/output_ref
- [ログ保存](./log-storage.md) - checkログの保存
- [業務ルール](./business-rules.md) - runは追記、再実行の扱い
