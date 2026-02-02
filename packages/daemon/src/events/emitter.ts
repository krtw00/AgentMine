import { EventEmitter } from "events";

export interface RunEvent {
  runId: number;
  [key: string]: unknown;
}

class AppEventEmitter extends EventEmitter {
  emitRunEvent(eventName: string, data: RunEvent) {
    this.emit(eventName, data);
    this.emit("*", { event: eventName, data }); // ワイルドカード
  }
}

export const eventEmitter = new AppEventEmitter();
