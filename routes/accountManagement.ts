import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'
import dbConnection from '../db/connection'
import { JwtPayload } from 'jsonwebtoken'; // Adicione esta linha
import { enviarEmail } from '../mail/emailConfig'
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

router.put('/update', authMiddleware, async (req, res) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const loginUserId = (req.userAuthenticated as JwtPayload).id;

    // Desestruturação das variáveis do req.body
    const {
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

    // Primeiro, buscar o idCliente da tabela login_usuario
    const userQuery = await dbConnection.query(
      'SELECT idCliente FROM login_usuario WHERE id = $1',
      [loginUserId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Este é o id da tabela Cliente que será usado como foreign key
    const clienteId = userQuery.rows[0].idcliente;

    // Verifica se o perfil já existe usando o id do Cliente
    const existingProfile = await dbConnection.query(
      'SELECT * FROM Estatisticas_do_Cliente WHERE idUsuario = $1',
      [clienteId]
    );

    if (existingProfile.rows.length === 0) {
      // Se não existir, insere um novo perfil usando o id do Cliente
      await dbConnection.query(
        `INSERT INTO Estatisticas_do_Cliente 
        (idUsuario, pontos, vitorias, jogos, reflexos, defesa, forca, fisico, estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [clienteId, pontos, vitorias, jogos, reflexos, defesa, forca, fisico, estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral]
      );
    } else {
      // Se existir, atualiza o perfil
      await dbConnection.query(
        `UPDATE Estatisticas_do_Cliente 
        SET pontos = $2, vitorias = $3, jogos = $4, reflexos = $5, defesa = $6, forca = $7, fisico = $8, estrelas = $9, estilo = $10, posicao = $11, cidadeEstado = $12, numeroPreferido = $13, bairro = $14, geral = $15
        WHERE idUsuario = $1`,
        [clienteId, pontos, vitorias, jogos, reflexos, defesa, forca, fisico, estrelas, estilo, posicao, cidadeEstado, numeroPreferido, bairro, geral]
      );
    }

    res.status(200).json({ message: 'Perfil atualizado com sucesso' });
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


export default router