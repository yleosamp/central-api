// Importações
import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import createTables from './db/createTables'
const app = express()

dotenv.config() // Utilizando o dotenv para carregar as variáveis de ambiente

const port = process.env.PORT || 3000 // Definindo a porta do servidor

app.use(express.json())

// Usar os roteadores
import startedRouter from './routes/started'
import authenticationRouter from './routes/authentication'
import accountManagementRouter from './routes/accountManagement'

app.use('/api/', startedRouter)
app.use('/api/autenticacao', authenticationRouter)
app.use('/api/accountManagement', accountManagementRouter)

// Rotas para verificação
app.get('/rodando', (req: Request, res: Response): void => {
  res.send('O servidor está rodando!') // Rota para verificar se o servidor está rodando
})

// Inicializar o servidor
app.listen(port, (): void => {
  console.log(`Servidor iniciado com sucesso na porta ${port}`)
  createTables()
})