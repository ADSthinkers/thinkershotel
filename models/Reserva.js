import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Reserva = sequelize.define(
  'Reserva',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    checkIn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkOut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Confirmada', 'Check-in', 'Check-out', 'Pendente', 'Cancelada'),
      allowNull: false,
      defaultValue: 'Confirmada',
    },
    valorTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'reservas',
  }
);

export default Reserva;
