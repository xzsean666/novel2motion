import {
  createRuntime,
  TaskRuntime,
  RuntimeOptions,
  TaskMiddleware
} from "node-task-runtime";

let globalRuntime: TaskRuntime | null = null;

/**
 * Creates or retrieves the singleton TaskRuntime configured for novel2motion.
 */
export function getAppRuntime(options: Partial<RuntimeOptions> = {}): TaskRuntime {
  if (globalRuntime && globalRuntime.state !== "stopped") {
    return globalRuntime;
  }

  // APM / Performance Monitoring Middleware
  const apmMiddleware: TaskMiddleware = async (context, next) => {
    const start = Date.now();
    try {
      const result = await next();
      const elapsed = Date.now() - start;
      if (elapsed > 3000) {
        // Slow task warning
        // Note: console logging can be replaced or piped to custom logger
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  const runtime = createRuntime({
    workers: "auto",
    maxConcurrency: 16,
    defaultTimeout: 120_000,
    shutdownTimeout: 10_000,
    middlewares: [apmMiddleware],
    ...options
  });

  globalRuntime = runtime;
  return runtime;
}

/**
 * Gracefully shuts down the global TaskRuntime.
 */
export async function shutdownAppRuntime(): Promise<void> {
  if (globalRuntime) {
    await globalRuntime.destroy();
    globalRuntime = null;
  }
}
