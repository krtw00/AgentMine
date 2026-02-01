---
depends_on:
  - ../03-details/flows.md
  - ../03-details/data-model.md
tags: [decisions, adr, execution]
ai_summary: "continue/retryは同一runへの追加入力ではなく、新しいrunを作成することを決定する"
---

# ADR-0005: continue/retryは新しいrunを作成する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPは `claude` と `codex` の両方をrunnerとして扱う。
これらのCLIは対話性や入出力の扱いが異なる。
ブラウザから「同一プロセスに追い入力」を成立させるには、PTY等の実装が必要になる。
再現性と運用コストを考えると、MVPでの対話継続はリスクが高い。

## 決定事項

`continue` と `retry` は、同一タスクに対して新しいrunを作成する操作とする。
新runの入力には、前runの事実（差分/失敗理由/未解決点）を要約して付与する。

## 検討した選択肢

### 選択肢1: 同一runに追加入力（不採用）

- 長所: 会話的で自然である
- 短所: runner差が大きい。PTY等が必要になる。再現性が下がる

### 選択肢2: 新しいrunを作成（採用）

- 長所: runner差を吸収しやすい。再現性が高い。実装が単純である
- 短所: 会話的な体験は弱くなる

## 決定理由

- `claude`/`codex` の両対応をMVPから成立させるため
- run単位で事実（ログ/差分/検証結果）を固定し、再現性を優先するため

## 結果

### ポジティブな影響

- runが明確に区切られ、差分レビューと追跡がしやすい
- UI/DBのモデルが単純になる

### ネガティブな影響

- 会話継続の体験が弱い
- 入力の作り込み（前run要約）が品質に影響する

## 関連ADR

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon

