-- 1. Adiciona uma nova coluna temporária
ALTER TABLE Agendamento ADD COLUMN horario_temp JSONB;

-- 2. Atualiza a nova coluna com a conversão dos dados
UPDATE Agendamento SET horario_temp = to_jsonb(horario);

-- 3. Remove a coluna original
ALTER TABLE Agendamento DROP COLUMN horario;

-- 4. Renomeia a nova coluna para o nome original
ALTER TABLE Agendamento RENAME COLUMN horario_temp TO horario;

-- ADICIONAR COLUNA DE idEmpresa NO AGENDAMENTO
ALTER TABLE Agendamento
ADD COLUMN idEmpresa INTEGER REFERENCES Empresa_Info(id);

-- ADICIONAR COLUNA DE TIPO DE CAMPO NO CAMPO DA EMPRESA
ALTER TABLE Campos_da_Empresa ADD COLUMN tipoCampo VARCHAR(50);

-- ALTERAR O TIPO DA COLUNA CNPJ PARA VARCHAR(30)
ALTER TABLE Empresa_Info
ALTER COLUMN CNPJ TYPE VARCHAR(30);

-- Adicionar a coluna PAGO com valor padrão false
ALTER TABLE Agendamento
ADD COLUMN pago BOOLEAN DEFAULT false;