import { type AuthenticatedOperationFor } from '../wrappers.js';
import { updateIsUserAdminById as updateIsUserAdminById_ext } from 'wasp/src/user/operations';
import { generateChatbotResponse as generateChatbotResponse_ext } from 'wasp/src/demo-ai-app/operations';
import { generateCheckoutSession as generateCheckoutSession_ext } from 'wasp/src/payment/operations';
import { createFile as createFile_ext } from 'wasp/src/file-upload/operations';
export type UpdateIsUserAdminById_ext = typeof updateIsUserAdminById_ext;
export declare const updateIsUserAdminById: AuthenticatedOperationFor<UpdateIsUserAdminById_ext>;
export type GenerateChatbotResponse_ext = typeof generateChatbotResponse_ext;
export declare const generateChatbotResponse: AuthenticatedOperationFor<GenerateChatbotResponse_ext>;
export type GenerateCheckoutSession_ext = typeof generateCheckoutSession_ext;
export declare const generateCheckoutSession: AuthenticatedOperationFor<GenerateCheckoutSession_ext>;
export type CreateFile_ext = typeof createFile_ext;
export declare const createFile: AuthenticatedOperationFor<CreateFile_ext>;
//# sourceMappingURL=index.d.ts.map