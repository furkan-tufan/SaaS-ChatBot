import express from 'express'

import auth from 'wasp/core/auth'

import updateIsUserAdminById from './updateIsUserAdminById.js'
import generateChatbotResponse from './generateChatbotResponse.js'
import generateCheckoutSession from './generateCheckoutSession.js'
import createFile from './createFile.js'
import getPaginatedUsers from './getPaginatedUsers.js'
import getCustomerPortalUrl from './getCustomerPortalUrl.js'
import getAllFilesByUser from './getAllFilesByUser.js'
import getDownloadFileSignedURL from './getDownloadFileSignedURL.js'
import getDailyStats from './getDailyStats.js'

const router = express.Router()

router.post('/update-is-user-admin-by-id', auth, updateIsUserAdminById)
router.post('/generate-chatbot-response', auth, generateChatbotResponse)
router.post('/generate-checkout-session', auth, generateCheckoutSession)
router.post('/create-file', auth, createFile)
router.post('/get-paginated-users', auth, getPaginatedUsers)
router.post('/get-customer-portal-url', auth, getCustomerPortalUrl)
router.post('/get-all-files-by-user', auth, getAllFilesByUser)
router.post('/get-download-file-signed-url', auth, getDownloadFileSignedURL)
router.post('/get-daily-stats', auth, getDailyStats)

export default router
