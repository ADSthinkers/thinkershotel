# Repository Guidelines

## Project Structure & Module Organization

This is an Expo Router React Native app. Main code lives in `src/`: routes and screen composition are in `src/app`, shared UI in `src/components`, React context in `src/context`, hooks in `src/hooks`, static domain data in `src/data`, API helpers in `src/services`, and design values in `src/constants`. Images, icons, splash assets, and Expo icon source files live in `assets/`. Utility scripts are in `scripts/`; `scripts/reset-project.js` is the Expo template reset helper. Build output in `dist/` and dependencies in `node_modules/` should not be edited manually.

## Build, Test, and Development Commands

- `npm install`: install project dependencies from `package-lock.json`.
- `npm start`: start the Expo development server.
- `npm run android`: launch Expo for an Android emulator or device.
- `npm run ios`: launch Expo for an iOS simulator or device.
- `npm run web`: run the app in a web browser.
- `npm run lint`: run Expo lint checks.
- `npm run reset-project`: reset the template structure; use only when intentionally restarting the app scaffold.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Prefer functional React components, hooks, and typed props. Keep route files under `src/app` aligned with Expo Router conventions, and use the `@/` alias for imports from `src` when it improves readability. Use PascalCase for components and providers, camelCase for functions and variables, and descriptive union/type names such as `ReservationStatus` or `TabKey`. Match the existing style: two-space indentation, single quotes, semicolons, and React Native `StyleSheet` objects.

## Testing Guidelines

No test framework is configured yet. Before adding tests, choose tooling compatible with Expo and React Native, such as Jest with React Native Testing Library. Place tests near the code they cover using `*.test.ts` or `*.test.tsx`, or in `__tests__` for larger suites. Until tests exist, run `npm run lint` and manually verify changed flows in Expo.

## Commit & Pull Request Guidelines

Recent commits use short Portuguese summaries, for example `Correções e melhorias de UI`. Keep commit messages concise and scoped to one change. Pull requests should include a summary, affected screens or modules, manual verification steps, linked issues when available, and screenshots or recordings for UI changes.

## Security & Configuration Tips

Public Expo variables must use the `EXPO_PUBLIC_` prefix. The API base URL is configured through `EXPO_PUBLIC_API_URL` in `src/services/api.ts`; avoid committing private endpoints, tokens, or local-only credentials.
