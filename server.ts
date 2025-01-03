// Importações
import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import createTables from './db/createTables'
import cors from 'cors'
import './routes/resetAgendamento' // Importar o arquivo do cron

const app = express()

dotenv.config() // Utilizando o dotenv para carregar as variáveis de ambiente

const port = process.env.PORT || 3000 // Definindo a porta do servidor

app.use(express.json())
app.use(cors({ origin: '*' })) // Configurando o CORS para permitir qualquer origem

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// SERVIR IMAGENS
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Usar os roteadores
import startedRouter from './routes/started'
import authenticationRouter from './routes/authentication'
import accountManagementRouter from './routes/accountManagement'
import businessManagementRouter from './routes/businessManagement'
import fieldScheduleRouter from './routes/fieldSchedule'
import camposPage from './routes/camposPage'

app.use('/api/', startedRouter)
app.use('/api/autenticacao', authenticationRouter)
app.use('/api/accountManagement', accountManagementRouter)
app.use('/api/businessManagement', businessManagementRouter)
app.use('/api/schedule', fieldScheduleRouter)
app.use('/api/home', camposPage)

// Rotas para verificação
app.get('/rodando', (req: Request, res: Response): void => {
  res.send('O servidor está rodando!') // Rota para verificar se o servidor está rodando
})

// Inicializar o servidor
app.listen(port, (): void => {
  console.log(`Servidor iniciado com sucesso na porta ${port}`)
  createTables()
})
