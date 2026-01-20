# Observable Facts（観測可能な事実）

🎯 **信頼性の要**: ステータスは客観的な事実で自動判定する

agentmineは**Observable & Deterministic**原則に基づき、すべてのステータスを観測可能な事実で判定します。人間やAIが主観的に「完了」と設定するのではなく、客観的に観測できる事実（exit code、Git merge状態等）から自動的にステータスを決定します。

---

## 原則

**ステータスはexit code、merge状態等の客観事実で判定する。主観的な設定は行わない。**

```
┌─────────────────────────────────────────────────────────────┐
│  Observable & Deterministic                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ 主観的判定:                                              │
│    人間: 「このタスクは完了にしておこう」                     │
│    AI: 「完了したので status=done に更新」                   │
│    → 誰かが「完了」を設定し忘れる                            │
│    → 人によって判断基準が違う                                 │
│                                                             │
│  ✅ 客観的判定:                                              │
│    agentmine: git log baseBranch..task-branch               │
│    結果が空 → マージ済み → done                              │
│    → 誰が見ても同じ結果                                      │
│    → 人間の介入不要                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## なぜObservable Factsが必要か

### 1. 一貫性

誰が見ても、いつ見ても、同じ結果：

```
❌ 主観的判定:
- 人間A: 「テスト書いてないけど、まあ完了でいいか」→ done
- 人間B: 「テストがないから完了じゃない」→ in_progress
→ 判断基準がバラバラ

✅ 客観的判定:
- git log main..task-5-s123 が空
→ マージ済み → done
→ 誰が見ても done
```

### 2. 自動化

人間の介入なしに判定可能：

```
❌ 主観的判定:
Worker完了 → 人間が確認 → ステータス更新
→ 人間の作業が必要

✅ 客観的判定:
Worker完了 → agentmineが git log で自動判定 → ステータス更新
→ 完全自動化
```

### 3. 信頼性

事実ベースなので改ざん・ミス不可：

```
❌ 主観的判定:
- 「完了」設定し忘れ → ずっと in_progress のまま
- 誤って「完了」設定 → 実は完了していない

✅ 客観的判定:
- マージされていない → in_progress
- マージされた → done
→ 事実と常に一致
```

---

## 観測可能な事実の例

### Worker終了

**観測方法**: プロセスのexit code

```bash
# Worker実行
agentmine worker run 5 --exec

# Worker完了
echo $?
# → 0: 成功
# → 1-6: エラー

# agentmineが自動記録
sessions.exit_code = 0  # 成功
sessions.status = 'completed'
```

**判定**:
- `exit code = 0` → 成功
- `exit code ≠ 0` → 失敗

### タスク完了

**観測方法**: Git merge状態

```bash
# セッションのブランチがbaseBranchにマージされたか確認
git log --oneline main..task-5-s123

# 結果が空 → マージ済み → done
# 結果があり → まだマージされていない → in_progress
```

**判定**:
```typescript
async function isTaskDone(taskId: number, baseBranch: string): Promise<boolean> {
  // タスクのセッションブランチ取得
  const session = await getLatestSession(taskId);
  if (!session || !session.branch) return false;

  // Git判定
  const { stdout } = await exec(
    `git log --oneline ${baseBranch}..${session.branch}`
  );

  // 空 = マージ済み = done
  return stdout.trim() === '';
}
```

### セッション状態

**観測方法**: プロセス存在確認

```bash
# Worker PID記録
sessions.pid = 12345

# プロセス存在確認
ps -p 12345
# → 存在: running
# → 不存在: completed/failed

# exit code確認
# → 0: completed
# → ≠0: failed
```

**判定**:
```typescript
async function getSessionStatus(sessionId: number): Promise<SessionStatus> {
  const session = await getSession(sessionId);

  if (session.completedAt) {
    // 完了時刻が記録されている → completed/failed
    return session.exitCode === 0 ? 'completed' : 'failed';
  }

  if (session.pid) {
    // プロセス存在確認
    try {
      process.kill(session.pid, 0); // シグナル0で存在確認のみ
      return 'running';
    } catch {
      // プロセス不存在 → クラッシュ
      return 'failed';
    }
  }

  return 'pending';
}
```

### DoD（Definition of Done）判定

**観測方法**: マージ結果

```bash
# Orchestratorがマージ実行
git merge task-5-s123

# 結果
echo $?
# → 0: merged
# → ≠0: error
```

**判定**:
```typescript
type DoDResult = 'pending' | 'merged' | 'timeout' | 'error';

async function judgeDod(sessionId: number): Promise<DoDResult> {
  try {
    // マージ実行
    await exec(`git merge ${session.branch}`, { timeout: 60000 });
    return 'merged';
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      return 'timeout';
    }
    return 'error';
  }
}
```

---

## タスクステータスの自動判定

### ステータス定義

| ステータス | 条件（Observable Facts） |
|-----------|------------------------|
| `open` | セッションなし |
| `in_progress` | running セッションが1つ以上 |
| `done` | `git log baseBranch..branch` が空（マージ済み） |
| `failed` | runningなし、mergedなし、失敗/取消のみ |
| `cancelled` | 手動キャンセル（唯一の例外） |

### 判定ロジック

```typescript
async function computeTaskStatus(taskId: number): Promise<TaskStatus> {
  // 1. タスクのセッション一覧取得
  const sessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.taskId, taskId));

  if (sessions.length === 0) {
    return 'open';
  }

  // 2. 手動キャンセルチェック
  if (sessions.some(s => s.status === 'cancelled')) {
    return 'cancelled';
  }

  // 3. Git判定: マージ済みか？
  const mergedSession = sessions.find(s => s.dodResult === 'merged');
  if (mergedSession) {
    // ダブルチェック: Git側でも確認
    const { stdout } = await exec(
      `git log --oneline ${baseBranch}..${mergedSession.branch}`
    );
    if (stdout.trim() === '') {
      return 'done';
    }
  }

  // 4. running セッション確認
  const runningSessions = sessions.filter(s => {
    if (!s.pid) return false;
    try {
      process.kill(s.pid, 0);
      return true;
    } catch {
      return false;
    }
  });

  if (runningSessions.length > 0) {
    return 'in_progress';
  }

  // 5. 失敗/取消のみ → failed
  const allFailedOrCancelled = sessions.every(
    s => s.status === 'failed' || s.status === 'cancelled'
  );

  if (allFailedOrCancelled) {
    return 'failed';
  }

  // 6. デフォルト: in_progress
  return 'in_progress';
}
```

### 自動更新

```typescript
// agentmine内部で定期的に実行

setInterval(async () => {
  const tasks = await db.select().from(tasks);

  for (const task of tasks) {
    const computedStatus = await computeTaskStatus(task.id);

    if (task.status !== computedStatus) {
      // ステータスが変化 → 更新
      await db
        .update(tasks)
        .set({ status: computedStatus })
        .where(eq(tasks.id, task.id));
    }
  }
}, 10000); // 10秒ごと
```

---

## 主観的判定との比較

### 主観的判定の問題

```
❌ 従来のタスク管理（Redmine, Jira等）:

1. 担当者が「完了」ボタンをクリック
   → 設定し忘れ
   → まだ作業中なのに「完了」にしてしまう

2. ステータスの意味が曖昧
   - 「完了」= コード書いた？ テスト書いた？ マージした？
   → 人によって基準が違う

3. 複数人で作業
   - 人間Aが「完了」設定
   - 人間Bが「まだ終わってないよ」と in_progress に戻す
   → 揉める
```

### Observable Factsの利点

```
✅ agentmine:

1. マージされたら自動的に done
   → 設定し忘れなし
   → 嘘をつけない

2. ステータスの意味が明確
   - done = マージされた（事実）
   - in_progress = まだマージされていない（事実）

3. 複数人で作業
   - 誰が見ても done は done
   → 揉めない
```

---

## 実装例

### Worker終了時の記録

```typescript
// agentmine worker run の内部処理

async function recordSessionCompletion(sessionId: number, exitCode: number) {
  const now = new Date();

  // 1. exit code記録
  await db
    .update(sessions)
    .set({
      status: exitCode === 0 ? 'completed' : 'failed',
      exitCode,
      completedAt: now,
      duration: now.getTime() - session.startedAt.getTime(),
    })
    .where(eq(sessions.id, sessionId));

  // 2. 成果物収集（git diff）
  const { stdout } = await exec('git diff --name-only HEAD', {
    cwd: session.worktreePath,
  });
  const artifacts = stdout.trim().split('\n').filter(Boolean);

  await db
    .update(sessions)
    .set({ artifacts })
    .where(eq(sessions.id, sessionId));

  // 3. タスクステータス更新（Observable Factsに基づく）
  const taskStatus = await computeTaskStatus(session.taskId);
  await db
    .update(tasks)
    .set({ status: taskStatus })
    .where(eq(tasks.id, session.taskId));
}
```

### タスク完了のGit判定

```typescript
async function isTaskMerged(
  taskId: number,
  baseBranch: string
): Promise<boolean> {
  // 最新のセッション取得
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.taskId, taskId))
    .orderBy(desc(sessions.id))
    .limit(1)
    .then(rows => rows[0]);

  if (!session || !session.branch) {
    return false;
  }

  // Git判定: ブランチがbaseBranchにマージされたか
  const { stdout } = await exec(
    `git log --oneline ${baseBranch}..${session.branch}`
  );

  // 空 = マージ済み
  return stdout.trim() === '';
}
```

---

## 唯一の例外: cancelled

**cancelled** ステータスは唯一の主観的判定：

```typescript
// 人間またはOrchestratorが明示的にキャンセル

agentmine task cancel 5 --reason "要件変更のため不要"

// → タスクを cancelled に更新
// → running セッションを停止
```

**理由**: キャンセルは意思決定であり、観測可能な事実では判定できない。

---

## よくある質問

### Q1: タスクステータスを手動で更新できますか？

**A**: いいえ、できません。タスクステータスは観測可能な事実（セッション状態・マージ状態）で自動判定されます。

```bash
# ❌ 手動更新コマンドは存在しない
agentmine task update 5 --status done
# Error: Task status is automatically determined

# ✅ マージすれば自動的に done になる
git merge task-5-s123
# → agentmineが自動的に done に更新
```

### Q2: セッションステータスは手動で更新できますか？

**A**: 基本的にできません。Worker完了時のexit codeで自動判定されます。ただし、`session end` コマンドで明示的に記録することは可能です（手動Worker運用時）：

```bash
# Worker runを使わない外部Worker運用時のみ
agentmine session end 123 --exit-code 0 --dod-result merged
```

### Q3: タスクが「完了」なのに in_progress のままです

**A**: マージされていないためです。Observable Factsに基づくと：

```bash
# タスク確認
agentmine task show 5
# status: in_progress

# Git判定
git log --oneline main..task-5-s123
# → 結果がある = まだマージされていない

# マージ実行
git merge task-5-s123

# 再度確認
agentmine task show 5
# status: done（自動更新された）
```

### Q4: DoD判定が pending のまま更新されません

**A**: DoD判定はOrchestratorがマージ実行時に記録します。agentmineは自動判定しません：

```bash
# Orchestratorが実行
cd .agentmine/worktrees/task-5
pnpm lint && pnpm test && pnpm build
# → 成功

# Orchestratorがマージ
git merge task-5-s123
# → exit code 0

# Orchestratorがセッション更新
agentmine session end 123 --dod-result merged
```

---

## メリット・デメリット

### メリット

✅ **一貫性**: 誰が見ても同じ結果
✅ **自動化**: 人間の介入不要
✅ **信頼性**: 事実ベースなので改ざん不可
✅ **明確性**: ステータスの意味が曖昧でない
✅ **並列実行対応**: 複数人/AIが同時作業しても問題なし

### デメリット

⚠️ **柔軟性の制限**: 「完了したことにしたい」ができない
⚠️ **Git依存**: Git外の作業は判定できない
⚠️ **初期学習コスト**: 「ステータスは自動判定」の理解が必要

---

## 設計判断基準

新しい機能を追加する際は、Observable & Deterministic原則に従っているか確認してください：

- [ ] ステータスは観測可能な事実で判定しているか？
- [ ] 人間やAIが主観的に設定していないか？
- [ ] 誰が見ても同じ結果になるか？
- [ ] 自動化可能か？
- [ ] 事実ベースで改ざん不可か？

---

## 関連ドキュメント

- @../02-architecture/design-principles.md - Observable & Deterministic原則
- @../04-data/schema.md - sessions/tasksテーブル定義
- @../05-features/task-management.md - タスク管理
- @../05-features/session-log.md - セッション記録
- @../appendix/glossary.md - 用語定義（Observable Facts）
