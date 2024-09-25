import { Router } from 'express'
import { Request, Response } from 'express';
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';
import { JwtPayload } from 'jsonwebtoken';
import multer from 'multer';

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

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req: Request, file: any, cb: any) => {
    cb(null, 'uploads/'); // Pasta onde os arquivos serão salvos
  },
  filename: (req: Request, file: any, cb: any) => {
    cb(null, file.originalname); // Nome do arquivo
  }
});

const upload = multer({ storage });

// Rota para adicionar um campo
router.post('/campo', authMiddleware, upload.single('bannerCampo'), async (req, res) => {
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
      preco,
      disponibilidade,
      horarios
    } = req.body;

    // Convertendo horarios para o formato JSONB
    const horariosJSONB = JSON.stringify(horarios);

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo não enviado' });
    }

    const bannerCampo = req.file.path; // Caminho do arquivo salvo

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

// Rota para listar os agendamentos da empresa
router.get('/agendamentos', authMiddleware, async (req, res) => {
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

    const agendamentosQuery = await dbConnection.query('SELECT * FROM Agendamento WHERE idEmpresa = $1', [idEmpresa]);

    if (agendamentosQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum agendamento encontrado para esta empresa' });
    }

    res.status(200).json({ message: 'Agendamentos listados com sucesso', agendamentos: agendamentosQuery.rows });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
});

// Rota para deletar um campo
router.delete('/delete-campo/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;
    const campoId = req.params.id;

    // Verificar se o campo existe e pertence ao usuário autenticado
    const campoQuery = await dbConnection.query('SELECT id, idempresa FROM Campos_da_Empresa WHERE id = $1', [campoId]);
    if (campoQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Campo não encontrado' });
    }

    const campo = campoQuery.rows[0];
    // Verificar o id da empresa por meio do campo "idempresa" na tabela de login
    const empresaQuery = await dbConnection.query('SELECT idempresa FROM Login_Usuario WHERE id = $1', [userId]);
    if (empresaQuery.rows.length === 0 || empresaQuery.rows[0].idempresa !== campo.idempresa) {
      return res.status(403).json({ message: 'Usuário não tem permissão para deletar este campo' });
    }

    // Deletar o campo
    const deleteQuery = 'DELETE FROM Campos_da_Empresa WHERE id = $1';
    await dbConnection.query(deleteQuery, [campoId]);

    res.status(200).json({ message: 'Campo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar campo:', error);
    res.status(500).json({ message: 'Erro ao deletar campo' });
  }
});

router.delete('/delete-agendamento/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;
    const agendamentoId = req.params.id;

    // Verificar se o agendamento existe e pertence ao usuário autenticado
    const agendamentoQuery = await dbConnection.query('SELECT id, idCampo, horario FROM Agendamento WHERE id = $1', [agendamentoId]);
    if (agendamentoQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    const agendamento = agendamentoQuery.rows[0];

    // Verificar o id da empresa por meio do campo "idempresa" na tabela de login
    const empresaQuery = await dbConnection.query('SELECT idempresa FROM Login_Usuario WHERE id = $1', [userId]);
    if (empresaQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Usuário não tem permissão para deletar este agendamento' });
    }

    // Deletar o agendamento
    const deleteQuery = 'DELETE FROM Agendamento WHERE id = $1';
    await dbConnection.query(deleteQuery, [agendamentoId]);

    // Voltar o horário agendado para a tabela de campos_da_empresa
    const campoQuery = await dbConnection.query('SELECT horarios FROM Campos_da_Empresa WHERE id = $1', [agendamento.idCampo]);


    const campo = campoQuery.rows[0];
    const horarios = campo.horarios;
    const diaSemana = Object.keys(agendamento.horario)[0];
    const horarioAgendado = agendamento.horario[diaSemana][0];

    // Remover o horário agendado dos horários do campo
    horarios[diaSemana] = horarios[diaSemana].filter((horario: string) => horario !== horarioAgendado); // Especificar o tipo do parâmetro

    // Atualizar os horários do campo
    const updateQuery = 'UPDATE Campos_da_Empresa SET horarios = $1 WHERE id = $2';
    await dbConnection.query(updateQuery, [horarios, agendamento.idCampo]);

    res.status(200).json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ message: 'Erro ao deletar agendamento' });
  }
});

export default router