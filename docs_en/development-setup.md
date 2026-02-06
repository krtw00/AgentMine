# Development Setup

---

## Prerequisites

| Tool             | Version | Notes                       |
| ---------------- | ------- | --------------------------- |
| Node.js          | >= 20   |                             |
| pnpm             | 10.28.2 | Auto-managed via corepack   |
| Git              | >= 2.x  |                             |
| Docker + Compose | Latest  | Only for Docker development |

---

## Clone the Repository

```bash
git clone https://github.com/<your-fork>/AgentMine.git
cd AgentMine
```

---

## Option A: Native Node.js (Recommended)

### 1. Enable pnpm

```bash
corepack enable
```

Corepack automatically installs the pnpm version specified in the project.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

```bash
cd packages/db
pnpm generate
pnpm migrate
cd ../..
```

A SQLite database will be created at `packages/db/data/agentmine.db`.

### 4. Start Development Servers

Start all packages:

```bash
pnpm dev
```

To start individual packages:

```bash
# Daemon only
pnpm --filter @agentmine/daemon dev

# Web only
pnpm --filter @agentmine/web dev
```

### 5. Verify

| Service | URL                       | Description |
| ------- | ------------------------- | ----------- |
| Web UI  | http://localhost:3000     | Frontend    |
| API     | http://localhost:3001/api | Backend API |

The Web UI automatically proxies API requests to the daemon (localhost:3001).

---

## Option B: Docker

### 1. Start Containers

```bash
docker compose up -d
```

### 2. Verify

| Service | URL                       | Description |
| ------- | ------------------------- | ----------- |
| Web UI  | http://localhost:3000     | Frontend    |
| API     | http://localhost:3001/api | Backend API |

### 3. View Logs

```bash
docker compose logs -f
```

### 4. Stop Containers

```bash
docker compose down
```

### Traefik Integration

To integrate with a reverse proxy (Traefik), create a `docker-compose.override.yml` to add Traefik labels and network configuration.

---

## Common Commands

### Development

```bash
pnpm dev                                    # Start all
pnpm --filter @agentmine/daemon dev         # Daemon only
pnpm --filter @agentmine/web dev            # Web only
```

### Build

```bash
pnpm build                                  # Build all
```

### Database

```bash
cd packages/db
pnpm generate                               # Generate migrations
pnpm migrate                                # Run migrations
pnpm studio                                 # Open Drizzle Studio
```

### Docker

```bash
docker compose up -d                        # Start
docker compose down                         # Stop
docker compose build                        # Build
docker compose logs -f                      # View logs
```

---

## Troubleshooting

### `pnpm install` fails

Ensure corepack is enabled:

```bash
corepack enable
node -v   # Must be v20+
```

### Port already in use

If port 3000 or 3001 is already in use:

```bash
# macOS / Linux
lsof -i :3000
lsof -i :3001
```

### Database errors

Re-run migrations:

```bash
cd packages/db
pnpm generate
pnpm migrate
```

### Docker Compose network error

If you have a `docker-compose.override.yml`, it may require external networks (e.g., Traefik). Try temporarily moving the override file aside.
