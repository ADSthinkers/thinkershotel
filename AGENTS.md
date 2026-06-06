# Repository Guidelines

## Project Structure & Module Organization

This is a Node.js ES module backend for the ThiHotel API. The entry point is `server.js`, which configures Express, CORS, request logging, health checks, and `/api` routes.

- `config/`: MySQL/Sequelize setup, JWT config, stored procedure helpers, and database bootstrap logic.
- `controllers/`: Request handlers grouped by domain, for example `ClienteController.js` and `ReservaController.js`.
- `routes/`: Express routers matching controller domains, for example `ClienteRoutes.js`.
- `models/`: Sequelize models and model associations through `models/index.js`.
- `middlewares/`: Shared middleware such as token verification.
- `.env_template`: Required environment variable names. Copy values into `.env`; do not commit secrets.

There is currently no dedicated tests directory or static asset directory.

## Build, Test, and Development Commands

- `npm install`: Install dependencies from `package-lock.json`.
- `npm start`: Run the API with `node server.js`; requires reachable MySQL and valid `.env` settings.
- `npm test`: Run `node --check server.js`; validates entry-point JavaScript syntax only.

After starting, check `GET /api/health` to confirm the service is running.

## Coding Style & Naming Conventions

Use JavaScript ES modules with `import`/`export`. Keep two-space indentation, single quotes, and semicolons. Use PascalCase filenames for controllers, routes, and models (`CheckInController.js`, `UsuarioSistema.js`). Use lower camelCase for functions, variables, and route handlers (`listarClientes`, `connectDB`). Keep API response messages in Portuguese unless changing an established contract.

Prefer shared helpers from `config/dbProcedures.js` for stored procedure calls and database error handling. Keep route files thin: define endpoints, attach middleware, and delegate behavior to controllers.

## Testing Guidelines

The current test script is a syntax check, not a full suite. Run `npm test` before committing. For behavioral changes, manually exercise affected endpoints with valid auth and MySQL data, and include notes in the pull request. If adding automated tests, place them in `tests/` or `__tests__/` and name files by feature, for example `clientes.test.js`.

## Commit & Pull Request Guidelines

Recent commits use short Portuguese summaries such as `Backend base` and `Adição de relatórios e triggers`. Follow that pattern: concise, descriptive, and focused on one change.

Pull requests should include a brief description, changed endpoints or database objects, manual test steps, and any required `.env` or MySQL setup changes. Link related issues when available.

## Security & Configuration Tips

Keep `.env` private. Required values include `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, `AUTH_EMAIL`, and `AUTH_PASSWORD`. Avoid logging secrets; existing boot logs intentionally report whether secrets are configured, not their values.
