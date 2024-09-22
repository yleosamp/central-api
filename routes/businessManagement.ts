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

router.post('/campo', authMiddleware, async (req, res) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;
    const userQuery = await dbConnection.query('SELECT * FROM Login_Usuario WHERE id = $1', [userId]);

    if (userQuery.rows.length === 0 || !userQuery.rows[0].idempresa) {
      return res.status(404).json({ message: 'Empresa não encontrada para este usuário' });
    }

    const idEmpresa = userQuery.rows[0].idempresa;

    const {
      nomeCampo,
      bannerCampo,
      preco,
      disponibilidade,
      horarios
    } = req.body;

    // Convertendo horarios para o formato JSONB
    const horariosJSONB = JSON.stringify(horarios);

    const insertQuery = `
      INSERT INTO Campos_da_Empresa (idEmpresa, nomeCampo, bannerCampo, preco, disponibilidade, horarios)
      VALUES ($1, $2, $3, $4, $5, $6::JSONB)
      RETURNING *
    `;

    const insertedCampo = await dbConnection.query(insertQuery, [
      idEmpresa, nomeCampo, bannerCampo, preco, disponibilidade, horariosJSONB
    ]);

    if (insertedCampo.rows.length === 0) {
      return res.status(404).json({ message: 'Falha ao adicionar campo' });
    }

    res.status(200).json({ message: 'Campo adicionado com sucesso', campo: insertedCampo.rows[0] });
  } catch (error) {
    console.error('Erro ao adicionar campo:', error);
    res.status(500).json({ message: 'Erro ao adicionar campo' });
  }
});

export default router