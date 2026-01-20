import { createDb, initializeDb, MemoryService, type Memory } from '@agentmine/core';
import MemoryClient from './memory-client';

async function getMemories(): Promise<Memory[]> {
  const db = createDb();
  await initializeDb(db);
  const memoryService = new MemoryService(db);
  return memoryService.list({ status: 'active' });
}

async function getCategories(): Promise<string[]> {
  const db = createDb();
  await initializeDb(db);
  const memoryService = new MemoryService(db);
  return memoryService.getCategories();
}

export default async function MemoryPage() {
  const [memories, categories] = await Promise.all([
    getMemories(),
    getCategories(),
  ]);

  return <MemoryClient memories={memories} categories={categories} />;
}
