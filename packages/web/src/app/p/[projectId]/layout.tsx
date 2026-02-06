"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import { useSSE } from "@/lib/sse";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = Number(params.projectId);

  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const sseConnected = useAppStore((s) => s.sseConnected);

  useEffect(() => {
    setCurrentProject(projectId);
    return () => setCurrentProject(null);
  }, [projectId, setCurrentProject]);

  useSSE(projectId);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await projectsApi.get(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const navItems = [
    { href: `/p/${projectId}/live`, label: "ライブ", icon: "play" },
    { href: `/p/${projectId}/monitor`, label: "モニター", icon: "chart" },
    { href: `/p/${projectId}/runs`, label: "実行履歴", icon: "bolt" },
    { href: `/p/${projectId}/agents`, label: "エージェント", icon: "cpu" },
    { href: `/p/${projectId}/settings`, label: "設定", icon: "cog" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-900">
      {/* Header */}
      <header className="px-4 py-2 flex items-center justify-between border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-semibold text-sm text-blue-400">AgentMine</span>
          </Link>
          {project && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-sm font-medium text-zinc-200">{project.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${sseConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-xs text-zinc-400">{sseConnected ? "接続中" : "切断"}</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-52 border-r border-zinc-700 bg-zinc-800 flex flex-col">
          <ul className="p-2 space-y-0.5 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-zinc-700 text-zinc-100 border-l-2 border-blue-500"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 border-l-2 border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="p-3 border-t border-zinc-700 text-xs text-zinc-500">
            <div className="truncate">{project?.repoPath}</div>
            <div className="mt-1 opacity-70">ブランチ: {project?.baseBranch}</div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
