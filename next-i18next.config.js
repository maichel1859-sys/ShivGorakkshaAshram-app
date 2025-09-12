module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi', 'mr'], // English, Hindi, Marathi
  },
  react: {
    useSuspense: false,
  },
  localePath: typeof window === 'undefined' ? require('path').resolve('./public/locales') : '/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
}