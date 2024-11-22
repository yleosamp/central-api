import { Router } from 'express'
import { Request, Response } from 'express';
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';
import { JwtPayload } from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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
    cb(null, 'uploads/campos/'); // Pasta onde os arquivos serão salvos
  },
  filename: (req: Request, file: any, cb: any) => {
    cb(null, file.originalname); // Nome do arquivo
  }
});

const upload = multer({ storage });

// Rota para adicionar um campo
router.post('/campo', authMiddleware, upload.single('bannerCampo'), async (req: Request, res: Response) => {
  try {
    console.log('Iniciando a rota /campo');

    if (!req.userAuthenticated) {
      console.error('Usuário não autenticado');
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;
    console.log(`ID do usuário autenticado: ${userId}`);

    // Buscar o idEmpresa do usuário logado
    const empresaQuery = await dbConnection.query(
      'SELECT idEmpresa FROM Login_Usuario WHERE id = $1',
      [userId]
    );

    if (!empresaQuery.rows[0]?.idempresa) {
      console.error('Empresa não encontrada para este usuário');
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const idEmpresa = empresaQuery.rows[0].idempresa;
    console.log(`ID da empresa: ${idEmpresa}`);

    // Desestruturar o corpo da requisição
    const {
      nomeCampo,
      preco,
      disponibilidade,
      horarios // Aqui, os horários ainda são uma string
    } = req.body;

    console.log('Dados recebidos:', { nomeCampo, preco, disponibilidade, horarios });

    // Converter a string de horários para um objeto
    let horariosObj;
    try {
      horariosObj = JSON.parse(horarios); // Converte a string para um objeto
    } catch (error) {
      console.error('Erro ao converter horários para objeto:', error);
      return res.status(400).json({ message: 'Formato de horários inválido' });
    }

    // Validar se os horários estão no formato correto
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const horarioValido = diasSemana.every(dia => 
      Array.isArray(horariosObj[dia]) && 
      horariosObj[dia].every((horario: string) => 
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(horario)
      )
    );

    if (!horarioValido) {
      console.error('Formato de horários inválido');
      return res.status(400).json({ 
        message: 'Formato de horários inválido' 
      });
    }

    // Inserir o campo com os horários como JSONB
    const query = `
      INSERT INTO Campos_da_Empresa 
      (idEmpresa, nomeCampo, bannerCampo, preco, disponibilidade, horarios)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await dbConnection.query(query, [
      idEmpresa,
      nomeCampo,
      '', // Inicialmente vazio, será atualizado depois
      preco,
      disponibilidade === 1, // Converte 1 para true
      horariosObj // Agora, estamos passando o objeto
    ]);

    const campoId = result.rows[0].id;
    console.log(`Campo inserido com ID: ${campoId}`);

    // Criar pasta para o campo
    const campoDir = `uploads/campos/${campoId}`;
    fs.mkdirSync(campoDir, { recursive: true }); // Cria a pasta se não existir
    console.log(`Pasta criada: ${campoDir}`);

    // Mover a imagem do banner para a nova pasta
    if (req.file) {
      console.log('Arquivo recebido:', req.file);
      const bannerPath = `${campoDir}/${req.file.filename}`;
      fs.renameSync(req.file.path, bannerPath); // Move o arquivo para a nova pasta
      console.log(`Arquivo movido para: ${bannerPath}`);

      // Atualizar o caminho da imagem no banco de dados
      await dbConnection.query(
        `UPDATE Campos_da_Empresa SET bannerCampo = $1 WHERE id = $2`,
        [bannerPath, campoId]
      );
    } else {
      console.error('Arquivo não enviado');
      return res.status(400).json({ message: 'Arquivo não enviado' });
    }

    res.status(201).json({
      message: 'Campo cadastrado com sucesso',
      campo: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao cadastrar campo:', error);
    res.status(500).json({ message: 'Erro ao cadastrar campo' });
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

    // Modificar a consulta para incluir o nome do cliente e o preço do campo
    const agendamentosQuery = await dbConnection.query(`
      SELECT a.id, a.idCampo, a.quantidadePessoas, a.idEmpresa, a.semana, a.horario, 
             c.nomeReal AS nomeCliente, 
             ce.preco AS precoCampo
      FROM Agendamento a
      JOIN Campos_da_Empresa ce ON a.idCampo = ce.id
      JOIN Cliente c ON a.idCliente = c.id
      WHERE a.idEmpresa = $1
    `, [idEmpresa]);

    if (agendamentosQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum agendamento encontrado para esta empresa' });
    }

    res.status(200).json({ 
      message: 'Agendamentos listados com sucesso', 
      agendamentos: agendamentosQuery.rows 
    });
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

router.get('/campos', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;

    // Puxar o id da empresa por meio do id de login
    const empresaQuery = await dbConnection.query('SELECT idEmpresa FROM Login_Usuario WHERE id = $1', [userId]);
    if (empresaQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Usuário não tem permissão para acessar os campos' });
    }
    const idEmpresa = empresaQuery.rows[0].idempresa;

    // console.log(`userId: ${userId}, idEmpresa: ${idEmpresa}`);

    // Puxar os campos da empresa por meio do id da empresa
    const camposQuery = await dbConnection.query('SELECT * FROM Campos_da_Empresa WHERE idEmpresa = $1', [idEmpresa]);
    res.json(camposQuery.rows);
  } catch (error) {
    console.error('Erro ao listar campos da empresa:', error);
    res.status(500).json({ message: 'Erro ao listar campos da empresa' });
  }
});



export default router