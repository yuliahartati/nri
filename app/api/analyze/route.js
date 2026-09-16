export async function POST(request) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || !text.trim()) {
      return Response.json(
        { error: "Text is required." },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "NRI analysis endpoint is working.",
      receivedCharacters: text.length,
    });
  } catch (error) {
    return Response.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}