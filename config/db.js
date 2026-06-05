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
    await ensureDatabaseExists();
    console.log('🗄️  Banco de dados verificado/criado com sucesso!');

    await sequelize.authenticate();
    console.log('MySQL Conectado com Sucesso!');

    await sequelize.sync();
    console.log('📦 Base de dados sincronizada (Schema atualizado)!');

    await setupDatabaseObjects(sequelize);
    console.log('📊 Relatórios, triggers e stored procedures configurados!');

  } catch (error) {
    console.error('❌ Erro ao conectar no MySQL :', error.message);
    process.exit(1); 
  }
};

export { connectDB, sequelize };
