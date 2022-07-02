# @xata.io/client

## 0.12.0

### Minor Changes

- [#376](https://github.com/xataio/client-ts/pull/376) [`db3c88e`](https://github.com/xataio/client-ts/commit/db3c88e1f2bee6d308afb8d6e95b7c090a87e7a7) Thanks [@SferaDev](https://github.com/SferaDev)! - Hide xata object and expose getMetadata method

### Patch Changes

- [#364](https://github.com/xataio/client-ts/pull/364) [`1cde95f`](https://github.com/xataio/client-ts/commit/1cde95f05a6b9fbf0564ea05400140f0cef41a3a) Thanks [@SferaDev](https://github.com/SferaDev)! - Add peer dep of TS 4.5+

* [#362](https://github.com/xataio/client-ts/pull/362) [`57bf0e2`](https://github.com/xataio/client-ts/commit/57bf0e2e049ed0498683ff42d287983f295342b7) Thanks [@SferaDev](https://github.com/SferaDev)! - Do not show error if date is not defined

## 0.11.0

### Minor Changes

- [#322](https://github.com/xataio/client-ts/pull/322) [`bc64c28`](https://github.com/xataio/client-ts/commit/bc64c28fbfbb000c7190ac8092e2ef6a261df86f) Thanks [@SferaDev](https://github.com/SferaDev)! - Add filter support for cross-table search operations

### Patch Changes

- [#327](https://github.com/xataio/client-ts/pull/327) [`505257c`](https://github.com/xataio/client-ts/commit/505257c0c42ca0c8beaf5c0f638037c576dcc43c) Thanks [@SferaDev](https://github.com/SferaDev)! - Allow reading multiple uids at the same time

* [#346](https://github.com/xataio/client-ts/pull/346) [`ff7e5c6`](https://github.com/xataio/client-ts/commit/ff7e5c6f211913196d8c28600d7a7675ed261688) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix compat with TS 4.8

- [#345](https://github.com/xataio/client-ts/pull/345) [`bf64cb8`](https://github.com/xataio/client-ts/commit/bf64cb885d55a0271e966314384324f02ded084e) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix bug with nullable record filters inferred as never

* [#334](https://github.com/xataio/client-ts/pull/334) [`ce07601`](https://github.com/xataio/client-ts/commit/ce07601e4ddf9f75e20249d479dc04a63795ca96) Thanks [@SferaDev](https://github.com/SferaDev)! - Add support for TS 4.5

- [#325](https://github.com/xataio/client-ts/pull/325) [`12f1ce3`](https://github.com/xataio/client-ts/commit/12f1ce362f6cda27dfdb3afab0800282bddc8b5e) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix offset errors with operations that affect many rows

* [#345](https://github.com/xataio/client-ts/pull/345) [`a73a2a2`](https://github.com/xataio/client-ts/commit/a73a2a2014c44cf88eaef42196ba1dba9d516b4a) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix issue with Filter<T> not narrowing down type on object properties

## 0.10.2

### Patch Changes

- [#312](https://github.com/xataio/client-ts/pull/312) [`0edf1af`](https://github.com/xataio/client-ts/commit/0edf1af2205c4761d53a02c74ddaab3168d69775) Thanks [@SferaDev](https://github.com/SferaDev)! - Add filtering to search by table

* [#312](https://github.com/xataio/client-ts/pull/312) [`66ad7cc`](https://github.com/xataio/client-ts/commit/66ad7cc0365046c5d039c37117feac04428d8373) Thanks [@SferaDev](https://github.com/SferaDev)! - Add new API method for searching in a given table

## 0.10.1

### Patch Changes

- [#271](https://github.com/xataio/client-ts/pull/271) [`0bb17b8`](https://github.com/xataio/client-ts/commit/0bb17b88d49f1c8be32d2d6b0b3a5918890876cb) Thanks [@SferaDev](https://github.com/SferaDev)! - Link and resolve branches from git

## 0.10.0

### Minor Changes

- [#272](https://github.com/xataio/client-ts/pull/272) [`6d76275`](https://github.com/xataio/client-ts/commit/6d7627555a404a4c2da42f4187df6f8300f9a46f) Thanks [@SferaDev](https://github.com/SferaDev)! - Rename page options to pagination

* [#270](https://github.com/xataio/client-ts/pull/270) [`1864742`](https://github.com/xataio/client-ts/commit/18647428d8608841de514c3784fb711c39dccc6d) Thanks [@SferaDev](https://github.com/SferaDev)! - Move chunk to options object

### Patch Changes

- [#281](https://github.com/xataio/client-ts/pull/281) [`d1ec0df`](https://github.com/xataio/client-ts/commit/d1ec0df14834088a816919bfc68216f3f9b2d9ef) Thanks [@SferaDev](https://github.com/SferaDev)! - Do not send from param on undefined

* [#282](https://github.com/xataio/client-ts/pull/282) [`1af6f1a`](https://github.com/xataio/client-ts/commit/1af6f1aaa1123e77a895961581c87f06a88db698) Thanks [@SferaDev](https://github.com/SferaDev)! - Do not allow filter/sort with cursor navigation

- [#284](https://github.com/xataio/client-ts/pull/284) [`be4eda8`](https://github.com/xataio/client-ts/commit/be4eda8f73037d97fef7de28b56d7471dd867875) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix cache ttl with 0 value

* [#265](https://github.com/xataio/client-ts/pull/265) [`99be734`](https://github.com/xataio/client-ts/commit/99be734827576d888aa12a579ed1983a0a8a8e83) Thanks [@SferaDev](https://github.com/SferaDev)! - Add datetime field type support

## 0.9.1

### Patch Changes

- [#250](https://github.com/xataio/client-ts/pull/250) [`5d7c9e4`](https://github.com/xataio/client-ts/commit/5d7c9e4fa2799255e2bfc8b6fb12c89dc4e1f35e) Thanks [@xata-bot](https://github.com/xata-bot)! - Add branch resolution endpoints to api client

* [#261](https://github.com/xataio/client-ts/pull/261) [`e95f20a`](https://github.com/xataio/client-ts/commit/e95f20a7bce264936680353f816065fa379448fc) Thanks [@gimenete](https://github.com/gimenete)! - Fixes a compatibility error in CloudFlare workers with latest version of wrangler

## 0.9.0

### Minor Changes

- [#246](https://github.com/xataio/client-ts/pull/246) [`2848894`](https://github.com/xataio/client-ts/commit/284889446bbac5d6737086bf01a588d97b841730) Thanks [@SferaDev](https://github.com/SferaDev)! - Rename getOne to getFirst

### Patch Changes

- [#254](https://github.com/xataio/client-ts/pull/254) [`2fc2788`](https://github.com/xataio/client-ts/commit/2fc2788e583c047ffb2cd693f053f60ce608149c) Thanks [@SferaDev](https://github.com/SferaDev)! - Deprecate XataApiClient

* [#230](https://github.com/xataio/client-ts/pull/230) [`a96da7c`](https://github.com/xataio/client-ts/commit/a96da7c8b548604ed25001390992531537675a44) Thanks [@SferaDev](https://github.com/SferaDev)! - Include tables in Proxy target for object introspection (shell)

- [#222](https://github.com/xataio/client-ts/pull/222) [`e8d595f`](https://github.com/xataio/client-ts/commit/e8d595f54efe126b39c78cc771a5d69c551f4fba) Thanks [@SferaDev](https://github.com/SferaDev)! - Add cache strategies

* [#244](https://github.com/xataio/client-ts/pull/244) [`c4dcd11`](https://github.com/xataio/client-ts/commit/c4dcd110d8f9dc3a7e4510f2f00257c9109e51fa) Thanks [@gimenete](https://github.com/gimenete)! - getCurrentBranchName never returns a Promise that resolves to undefined

## 0.8.4

### Patch Changes

- dd958a4: Fix search results return type
- f5ec686: Make XataApiClientOptions optional

## 0.8.3

### Patch Changes

- c660356: Export ESM and CJS bundles

## 0.8.2

### Patch Changes

- 3d81e7a: Make db model references stable

## 0.8.1

### Patch Changes

- 5110261: Fix execution from the browser
- aa3d7e7: Allow sending sort as in the API
- 0047193: Add new plugin system for the SDK
- 43856a5: Add discriminated union search

## 0.8.0

### Patch Changes

- bde908e: Refactor client builder
- ea3eef8: Make records returned by the API readonly

## 0.7.2

### Patch Changes

- 4803b6f: Memoize ApiClient namespaces
- 1f268d7: Add search in XataClient
- d58c3d9: Hide private helper utilities
- f3b731b: Expose branch resolution API

## 0.7.1

### Patch Changes

- 01aef78: Fix bundle for browsers
- 56be1fd: Allow sending updates with link object
- fc51771: Add includes operator helper methods

## 0.7.0

### Minor Changes

- 6ce5512: Add bulk operations for all methods
- 2a1fa4f: Introduced automatic branch resolution mechanism

### Patch Changes

- d033f3a: Improve column selection output type with non-nullable columns
- b1e92db: Include stack trace with errors
- deed570: Improve sorting with multiple properties
- 80b5417: Improve filtering types

## 0.6.0

### Minor Changes

- 084f5df: Add type inference for columns
- bb73c89: Unify create and insert in a single method overload

### Patch Changes

- 716c487: Forward nullable types on links
- bb66bb2: Fix error handling with createMany
- 084f5df: Fix circular dependencies on selectable column

## 0.5.1

### Patch Changes

- 12729ab: Make API client fetch implementation optional

## 0.5.0

### Patch Changes

- 14ec7d1: Fix in Selectable type

## 0.4.0

### Patch Changes

- b951331: Add support for new float column
- d470610: Add new getAll() method
- eaf92a8: Expose pagination constants (size and offset limits)
- 57fde77: Reduce subrequests for createMany
- eaf92a8: Implement schema-less client
- 97a3caa: Make createBranch from optional with empty branch

## 0.3.0

### Minor Changes

- 1c0a454: Add API Client and internally use it

### Patch Changes

- 122321c: Fix client in CF workers and Deno
- a2671b5: Allow cancel or resend workspace invites
- e73d470: Split insert and create
