import dbConnection from './connection'

const createTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS Empresa_Info (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        cidade VARCHAR(100),
        enderecoMaps TEXT,
        precoMedio FLOAT,
        totalSemanal FLOAT,
        imagemBanner TEXT,
        imagemAvatar TEXT,
        horarioFuncionamento TEXT,
        abertoFechado BOOLEAN,
        nivelEmpresa INTEGER,
        CNPJ VARCHAR(14) UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Cliente (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        nomeReal VARCHAR(100),
        dataNasc DATE,
        amigos INTEGER[],
        fotoAvatar TEXT
    );

    CREATE TABLE IF NOT EXISTS Login_Usuario (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        codigoVerificacao INTEGER,
        token TEXT,
        nivelUsuario TEXT,
        idCliente INTEGER REFERENCES Cliente(id),
        idEmpresa INTEGER REFERENCES Empresa_Info(id)
    );

    CREATE TABLE IF NOT EXISTS Recuperar_Conta (
        id SERIAL PRIMARY KEY,
        idUsuario INTEGER REFERENCES Login_Usuario(id),
        codigoRecuperacao INTEGER,
        newPassword VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Campos_da_Empresa (
        id SERIAL PRIMARY KEY,
        idEmpresa INTEGER REFERENCES Empresa_Info(id),
        nomeCampo VARCHAR(255) NOT NULL,
        bannerCampo TEXT,
        preco FLOAT,
        disponibilidade BOOLEAN,
        horarios JSONB
    );

    CREATE TABLE IF NOT EXISTS Agendamento (
        id SERIAL PRIMARY KEY,
        idCliente INTEGER REFERENCES Cliente(id),
        idCampo INTEGER REFERENCES Campos_da_Empresa(id),
        horario TEXT[],
        quantidadePessoas INTEGER,
        semana TEXT
    );

    CREATE TABLE IF NOT EXISTS Estatisticas_do_Cliente (
        id SERIAL PRIMARY KEY,
        idUsuario INTEGER REFERENCES Cliente(id),
        pontos INTEGER,
        vitorias INTEGER,
        jogos INTEGER,
        reflexos INTEGER,
        defesa INTEGER,
        forca INTEGER,
        fisico INTEGER,
        estrelas INTEGER,
        estilo TEXT,
        posicao TEXT,
        cidadeEstado TEXT,
        numeroPreferido INTEGER,
        bairro TEXT,
        geral INTEGER
    );

    CREATE TABLE IF NOT EXISTS Relatorio_de_Agendamentos (
        id SERIAL PRIMARY KEY,
        campoAgendado INTEGER,
        preco INTEGER,
        diaDaSemana VARCHAR(20),
        data TIMESTAMP,
        cliente INTEGER REFERENCES Cliente(id),
        idEmpresa INTEGER REFERENCES Empresa_Info(id)
    );
  `

  const execQuery = await dbConnection.query(query)
  if(execQuery.rowCount !== null && execQuery.rowCount > 0){
    console.log('Tabelas criadas com sucesso!')
  } else {
    console.log('Todas as tabelas já existem!')
  }
}

export default createTables
