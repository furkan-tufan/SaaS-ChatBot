
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { updateIsUserAdminById as updateIsUserAdminById_ext } from 'wasp/src/user/operations'
import { generateChatbotResponse as generateChatbotResponse_ext } from 'wasp/src/demo-ai-app/operations'
import { generateCheckoutSession as generateCheckoutSession_ext } from 'wasp/src/payment/operations'
import { createFile as createFile_ext } from 'wasp/src/file-upload/operations'

// PRIVATE API
export type UpdateIsUserAdminById_ext = typeof updateIsUserAdminById_ext

// PUBLIC API
export const updateIsUserAdminById: AuthenticatedOperationFor<UpdateIsUserAdminById_ext> =
  createAuthenticatedOperation(
    updateIsUserAdminById_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type GenerateChatbotResponse_ext = typeof generateChatbotResponse_ext

// PUBLIC API
export const generateChatbotResponse: AuthenticatedOperationFor<GenerateChatbotResponse_ext> =
  createAuthenticatedOperation(
    generateChatbotResponse_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type GenerateCheckoutSession_ext = typeof generateCheckoutSession_ext

// PUBLIC API
export const generateCheckoutSession: AuthenticatedOperationFor<GenerateCheckoutSession_ext> =
  createAuthenticatedOperation(
    generateCheckoutSession_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type CreateFile_ext = typeof createFile_ext

// PUBLIC API
export const createFile: AuthenticatedOperationFor<CreateFile_ext> =
  createAuthenticatedOperation(
    createFile_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )
