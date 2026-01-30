# UI参考資料

## 目的

Task Monitor UIの設計参考となるツール・コンセプトをまとめる。

## コンセプト

| 項目 | 説明 |
|------|------|
| 監視・介入中心 | ワークフロー編集は不要（AIがタスク分解） |
| 親子関係の表現 | タスク階層を視覚化 |
| DevToolsネットワークパネル的 | ツリー＋ウォーターフォール |

## 参考ツール

### Jaeger UI

分散トレーシングのUI。**最も参考になるコンセプト**。

https://github.com/jaegertracing/jaeger-ui

| 良い点 | AgentMineへの適用 |
|--------|------------------|
| ツリー構造（折りたたみ可能） | タスクの親子関係 |
| ウォーターフォールタイムライン | 実行時間の可視化 |
| クリックで詳細展開 | 入力/出力/ログ表示 |
| エラー表示（赤マーク） | 失敗/要介入の強調 |
| Depth（階層の深さ）情報 | タスク階層の把握 |

### AgentOps

AIエージェント監視専用プラットフォーム。

https://github.com/AgentOps-AI/agentops

| 良い点 | AgentMineへの適用 |
|--------|------------------|
| タイムライン/カスケードビュー | セッション全体の流れ |
| セッションリプレイ | 過去の実行確認 |
| LLM/Tool呼び出しの色分け | タスク種別の区別 |
| コスト/トークン追跡 | リソース監視 |

### Langfuse

LLM Observabilityプラットフォーム。

https://github.com/langfuse/langfuse

| 良い点 | AgentMineへの適用 |
|--------|------------------|
| トレースツリー表示 | 実行の流れ |
| 時間・コスト表示 | パフォーマンス把握 |

### その他

| ツール | 参考点 |
|--------|--------|
| Dagster | DAGグラフ、依存関係可視化 |
| Chrome DevTools Network | ウォーターフォール、詳細パネル |

## AgentMineへの適用マッピング

| 参考ツールの概念 | AgentMine |
|-----------------|-----------|
| Span | Task |
| Service & Operation | Agent & Task名 |
| Duration | 実行時間 |
| Tags/Logs | 入力/出力/ログ |
| エラーマーク | 失敗/要介入 |
| （なし） | 介入ボタン |

## 関連ドキュメント

- Web UI設計: @06-interfaces/web/overview.md
- 用語集: @appendix/glossary.md
