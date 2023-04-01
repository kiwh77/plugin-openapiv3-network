import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import copy from 'rollup-plugin-copy'

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.js',
    format: 'es',
    sourcemap: true
  },
  external: ['handlebars', 'handlebars-helpers'],
  plugins: [
    typescript(),
    resolve(),
    copy({
      targets: [{ src: './src/templates/*', dest: 'dist/templates' }]
    })
  ]
}
