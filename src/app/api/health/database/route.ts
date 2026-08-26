import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function hasValidHealthSecret(request: Request): boolean {
  const expected = process.env.DB_HEALTHCHECK_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function GET(request: Request) {
  if (!hasValidHealthSecret(request)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      database: "reachable",
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("DB_HEALTHCHECK_ERROR", error);
    return Response.json(
      { ok: false, database: "unreachable" },
      { status: 503 },
    );
  }
}

