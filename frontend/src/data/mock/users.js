// Usuarios del panel (MVP mock). Reemplazar por panel-api (JWT + TOTP) en producción.
export const USERS = [
  {
    username: 'super',
    password: 'ofKx5deNiMROvOEx',
    nombre: 'Superadmin QA',
    rol: 'superadmin',
    principal: true,
  },
  {
    username: 'cumplimiento',
    password: 'Cumple123!',
    nombre: 'Valentina Ríos',
    rol: 'cumplimiento',
  },
  {
    username: 'soporte',
    password: 'Soporte123!',
    nombre: 'Mateo Gil',
    rol: 'soporte',
  },
  {
    username: 'aliado',
    password: 'Aliado123!',
    nombre: 'Red Puntored',
    rol: 'aliado',
    redId: 'red-puntored',
  },
];

export const findByCredentials = (username, password) =>
  USERS.find(
    (u) => u.username === String(username).trim().toLowerCase() && u.password === password
  );

export const findByUsername = (username) => USERS.find((u) => u.username === username);

export const toPublicUser = ({ password, ...rest }) => rest;
