import { Router } from 'express'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'

const router = Router()

// Testar um pagamento pela stripe

export default router