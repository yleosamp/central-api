import { Router, Request, Response } from 'express'

const router = Router();

// Defina suas rotas aqui
router.get('/home', (req: Request, res: Response): void => {
  res.send('A API foi iniciada e o Router está funcionando com sucesso!')
});

export default router