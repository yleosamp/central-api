import { Router, Request, Response } from 'express'
import dbConnection from '../db/connection'
import { authMiddleware } from '../middlewares/verifyTokenInHeader'
import { JwtPayload } from 'jsonwebtoken';

const router = Router()

// Rota para agendar um campo

router.post('/agendar', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userAuthenticated) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const userId = (req.userAuthenticated as JwtPayload).id;

    // Continuar com a lógica de agendamento do campo

    const { idCampo, horario, quantidadePessoas, semana, idEmpresa } = req.body;

    // Convertendo horario para o formato JSONB
    const horarioJSONB = JSON.stringify(horario);

    // Buscar o campo para verificar se o horário está disponível
    const campoQuery = await dbConnection.query('SELECT horarios FROM Campos_da_Empresa WHERE id = $1', [idCampo]);

    if (campoQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Campo não encontrado' });
    }

    const campoHorarios = campoQuery.rows[0].horarios;

    // Assumindo que campoHorarios já é um objeto JSON
    const campoHorariosJSON = campoHorarios; 

    // Remover o horário agendado do campo
    Object.keys(horario).forEach(dia => {
      campoHorariosJSON[dia] = campoHorariosJSON[dia].filter((horarioExistente: any) => !horario[dia].includes(horarioExistente));
    });

    // Atualizar os horários do campo
    const updateCampoQuery = `UPDATE Campos_da_Empresa SET horarios = $1::JSONB WHERE id = $2`;
    await dbConnection.query(updateCampoQuery, [JSON.stringify(campoHorariosJSON), idCampo]);

    // Inserir o agendamento

    // Buscar o idCliente da tabela login_usuario
    const userQuery = await dbConnection.query(
      'SELECT idCliente FROM login_usuario WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const idCliente = userQuery.rows[0].idCliente;

    // Atualizar o insert usando o idCliente ao invés do userId
    const insertAgendamentoQuery = `INSERT INTO Agendamento (idCliente, idCampo, idEmpresa, horario, quantidadePessoas, semana) VALUES ($1, $2, $3, $4::JSONB, $5, $6) RETURNING *`;
    const insertedAgendamento = await dbConnection.query(insertAgendamentoQuery, 
      [idCliente, idCampo, idEmpresa, horarioJSONB, quantidadePessoas, semana]
    );

    if (insertedAgendamento.rows.length === 0) {
      return res.status(404).json({ message: 'Falha ao agendar campo' });
    }

    res.status(200).json({ message: 'Campo agendado com sucesso', agendamento: insertedAgendamento.rows[0] });

  } catch (error) {
    console.error('Erro ao agendar campo:', error);
    res.status(500).json({ message: 'Erro ao agendar campo' });
  }
})

export default router
