# Deliver the first bounded CLI-to-todo round trip

ID: TD-002
Type: implementation
Status: draft
Assignee: none
Parent: [TD-001](001-crash-safe-todo-slice.md)
Depends on: none
Start gate: recorded slice approval and explicit implementation authorization

## Outcome

One request crosses the real CLI, gateway, agent runner, Pi Durable, provider adapter, and SQLite store. It creates a todo and returns a stored result. A second request lists that todo.

## Before work

Read the parent's contracts, the [PRD dependency requirements](../../pi-durable-personal-agent-prd.md#dependency-evidence-and-verification-boundary), and the [existing source research](../../.scratch/personal-assistant/research/pi-durable-contract.md). No connector research or account tests are needed.

The existing research names Pi Durable and Pi AI 1.4.0 as candidates. Pin the actual tested package artifact and transitive lockfile. Record the exact Node 24 build and its SQLite version. Do not label historical metadata as a current release check.

## Implementation

1. Add the smallest TypeScript package, tests, and JSON configuration with schema validation. Pin runtime/package versions. Keep secrets in protected host files referenced by configuration. Defer YAML support, testing, and linting.
2. Exercise the public Pi APIs in a retained adapter contract test. Establish supported document transactions, durable submission identity, explicit extension selection, stable tool identity, model interception, and FULL SQLite settings before building around them.
3. Start one gateway and one runner as separate processes. The runner owns the store and a restricted Unix socket. Require loopback authentication and reauthorize the route at the runner. Take the canonical ownership lock before writable open.
4. Implement the three HTTP routes and `submit`, `status`, `result`, and `config validate` CLI commands from TD-001. Admit and acknowledge only after durable commit. Store payload digests and configuration snapshots without credential values.
5. Register `add_todo` and `list_todos` explicitly. Enforce schemas and permissions outside model code. Store title, open state, creation time, and stable todo ID. Bound list pages and model context. Atomically store each add result with its todo.
6. Connect the selected DeepInfra model through Pi AI and a replaceable provider adapter. Own credentials, usage extraction, price configuration, streaming progress, and tool-call conversion there.
7. Before any live request, implement finite call/tool/time limits and the separate shared ledger reservation path. Require known pricing and a configured output bound. Disable hidden provider retries. Persist the exact tool-call batch before invoking a tool.
8. Run the same path with a deterministic local provider fixture. Once the owner authorizes a bounded live smoke and supplies credentials through an approved local file, run add/list against the exact selected model. Never fetch credentials from 1Password.

Each step ends in runnable code or a focused passing test. Do not build unused multi-agent, connector, scheduler, plugin, or portability frameworks.

## Proposed files

- `package.json`, `package-lock.json`, `tsconfig.json`
- `config/assistant.example.json`, using the confirmed JSON format
- `src/config.ts`, `src/cli.ts`, `src/gateway.ts`, `src/runner.ts`
- `src/runtime/pi-durable.ts`, `src/host/store.ts`
- `src/tools/todos.ts`
- `src/inference/deepinfra.ts`, `src/inference/budget.ts`
- `tests/slice.test.ts`, `docs/runtime-contract.md`

These are proposed locations, not existing exports or files. Keep the public module interface small: submit, inspect status, retrieve result, resume, and close. The deterministic provider and DeepInfra adapter share the same inference checks.

## Acceptance

- [ ] Record exact artifacts, integrity/lockfile, runtime/storage versions, public exports used, and effective PRAGMAs.
- [ ] A normal add/list pair crosses both real processes and Pi Durable, not a replacement loop or direct CLI database write.
- [ ] CLI disconnect does not cancel the admitted request. Its original receipt returns the stored answer.
- [ ] Reusing an identical request returns the original receipt. Changed content returns 409. Two distinct requests with the same todo title create two todos.
- [ ] Unauthenticated input, a denied route/tool, and malformed configuration create no run or todo. Credentials and request bodies stay out of ordinary logs.
- [ ] Unknown prices, absent credentials, exhausted funds, and finite request limits block dispatch before a network call.
- [ ] A reservation and durable dispatch intent precede every provider attempt. Recorded usage settles known results; uncertainty retains a conservative charge.
- [ ] The authorized live smoke uses `deepseek-ai/DeepSeek-V4-Flash-0731`, records usage, and completes add/list. If it is not authorized or available, record the blockage rather than claiming a real-model pass.
- [ ] Configuration uses schema-validated JSON and the tool allowlist contains only `add_todo` and `list_todos`. YAML support, testing, and linting remain outside this slice.

## Stop condition

If the public Pi interfaces cannot provide the required transaction, replay, or pre-dispatch checks, stop with the exact failed contract and a small reproduction. Do not add a second execution engine or edit upstream tables.

## Evidence

Pending. All acceptance boxes are unexecuted.
