import { NextResponse } from "next/server"

type ProposalApiErrorOptions = {
  status: 404 | 409 | 422 | 500
  error: string
  code?: string
  issues?: unknown
}

export function proposalApiErrorResponse(options: ProposalApiErrorOptions) {
  return NextResponse.json(
    {
      ok: false,
      error: options.error,
      ...(options.code ? { code: options.code } : {}),
      ...(options.issues ? { issues: options.issues } : {}),
    },
    { status: options.status },
  )
}
