import { EchoedFatalError } from "@/echoedFatalError";
import { TraceHistory } from "@/integration/common/traceHistory";
import { Base64String } from "@/type/base64String";
import { BrowserContext } from "@playwright/test";

type EchoedContext = {
  traces: TraceHistory;
};

const echoedContextPropertyName = "__echoed_ctx";
export type WrappedBrowserContext = {
  [echoedContextPropertyName]: EchoedContext | undefined;
};

function getEchoedContext(context: BrowserContext): EchoedContext {
  const ctx = (context as unknown as WrappedBrowserContext)[
    echoedContextPropertyName
  ];

  if (!ctx) {
    throw new EchoedFatalError(
      "Echoed is not initialized for Playwright's context. not using test produced by Echoed?",
    );
  }

  return ctx;
}

export function initializeEchoedContext(context: BrowserContext): void {
  (context as unknown as WrappedBrowserContext)[echoedContextPropertyName] = {
    traces: new TraceHistory(),
  };
}

export function setTraceIdToContext(
  context: BrowserContext,
  url: string,
  traceId: Base64String,
): void {
  const traces = getEchoedContext(context).traces;
  traces.push(url, traceId);
}

export function getLastTraceIdFromContext(
  context: BrowserContext,
  pattern: string | RegExp,
): Base64String | undefined {
  const traces = getEchoedContext(context).traces;
  if (!traces) {
    return undefined;
  }

  return traces.getLastTraceId(pattern);
}
