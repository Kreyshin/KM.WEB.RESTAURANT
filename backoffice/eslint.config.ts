import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'km/archivos',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'km/ignorados',
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      // Identidad de plataforma preservada: no se edita, no se audita.
      'src/assets/karma/**',
    ],
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'km/reglas',
    rules: {
      // Los componentes de vista son de una palabra por convención del proyecto
      // (CartaView, MesasView), y el router los referencia por ruta.
      'vue/multi-word-component-names': 'off',

      // Con props declaradas por tipo, `id?: string` ya expresa «puede no venir».
      // Exigir un default obligaría a inventar valores vacíos sin significado.
      'vue/require-default-prop': 'off',

      // Un `any` silencioso es la vía rápida a un error en producción.
      '@typescript-eslint/no-explicit-any': 'error',

      // Permite marcar un argumento como intencionadamente sin usar: `_password`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Prettier manda en formato: estas reglas se apagan para no pelearse.
  skipFormatting,
)
