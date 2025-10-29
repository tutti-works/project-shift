/**
 * Structured debug logger that stores recent logs and exposes them on window.
 */

interface DebugLog {
  timestamp: number;
  category: string;
  message: string;
  data?: unknown;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private readonly maxLogs = 100;

  log(category: string, message: string, data?: unknown): void {
    const log: DebugLog = {
      timestamp: Date.now(),
      category,
      message,
      data,
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const emoji = this.getCategoryEmoji(category);
    if (data !== undefined) {
      console.log(`${emoji} [${category}] ${message}`, data);
    } else {
      console.log(`${emoji} [${category}] ${message}`);
    }
  }

  private getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      DEPTH: "🔍",
      DISTANCE: "🔍",
      FRAME: "📊",
      SHADER: "📝",
      UNIFORM: "🔗",
      ERROR: "❌",
      SUCCESS: "✅",
      WARNING: "⚠️",
    };
    return emojiMap[category] ?? "📋";
  }

  getLogs(category?: string): DebugLog[] {
    if (category) {
      return this.logs.filter((log) => log.category === category);
    }
    return this.logs;
  }

  getFormattedLogs(): string {
    return this.logs
      .map((log) => {
        const time = new Date(log.timestamp).toISOString();
        let dataStr = "";
        if (log.data !== undefined) {
          try {
            dataStr = `\n  ${JSON.stringify(log.data, null, 2)}`;
          } catch {
            dataStr = `\n  ${String(log.data)}`;
          }
        }
        return `[${time}] [${log.category}] ${log.message}${dataStr}`;
      })
      .join("\n\n");
  }

  clear(): void {
    this.logs = [];
    console.clear();
  }

  expose(): void {
    if (typeof window !== "undefined") {
      window.debugLogger = this;
      console.log("✅ DebugLogger is exposed as window.debugLogger");
      console.log("Use window.debugLogger.getLogs() to get all logs");
      console.log("Use window.debugLogger.getFormattedLogs() to get formatted logs");
    }
  }
}

export const debugLogger = new DebugLogger();

declare global {
  interface Window {
    debugLogger?: DebugLogger;
  }
}

if (typeof window !== "undefined") {
  debugLogger.expose();
}
