import { prisma } from 'wasp/server'

import { generateChatbotResponse } from '../../../../../src/demo-ai-app/operations'


export default async function (args, context) {
  return (generateChatbotResponse as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}
