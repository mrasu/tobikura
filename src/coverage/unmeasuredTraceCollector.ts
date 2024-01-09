import { OtelSpan } from "@/type/otelSpan";
import { toBase64 } from "@/util/byte";

export class UnmeasuredTraceCollector {
  private readonly traceIds = new Set<string>();

  addSpans(spans: OtelSpan[]) {
    for (const span of spans) {
      if (!span.traceId) continue;
      this.traceIds.add(toBase64(span.traceId));
    }
  }

  get traceIdArray(): string[] {
    return Array.from(this.traceIds);
  }
}
