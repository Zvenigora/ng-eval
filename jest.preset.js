const nxPreset = require('@nx/jest/preset').default;

// One worker, so Jest runs every test file in band, in its own process, and
// starts no worker for jest-worker to force-exit after its fixed 500 ms grace
// period. Uncapped, each project starts cores - 1 workers and `nx run-many`
// runs the projects side by side. See `docs/backlog-retired.md` F7.
module.exports = { ...nxPreset, maxWorkers: 1 };
