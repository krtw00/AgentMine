import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eventEmitter } from "../events/emitter";

export const eventsRouter = new Hono();

// GET /api/events - SSEエンドポイント
eventsRouter.get("/", async (c) => {
  const projectIdParam = c.req.query("project_id");
  const filterProjectId = projectIdParam ? Number(projectIdParam) : null;

  return streamSSE(c, async (stream) => {
    const sendEvent = (eventName: string, data: unknown) => {
      stream.writeSSE({
        event: eventName,
        data: JSON.stringify(data),
      });
    };

    // 接続確認
    sendEvent("connected", { timestamp: new Date().toISOString() });

    // イベントリスナー登録
    const listener = ({ event, data }: { event: string; data: Record<string, unknown> }) => {
      if (filterProjectId !== null && data.projectId !== filterProjectId) {
        return;
      }
      sendEvent(event, data);
    };

    eventEmitter.on("*", listener);

    // 接続が切れるまで待機
    try {
      while (true) {
        await stream.sleep(30000); // 30秒ごとにkeep-alive
        sendEvent("ping", { timestamp: new Date().toISOString() });
      }
    } finally {
      eventEmitter.off("*", listener);
    }
  });
});
