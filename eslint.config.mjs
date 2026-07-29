import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototype/mock tĩnh do designer đổ vào — không phải mã nguồn app, không lint.
    "Learn_English_PWA_Design/**",
    "mocks/**",
  ]),
  {
    rules: {
      // Pattern khởi tạo/reset state trong effect (auth-init, reset form theo `open`)
      // là idiomatic và đã có sẵn trong repo — hạ xuống warn thay vì chặn build.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
