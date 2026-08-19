# Contributing to Rakshika

First off, thank you for considering contributing to Rakshika. It's people like you that make Rakshika a safer environment for women everywhere.

## Development Workflow

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/Rakshika.git
   ```
3. **Create a branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following the code style guidelines.
5. **Commit your changes**:
   ```bash
   git commit -m "feat: your feature description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a Pull Request** against the `develop` branch of the main repository.

## Code Style

- We use **TypeScript** strictly. Avoid using `any` types.
- Format your code using the built-in ESLint/Oxlint rules. Run `npm run lint` before committing.
- Prefer **TailwindCSS** utility classes over custom CSS.

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.
