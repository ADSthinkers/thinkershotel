import mysql from 'mysql2/promise';

const TABLES = {
  clientes: ['id', 'nome', 'email', 'telefone', 'status', 'totalHospedagens', 'ultimaHospedagem', 'createdAt', 'updatedAt'],
  reservas: ['id', 'clienteId', 'hospede', 'quarto', 'checkIn', 'checkOut', 'status', 'valorTotal', 'createdAt', 'updatedAt'],
  check_ins: ['id', 'reservaId', 'clienteId', 'hospede', 'quarto', 'data', 'horario', 'status', 'telefone', 'createdAt', 'updatedAt'],
  check_outs: ['id', 'reservaId', 'clienteId', 'hospede', 'quarto', 'data', 'horario', 'status', 'telefone', 'createdAt', 'updatedAt'],
};

function assertValidDatabaseName(dbName) {
  if (!dbName || !/^[a-zA-Z0-9_$]+$/.test(dbName)) {
    throw new Error('DB_NAME inválido. Use apenas letras, números, "_" ou "$".');
  }
}

function jsonObjectFromColumns(alias, columns) {
  return columns.flatMap((column) => [`'${column}'`, `${alias}.\`${column}\``]).join(', ');
}

async function recreateTrigger(sequelize, tableName, operation, rowAlias) {
  const triggerName = `trg_${tableName}_${operation.toLowerCase()}_relatorio`;
  const columns = TABLES[tableName];
  const timing = operation === 'DELETE' ? 'BEFORE' : 'AFTER';

  await sequelize.query(`DROP TRIGGER IF EXISTS \`${triggerName}\``);
  await sequelize.query(`
    CREATE TRIGGER \`${triggerName}\`
    ${timing} ${operation} ON \`${tableName}\`
    FOR EACH ROW
    BEGIN
      INSERT INTO relatorio_dados_bd (tabela, operacao, registro_id, dados)
      VALUES ('${tableName}', '${operation}', ${rowAlias}.id, JSON_OBJECT(${jsonObjectFromColumns(rowAlias, columns)}));
    END
  `);
}

async function createReportTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS relatorio_dados_bd (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tabela VARCHAR(64) NOT NULL,
      operacao ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
      registro_id INT NULL,
      dados JSON NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_relatorio_tabela_criado_em (tabela, criado_em),
      INDEX idx_relatorio_operacao_criado_em (operacao, criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function createSystemUsersTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS usuarios_sistema (
      id INT AUTO_INCREMENT PRIMARY KEY,
      login VARCHAR(100) NOT NULL UNIQUE,
      senha_hash CHAR(64) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      perfil VARCHAR(50) NOT NULL DEFAULT 'admin',
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_usuarios_sistema_login_ativo (login, ativo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    INSERT INTO usuarios_sistema (login, senha_hash, nome, perfil, ativo)
    SELECT 'admin', SHA2('admin', 256), 'Administrador do Sistema', 'admin', TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM usuarios_sistema WHERE login = 'admin'
    )
  `);
}

async function createReportTriggers(sequelize) {
  for (const tableName of Object.keys(TABLES)) {
    await recreateTrigger(sequelize, tableName, 'INSERT', 'NEW');
    await recreateTrigger(sequelize, tableName, 'UPDATE', 'NEW');
    await recreateTrigger(sequelize, tableName, 'DELETE', 'OLD');
  }
}

async function createStoredProcedures(sequelize) {
  const procedures = [
    'sp_criar_cliente',
    'sp_atualizar_cliente',
    'sp_remover_cliente',
    'sp_criar_reserva',
    'sp_atualizar_reserva',
    'sp_cancelar_reserva',
    'sp_remover_reserva',
    'sp_criar_check_in',
    'sp_atualizar_check_in',
    'sp_concluir_check_in',
    'sp_remover_check_in',
    'sp_criar_check_out',
    'sp_atualizar_check_out',
    'sp_concluir_check_out',
    'sp_remover_check_out',
  ];

  for (const procedure of procedures) {
    await sequelize.query(`DROP PROCEDURE IF EXISTS \`${procedure}\``);
  }

  await sequelize.query(`
    CREATE PROCEDURE sp_criar_cliente(
      IN p_nome VARCHAR(255),
      IN p_email VARCHAR(255),
      IN p_telefone VARCHAR(255),
      IN p_status VARCHAR(32),
      IN p_totalHospedagens INT,
      IN p_ultimaHospedagem DATE
    )
    BEGIN
      INSERT INTO clientes (nome, email, telefone, status, totalHospedagens, ultimaHospedagem, createdAt, updatedAt)
      VALUES (p_nome, p_email, p_telefone, COALESCE(p_status, 'Novo'), COALESCE(p_totalHospedagens, 0), p_ultimaHospedagem, NOW(), NOW());
      SELECT * FROM clientes WHERE id = LAST_INSERT_ID();
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_atualizar_cliente(IN p_id INT, IN p_payload LONGTEXT)
    BEGIN
      UPDATE clientes
      SET
        nome = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.nome')), nome),
        email = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.email')), email),
        telefone = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.telefone')), telefone),
        status = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.status')), status),
        totalHospedagens = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.totalHospedagens')) AS SIGNED), totalHospedagens),
        ultimaHospedagem = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.ultimaHospedagem')) AS DATE), ultimaHospedagem),
        updatedAt = NOW()
      WHERE id = p_id;
      SELECT * FROM clientes WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_remover_cliente(IN p_id INT)
    BEGIN
      DELETE FROM clientes WHERE id = p_id;
      SELECT ROW_COUNT() AS affectedRows;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_criar_reserva(
      IN p_clienteId INT,
      IN p_hospede VARCHAR(255),
      IN p_quarto VARCHAR(255),
      IN p_checkIn DATE,
      IN p_checkOut DATE,
      IN p_status VARCHAR(32),
      IN p_valorTotal DECIMAL(10,2)
    )
    BEGIN
      INSERT INTO reservas (clienteId, hospede, quarto, checkIn, checkOut, status, valorTotal, createdAt, updatedAt)
      VALUES (p_clienteId, p_hospede, p_quarto, p_checkIn, p_checkOut, COALESCE(p_status, 'Confirmada'), COALESCE(p_valorTotal, 0), NOW(), NOW());
      SELECT * FROM reservas WHERE id = LAST_INSERT_ID();
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_atualizar_reserva(IN p_id INT, IN p_payload LONGTEXT)
    BEGIN
      UPDATE reservas
      SET
        clienteId = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.clienteId')) AS SIGNED), clienteId),
        hospede = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.hospede')), hospede),
        quarto = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.quarto')), quarto),
        checkIn = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.checkIn')) AS DATE), checkIn),
        checkOut = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.checkOut')) AS DATE), checkOut),
        status = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.status')), status),
        valorTotal = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.valorTotal')) AS DECIMAL(10,2)), valorTotal),
        updatedAt = NOW()
      WHERE id = p_id;
      SELECT * FROM reservas WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_cancelar_reserva(IN p_id INT)
    BEGIN
      UPDATE reservas SET status = 'Cancelada', updatedAt = NOW() WHERE id = p_id;
      SELECT * FROM reservas WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_remover_reserva(IN p_id INT)
    BEGIN
      DELETE FROM reservas WHERE id = p_id;
      SELECT ROW_COUNT() AS affectedRows;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_criar_check_in(
      IN p_reservaId INT,
      IN p_clienteId INT,
      IN p_hospede VARCHAR(255),
      IN p_quarto VARCHAR(255),
      IN p_data DATE,
      IN p_horario VARCHAR(255),
      IN p_status VARCHAR(32),
      IN p_telefone VARCHAR(255)
    )
    BEGIN
      INSERT INTO check_ins (reservaId, clienteId, hospede, quarto, data, horario, status, telefone, createdAt, updatedAt)
      VALUES (p_reservaId, p_clienteId, p_hospede, p_quarto, p_data, COALESCE(p_horario, '14:00'), COALESCE(p_status, 'Aguardando'), p_telefone, NOW(), NOW());
      SELECT * FROM check_ins WHERE id = LAST_INSERT_ID();
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_atualizar_check_in(IN p_id INT, IN p_payload LONGTEXT)
    BEGIN
      UPDATE check_ins
      SET
        reservaId = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.reservaId')) AS SIGNED), reservaId),
        clienteId = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.clienteId')) AS SIGNED), clienteId),
        hospede = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.hospede')), hospede),
        quarto = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.quarto')), quarto),
        data = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.data')) AS DATE), data),
        horario = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.horario')), horario),
        status = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.status')), status),
        telefone = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.telefone')), telefone),
        updatedAt = NOW()
      WHERE id = p_id;
      SELECT * FROM check_ins WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_concluir_check_in(IN p_id INT)
    BEGIN
      UPDATE check_ins SET status = 'Concluido', updatedAt = NOW() WHERE id = p_id;
      UPDATE reservas
      SET status = 'Check-in', updatedAt = NOW()
      WHERE id = (SELECT reservaId FROM check_ins WHERE id = p_id AND reservaId IS NOT NULL);
      SELECT * FROM check_ins WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_remover_check_in(IN p_id INT)
    BEGIN
      DELETE FROM check_ins WHERE id = p_id;
      SELECT ROW_COUNT() AS affectedRows;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_criar_check_out(
      IN p_reservaId INT,
      IN p_clienteId INT,
      IN p_hospede VARCHAR(255),
      IN p_quarto VARCHAR(255),
      IN p_data DATE,
      IN p_horario VARCHAR(255),
      IN p_status VARCHAR(32),
      IN p_telefone VARCHAR(255)
    )
    BEGIN
      INSERT INTO check_outs (reservaId, clienteId, hospede, quarto, data, horario, status, telefone, createdAt, updatedAt)
      VALUES (p_reservaId, p_clienteId, p_hospede, p_quarto, p_data, COALESCE(p_horario, '11:00'), COALESCE(p_status, 'Pendente'), p_telefone, NOW(), NOW());
      SELECT * FROM check_outs WHERE id = LAST_INSERT_ID();
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_atualizar_check_out(IN p_id INT, IN p_payload LONGTEXT)
    BEGIN
      UPDATE check_outs
      SET
        reservaId = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.reservaId')) AS SIGNED), reservaId),
        clienteId = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.clienteId')) AS SIGNED), clienteId),
        hospede = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.hospede')), hospede),
        quarto = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.quarto')), quarto),
        data = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.data')) AS DATE), data),
        horario = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.horario')), horario),
        status = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.status')), status),
        telefone = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_payload, '$.telefone')), telefone),
        updatedAt = NOW()
      WHERE id = p_id;
      SELECT * FROM check_outs WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_concluir_check_out(IN p_id INT)
    BEGIN
      UPDATE check_outs SET status = 'Concluido', updatedAt = NOW() WHERE id = p_id;
      UPDATE reservas
      SET status = 'Check-out', updatedAt = NOW()
      WHERE id = (SELECT reservaId FROM check_outs WHERE id = p_id AND reservaId IS NOT NULL);
      SELECT * FROM check_outs WHERE id = p_id;
    END
  `);

  await sequelize.query(`
    CREATE PROCEDURE sp_remover_check_out(IN p_id INT)
    BEGIN
      DELETE FROM check_outs WHERE id = p_id;
      SELECT ROW_COUNT() AS affectedRows;
    END
  `);
}

export async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const [dbHost, dbPort] = (process.env.DB_HOST || 'localhost').split(':');
  const dbPassword = process.env.DB_PASSWORD;

  assertValidDatabaseName(dbName);

  const connection = await mysql.createConnection({
    host: dbHost || 'localhost',
    port: dbPort ? Number(dbPort) : 3306,
    user: dbUser,
    password: dbPassword,
  });

  const [existingDatabases] = await connection.query('SHOW DATABASES LIKE ?', [dbName]);
  const existed = existingDatabases.length > 0;

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  return {
    created: !existed,
    existed,
    database: dbName,
    host: dbHost || 'localhost',
    port: dbPort ? Number(dbPort) : 3306,
    user: dbUser,
  };
}

export async function setupDatabaseObjects(sequelize) {
  await createSystemUsersTable(sequelize);
  await createReportTable(sequelize);
  await createReportTriggers(sequelize);
  await createStoredProcedures(sequelize);

  return {
    systemUsersTable: 'usuarios_sistema',
    reportTable: 'relatorio_dados_bd',
    reportTriggers: Object.keys(TABLES).length * 3,
    storedProcedures: 15,
  };
}
