export const config: CodeceptJS.MainConfig = {
  tests: './tests/*_test.ts',
  output: 'y',
  helpers: {
    REST: {
      endpoint: 'http://localhost:3000',
    },
    JSONResponse: {},
  },
  include: {
    I: './steps_file.ts',
  },
  noGlobals: true,
  plugins: {},
  name: 'mini-ecommerce-api',
  require: ['tsx/esm'],
};
