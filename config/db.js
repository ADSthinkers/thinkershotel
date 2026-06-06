import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { ensureDatabaseExists, setupDatabaseObjects } from './dbSetup.js';

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const [dbHost, dbPort] = (process.env.DB_HOST || 'localhost').split(':');
const dbPassword = process.env.DB_PASSWORD;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort ? Number(dbPort) : 3306,
  dialect: 'mysql',
  logging: false,
});

const connectDB = async () => {
  try {
    const connectionInfo = {
      database: dbName,
      user: dbUser,
      host: dbHost || 'localhost',
      port: dbPort ? Number(dbPort) : 3306,
      passwordConfigured: Boolean(dbPassword),
    };

    console.log('🔎 Verificando configuração do MySQL...');
    console.log('   • Host:', `${connectionInfo.host}:${connectionInfo.port}`);
    console.log('   • Banco:', connectionInfo.database);
    console.log('   • Usuário:', connectionInfo.user || '(não informado)');
    console.log('   • Senha configurada:', connectionInfo.passwordConfigured ? 'sim' : 'não');

    const databaseStatus = await ensureDatabaseExists();
    if (databaseStatus.created) {
      console.log(`🆕 Banco de dados "${databaseStatus.database}" não existia e foi criado.`);
    } else {
      console.log(`✅ Banco de dados "${databaseStatus.database}" encontrado.`);
    }
    console.log(`   • Credenciais usadas: ${databaseStatus.user}@${databaseStatus.host}:${databaseStatus.port}`);

    await sequelize.authenticate();
    console.log('✅ MySQL conectado com sucesso!');

    await sequelize.sync();
    console.log('📦 Tabelas Sequelize verificadas/sincronizadas.');

    if (databaseStatus.created) {
      const setupStatus = await setupDatabaseObjects(sequelize);
      console.log('📊 Objetos iniciais do banco configurados:');
      console.log(`   • Tabela de usuários: ${setupStatus.systemUsersTable}`);
      console.log(`   • Usuário padrão: admin/admin`);
      console.log(`   • Tabela de logs: ${setupStatus.activityLogTable}`);
      console.log(`   • Triggers de logs: ${setupStatus.activityLogTriggers}`);
      console.log(`   • Stored procedures: ${setupStatus.storedProcedures}`);
    } else {
      console.log('📊 Banco já existente; bootstrap inicial de triggers/procedures ignorado.');
    }

  } catch (error) {
    console.error('❌ Erro ao conectar/configurar o MySQL:', error.message || error);
    process.exit(1); 
  }
};

export { connectDB, sequelize, dbHost, dbName, dbPort, dbUser };
