import { getAppRuntime } from "../runtime/app-runtime.js";

/**
 * Probes the exact duration of an audio file in milliseconds using ffprobe.
 */
export async function probeAudioDurationMs(filePath: string): Promise<number> {
  const runtime = getAppRuntime();

  const ffprobeTask = runtime.cli<string, string>("ffprobe", {
    name: "ffprobe_duration",
    command: "ffprobe",
    args: () => [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath
    ],
    stdout: "string",
    stderr: "string",
    timeout: 15_000
  });

  const output = await ffprobeTask(filePath);
  const seconds = parseFloat(output.trim());
  if (isNaN(seconds) || seconds <= 0) {
    throw new Error(`Failed to probe duration for audio file: ${filePath}`);
  }

  return Math.round(seconds * 1000);
}
