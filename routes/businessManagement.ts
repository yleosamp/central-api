import { Router } from 'express'
import { Request, Response } from 'express';
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';

const router = Router()

// Fazer o gerenciamento da empresa, as informações e criar um campo
// TESTAR A ROTA

// Rota para adicionar informações da empresa
router.post('/informacoes', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const {
      nome,
      endereco,
      cidade,
      enderecoMaps,
      precoMedio,
      totalSemanal,
      imagemBanner,
      imagemAvatar,
      horarioFuncionamento,
      abertoFechado,
      nivelEmpresa,
      CNPJ
    } = req.body;

    const query = `
      INSERT INTO Empresa_Info (
        nome, endereco, cidade, enderecoMaps, precoMedio, totalSemanal,
        imagemBanner, imagemAvatar, horarioFuncionamento, abertoFechado,
        nivelEmpresa, CNPJ
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const values = [
      nome,
      endereco,
      cidade,
      enderecoMaps,
      precoMedio,
      totalSemanal,
      imagemBanner,
      imagemAvatar,
      horarioFuncionamento,
      abertoFechado,
      nivelEmpresa,
      CNPJ
    ];

    const result = await dbConnection.query(query, values);

    if (result.rows.length > 0) {
      res.status(201).json({ message: 'Empresa adicionada com sucesso', id: result.rows[0].id });
    } else {
      res.status(400).json({ message: 'Falha ao adicionar empresa' });
    }
  } catch (error) {
    console.error('Erro ao adicionar empresa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router