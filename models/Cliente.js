import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Cliente = sequelize.define(
  'Cliente',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('VIP', 'Regular', 'Novo'),
      allowNull: false,
      defaultValue: 'Novo',
    },
    totalHospedagens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ultimaHospedagem: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: 'clientes',
  }
);

export default Cliente;
