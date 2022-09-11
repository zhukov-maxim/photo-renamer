module.exports = {
  env: {
    browser: true
  },
  extends: 'airbnb-base',
  plugins: ['import'],
  rules: {
    'arrow-parens': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'global-require': 'off',
    'no-console': 'off'
  }
};
