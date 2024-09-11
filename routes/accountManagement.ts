import { Router } from 'express'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'
import dbConnection from '../db/connection'
import { JwtPayload } from 'jsonwebtoken'; // Adicione esta linha

const router = Router()

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const userId = (req.userAuthenticated as JwtPayload).id; // Adiciona a asserção de tipo
    const user = await dbConnection.query('SELECT * FROM Login_Usuario WHERE id = $1', [userId]);
    res.json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar o perfil' });
  }
});

export default router