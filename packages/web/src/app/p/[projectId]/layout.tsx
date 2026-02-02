"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import { useSSE } from "@/lib/sse";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    { href: `/p/${projectId}/monitor`, label: "Monitor" },
    { href: `/p/${projectId}/runs`, label: "Runs" },
    { href: `/p/${projectId}/agents`, label: "Agent Profiles" },
    { href: `/p/${projectId}/settings`, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg hover:text-gray-300">
            AgentMine
          </Link>
          {project && (
            <span className="text-gray-400">/ {project.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              sseConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-400">
            {sseConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-48 bg-gray-100 border-r p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
