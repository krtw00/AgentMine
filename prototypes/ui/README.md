# UIプロトタイプ

本ディレクトリは、実装前にUIの方式を確認するための静的プロトタイプである。
実装の正は `docs/03-details/ui-mvp.md` にある。

## 起動

```
cd prototypes/ui
python3 -m http.server 6418
```

ブラウザで以下を開く。

- Monitor A（テーブル内アウトライン）: `http://127.0.0.1:6418/monitor.html`
- Monitor B（ツリー + テーブル分割）: `http://127.0.0.1:6418/monitor-split.html`
- Monitor C（Network graph: overview+timeline）: `http://127.0.0.1:6418/monitor-graph.html`

関連ページ:

- `http://127.0.0.1:6418/settings.html`（exclude UI）
- `http://127.0.0.1:6418/agents.html`（Agent Profiles placeholder）

## 目的

- Monitor（Run一覧 + ウォーターフォール + 詳細）の見え方を確認する
- Task作成時の `write_scope` 入力（B: ファイルツリー選択）を確認する
