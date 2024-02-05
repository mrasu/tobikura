import { IFileLogger } from "@/fileLog/iFileLogger";
import { buildTraceLoggingFetch } from "@/traceLoggingFetch";
import type { Global } from "@jest/types";

let originalFetch: (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function patchFetch(
  logger: IFileLogger,
  testPath: string,
  global: Global.Global,
): void {
  const logFileFn = async (text: string): Promise<void> => {
    await logger.appendFileLine(text);
  };

  const customFetch = buildTraceLoggingFetch(testPath, global.fetch, logFileFn);
  originalFetch = global.fetch;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.fetch = customFetch;
}

export function restoreFetch(global: Global.Global): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.fetch = originalFetch;
}
