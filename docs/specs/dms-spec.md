# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, listem e baixem documentos armazenados no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Envio de documentos via `multipart/form-data`.
- Listagem dos documentos associados ao identificador de usuário informado pelo cliente.
- Download de um documento pelo identificador, validando a correspondência com o usuário informado.
- Armazenamento de arquivos em `backend/storage` com Multer `diskStorage`.
- Armazenamento dos metadados em memória nesta fase.
- Interface web em React para as operações previstas e comunicação com a API via prefixo `/api`.

### Fora do escopo

- Armazenamento em banco de dados, provedores externos ou serviços de nuvem.
- Autenticação, autorização confiável ou identidade verificada. O identificador enviado pelo cliente não é prova de identidade nem uma fronteira de segurança.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Garantia de recuperação dos metadados após reinício do processo.
- Restrição de formatos de arquivo nesta fase.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo e deve informar um identificador não vazio no campo `owner`. |
| RF-02 | O sistema deve aceitar qualquer formato de arquivo, respeitando o limite de tamanho configurado. |
| RF-03 | Em um envio válido, o sistema deve gravar o arquivo em `backend/storage` com nome interno gerado pela aplicação e registrar seus metadados em memória. |
| RF-04 | O sistema deve retornar os metadados do documento criado, sem expor o caminho ou nome interno de armazenamento. |
| RF-05 | O usuário pode listar documentos informando `owner`; a resposta deve conter apenas documentos cujo `owner` corresponda exatamente ao valor informado. |
| RF-06 | O usuário pode baixar um documento informando seu identificador no caminho e `owner` na query string. O sistema deve verificar a correspondência antes de enviar o arquivo. |
| RF-07 | Se o documento não existir nos metadados ou não corresponder ao `owner` informado, o sistema deve responder como não encontrado, sem revelar se o identificador pertence a outro usuário. |
| RF-08 | O sistema deve responder com erro legível quando faltarem campos obrigatórios, o arquivo exceder o limite ou ocorrer falha de leitura/escrita. |
| RF-09 | Depois de reiniciar o processo, documentos sem metadados em memória não devem aparecer na listagem nem ser baixáveis pela API. A limpeza de arquivos órfãos não faz parte desta versão. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend deve usar Node.js e Express em CommonJS; o frontend deve usar React e Vite em ESM. |
| RNF-02 | Os arquivos devem ser armazenados somente no filesystem local, em `backend/storage`, usando Multer com `diskStorage`. |
| RNF-03 | Os metadados devem ser mantidos em memória; não deve ser introduzido banco de dados ou armazenamento remoto nesta fase. |
| RNF-04 | As configurações operacionais devem ser obtidas de variáveis de ambiente. `PORT` define a porta do backend; `UPLOAD_MAX_BYTES` define o tamanho máximo do arquivo. O padrão proposto para `UPLOAD_MAX_BYTES` é `10485760` (10 MiB). |
| RNF-05 | O nome usado no filesystem deve ser gerado pela aplicação e não derivado diretamente do nome enviado pelo usuário. O nome original deve ser preservado apenas como metadado para exibição e download. |
| RNF-06 | A API deve usar respostas JSON para metadados e erros; respostas de download devem ser binárias e incluir cabeçalhos apropriados para download. |
| RNF-07 | O backend deve manter a separação `routes → controllers → services → repositories`; regras de negócio ficam em `services` e acesso ao filesystem/metadados fica em `repositories`. |
| RNF-08 | O identificador `owner` fornecido pelo cliente serve apenas para organização e filtragem funcional. Sem autenticação, não oferece isolamento seguro entre usuários. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, gerado pela aplicação (UUID). |
| `originalName` | string | Nome original fornecido para o arquivo; não é usado como caminho no filesystem. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do recebimento bem-sucedido, em ISO 8601 UTC. |
| `owner` | string | Identificador não vazio informado pelo cliente; não representa identidade autenticada. |
| `storageName` | string | Nome interno gerado para localizar o arquivo em `backend/storage`; campo interno, não retornado pela API. |

O repositório mantém os registros em memória durante a vida do processo. O arquivo é escrito antes da inclusão dos metadados; se o registro falhar, o serviço deve tentar remover o arquivo recém-gravado. Após reinício, os arquivos existentes não terão metadados associados e não serão recuperados automaticamente.

## 6. Contratos de API

Os caminhos abaixo são relativos à API do backend. No frontend, as chamadas usam o prefixo `/api`; o proxy de desenvolvimento do Vite remove esse prefixo antes de encaminhar a requisição ao backend.

Formato padrão de erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição do erro"
  }
}
```

### `POST /upload`

- Entrada: `multipart/form-data` com `file` (um arquivo obrigatório) e `owner` (texto não vazio obrigatório).
- Sucesso: `201 Created`, corpo JSON com `id`, `originalName`, `size`, `uploadedAt` e `owner`.
- Erros: `400 Bad Request` para campos ausentes ou inválidos; `413 Payload Too Large` quando o arquivo exceder `UPLOAD_MAX_BYTES`; `500 Internal Server Error` para falha inesperada de armazenamento ou registro dos metadados.

Exemplo de resposta de sucesso:

```json
{
  "id": "b7f5e1e2-6472-4c78-a492-882ce7d7a095",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-10T12:00:00.000Z",
  "owner": "usuario-123"
}
```

### `GET /documents?owner={owner}`

- Entrada: query parameter `owner`, obrigatório e não vazio.
- Sucesso: `200 OK`, corpo JSON com a lista de metadados pertencentes exatamente ao `owner` solicitado, ordenada por `uploadedAt` decrescente. Lista vazia retorna `[]`.
- Erros: `400 Bad Request` se `owner` estiver ausente ou vazio; `500 Internal Server Error` para falha inesperada ao consultar o repositório.

Exemplo de resposta de sucesso:

```json
[
  {
    "id": "b7f5e1e2-6472-4c78-a492-882ce7d7a095",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "usuario-123"
  }
]
```

### `GET /documents/:id/download?owner={owner}`

- Entrada: `id` no caminho e `owner` obrigatório na query string.
- Sucesso: `200 OK`, conteúdo binário do arquivo com `Content-Disposition: attachment` usando o nome original e `Content-Type` apropriado (ou `application/octet-stream` quando não for possível determiná-lo com segurança).
- Erros: `400 Bad Request` se `owner` estiver ausente ou vazio; `404 Not Found` se o documento não existir, não pertencer ao `owner` informado ou se o arquivo local não estiver disponível; `500 Internal Server Error` para falha inesperada de leitura.

Para caminhos iniciados pelo frontend, os exemplos equivalentes são `/api/upload`, `/api/documents?owner=...` e `/api/documents/:id/download?owner=...`.

## 7. Decisões arquiteturais

- Backend em Node.js + Express, CommonJS, organizado em `routes`, `controllers`, `services` e `repositories`, com dependências no sentido `routes → controllers → services → repositories`.
- Rotas delegam aos controllers; controllers tratam HTTP e validação de entrada; services concentram regras de negócio; repositories encapsulam filesystem e armazenamento em memória.
- Multer com `diskStorage` grava arquivos localmente em `backend/storage`. O nome físico é gerado pela aplicação para evitar usar entrada do cliente como caminho.
- O repositório de metadados é em memória nesta versão. Reiniciar o processo perde os registros, mesmo que os arquivos permaneçam no diretório local.
- Frontend React com componentes funcionais e serviços baseados em `fetch`, usando o prefixo `/api` configurado no proxy Vite.
- `owner` é fornecido pelo cliente e usado para filtrar listagem e validar a operação de download; isso não substitui autenticação e não deve ser considerado controle de acesso seguro.
- Limite máximo padrão proposto de 10 MiB, configurável por `UPLOAD_MAX_BYTES`; formatos não são filtrados nesta fase.
- Os nomes e caminhos exatos de campos/respostas definidos nesta especificação são o contrato alvo da implementação, não uma afirmação de que os endpoints já estejam disponíveis.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Nesta atividade, somente esta especificação é produzida; nenhum arquivo de backend ou frontend faz parte da execução.

1. Implementar configuração do backend, diretório de armazenamento local e middleware Multer com limite configurável; validar configuração inválida e rejeição de arquivos acima do limite.
2. Implementar repositórios de filesystem e metadados em memória, incluindo geração de identificadores, gravação/consulta e limpeza do arquivo em caso de falha ao registrar metadados.
3. Implementar serviços e controllers para upload, listagem por `owner` e download com verificação de correspondência; mapear erros para os status e formato definidos.
4. Registrar as rotas da API e adicionar testes backend com `node:test` para sucesso, validação, limite de upload, falhas de filesystem e ausência/incompatibilidade de documentos.
5. Implementar no frontend os fluxos de envio, listagem e download via `fetch` e prefixo `/api`, com estados de carregamento e apresentação de erros.
6. Validar integração frontend/backend pelo proxy Vite, executar a suíte de testes e revisar os limites conhecidos: ausência de autenticação e perda dos metadados após reinício.