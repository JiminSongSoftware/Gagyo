import type {
  afterAll as afterAllType,
  afterEach as afterEachType,
  beforeAll as beforeAllType,
  beforeEach as beforeEachType,
  describe as describeType,
  expect as expectType,
  it as itType,
  jest as jestType,
  test as testType,
} from '@jest/globals';

declare global {
  const describe: typeof describeType;
  const it: typeof itType;
  const test: typeof testType;
  const expect: typeof expectType;
  const jest: typeof jestType;
  const beforeAll: typeof beforeAllType;
  const afterAll: typeof afterAllType;
  const beforeEach: typeof beforeEachType;
  const afterEach: typeof afterEachType;
}

export {};
