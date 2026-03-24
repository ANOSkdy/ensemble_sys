export const JOB_STATUSES = ["active", "archived"] as const

export const JOB_REVISION_SOURCES = ["ai"] as const
export const JOB_REVISION_STATUSES = ["approved"] as const

export const RUN_CHANNELS = ["airwork"] as const
export const RUN_TYPES = ["update"] as const
export const RUN_STATUSES = ["draft"] as const
export const RUN_FILE_FORMATS = ["txt", "xlsx"] as const

export const RUN_ITEM_ACTIONS = ["update"] as const

export type JobStatus = (typeof JOB_STATUSES)[number]
export type JobRevisionSource = (typeof JOB_REVISION_SOURCES)[number]
export type JobRevisionStatus = (typeof JOB_REVISION_STATUSES)[number]
export type RunChannel = (typeof RUN_CHANNELS)[number]
export type RunType = (typeof RUN_TYPES)[number]
export type RunStatus = (typeof RUN_STATUSES)[number]
export type RunFileFormat = (typeof RUN_FILE_FORMATS)[number]
export type RunItemAction = (typeof RUN_ITEM_ACTIONS)[number]
