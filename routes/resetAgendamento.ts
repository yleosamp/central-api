import cron from 'node-cron';
import dbConnection from '../db/connection';

// Função que será executada todo domingo
const resetAgendamentos = async () => {
  try {
    // Obter a data atual e o número da semana
    const dataAtual = new Date();
    const numeroSemana = Math.ceil((dataAtual.getDate() + 6 - dataAtual.getDay()) / 7); // Cálculo do número da semana

    // Puxar todos os agendamentos da semana atual para todas as empresas
    const agendamentosQuery = await dbConnection.query(`
      SELECT idCampo, idEmpresa, SUM(preco) as totalPreco
      FROM Agendamento
      JOIN Campos_da_Empresa ON Agendamento.idCampo = Campos_da_Empresa.id
      WHERE data >= NOW() - INTERVAL '7 days'
      GROUP BY idCampo, idEmpresa
    `);

    // Criar um objeto JSONB para armazenar os totais
    const totalSemanal: { [key: string]: { [key: string]: number } } = {};
    agendamentosQuery.rows.forEach(row => {
      if (!totalSemanal[row.idEmpresa]) {
        totalSemanal[row.idEmpresa] = {};
      }
      totalSemanal[row.idEmpresa][row.idCampo] = parseFloat(row.totalPreco);
    });

    // Atualizar o totalSemanal na tabela Empresa_Info para cada empresa
    for (const idEmpresa in totalSemanal) {
      await dbConnection.query(`
        UPDATE Empresa_Info
        SET totalSemanal = $1
        WHERE id = $2
      `, [JSON.stringify({ [numeroSemana]: totalSemanal[idEmpresa] }), idEmpresa]);
    }

    // Resetar os horários na tabela Agendamento
    await dbConnection.query('DELETE FROM Agendamento WHERE data < NOW() - INTERVAL \'7 days\''); // Remove agendamentos antigos

    console.log('Agendamentos resetados e totais armazenados com sucesso.');
  } catch (error) {
    console.error('Erro ao resetar agendamentos:', error);
  }
};

// Agendar a tarefa para ser executada todo domingo às 23:59
cron.schedule('59 23 * * 0', resetAgendamentos);
