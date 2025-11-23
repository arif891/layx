// ESBuild configuration for JavaScript processing
export const esbuildConfig = {
  // Base/main application JS bundling
  layx: {
    minify: true,
    sourcemap: false,
    format: 'esm',
    target: 'esnext',
    charset: 'utf8',
    legalComments: 'none',
  },

  // Add custom bundles below (users can modify here)
  // Example:
  // custom: {
  //   entryPoints: ['assets/js/custom.js'],
  //   outfile: 'layx/assets/js/custom.min.js',
  //   minify: true,
  //   format: 'esm'
  // }
};
