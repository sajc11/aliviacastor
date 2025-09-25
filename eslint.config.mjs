import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist','node_modules'] },
  ...astro.configs['flat/recommended'],
  { files:['**/*.astro'], plugins:{'jsx-a11y':jsxA11y}, rules:{...astro.configs['jsx-a11y-recommended'].rules}},
  { files:['**/*.{ts,tsx}'],
    languageOptions:{ parser: tseslint.parser, parserOptions:{ project:'./tsconfig.json', ecmaFeatures:{jsx:true}}},
    plugins:{'@typescript-eslint': tseslint.plugin, react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y},
    settings:{ react:{version:'detect'} },
    rules:{ ...tseslint.configs.recommendedTypeChecked.rules, ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules, ...jsxA11y.configs.recommended.rules,
            'react/react-in-jsx-scope':'off','no-undef':'off' } },
  prettier,
);