import { Router } from "express"
import { Response, Request} from "express"
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';
import { JwtPayload } from 'jsonwebtoken';

const router = Router()

router.get('/empresas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, imagemBanner, nome, endereco
      FROM Empresa_Info
    `;
    const empresas = await dbConnection.query(query);
    res.json(empresas.rows);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ message: 'Erro ao listar empresas' });
  }
});

router.get('/campos/:idEmpresa', async (req: Request, res: Response) => {
  try {
    const idEmpresa = req.params.idEmpresa;
    const query = `
      SELECT id, nomeCampo, bannerCampo, preco, horarios
      FROM Campos_da_Empresa
      WHERE idEmpresa = $1
    `;
    const campos = await dbConnection.query(query, [idEmpresa]);
    res.json(campos.rows);
  } catch (error) {
    console.error('Erro ao listar campos da empresa:', error);
    res.status(500).json({ message: 'Erro ao listar campos da empresa' });
  }
});

export default router