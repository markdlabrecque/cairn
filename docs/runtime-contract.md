# TD-002 runtime contract evidence

TD-002 is incomplete and not ready for review or merge. The fixture round trip runs, but typecheck fails in an implementor-authored contract test. No Pi dependency stop condition has been demonstrated. No live inference was authorized or attempted.

## Authorization and worktree

Work started on clean branch `feat/td-002-todo-round-trip` at planning commit `91c7880`. The owner authorized TD-002 only, with deterministic local fixtures. No commits, merges, pushes, subagents, production access, connector tests, credential retrieval, or service installation occurred. TD-003 through TD-005 remain drafts.

The implementor profile references `~/.agents/skills/subagent-tdd-pipeline/SKILL.md`. That file was absent. The owner's request and the local tickets supplied the stage instructions. No separate red-test handoff was present, so the retained tests were authored here.

## Tested artifacts

The registry query during this execution reported `latest: 1.4.0`. That observation is separate from the historical research. The installed npm artifact, not an upstream source checkout, ran every test.

- Node `v24.20.0`, executable `/home/mark/.config/nvm/versions/node/v24.20.0/bin/node`.
- npm `11.19.0`.
- Built-in SQLite `3.53.4`.
- `@earendil-works/pi-durable`, Pi AI, and Chord exactly `1.4.0`.
- TypeBox `1.3.27`, TypeScript `5.9.3`, Node types `24.10.0`.
- `package-lock.json` pins transitive artifacts and their integrity values. SHA-256 `5f2996f87dad39dd788dbc7c5dc8b8219b555149a59d6312494337ee06d24e65`.
- Pi Durable integrity `sha512-EtIyXH1MBSXdJSkodmy+CYXuwfve3gPrD4GNCZ0XmuRWLPupwRlNQ7fdaXjRcLoKb6SWkT/yEzK+sMmrqvYK+Q==`.
- The dev dependency `@modelcontextprotocol/sdk@1.32.2` supplies the optional peer declaration imported by `@google/genai@2.21.0`. Initial typecheck could not resolve that declaration. No MCP implementation or connector test was added. `skipLibCheck` remains off.

[Artifact and PRAGMA output](evidence/td002-runtime-versions.json) records root exports, lockfile entries, and effective values. `openNodeSqliteDatabase()` initially returned WAL with synchronous `1`, NORMAL. Setting FULL through its public `exec()` before `SqliteStorage.open()` produced WAL with synchronous `2`, FULL. The document test sets and checks FULL on both opens. This does not prove power-loss safety.

Registry and runtime commands executed:

```sh
node --version
npm --version
npm view @earendil-works/pi-durable version dist-tags engines exports dependencies --json
npm view @earendil-works/pi-durable@1.4.0 dist --json
npm install --ignore-scripts --no-audit --no-fund
npm ls --depth=0
sha256sum package-lock.json
```

Reproduce the storage/version probe without credentials:

```sh
node --input-type=module <<'JS'
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as durable from '@earendil-works/pi-durable';
import { openNodeSqliteDatabase } from '@earendil-works/pi-durable/storage/sqlite/node';
import { SqliteStorage } from '@earendil-works/pi-durable/storage/sqlite';
const directory = await mkdtemp(join(tmpdir(), 'td002-probe-'));
const db = await openNodeSqliteDatabase(join(directory, 'probe.sqlite'));
try {
  console.log('node', process.version);
  console.log('sqlite', await db.get('SELECT sqlite_version() AS version'));
  console.log('defaults', await db.get('PRAGMA journal_mode'), await db.get('PRAGMA synchronous'));
  await db.exec('PRAGMA synchronous=FULL');
  await SqliteStorage.open(db);
  console.log('effective', await db.get('PRAGMA journal_mode'), await db.get('PRAGMA synchronous'));
  console.log('public exports', Object.keys(durable).sort());
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  for (const name of ['pi-durable', 'pi-ai', 'chord']) console.log(name, lock.packages[`node_modules/@earendil-works/${name}`]);
} finally { await db.close(); await rm(directory, { recursive: true, force: true }); }
JS
```

An initial metadata probe tried Pi AI's unexported `package.json` subpath and failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The successful probe reads the retained lockfile instead. This is not a transaction/replay failure.

## Public APIs exercised

| API | Executed evidence |
| --- | --- |
| `defineDoc`, `Harness.open`, `Harness.commit`, `tx.doc`, `snapshot`, `close` | Application document commit and reopen on actual SQLite. |
| `SqliteStorage.open`, `openNodeSqliteDatabase`, public database `exec`/`get` | FULL set before Pi storage open and read back. No Pi table edits. |
| `defineTool`, `defineExtension`, `createRegistry`, explicit conversation `extensions` and `tools` | Only the todo extension/tool are selected in the replay test; both todo tools plus the inference guard are selected in the process test. No coding tools installed. |
| `Conversation.submit`, stable `requestId`, `Submission.wait`, `Harness.submission` | Receipt retrieval and duplicate submission through the process path; reacquisition after reopen in the contract test. Application digest checking supplies changed-payload conflicts. |
| `AssistantEntry`, `tx.task`, `tx.entry`, tool `api.taskId`/`callId`/`commit`, `replay: 'safe'` | Contract test observes the persisted assistant decision before the application effect, closes after the effect, reopens, and observes the same execution identity with one application item. It uses cooperative close, not SIGKILL. |
| `GenerationTask`, `hook`, public `getTask`, Pi AI `createModels`, `createProvider`, provider streams | Before-request hook binds a durable generation task/attempt to the mandatory adapter. Adapter checks the binding again before reserving or dispatching. Normal fixture path executes it. Failure cases remain untested. |
| Pi AI `fauxProvider`, `fauxAssistantMessage`, `fauxToolCall`, event stream | Deterministic fixture tool call followed by final answer. No external inference. |

`beforeRequest` is not itself a fail-closed authorization hook. The installed generation code reports ordinary hook errors and continues. Its public hook API provides reads and memos, not a transaction writer. The adapter therefore rejects missing/mismatched attempt binding and owns the pre-dispatch path. The installed `ToolTask` bypasses `beforeTool` on safe replay, so the tool implementation itself checks permissions and limits. These are inspected contracts; denied/recovery matrix coverage is still required.

Primary references read include the installed Durable and Pi AI READMEs, Chord README, declarations and relevant installed JavaScript. The linked Durable normative specification was read at historical commit `ede2c9b468d8e061c557d16957513715e6d49cd6`. That source specification is not substituted for the installed artifact. Its local downloaded copy is ignored under `tmp/upstream/`.

## Retained first path

`tests/slice.test.ts` creates an isolated temporary configuration and owner-only synthetic authentication file. It starts a real runner and gateway as separate Node processes, then invokes the CLI in further processes. It executes add, polls the persisted answer, resubmits an identical request, rejects changed content, lists the todo, checks status, rejects unauthenticated input, and checks the child logs for fixture payload/token leakage.

The runner alone opens Pi's agent store. Gateway and CLI forward HTTP only. The host uses `/usr/bin/flock` keepers before writable open and a mode-0600 Unix socket. Application receipts, queue order, todo effects/results, and model intents/responses use supported Pi documents. The host spending ledger is a separate application-owned SQLite file with FULL. These mechanisms have a normal-path test, not complete safety acceptance.

The selected provider/model remains DeepInfra `deepseek-ai/DeepSeek-V4-Flash-0731`. Fixture mode is explicit in the test configuration and result metadata; it does not test that model's availability, quality, pricing, or usage reporting. The live adapter uses Pi AI's OpenAI-completions implementation at the direct DeepInfra endpoint, with hidden retries disabled. It has not run against DeepInfra, including no local HTTP wire-fixture test yet.

`config/assistant.example.json` selects live mode, has no credential, and has unknown prices. It is intentionally unable to dispatch. Validation checks its JSON schema without reading a credential. Do not start live work from this example without separate owner authorization.

## Checks and current blocker

```sh
npm ci --ignore-scripts --no-audit --no-fund   # repeatable install command, not rerun after final lock update
node --test tests/pi-durable-contract.test.ts tests/pi-replay-contract.test.ts
node --test tests/slice.test.ts
npm test
npm run typecheck
node src/cli.ts --config config/assistant.example.json --json config validate
git diff --check
```

Executed results:

- `npm test`: 3 tests passed, 0 failed, 0 skipped. [Output](evidence/td002-focused-tests.txt).
- `node --test tests/slice.test.ts`: first ran red because `src/runner.ts` did not exist; after implementation, passed with the real process path.
- The document and replay contract tests also passed before the process implementation.
- `npm run typecheck`: exit 2, six diagnostics in `tests/pi-replay-contract.test.ts`. [Output](evidence/td002-typecheck.txt). Source and installed-dependency declarations now report no diagnostics. A first attempt timed out at 30 seconds; the longer invocation completed and reported the retained errors.
- Example `config validate`: exit 0, `{"valid":true,"fixture":false}`.
- `git diff --check`: exit 0.
- No pre-existing application test suite existed in this worktree. No expensive recovery, reboot, service, connector, or live-inference gate ran. No independent reviewer gate ran.

The implementor rules require approval before changing tests. Approval was requested to correct only the implementor-authored replay fixture setup:

1. Pass `{ id: 'batch-call-1' }` as the third `fauxToolCall` argument, matching the installed declaration, rather than a string.
2. Add JSON-object/number narrowing before reading the public task input and decode its stored assistant ID at that trusted boundary.
3. Narrow the stored model message to assistant before accessing content block types.

All existing assertions must stay. No test has been weakened, deleted, skipped, or retired. These corrections have not been made. This is a process/approval blocker, not evidence that Pi Durable failed the dependency gate. The worktree is not a green candidate handoff.

## Remaining claims

Before TD-002 can be a candidate, correct the fixture setup with authorization, finish the focused safety tests, and fix their findings. Known implementation work remains:

- Make shared reservation acquisition idempotent across an intent/reservation gap while retaining fail-closed uncertainty after dispatch. The current ledger rejects an existing reservation.
- Test and close queue-drain completion/admission races, duplicate owners, path aliases, stale/shared sockets, and startup cleanup. The current socket startup unlinks its configured path without a separate socket-ownership check.
- Test denied tools/routes, malformed config, missing credentials, unknown prices, zero funds, model/tool/time limits, and unavailable storage before claiming those acceptance rows.
- Prove the mandatory pre-dispatch ordering with a retained adapter test, including known usage settlement and conservative uncertainty. The normal path alone does not prove all bypasses are closed.
- Exercise two distinct requests with identical titles, CLI disconnect, list cursor bounds, context bounds, and final-answer retrieval without further execution.
- Add a deterministic loopback wire fixture for the live adapter. The current deterministic provider is in-memory behind Pi AI's provider API.

The separately authorized live smoke must still use exactly `deepseek-ai/DeepSeek-V4-Flash-0731` through DeepInfra, complete add/list, and record real usage. It is blocked on owner authorization and an approved protected credential file. No substitute model/provider or credential lookup is permitted. TD-002 and the epic remain unpassed.

## Changed paths

- `.nvmrc`, `package.json`, `package-lock.json`, `tsconfig.json`.
- `config/assistant.example.json`.
- `src/config.ts`, `src/cli.ts`, `src/http.ts`, `src/gateway.ts`, `src/runner.ts`.
- `src/host/store.ts`, `src/runtime/documents.ts`, `src/runtime/pi-durable.ts`.
- `src/tools/todos.ts`, `src/inference/budget.ts`, `src/inference/deepinfra.ts`.
- `tests/pi-durable-contract.test.ts`, `tests/pi-replay-contract.test.ts`, `tests/slice.test.ts`.
- This document, `docs/evidence/td002-focused-tests.txt`, `docs/evidence/td002-typecheck.txt`, `docs/evidence/td002-runtime-versions.json`.
- `docs/tickets/001-crash-safe-todo-slice.md`, `docs/tickets/002-first-todo-round-trip.md`, `docs/tickets/README.md`.
