import Cliente from './Cliente.js';
import Reserva from './Reserva.js';
import CheckIn from './CheckIn.js';
import CheckOut from './CheckOut.js';

Cliente.hasMany(Reserva, { foreignKey: 'clienteId', as: 'reservas' });
Reserva.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

Reserva.hasMany(CheckIn, { foreignKey: 'reservaId', as: 'checkIns' });
CheckIn.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva' });

Reserva.hasMany(CheckOut, { foreignKey: 'reservaId', as: 'checkOuts' });
CheckOut.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva' });

Cliente.hasMany(CheckIn, { foreignKey: 'clienteId', as: 'checkIns' });
CheckIn.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

Cliente.hasMany(CheckOut, { foreignKey: 'clienteId', as: 'checkOuts' });
CheckOut.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

export { Cliente, Reserva, CheckIn, CheckOut };
