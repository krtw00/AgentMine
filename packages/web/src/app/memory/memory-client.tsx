'use client';

import { useMemo, useState } from 'react';
import type { Memory, MemoryStatus } from '@agentmine/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type MemoryClientProps = {
  memories: Memory[];
  categories: string[];
};

type MemoryState = {
  id?: number;
  category: string;
  title: string;
  content: string;
  summary?: string;
  status: MemoryStatus;
  tags: string[];
  updatedAt: Date;
};

const normalizeMemory = (memory: Memory): MemoryState => ({
  id: memory.id,
  category: memory.category,
  title: memory.title,
  content: memory.content,
  summary: memory.summary ?? undefined,
  status: memory.status,
  tags: (memory.tags as string[]) ?? [],
  updatedAt: memory.updatedAt,
});

const textAreaClassName =
  'border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}か月前`;
  return `${Math.floor(days / 365)}年前`;
}

function getStatusLabel(status: MemoryStatus): string {
  switch (status) {
    case 'active':
      return '運用中';
    case 'draft':
      return '下書き';
    case 'archived':
      return 'アーカイブ';
    default:
      return status;
  }
}

function getStatusColor(status: MemoryStatus): string {
  switch (status) {
    case 'active':
      return 'text-emerald-600';
    case 'draft':
      return 'text-amber-600';
    case 'archived':
      return 'text-muted-foreground';
    default:
      return '';
  }
}

export default function MemoryClient({
  memories: initialMemories,
  categories: initialCategories,
}: MemoryClientProps) {
  const [memories, setMemories] = useState<MemoryState[]>(() =>
    initialMemories.map(normalizeMemory)
  );
  const [selectedId, setSelectedId] = useState<number | undefined>(
    initialMemories[0]?.id
  );
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<MemoryStatus | 'all'>('all');
  const [draft, setDraft] = useState<MemoryState | null>(
    initialMemories[0] ? normalizeMemory(initialMemories[0]) : null
  );
  const [dirty, setDirty] = useState(false);

  const selectedMemory = useMemo(
    () => memories.find((m) => m.id === selectedId),
    [memories, selectedId]
  );

  const groupedMemories = useMemo(() => {
    const filtered = memories.filter((m) => {
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          m.title.toLowerCase().includes(s) ||
          m.category.toLowerCase().includes(s) ||
          m.content.toLowerCase().includes(s)
        );
      }
      return true;
    });

    const groups = new Map<string, MemoryState[]>();
    for (const memory of filtered) {
      const cat = memory.category;
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(memory);
    }
    return groups;
  }, [memories, search, filterStatus]);

  const stats = useMemo(() => {
    const categories = new Set(memories.map((m) => m.category)).size;
    const draftCount = memories.filter((m) => m.status === 'draft').length;
    return { categories, total: memories.length, draftCount };
  }, [memories]);

  const handleSelect = (memory: MemoryState) => {
    setSelectedId(memory.id);
    setDraft({ ...memory });
    setDirty(false);
  };

  const updateDraft = (updates: Partial<MemoryState>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
    setDirty(true);
  };

  const handleSave = () => {
    if (!draft || !draft.id) return;
    // TODO: Call API to save
    setMemories((prev) =>
      prev.map((m) => (m.id === draft.id ? { ...draft } : m))
    );
    setDirty(false);
  };

  const handleDiscard = () => {
    if (!selectedMemory) return;
    setDraft({ ...selectedMemory });
    setDirty(false);
  };

  const contextPreview = useMemo(() => {
    const parts: string[] = ['## プロジェクト決定事項', ''];

    const activeMemories = memories.filter((m) => m.status === 'active');
    const byCategory = new Map<string, MemoryState[]>();
    for (const memory of activeMemories) {
      const cat = memory.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(memory);
    }

    for (const [category, categoryMemories] of byCategory) {
      parts.push(`### ${category}`);
      for (const memory of categoryMemories) {
        const summary = memory.summary || memory.content.split('\n')[0]?.trim() || '';
        parts.push(`- ${memory.title}: ${summary}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }, [memories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Memory Bank
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            共有した決定事項を、すぐに再利用
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            構造化された知識を整理し、実行前にエージェントへ渡るコンテキストをプレビューします。
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background/80 px-3 py-1">
              カテゴリ {stats.categories}件
            </span>
            <span className="rounded-full border bg-background/80 px-3 py-1">
              エントリ {stats.total}件
            </span>
            {stats.draftCount > 0 && (
              <span className="rounded-full border bg-amber-100 px-3 py-1 text-amber-700">
                下書き {stats.draftCount}件
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">新規メモリ</Button>
          <Button variant="ghost" size="sm">
            コンテキストをプレビュー
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(249,115,22,0.18),transparent_45%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">ライブラリ</p>
                  <span className="text-xs text-muted-foreground">
                    {memories.length}件
                  </span>
                </div>
                <Input
                  placeholder="メモリを検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'draft', 'archived'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus(status)}
                    >
                      {status === 'all' ? 'すべて' : getStatusLabel(status)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur max-h-[500px] overflow-y-auto">
              <div className="space-y-6">
                {memories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>メモリがありません</p>
                    <p className="mt-1 text-xs">「新規メモリ」から追加してください</p>
                  </div>
                ) : groupedMemories.size === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    検索結果がありません
                  </div>
                ) : (
                  Array.from(groupedMemories.entries()).map(([category, categoryMemories]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <span>{category}</span>
                        <span className="rounded-full border bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {categoryMemories.length}件
                        </span>
                      </div>
                      <div className="space-y-2">
                        {categoryMemories.map((memory) => {
                          const isActive = memory.id === selectedId;
                          return (
                            <button
                              key={memory.id}
                              type="button"
                              onClick={() => handleSelect(memory)}
                              className={cn(
                                'w-full rounded-xl border px-3 py-2 text-left transition',
                                isActive
                                  ? 'border-foreground/20 bg-foreground/5 shadow-sm'
                                  : 'border-transparent bg-background/60 hover:border-border'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">{memory.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    #{memory.id}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    'rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase',
                                    getStatusColor(memory.status)
                                  )}
                                >
                                  {getStatusLabel(memory.status)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                更新 {formatDate(memory.updatedAt)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Editor */}
          <section className="space-y-4">
            {draft ? (
              <>
                <div className="rounded-2xl border bg-background/80 p-5 backdrop-blur">
                  <div className="flex flex-col gap-4 border-b border-dashed pb-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          {draft.category}
                        </p>
                        <Input
                          value={draft.title}
                          onChange={(e) => updateDraft({ title: e.target.value })}
                          className="text-2xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                          placeholder="タイトル"
                        />
                        <Input
                          value={draft.summary || ''}
                          onChange={(e) => updateDraft({ summary: e.target.value || undefined })}
                          className="text-sm text-muted-foreground border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                          placeholder="要約（オプション）"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={handleSave} disabled={!dirty}>
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDiscard}
                          disabled={!dirty}
                        >
                          破棄
                        </Button>
                        <Button variant="ghost" size="sm">
                          アーカイブ
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border bg-background/80 px-2 py-1">
                        ID: #{draft.id}
                      </span>
                      <span className="rounded-full border bg-background/80 px-2 py-1">
                        更新日 {draft.updatedAt.toLocaleDateString()}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border bg-background/80 px-2 py-1',
                          getStatusColor(draft.status)
                        )}
                      >
                        {getStatusLabel(draft.status)}
                      </span>
                      {dirty && (
                        <span className="rounded-full border bg-amber-100 px-2 py-1 text-amber-700">
                          未保存の変更あり
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">コンテンツ</p>
                      <span className="text-xs text-muted-foreground">Markdown</span>
                    </div>
                    <textarea
                      className={cn(textAreaClassName, 'h-[360px] font-mono text-sm resize-none')}
                      value={draft.content}
                      onChange={(e) => updateDraft({ content: e.target.value })}
                      placeholder="メモリの内容を入力..."
                    />
                  </div>
                </div>

                {/* Context Preview */}
                <div className="rounded-2xl border bg-background/80 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">コンテキストプレビュー</p>
                      <p className="text-xs text-muted-foreground">
                        セッション開始時にエージェントへ送る統合コンテキスト。
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(contextPreview)}
                    >
                      コピー
                    </Button>
                  </div>
                  <div className="mt-4 rounded-2xl border bg-card p-4 font-mono text-xs leading-5 text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {contextPreview || 'アクティブなメモリがありません'}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border bg-background/80 p-5 backdrop-blur">
                <div className="py-20 text-center text-muted-foreground">
                  <p className="text-lg font-semibold">メモリを選択してください</p>
                  <p className="mt-2 text-sm">
                    左のリストからメモリを選択するか、新規作成してください
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
