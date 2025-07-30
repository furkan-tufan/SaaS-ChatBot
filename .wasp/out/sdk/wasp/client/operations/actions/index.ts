import { type ActionFor, createAction } from './core'
import { UpdateIsUserAdminById_ext } from 'wasp/server/operations/actions'
import { GenerateChatbotResponse_ext } from 'wasp/server/operations/actions'
import { GenerateCheckoutSession_ext } from 'wasp/server/operations/actions'
import { CreateFile_ext } from 'wasp/server/operations/actions'

// PUBLIC API
export const updateIsUserAdminById: ActionFor<UpdateIsUserAdminById_ext> = createAction<UpdateIsUserAdminById_ext>(
  'operations/update-is-user-admin-by-id',
  ['User'],
)

// PUBLIC API
export const generateChatbotResponse: ActionFor<GenerateChatbotResponse_ext> = createAction<GenerateChatbotResponse_ext>(
  'operations/generate-chatbot-response',
  ['User'],
)

// PUBLIC API
export const generateCheckoutSession: ActionFor<GenerateCheckoutSession_ext> = createAction<GenerateCheckoutSession_ext>(
  'operations/generate-checkout-session',
  ['User'],
)

// PUBLIC API
export const createFile: ActionFor<CreateFile_ext> = createAction<CreateFile_ext>(
  'operations/create-file',
  ['User', 'File'],
)
