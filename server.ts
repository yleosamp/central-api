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
app.use(cors()) // Configurando o CORS

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