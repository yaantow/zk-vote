/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          esModuleInterop: true,
          allowJs: true,
          strict: true,
          noEmit: true,
          resolveJsonModule: true,
          isolatedModules: true,
          target: "ES2017",
          paths: { "@/*": ["./*"] },
        },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testMatch: ["**/__tests__/**/*.test.ts"],
};
