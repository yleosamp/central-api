import { Request, Response, Router } from 'express'
import dbConnection from '../db/connection'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()
const secretKey = process.env.JWT_SECRET // Certifique-se de definir JWT_SECRET no seu arquivo .env

// Rotas de autenticação - Registro

router.post('/registro', async (req: Request, res: Response) => {
  const { email, password, nivelUsuario, idCliente, idEmpresa, nickname, nomeReal, dataNasc } = req.body

  try {
    // Verificar se o usuário já existe
    const userCheck = await dbConnection.query('SELECT * FROM Login_Usuario WHERE email = $1', [email])
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Usuário já existe' })
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Gerar código de verificação
    const codigoVerificacao = Math.floor(100000 + Math.random() * 900000)

    // Inserir novo usuário no banco de dados

    if (nivelUsuario == 1) {
      const clienteQuery = await dbConnection.query(
        `INSERT INTO Cliente (email, password, nickname, nomeReal, dataNasc) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, hashedPassword, nickname, nomeReal, dataNasc]
      ) // Cliente
      clienteQuery

      await dbConnection.query(
        `INSERT INTO Login_Usuario (email, password, codigoVerificacao, nivelUsuario, idCliente) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, hashedPassword, codigoVerificacao, nivelUsuario, clienteQuery.rows[0].id]
      ) // Login_Usuario
      
    } else if(nivelUsuario == 2) {
      await dbConnection.query(
        `INSERT INTO Login_Usuario (email, password, codigoVerificacao, nivelUsuario, idEmpresa) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, hashedPassword, codigoVerificacao, nivelUsuario, idEmpresa] // Registro empresa
      )
    }

    // Obter o ID de login
    const loginId = await dbConnection.query('SELECT id FROM Login_Usuario WHERE email = $1', [email]);
    const userId = loginId.rows[0].id

    // Obter o ID do cliente recém-criado
    const clientQuery = await dbConnection.query('SELECT id FROM Cliente WHERE email = $1', [email]);
    const clientId = clientQuery.rows[0].id;

    // Gerar token JWT
    if (!secretKey) {
      throw new Error('JWT_SECRET não está definido')
    }
    const token = jwt.sign({ id: userId }, secretKey, { expiresIn: '1h' })

    // Atualizar o token na tabela Login_Usuario
    await dbConnection.query(
      'UPDATE Login_Usuario SET token = $1 WHERE id = $2',
      [token, userId]
    )
    
    res.status(201).json({ token, codigoVerificacao, idCliente: clientId })
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    res.status(500).json({ message: 'Erro ao registrar usuário' })
  }
})


// Rota de login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, codigoVerificacao } = req.body;

    // Verificar se o usuário existe
    const userQuery = await dbConnection.query(
      'SELECT * FROM Login_Usuario WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado', page: 1 });
    }

    const user = userQuery.rows[0];

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }

    // Verificar o código de verificação
    if (codigoVerificacao !== user.codigoverificacao) {
      return res.status(401).json({ message: 'Código de verificação incorreto', codigoVerificacao: user.codigoverificacao })
    }

    // Gerar novo token JWT
    if (!secretKey) {
      throw new Error('JWT_SECRET não está definido');
    }
    const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });

    // Atualizar o token na tabela Login_Usuario
    await dbConnection.query(
      'UPDATE Login_Usuario SET token = $1 WHERE id = $2',
      [token, user.id]
    );

    res.status(200).json({ token });

    // Adicionar o token ao cabeçalho da resposta
    res.setHeader('Authorization', `Bearer ${token}`);

    // Enviar a resposta com o token no corpo também
    res.status(200).json({ token });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});



// Exportar o router

export default router