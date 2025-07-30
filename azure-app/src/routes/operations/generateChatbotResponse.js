import { createAction } from '../../middleware/operations.js'
import generateChatbotResponse from '../../actions/generateChatbotResponse.js'

export default createAction(generateChatbotResponse)
