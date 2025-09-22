export async function POST(req: Request) {
  try {
    const { to, subject, body, system, payload } = await req.json();

    const timestamp = new Date().toISOString();
    // Mock logging to server console
    console.log("[mock-email] sending email", {
      timestamp,
      to,
      subject,
      system,
      preview: String(body).slice(0, 200),
      payloadSnippet: JSON.stringify(payload ?? {}).slice(0, 200),
    });

    // Simulate async queuing delay
    await new Promise((r) => setTimeout(r, 150));

    return Response.json({ ok: true, message: "Email queued (mock)", to, system, timestamp });
  } catch (e: any) {
    console.error("[mock-email] failed to queue email", e?.message || e);
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}