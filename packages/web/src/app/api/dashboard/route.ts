import { NextResponse } from 'next/server';
import { tasks, sessions } from '@agentmine/core';
import { eq, desc, sql, count } from 'drizzle-orm';
import { getDb } from '@/lib/db';

/**
 * GET /api/dashboard - Get dashboard statistics
 */
export async function GET() {
  try {
    const db = getDb();

    // Get task counts by status
    const taskCounts = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .groupBy(tasks.status);

    const taskStats = {
      open: 0,
      in_progress: 0,
      done: 0,
      failed: 0,
      dod_failed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const row of taskCounts) {
      if (row.status && row.status in taskStats) {
        taskStats[row.status as keyof typeof taskStats] = row.count;
      }
      taskStats.total += row.count;
    }

    // Get active sessions (running)
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'running'))
      .orderBy(desc(sessions.startedAt))
      .limit(5);

    // Get recent completed tasks
    const recentTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'done'))
      .orderBy(desc(tasks.updatedAt))
      .limit(5);

    // Get session counts by status
    const sessionCounts = await db
      .select({
        status: sessions.status,
        count: count(),
      })
      .from(sessions)
      .groupBy(sessions.status);

    const sessionStats = {
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const row of sessionCounts) {
      if (row.status && row.status in sessionStats) {
        sessionStats[row.status as keyof typeof sessionStats] = row.count;
      }
      sessionStats.total += row.count;
    }

    return NextResponse.json({
      taskStats,
      sessionStats,
      activeSessions,
      recentTasks,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
