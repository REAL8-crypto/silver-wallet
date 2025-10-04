module.exports = {
  presets: [
    'react-app',
    ['@babel/preset-env', { 
      targets: '> 0.25%, not dead',
      useBuiltIns: 'entry',
      corejs: 3,
      modules: false
    }]
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      corejs: 3,
      helpers: true,
      regenerator: true
    }]
  ]
};
