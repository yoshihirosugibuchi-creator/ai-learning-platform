import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "next-env.d.ts",
      "scripts/**/*",
      "./scripts/**",
      "public/**",
      "ios/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": [
        "warn",
        {
          "ignoreRestArgs": true
        }
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      // 🚨 CRITICAL: Prohibit auth.users.user_metadata.role usage & 無限ループ防止
      "no-restricted-syntax": [
        "error",
        {
          "selector": "MemberExpression[object.object.property.name='user_metadata'][property.name='role']",
          "message": "🚨 FORBIDDEN: Never use auth.users.user_metadata.role! Always use users table role instead. See CLAUDE.md for details."
        },
        {
          "selector": "Literal[value='role'][parent.type='Property'][parent.parent.property.name='user_metadata']",
          "message": "🚨 FORBIDDEN: Never access 'role' from user_metadata! Always use users table role instead."
        },
        {
          "selector": "CallExpression[callee.name='useEffect'] ArrayExpression[elements.*.name='profile']",
          "message": "⚠️ INFINITE LOOP RISK: useEffect with 'profile' in dependencies may cause infinite loop if 'profile' is updated inside the effect. Consider removing 'profile' from dependencies. See CLAUDE.md for AuthProvider pattern."
        }
      ],
      // 🔄 React Hook無限ループ防止ルール (2025.10.09追加)
      "react-hooks/exhaustive-deps": [
        "error",
        {
          "additionalHooks": "useCustomEffect|useAsyncEffect",
          "enableDangerousAutofixThisMayCauseInfiniteLoops": false
        }
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // 管理者API・デバッグAPIでのSupabase情報スキーマアクセス許可
    files: ["**/api/admin/**/*.ts", "**/api/debug/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // 情報スキーマアクセス等の正当な用途で許可
    },
  },
];

export default eslintConfig;
