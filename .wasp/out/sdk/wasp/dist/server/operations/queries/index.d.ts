import { type AuthenticatedOperationFor } from '../wrappers.js';
import { getPaginatedUsers as getPaginatedUsers_ext } from 'wasp/src/user/operations';
import { getCustomerPortalUrl as getCustomerPortalUrl_ext } from 'wasp/src/payment/operations';
import { getAllFilesByUser as getAllFilesByUser_ext } from 'wasp/src/file-upload/operations';
import { getDownloadFileSignedURL as getDownloadFileSignedURL_ext } from 'wasp/src/file-upload/operations';
import { getDailyStats as getDailyStats_ext } from 'wasp/src/analytics/operations';
export type GetPaginatedUsers_ext = typeof getPaginatedUsers_ext;
export declare const getPaginatedUsers: AuthenticatedOperationFor<GetPaginatedUsers_ext>;
export type GetCustomerPortalUrl_ext = typeof getCustomerPortalUrl_ext;
export declare const getCustomerPortalUrl: AuthenticatedOperationFor<GetCustomerPortalUrl_ext>;
export type GetAllFilesByUser_ext = typeof getAllFilesByUser_ext;
export declare const getAllFilesByUser: AuthenticatedOperationFor<GetAllFilesByUser_ext>;
export type GetDownloadFileSignedURL_ext = typeof getDownloadFileSignedURL_ext;
export declare const getDownloadFileSignedURL: AuthenticatedOperationFor<GetDownloadFileSignedURL_ext>;
export type GetDailyStats_ext = typeof getDailyStats_ext;
export declare const getDailyStats: AuthenticatedOperationFor<GetDailyStats_ext>;
//# sourceMappingURL=index.d.ts.map