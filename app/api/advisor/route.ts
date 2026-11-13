import { encodeEvent } from "@/lib/advisor/sse";
import { answerChat } from "@/lib/data/advisor-chat";
import { getContext } from "@/lib/data/context";

// Advisor chat: one question per request, answered as a stream of events (progress, then the answer).
export async function POST(request: Request) {
  // Session first: guests are redirected to /login before any stream starts.
  await getContext();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await answerChat({ question: body.question, conversationId: body.conversationId, page: body.page }, (e) => controller.enqueue(encoder.encode(encodeEvent(e))));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
