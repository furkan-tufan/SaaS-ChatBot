import { createAction } from './core';
// PUBLIC API
export const updateIsUserAdminById = createAction('operations/update-is-user-admin-by-id', ['User']);
// PUBLIC API
export const generateChatbotResponse = createAction('operations/generate-chatbot-response', ['User']);
// PUBLIC API
export const generateCheckoutSession = createAction('operations/generate-checkout-session', ['User']);
// PUBLIC API
export const createFile = createAction('operations/create-file', ['User', 'File']);
//# sourceMappingURL=index.js.map