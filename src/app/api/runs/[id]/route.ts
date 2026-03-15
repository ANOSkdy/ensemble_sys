import { NextResponse } from "next/server"
import { getRunDetail } from "@/lib/db/queries/run-detail"
import { idParamSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params
  const parsed = idParamSchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })
  }

  const data = await getRunDetail(parsed.data.id)

  if (!data.run) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data })
}