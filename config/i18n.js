const i18n = require('i18n');
const path = require('path');

i18n.configure({
    locales: ['en', 'fr', 'ar'],
    defaultLocale: 'en',
    directory: path.join(__dirname, '../locales'),
    objectNotation: true,
    queryParameter: 'lang',
    autoReload: true,
    updateFiles: false,
    syncFiles: false
});

module.exports = i18n;
