import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'
import dbConnection from '../db/connection'
import { JwtPayload } from 'jsonwebtoken'; // Adicione esta linha
import { enviarEmail } from '../mail/emailConfig'
import multer from 'multer';

const router = Router()

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/'); // Certifique-se que esta pasta existe
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

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

router.put('/update', authMiddleware, upload.single('fotoAvatar'), async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const loginUserId = (req.userAuthenticated as JwtPayload).id;

    // Dados do formulário vêm em req.body
    const {
      nickname,
      pontos,
      vitorias,
      jogos,
      reflexos,
      defesa,
      forca,
      fisico,
      estrelas,
      estilo,
      posicao,
      cidadeEstado,
      numeroPreferido,
      bairro,
      geral
    } = req.body;

    // Caminho da imagem do avatar (se foi enviada)
    const fotoAvatar = req.file ? req.file.path : null;

    // Primeiro, buscar o idCliente da tabela login_usuario
    const userQuery = await dbConnection.query(
      'SELECT idCliente FROM login_usuario WHERE id = $1',
      [loginUserId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const clienteId = userQuery.rows[0].idcliente;

    // Atualizar informações do Cliente
    await dbConnection.query(
      `UPDATE Cliente 
       SET nickname = $1, fotoAvatar = $2
       WHERE id = $3`,
      [nickname, fotoAvatar, clienteId]
    );

    // Verifica se o perfil já existe
    const existingProfile = await dbConnection.query(
      'SELECT * FROM Estatisticas_do_Cliente WHERE idUsuario = $1',
      [clienteId]
    );

    if (existingProfile.rows.length === 0) {
      // Se não existir, insere
      await dbConnection.query(
        `INSERT INTO Estatisticas_do_Cliente 
        (idUsuario, pontos, vitorias, jogos, reflexos, defesa, forca, fisico, 
         estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [clienteId, pontos, vitorias, jogos, reflexos, defesa, forca, fisico,
         estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral]
      );
    } else {
      // Se existir, atualiza
      await dbConnection.query(
        `UPDATE Estatisticas_do_Cliente 
        SET pontos = $2, vitorias = $3, jogos = $4, reflexos = $5, defesa = $6,
            forca = $7, fisico = $8, estrelas = $9, estilo = $10, posicao = $11,
            cidadeEstado = $12, numeroPreferido = $13, bairro = $14, geral = $15
        WHERE idUsuario = $1`,
        [clienteId, pontos, vitorias, jogos, reflexos, defesa, forca, fisico,
         estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral]
      );
    }

    res.status(200).json({ 
      message: 'Perfil atualizado com sucesso',
      fotoAvatar: fotoAvatar 
    });
  } catch (error) {
    console.error('Erro ao atualizar o perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar o perfil' });
  }
});
 
router.delete('/delete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req.userAuthenticated as JwtPayload).id;
    const { requestDelete, codigo } = req.body;

    // Buscar o email do usuário
    const userQuery = await dbConnection.query(
      'SELECT email FROM Login_Usuario WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const userEmail = userQuery.rows[0].email;

    if (requestDelete === 1) {
      // Gerar código de verificação
      const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();

      // Atualizar o código de verificação no banco de dados
      await dbConnection.query(
        'UPDATE Login_Usuario SET codigoVerificacao = $1 WHERE id = $2',
        [codigoVerificacao, userId]
      );

      // Enviar o código por e-mail
      await enviarEmail(userEmail, 'Confirmação de Exclusão de Conta', `Seu código de verificação para excluir a conta é: ${codigoVerificacao}`);

      return res.status(200).json({ message: 'Código de verificação enviado para o email' });
    } else if (codigo) {
      // Verificar se o código fornecido está correto
      const codeQuery = await dbConnection.query(
        'SELECT codigoVerificacao FROM Login_Usuario WHERE id = $1',
        [userId]
      );

      if (codeQuery.rows[0].codigoVerificacao !== codigo) {
        return res.status(400).json({ message: 'Código de verificação incorreto' });
      }

      // Deletar a conta
      await dbConnection.query('DELETE FROM Login_Usuario WHERE id = $1', [userId]);
      await dbConnection.query('DELETE FROM Cliente WHERE id = $1', [userId]);
      await dbConnection.query('DELETE FROM Estatisticas_do_Cliente WHERE idUsuario = $1', [userId]);

      return res.status(200).json({ message: 'Conta deletada com sucesso' });
    } else {
      return res.status(400).json({ message: 'Requisição inválida' });
    }
  } catch (error) {
    console.error('Erro ao deletar a conta:', error);
    res.status(500).json({ message: 'Erro ao processar a exclusão da conta' });
  }
});

router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Buscar dados do perfil básico e estatísticas usando JOIN
    const profileQuery = await dbConnection.query(
      `SELECT 
        c.id, 
        c.email, 
        c.nickname, 
        c.nomeReal, 
        c.dataNasc, 
        c.amigos, 
        c.fotoAvatar,
        e.pontos,
        e.vitorias,
        e.jogos,
        e.reflexos,
        e.defesa,
        e.forca,
        e.fisico,
        e.estrelas,
        e.estilo,
        e.posicao,
        e.cidadeEstado,
        e.numeroPreferido,
        e.bairro,
        e.geral
      FROM Cliente c
      LEFT JOIN Estatisticas_do_Cliente e ON c.id = e.idUsuario
      WHERE c.id = $1`,
      [userId]
    );

    if (profileQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Perfil não encontrado' });
    }

    const userProfile = profileQuery.rows[0];

    return res.status(200).json({ profile: userProfile });
  } catch (error) {
    console.error('Erro ao buscar o perfil:', error);
    res.status(500).json({ message: 'Erro ao buscar o perfil' });
  }
});

router.get('/agendamentos', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = (req.userAuthenticated as JwtPayload).id;

    // Buscar o idCliente da tabela Login_Usuario
    const userQuery = await dbConnection.query(
      'SELECT idCliente FROM Login_Usuario WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const clienteId = userQuery.rows[0].idcliente;

    // Buscar os agendamentos do cliente
    const agendamentosQuery = await dbConnection.query(
      `SELECT a.id, a.idCampo, a.quantidadePessoas, a.idEmpresa, a.semana, a.horario, 
              c.nomeReal AS nomeUsuario, 
              ce.nomeCampo, ce.preco, 
              e.nome AS nomeEmpresa
       FROM Agendamento a
       JOIN Cliente c ON c.id = $1
       JOIN Campos_da_Empresa ce ON a.idCampo = ce.id
       JOIN Empresa_Info e ON ce.idEmpresa = e.id
       WHERE a.idCliente = $1`,
      [clienteId]
    );

    if (agendamentosQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum agendamento encontrado' });
    }

    // Retornar os agendamentos com as informações necessárias
    res.status(200).json({ agendamentos: agendamentosQuery.rows });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
});

export default router