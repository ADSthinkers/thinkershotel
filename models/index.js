import Cliente from './Cliente.js';
import Reserva from './Reserva.js';
import CheckIn from './CheckIn.js';
import CheckOut from './CheckOut.js';
import UsuarioSistema from './UsuarioSistema.js';

const restrictRelation = {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
};

Cliente.hasMany(Reserva, { foreignKey: 'clienteId', as: 'reservas', ...restrictRelation });
Reserva.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente', ...restrictRelation });

Reserva.hasMany(CheckIn, { foreignKey: 'reservaId', as: 'checkIns', ...restrictRelation });
CheckIn.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva', ...restrictRelation });

Reserva.hasMany(CheckOut, { foreignKey: 'reservaId', as: 'checkOuts', ...restrictRelation });
CheckOut.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva', ...restrictRelation });

export { Cliente, Reserva, CheckIn, CheckOut, UsuarioSistema };
