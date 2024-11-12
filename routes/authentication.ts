import { Request, Response, Router } from 'express'
import dbConnection from '../db/connection'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { enviarEmail } from '../mail/emailConfig'
import multer, { diskStorage, FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'

dotenv.config()

const router = Router()
const secretKey = process.env.JWT_SECRET // Certifique-se de definir JWT_SECRET no seu arquivo .env

// Configuração do multer
const storage = diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Verifica se o arquivo é o avatar ou banner e define o caminho correspondente
    if (file.fieldname === 'imagemAvatar') {
      cb(null, 'uploads/usuario/'); // Pasta para salvar o avatar temporariamente
    } else {
      cb(null, 'uploads/'); // Pasta para salvar o banner temporariamente
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: any, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nome do arquivo com timestamp
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.jpg' && ext !== '.png') {
      return cb(new Error('Apenas arquivos JPG e PNG são permitidos.'));
    }
    cb(null, true);
  }
});

// Rotas de autenticação - Registro
router.post('/registro', upload.fields([{ name: 'imagemBanner' }, { name: 'imagemAvatar' }]), async (req: Request, res: Response) => {
  const { email, password, nivelUsuario, nickname, nomeReal, dataNasc, nome, endereco, cidade, enderecoMaps, precoMedio, totalSemanal, horarioFuncionamento, abertoFechado, nivelEmpresa, CNPJ } = req.body;

  // Verificar se req.files está definido
  const imagemBanner = req.files && req.files['imagemBanner'] ? (req.files['imagemBanner'] as Express.Multer.File[])[0] : null;
  const imagemAvatar = req.files && req.files['imagemAvatar'] ? (req.files['imagemAvatar'] as Express.Multer.File[])[0] : null;

  try {
    // Verificar se o usuário já existe
    const userCheck = await dbConnection.query('SELECT * FROM Login_Usuario WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gerar código de verificação
    const codigoVerificacao = Math.floor(100000 + Math.random() * 900000);

    // Inserir novo usuário no banco de dados
    if (nivelUsuario == 1) {
      const clienteQuery = await dbConnection.query(
        `INSERT INTO Cliente (email, password, nickname, nomeReal, dataNasc) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, hashedPassword, nickname, nomeReal, dataNasc]
      );

      const clienteId = clienteQuery.rows[0].id;

      // Criar pasta para o avatar do cliente
      const clienteDir = `uploads/usuario/${clienteId}`;
      fs.mkdirSync(clienteDir, { recursive: true }); // Cria a pasta se não existir

      // Mover a imagem do avatar para a nova pasta
      if (imagemAvatar) {
        const avatarPath = `${clienteDir}/${imagemAvatar.filename}`;
        fs.renameSync(imagemAvatar.path, avatarPath); // Move o arquivo para a nova pasta
        await dbConnection.query(
          `UPDATE Cliente SET fotoAvatar = $1 WHERE id = $2`,
          [avatarPath, clienteId]
        );
      }

      await dbConnection.query(
        `INSERT INTO Login_Usuario (email, password, codigoVerificacao, nivelUsuario, idCliente) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, hashedPassword, codigoVerificacao, nivelUsuario, clienteId]
      );

    } else if (nivelUsuario == 2) {
      const empresaQuery = await dbConnection.query(
        `INSERT INTO Empresa_Info (nome, endereco, cidade, enderecoMaps, precoMedio, totalSemanal, horarioFuncionamento, abertoFechado, nivelEmpresa, CNPJ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [nome, endereco, cidade, enderecoMaps, precoMedio, totalSemanal, horarioFuncionamento, abertoFechado, nivelEmpresa, CNPJ]
      );

      const empresaId = empresaQuery.rows[0].id;

      // Criar pasta para o banner da empresa
      const empresaDir = `uploads/empresas/${empresaId}`;
      fs.mkdirSync(empresaDir, { recursive: true }); // Cria a pasta se não existir

      // Mover a imagem do banner para a nova pasta
      if (imagemBanner) {
        const bannerPath = `${empresaDir}/${imagemBanner.filename}`;
        fs.renameSync(imagemBanner.path, bannerPath); // Move o arquivo para a nova pasta
        await dbConnection.query(
          `UPDATE Empresa_Info SET imagembanner = $1 WHERE id = $2`,
          [bannerPath, empresaId]
        );
      }

      await dbConnection.query(
        `INSERT INTO Login_Usuario (email, password, codigoVerificacao, nivelUsuario, idEmpresa) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, hashedPassword, codigoVerificacao, nivelUsuario, empresaId]
      );
    }

    // Obter o ID de login
    const loginId = await dbConnection.query('SELECT id FROM Login_Usuario WHERE email = $1', [email]);
    const userId = loginId.rows[0].id;

    // Gerar token JWT
    if (!secretKey) {
      throw new Error('JWT_SECRET não está definido');
    }
    const token = jwt.sign({ id: userId }, secretKey);

    // Atualizar o token na tabela Login_Usuario
    await dbConnection.query(
      'UPDATE Login_Usuario SET token = $1 WHERE id = $2',
      [token, userId]
    );

    res.status(201).json({ token, codigoVerificacao });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
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
      const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
      await dbConnection.query(
        'UPDATE Login_Usuario SET codigoverificacao = $1 WHERE id = $2',
        [novoCodigo, user.id]
      );
      // Enviar o novo código de verificação para o email do usuário
        const corpoHtml = `
        <html>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
            <style>
              .container {
                font-family: "Montserrat", sans-serif;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                max-width: 600px;
                margin: auto;
              }
              .header {
                background-color: #4ECB71;
                color: #1D4A2A;
                padding: 10px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
              }
              .content {
                margin: 20px 0;
                text-align: center;
              }
              .code {
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0 auto;
                width: fit-content;
                gap: 20px;
              }
              .code div {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 4px;
                font-size: 24px;
                font-weight: bold;
                margin: 5px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Central da Resenha</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${email}</strong>, este é o seu código de autenticação:</p>
                <div class="code">
                  ${novoCodigo.split('').map(num => `<div>${num}</div>`).join('')}
                </div>
              </div>
              <div class="footer">
                <p>Para mais informações entre em contato com: suporte@centraldaresenha.com.br</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await enviarEmail(email, 'Recuperação de conta', corpoHtml)

      return res.status(401).json({ message: 'Código de verificação incorreto', codigoVerificacao: user.codigoverificacao });
    }

    // Gerar novo token JWT
    if (!secretKey) {
      throw new Error('JWT_SECRET não está definido');
    }
    const token = jwt.sign({ id: user.id }, secretKey); // Removida a opção expiresIn

    // Atualizar o token na tabela Login_Usuario
    await dbConnection.query(
      'UPDATE Login_Usuario SET token = $1 WHERE id = $2',
      [token, user.id]
    );

    // Adicionar o token ao cabeçalho da resposta
    res.setHeader('Authorization', `Bearer ${token}`);

    // Enviar a resposta com o token no corpo
    return res.status(200).json({ token });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
})

// Rota para recuperação de conta
router.post('/recovery', async (req: Request, res: Response) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    // Verificar se o usuário existe
    const userQuery = await dbConnection.query(
      'SELECT * FROM Login_Usuario WHERE email = $1',
      [email]
    )

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    const user = userQuery.rows[0];

    if (codigo === null) {
      // Gerar novo código de verificação
      const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString()

      // Atualizar o código de verificação no banco de dados
      await dbConnection.query(
        'UPDATE Login_Usuario SET codigoverificacao = $1 WHERE id = $2',
        [novoCodigo, user.id]
      );

      // Enviar o novo código por e-mail
      const corpoHtml = `
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
          <style>
            .container {
              font-family: "Montserrat", sans-serif;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              max-width: 600px;
              margin: auto;
            }
            .header {
              background-color: #4ECB71;
              color: #1D4A2A;
              padding: 10px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
            }
            .content {
              margin: 20px 0;
              text-align: center;
            }
            .code {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0 auto;
              width: fit-content;
              gap: 20px;
            }
            .code div {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 4px;
              font-size: 24px;
              font-weight: bold;
              margin: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #888;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Central da Resenha</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${email}</strong>, este é o seu código de autenticação:</p>
              <div class="code">
                ${novoCodigo.split('').map(num => `<div>${num}</div>`).join('')}
              </div>
            </div>
            <div class="footer">
              <p>Para mais informações entre em contato com: suporte@centraldaresenha.com.br</p>
            </div>
          </div>
        </body>
      </html>
    `;

      await enviarEmail(email, 'Recuperação de conta', corpoHtml)

      res.status(200).json({ message: 'Novo código de verificação gerado e enviado' })
    } else {
      // Verificar se o código fornecido está correto
      if (codigo !== user.codigoverificacao) {
        return res.status(400).json({ message: 'Código de verificação incorreto' })
      }

      if (!novaSenha) {
        return res.status(400).json({ message: 'Nova senha não fornecida' })
      }

      // Criptografar a nova senha
      const hashedPassword = await bcrypt.hash(novaSenha, 10)

      // Atualizar a senha no banco de dados
      await dbConnection.query(
        'UPDATE Login_Usuario SET password = $1, codigoverificacao = NULL WHERE id = $2',
        [hashedPassword, user.id]
      );

      res.status(200).json({ message: 'Senha atualizada com sucesso' })
    }
  } catch (error) {
    console.error('Erro ao recuperar conta:', error);
    res.status(500).json({ message: 'Erro ao processar a recuperação de conta' })
  }
})

// Exportar o router

export default router