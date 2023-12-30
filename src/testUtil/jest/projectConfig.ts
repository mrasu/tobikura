import { Config } from "@jest/reporters";

const DEFAULT_PROJECT_CONFIG: Config.ProjectConfig = {
  automock: false,
  cache: false,
  cacheDirectory: "/test_cache_dir/",
  clearMocks: false,
  collectCoverageFrom: ["src", "!public"],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [],
  cwd: "/test_root_dir/",
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: undefined,
  errorOnDeprecated: false,
  extensionsToTreatAsEsm: [],
  fakeTimers: { enableGlobally: false },
  filter: undefined,
  forceCoverageMatch: [],
  globalSetup: undefined,
  globalTeardown: undefined,
  globals: {},
  haste: {},
  id: "test_name",
  injectGlobals: true,
  moduleDirectories: [],
  moduleFileExtensions: ["js"],
  moduleNameMapper: [],
  modulePathIgnorePatterns: [],
  modulePaths: [],
  openHandlesTimeout: 1000,
  prettierPath: "prettier",
  resetMocks: false,
  resetModules: false,
  resolver: undefined,
  restoreMocks: false,
  rootDir: "/test_root_dir/",
  roots: [],
  runner: "jest-runner",
  runtime: "/test_module_loader_path",
  sandboxInjectedGlobals: [],
  setupFiles: [],
  setupFilesAfterEnv: [],
  skipFilter: false,
  skipNodeResolution: false,
  slowTestThreshold: 5,
  snapshotFormat: {},
  snapshotResolver: undefined,
  snapshotSerializers: [],
  testEnvironment: "node",
  testEnvironmentOptions: {},
  testLocationInResults: false,
  testMatch: [],
  testPathIgnorePatterns: [],
  testRegex: ["\\.test\\.js$"],
  testRunner: "jest-circus/runner",
  transform: [],
  transformIgnorePatterns: [],
  unmockedModulePathPatterns: undefined,
  watchPathIgnorePatterns: [],
};

export function buildProjectConfig(
  overrides: Partial<Config.ProjectConfig> = {},
): Config.ProjectConfig {
  return { ...DEFAULT_PROJECT_CONFIG, ...overrides };
}