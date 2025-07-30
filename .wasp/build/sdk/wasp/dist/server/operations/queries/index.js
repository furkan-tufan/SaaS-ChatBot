import { prisma } from 'wasp/server';
import { createAuthenticatedOperation, } from '../wrappers.js';
import { getPaginatedUsers as getPaginatedUsers_ext } from 'wasp/src/user/operations';
import { getCustomerPortalUrl as getCustomerPortalUrl_ext } from 'wasp/src/payment/operations';
import { getAllFilesByUser as getAllFilesByUser_ext } from 'wasp/src/file-upload/operations';
import { getDownloadFileSignedURL as getDownloadFileSignedURL_ext } from 'wasp/src/file-upload/operations';
import { getDailyStats as getDailyStats_ext } from 'wasp/src/analytics/operations';
// PUBLIC API
export const getPaginatedUsers = createAuthenticatedOperation(getPaginatedUsers_ext, {
    User: prisma.user,
});
// PUBLIC API
export const getCustomerPortalUrl = createAuthenticatedOperation(getCustomerPortalUrl_ext, {
    User: prisma.user,
});
// PUBLIC API
export const getAllFilesByUser = createAuthenticatedOperation(getAllFilesByUser_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const getDownloadFileSignedURL = createAuthenticatedOperation(getDownloadFileSignedURL_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const getDailyStats = createAuthenticatedOperation(getDailyStats_ext, {
    User: prisma.user,
    DailyStats: prisma.dailyStats,
});
//# sourceMappingURL=index.js.map