import { execSync, type ChildProcess } from "child_process";

export function killProcess(proc: ChildProcess, signal: "SIGTERM" | "SIGKILL" = "SIGTERM") {
  if (process.platform === "win32" && proc.pid) {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // already exited
    }
  } else {
    proc.kill(signal);
  }
}
