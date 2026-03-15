import { NextResponse } from "next/server"
import { getClientList } from "@/lib/db/queries/clients"
import { createClient } from "@/lib/db/queries/create-client"
import { recordAuditLog } from "@/lib/db/audit-log"
import { clientCreateSchema } from "@/lib/validators/schemas"

export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await getClientList()
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("GET /api/clients failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to fetch clients" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = clientCreateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid payload" },
        { status: 400 },
      )
    }

    const created = await createClient(parsed.data)

    await recordAuditLog({
      action: "create",
      target_table: "clients",
      target_id: created.id,
      detail: parsed.data,
    })

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (error) {
    console.error("POST /api/clients failed", error)
    return NextResponse.json(
      { ok: false, error: "failed to create client" },
      { status: 500 },
    )
  }
}
