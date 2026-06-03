import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CheckIn = sequelize.define(
  'CheckIn',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reservaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hospede: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quarto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    horario: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '14:00',
    },
    status: {
      type: DataTypes.ENUM('Aguardando', 'Pendente', 'Concluido'),
      allowNull: false,
      defaultValue: 'Aguardando',
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'check_ins',
  }
);

export default CheckIn;
