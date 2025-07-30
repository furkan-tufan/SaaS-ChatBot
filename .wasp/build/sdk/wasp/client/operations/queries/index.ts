import { type QueryFor, createQuery } from './core'
import { GetPaginatedUsers_ext } from 'wasp/server/operations/queries'
import { GetCustomerPortalUrl_ext } from 'wasp/server/operations/queries'
import { GetAllFilesByUser_ext } from 'wasp/server/operations/queries'
import { GetDownloadFileSignedURL_ext } from 'wasp/server/operations/queries'
import { GetDailyStats_ext } from 'wasp/server/operations/queries'

// PUBLIC API
export const getPaginatedUsers: QueryFor<GetPaginatedUsers_ext> = createQuery<GetPaginatedUsers_ext>(
  'operations/get-paginated-users',
  ['User'],
)

// PUBLIC API
export const getCustomerPortalUrl: QueryFor<GetCustomerPortalUrl_ext> = createQuery<GetCustomerPortalUrl_ext>(
  'operations/get-customer-portal-url',
  ['User'],
)

// PUBLIC API
export const getAllFilesByUser: QueryFor<GetAllFilesByUser_ext> = createQuery<GetAllFilesByUser_ext>(
  'operations/get-all-files-by-user',
  ['User', 'File'],
)

// PUBLIC API
export const getDownloadFileSignedURL: QueryFor<GetDownloadFileSignedURL_ext> = createQuery<GetDownloadFileSignedURL_ext>(
  'operations/get-download-file-signed-url',
  ['User', 'File'],
)

// PUBLIC API
export const getDailyStats: QueryFor<GetDailyStats_ext> = createQuery<GetDailyStats_ext>(
  'operations/get-daily-stats',
  ['User', 'DailyStats'],
)

// PRIVATE API (used in SDK)
export { buildAndRegisterQuery } from './core'
