import { Router } from 'express'
import { Request, Response } from 'express';
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';
import { JwtPayload } from 'jsonwebtoken';

const router = Router()

// Fazer o gerenciamento da empresa, as informações e criar um campo
// TESTAR A ROTA

// Rota para adicionar informações da empresa
// Rota para atualizar informações da empresa
router.put('/update-empresa', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const userId = (req.userAuthenticated as JwtPayload).id;

    // Buscar o idEmpresa associado ao usuário logado
    const userQuery = await dbConnection.query(
      'SELECT idEmpresa FROM Login_Usuario WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].idempresa) {
      return res.status(404).json({ message: 'Empresa não encontrada para este usuário' });
    }

    const idEmpresa = userQuery.rows[0].idempresa;

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

    // Atualizar as informações da empresa
    const updateQuery = `
      UPDATE Empresa_Info
      SET nome = $1, endereco = $2, cidade = $3, enderecoMaps = $4,
          precoMedio = $5, totalSemanal = $6, imagemBanner = $7,
          imagemAvatar = $8, horarioFuncionamento = $9, abertoFechado = $10,
          nivelEmpresa = $11, CNPJ = $12
      WHERE id = $13
      RETURNING *
    `;

    const updatedEmpresa = await dbConnection.query(updateQuery, [
      nome, endereco, cidade, enderecoMaps, precoMedio, totalSemanal,
      imagemBanner, imagemAvatar, horarioFuncionamento, abertoFechado,
      nivelEmpresa, CNPJ, idEmpresa
    ]);

    if (updatedEmpresa.rows.length === 0) {
      return res.status(404).json({ message: 'Falha ao atualizar informações da empresa' });
    }

    res.status(200).json({ message: 'Informações da empresa atualizadas com sucesso', empresa: updatedEmpresa.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar informações da empresa:', error);
    res.status(500).json({ message: 'Erro ao atualizar informações da empresa' });
  }
});


export default router