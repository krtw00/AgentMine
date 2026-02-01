---
depends_on:
  - ./agent-profiles.md
  - ./task-decomposition.md
  - ./runner-adapter.md
  - ./scope-control.md
  - ./log-storage.md
  - ./observable-facts.md
tags: [details, prompt, composition, audit]
ai_summary: "runの最終プロンプトを決定的に組み立てる規約（入力・構造・ファイルパスの渡し方・retry/continue要約・監査保存）を定義"
---

# プロンプト組み立て（Prompt Composition）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、run実行時にrunnerへ渡す「最終プロンプト」を組み立てる規約を定義する。
最終プロンプトは監査対象であり、再現性のために決定的に生成される必要がある。

---

## 目的

- runner差（`@` 等の記法差）に依存しないプロンプト生成を行う。
- retry/continue時に「次に何を直すべきか」を観測可能な事実から提示する。
- 実行前に「何を渡したか」を追跡可能にする（promptをrunログへ保存する）。

---

## 非目的

| 非目的 | 理由 |
|--------|------|
| ファイル内容の埋め込み | プロンプト肥大化と漏えいリスクを増やすため |
| runner固有記法（例: `@`）の採用 | runner差を増やし、移植性を落とすため |
| AIの自己申告を真実にする | 状態は観測可能な事実で判定するため |

---

## 生成主体と決定性

最終プロンプトは、Daemon内のコンポーネント（例: Prompt Composer）が生成する。
同じ入力が与えられた場合、同じ最終プロンプトが生成されることを要求する。

| 項目 | 方針 |
|------|------|
| 生成主体 | Daemon |
| 生成タイミング | RunnerAdapter起動の直前 |
| 決定性 | 同一入力→同一出力 |
| 監査 | 最終プロンプト全文をrunログ（meta）に保存する |

---

## 入力（MVP）

| 入力カテゴリ | 主な入力 | 由来 |
|------------|----------|------|
| 役割 | Agent Profileの`prompt_template` | DB |
| タスク | task id/title/description/write_scope | DB |
| 制約 | scope snapshot（write/exclude合成結果） | DB（runs.scope_snapshot） |
| 実行環境 | runner/model/config | DB（agent_profiles等） |
| 実行コンテキスト | worktree（カレントディレクトリ） | 実行環境 |
| 直前run事実 | exit code、check結果、scope違反、変更ファイル等 | DB + Git事実 |
| 追加入力 | Humanの追加入力（continueのみ） | UI入力 |

注:
- retry/continueは新runである。最終プロンプトも新しく生成する（→ADR-0005）。

---

## ファイルパスの渡し方（runner非依存）

ファイルは「内容を埋め込む」のではなく「参照すべきパスを列挙する」ことで渡す。
パスはworktreeルート基準の相対パスで表現する。

| ルール | 内容 |
|--------|------|
| 記法 | runner固有記法（例: `@`）を使わない |
| パス形式 | worktreeルート基準の相対パス |
| 目的 | 読むべき入口（Entry Points）を示す |
| 大量時 | 全列挙せず、入口ファイルとディレクトリ方針を優先する |

例（パスの例示であり、内容の埋め込みではない）:
- `docs/00-index.md`
- `docs/03-details/data-model.md`

---

## 最終プロンプトの構造（MVP）

最終プロンプトは、以下のセクション順で構成する。
各セクションは短く、機械的に生成できる形式を優先する。

| セクション | 内容 |
|-----------|------|
| Role | 役割と責務（Agent Profile由来） |
| Task | task id/title/description、完了条件の要点 |
| Workspace | 作業ディレクトリがworktreeであること |
| Read First | 参照すべきパス一覧（相対パス） |
| Constraints | write/exclude、禁止事項、承認が必要な事項 |
| Retry/Continue Digest | 直前runの観測事実の要約（該当時のみ） |
| Output Format | 期待する出力（変更要約、実行コマンド、注意点） |

注:
- DoDの詳細（どのコマンドを実行するか等）は、別途DoD定義として扱う。

---

## Retry/Continue Digest（観測事実の要約）

Digestは「判断」ではなく「観測可能な事実」のみで構成する。
MVPの推奨要約項目は以下である。

| 要約項目 | 例 | 目的 |
|---------|----|------|
| run結果 | exit code、終了理由 | 失敗の再現 |
| checks | passed/failed、失敗したcheck名 | DoDの再実行方針 |
| scope違反 | 件数、代表パス、承認状態 | needs_review回避と説明 |
| 変更ファイル | 変更ファイル一覧（相対パス） | 影響範囲の把握 |

---

## 保存（監査）とイベント

最終プロンプトはrunログの`meta`として保存する。
stdout/stderrとは別に、metaは「実行の前提情報」を追跡する用途である。

| 対象 | 保存先 | 理由 |
|------|--------|------|
| 最終プロンプト | runログ（meta） | 再現性・監査 |
| 実行出力 | runログ（stdout/stderr） | 可視化・監査 |

注:
- 保存方式は[ログ保存](./log-storage.md)（meta/参照）に従う。
- UIへの通知は[イベント配信](./event-stream.md)（run.output）に従う。

---

## 将来拡張（対象外）

| 追加候補 | 意味 |
|---------|------|
| ファイル内容の部分埋め込み | `supports_prompt_file_inclusion` がtrueのrunnerに限り対応する |
| promptの差分表示 | metaログ間のdiffとして実現する |
| 役割別の厳密テンプレート管理 | Agent Profileのバージョニングで扱う |

---

## 関連ドキュメント

- [Agent Profiles](./agent-profiles.md) - prompt_templateと実行設定
- [RunnerAdapter](./runner-adapter.md) - runnerへ渡すpromptと監査
- [スコープ制御](./scope-control.md) - write/excludeと違反検出
- [ログ保存](./log-storage.md) - metaとしての保存
- [観測可能な事実](./observable-facts.md) - digestの根拠
