import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CheckOut = sequelize.define(
  'CheckOut',
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
      defaultValue: '11:00',
    },
    status: {
      type: DataTypes.ENUM('Aguardando', 'Pendente', 'Concluido'),
      allowNull: false,
      defaultValue: 'Pendente',
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'check_outs',
  }
);

export default CheckOut;
