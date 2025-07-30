import { prisma } from 'wasp/server';
import { createAuthenticatedOperation, } from '../wrappers.js';
import { updateIsUserAdminById as updateIsUserAdminById_ext } from 'wasp/src/user/operations';
import { generateChatbotResponse as generateChatbotResponse_ext } from 'wasp/src/demo-ai-app/operations';
import { generateCheckoutSession as generateCheckoutSession_ext } from 'wasp/src/payment/operations';
import { createFile as createFile_ext } from 'wasp/src/file-upload/operations';
// PUBLIC API
export const updateIsUserAdminById = createAuthenticatedOperation(updateIsUserAdminById_ext, {
    User: prisma.user,
});
// PUBLIC API
export const generateChatbotResponse = createAuthenticatedOperation(generateChatbotResponse_ext, {
    User: prisma.user,
});
// PUBLIC API
export const generateCheckoutSession = createAuthenticatedOperation(generateCheckoutSession_ext, {
    User: prisma.user,
});
// PUBLIC API
export const createFile = createAuthenticatedOperation(createFile_ext, {
    User: prisma.user,
    File: prisma.file,
});
//# sourceMappingURL=index.js.map