import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const UsuarioSistema = sequelize.define(
  'UsuarioSistema',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    login: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    senha_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    perfil: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'operacional',
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'usuarios_sistema',
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
  }
);

export default UsuarioSistema;
