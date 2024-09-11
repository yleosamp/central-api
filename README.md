# Configuração do Ambiente

Para configurar o ambiente de desenvolvimento, você precisará criar um arquivo `.env` na raiz do projeto com as seguintes configurações:

```plaintext
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nome_do_banco_de_dados
DB_USER=usuario_do_banco
DB_PASSWORD=senha_do_banco

# Configurações do Servidor
PORT=3000

# Chave Secreta para JWT
JWT_SECRET=sua_chave_secreta

# Outras Configurações
NODE_ENV=development

# Configurações de Email
EMAIL_HOST=smtp.seuprovedor.com
EMAIL_PORT=587
EMAIL_USER=seu_email@dominio.com
EMAIL_PASSWORD=sua_senha_de_email
EMAIL_FROM=seu_email@dominio.com
```

### Explicação das Configurações

1. **Configurações do Banco de Dados**:
   - `DB_HOST`: O endereço do servidor do banco de dados (geralmente `localhost` para desenvolvimento local).
   - `DB_PORT`: A porta em que o banco de dados está escutando (5432 é a porta padrão para PostgreSQL).
   - `DB_NAME`: O nome do banco de dados que você está usando.
   - `DB_USER`: O nome de usuário para acessar o banco de dados.
   - `DB_PASSWORD`: A senha para acessar o banco de dados.

2. **Configurações do Servidor**:
   - `PORT`: A porta em que o servidor da aplicação irá escutar (3000 é uma escolha comum para desenvolvimento).

3. **Chave Secreta para JWT**:
   - `JWT_SECRET`: Uma chave secreta usada para assinar e verificar tokens JWT. Deve ser uma string segura e secreta.

4. **Outras Configurações**:
   - `NODE_ENV`: O ambiente de execução da aplicação (`development`, `production`, etc.).

5. **Configurações de Email**:
   - `EMAIL_HOST`: O servidor SMTP do seu provedor de email.
   - `EMAIL_PORT`: A porta do servidor SMTP (587 é comum para SMTP com STARTTLS).
   - `EMAIL_USER`: O endereço de email usado para enviar emails.
   - `EMAIL_PASSWORD`: A senha do endereço de email.
   - `EMAIL_FROM`: O endereço de email que aparecerá como remetente nos emails enviados.

### Exemplo de Arquivo `.env`
