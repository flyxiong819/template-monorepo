
module.exports = {
  input: 'index.ts',
  output: 
  {
    name: 'baseLib',
    file: 'dist/bundle.umd.js',
    format: 'umd',
  },
  plugins: [
    require('@rollup/plugin-typescript')({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
    require('@rollup/plugin-node-resolve')(),
    require('@rollup/plugin-commonjs')(),
    require('rollup-plugin-terser').terser(),
  ],
  external: ['vue'],
  watch: {
    include: ['src/**', 'index.ts'],
    clearScreen: false,
  },
};