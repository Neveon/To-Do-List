# To-Do List

A to-do list app with a **REST API** (Node.js, Express, TypeScript) and a **React** front end. To-dos are saved to a JSON file, so they persist between runs.

You can add, list, view, edit, complete, un-complete and delete to-dos. The list can also be filtered (all / completed / incomplete / overdue) and sorted (by date created, due date or title).

## How to build and run

### Option 1: Docker

```bash
docker compose up --build
```

Open <http://localhost:3000>. Data is kept in a Docker volume, so it survives restarts.

### Option 2: Run locally

Requires **Node.js 24** (see [`.nvmrc`](.nvmrc)), which includes npm 11.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. This starts the React app (port 5173) and the API (port 3000) together, both reloading on save. To-dos are saved in `server/data/todos.json`.

### Option 3: Production build

```bash
npm run build
npm start
```

Open <http://localhost:3000>. A single server serves both the API and the built React app.

### Settings (optional)

| Environment variable | Default                  | Purpose                    |
| -------------------- | ------------------------ | -------------------------- |
| `PORT`               | `3000`                   | Port the server listens on |
| `DATA_FILE`          | `server/data/todos.json` | Where to-dos are saved     |

You can also put these in a `.env` file in the project root (see [`.env.example`](.env.example)).

## How to run the tests

```bash
npm test          # run all tests
npm run check     # formatting, linting, type checking and all tests
```

To run the tests of just one part, use `npm test -w server` (or `-w client`, `-w shared`). The tests don't need a running server or internet access.

## API

| Request                          | What it does                                                                                                          | Success response         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `POST /api/todos`                | Add a to-do: `{ "title", "description"?, "dueDate"? }`                                                                | `201` with the new to-do |
| `GET /api/todos`                 | List to-dos. Optional: `?status=all\|completed\|incomplete\|overdue&sortBy=createdAt\|dueDate\|title&order=asc\|desc` | `200` with a list        |
| `GET /api/todos/:id`             | View one to-do                                                                                                        | `200`                    |
| `PATCH /api/todos/:id`           | Change any of `title`, `description`, `dueDate` (`null` clears a field)                                               | `200`                    |
| `POST /api/todos/:id/complete`   | Mark as completed                                                                                                     | `200`                    |
| `POST /api/todos/:id/incomplete` | Mark as not completed                                                                                                 | `200`                    |
| `DELETE /api/todos/:id`          | Delete a to-do                                                                                                        | `204`                    |

Each to-do looks like this:

```json
{
  "id": "3f5f8e3d-0620-4120-8861-42e78bad5c78",
  "title": "Pay rent",
  "description": "Transfer to landlord",
  "dueDate": "2026-10-01",
  "isCompleted": false,
  "createdAt": "2026-09-27T12:00:00.000Z"
}
```

Errors use one format, for example `400 { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "path": "title", "message": "Title is required" }] } }`. An unknown id returns `404` with code `NOT_FOUND`.

## Design choices

### Project structure

The code is split into three packages in one repository:

```
shared/   Validation rules and types, used by both the server and the client
server/   The REST API
client/   The React app
```

The main benefit is that **validation rules are written once**, in `shared/`, using the Zod library. The server uses them to check requests, and the client uses the same rules to check its form. The two sides can therefore never disagree about what a valid to-do is.

### Backend architecture

The server has three layers, and each has one job:

```
Routes      → read the request, validate it, send the response and status code
Service     → the business rules: create ids and timestamps, apply updates, find missing to-dos
Repository  → save and load to-dos (in a JSON file)
```

- **Easy to swap storage.** The service only talks to a `TodoRepository` interface, never to the file directly. Moving to a real database would mean writing one new class; the routes and service wouldn't change.
- **Safe file writes.** Each save writes a temporary file and then renames it over the real one, so a crash can't leave a half-written file. Saves run one at a time, so two requests can't overwrite each other's changes. A corrupt data file stops the server with a clear error instead of being overwritten.
- **One place for errors.** Routes don't handle errors themselves. A single error handler turns every failure into the same JSON error format with the right status code.
- **Built for testing.** The app is created by a function (`createApp`) and doesn't start listening on its own, so tests can call it directly. The clock and the id generator are passed in, so tests control time and ids exactly.

### Frontend

The React app has a list page (`/`) and a detail page (`/todos/:id`), with one form component shared by "add" and "edit". The chosen filter and sort are kept in the URL, so they survive a page refresh. Styling is kept minimal, because the brief focuses on architecture and testing rather than UI polish.

### Testing strategy

Most tests are small and fast, with a few that check everything working together:

- **Unit tests** cover the validation rules, filtering and sorting, and the service. The service tests use a fake in-memory repository.
- **Storage tests** use real files in a temporary folder. They check that data survives a restart, that 25 saves at once lose nothing, and that a corrupt file is never overwritten. The same set of tests also runs against the in-memory fake, which proves the fake behaves like the real thing.
- **API tests** send real HTTP requests to the app, using the Supertest library, backed by real file storage. They check every endpoint and its success and error status codes.
- **React tests** use React Testing Library to click and type like a user would, with the MSW library faking the API. They cover loading and error states, adding, editing, completing, deleting, and filtering.

Tests don't depend on the current date or time, so they give the same result on any day and in any time zone.

## Assumptions

- **A monorepo.** The API, the React app and the shared code live in one repository, so one `npm install` and one `npm test` cover everything.
- **One user, no login.** It's a personal to-do list, so there are no accounts or authentication.
- **A JSON file is enough storage.** As the brief allows, there is no database. This works for one server process and a personal-sized list.
- **Due dates have no time.** A due date is a calendar date (`YYYY-MM-DD`) only.
- **What "overdue" means.** A to-do is overdue if it isn't completed and its due date is before today. A to-do due today is not overdue yet.
- **Completing is its own action.** Completing and un-completing use dedicated endpoints, as listed separately in the brief. Editing only changes the title, description and due date.
- **Text limits.** Titles are required and at most 200 characters, and descriptions at most 2000. Extra spaces are trimmed, and a blank description is saved as "no description".
- **Default list order.** Without a sort option, to-dos are listed in the order they were created, oldest first.
- **No pagination.** The list returns all to-dos, which is fine for a personal list.

## Trade-offs and next steps

- A JSON file rewrites all data on every save, and only suits a single server process. A database would be the next step, which the repository layer makes simple.
- No browser end-to-end tests (e.g. Playwright). The full flow was checked by hand instead.
- No CI pipeline yet. `npm run check` runs everything a CI job would.

## License

[MIT](LICENSE)
