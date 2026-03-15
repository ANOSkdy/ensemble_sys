import "server-only"
import { sql } from "@/lib/db/client"

export type ClientDetail = {
  id: string
  org_id: string
  name: string
  owner_name: string | null
  memo: string | null
}

export type ClientChannelAccount = {
  id: string
  channel: string | null
  login_id: string | null
  memo: string | null
}

export type ClientLocation = {
  id: string
  name_ja: string | null
  memo: string | null
  is_active: boolean | null
}

export type ClientJob = {
  id: string
  internal_title: string | null
  status: string | null
}

export type ClientMeeting = {
  id: string
  title: string | null
  memo: string | null
  meeting_date: string | null
}

export type ClientDetailResult = {
  client: ClientDetail | null
  channelAccounts: ClientChannelAccount[]
  locations: ClientLocation[]
  jobs: ClientJob[]
  meetings: ClientMeeting[]
}

export async function getClientDetail(id: string): Promise<ClientDetailResult> {
  const clientRows = await sql`
    select
      id::text,
      org_id::text,
      name,
      owner_name,
      null::text as memo
    from clients
    where id::text = ${id}
    limit 1
  `

  const channelAccounts = await sql`
    select
      id::text,
      channel,
      login_id,
      memo
    from channel_accounts
    where client_id::text = ${id}
    order by id desc
  `

  const locations = await sql`
    select
      id::text,
      name_ja,
      memo,
      null::boolean as is_active
    from airwork_locations
    where client_id::text = ${id}
    order by id desc
  `

  const jobs = await sql`
    select
      id::text,
      internal_title,
      status
    from jobs
    where client_id::text = ${id}
    order by id desc
  `

  const meetings = await sql`
    select
      id::text,
      null::text as title,
      null::text as memo,
      null::text as meeting_date
    from client_meetings
    where client_id::text = ${id}
    order by id desc
  `

  return {
    client: (clientRows[0] as ClientDetail | undefined) ?? null,
    channelAccounts: channelAccounts as ClientChannelAccount[],
    locations: locations as ClientLocation[],
    jobs: jobs as ClientJob[],
    meetings: meetings as ClientMeeting[],
  }
}
