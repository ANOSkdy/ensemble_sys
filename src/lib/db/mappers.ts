export type DomainClient = {
  id: string
  organizationId: string
  name: string
  contactName?: string | null
  notes?: string | null
}

export function mapDbClientToDomain(row: {
  id: string
  org_id: string
  name: string
  owner_name?: string | null
  memo?: string | null
}): DomainClient {
  return {
    id: row.id,
    organizationId: row.org_id,
    name: row.name,
    contactName: row.owner_name ?? null,
    notes: row.memo ?? null,
  }
}
