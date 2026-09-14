export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockReply(content: string): Response {
  return jsonResponse(200, { message: { role: "assistant", content } });
}

export function mockError(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

export function mockFeedbackSummary(): Response {
  return mockReply(
    JSON.stringify({
      didWell: [{ quote: "Hi, nice to meet you!", explanation: "A warm, direct opener sets a friendly tone." }],
      canImprove: [{ quote: "Hi, nice to meet you!" }],
    }),
  );
}

export function mockWrittenReplyVerdict(verdict: "landed" | "not_yet", reason: string): Response {
  return mockReply(JSON.stringify({ verdict, reason }));
}
