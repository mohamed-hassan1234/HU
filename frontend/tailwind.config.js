export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        huGreen: '#078B56',
        huGreenDark: '#05633F',
        huBlue: '#2E8BBD',
        huGold: '#C9932A',
        huBg: '#F3F6F9',
        huText: '#263238'
      },
      boxShadow: {
        soft: '0 2px 4px rgba(15, 34, 58, 0.06)',
        glass: '0 8px 24px rgba(15, 34, 58, 0.10)'
      }
    }
  },
  plugins: []
};
