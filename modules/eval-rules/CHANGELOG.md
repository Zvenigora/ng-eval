# Changelog — `@zvenigora/ng-eval-rules`

All notable changes to `@zvenigora/ng-eval-rules` are documented in this file. The other packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **The rule format and `compileRule`.** `Rule` and its parts are the format, as TypeScript types,
  and `defineRule` types a rule written in TypeScript. `compileRule(rule, options?)` checks a rule,
  parses each of its expression fields once, and returns either the compiled rule or every problem
  it found, each with a `code`, a `path` and a `message`; the README lists the codes. For a rule
  JSON can write, it throws for none of them, only for the caller's options: one it does not
  define, `caseInsensitive` among them, one of the wrong type, and a key in an effect's
  declaration. The package peers
  `acorn-walk ^8.3.0`. Phase 12 step 3.
