import { Router, Request, Response } from 'express'
import dbConnection from '../db/connection'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'
import { JwtPayload } from 'jsonwebtoken';

const router = Router()

// Rota para agendar um campo
router.post('/agendar', authMiddleware, async (req: Request, res: Response) => {
  if (!req.userAuthenticated) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }
  const userId = (req.userAuthenticated as JwtPayload).id; // Adiciona a asserção de tipo

  // FAZER O CODIGO
})

export default router