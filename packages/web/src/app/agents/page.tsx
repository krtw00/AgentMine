import { AgentService } from '@agentmine/core';
import AgentsClient from './agents-client';

export default function AgentsPage() {
  const agentService = new AgentService();
  const agents = agentService.findAll();

  return <AgentsClient agents={agents} />;
}
