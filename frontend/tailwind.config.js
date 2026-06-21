export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        huGreen: '#008751',
        huGreenDark: '#006B3C',
        huBlue: '#1E73BE',
        huGold: '#C9932A',
        huBg: '#F8FAFC',
        huText: '#1F2937'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(31, 41, 55, 0.10)',
        glass: '0 24px 80px rgba(30, 115, 190, 0.14)'
      }
    }
  },
  plugins: []
};
