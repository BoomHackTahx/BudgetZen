import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabel, languages, localeByLanguage, translate } from './i18n.js';

test('offers Malagasy, French, and English with the expected locales', () => {
  assert.deepEqual(languages.map(({ code }) => code), ['mg', 'fr', 'en']);
  assert.equal(localeByLanguage.mg, 'mg-MG');
  assert.equal(localeByLanguage.fr, 'fr-FR');
  assert.equal(localeByLanguage.en, 'en-GB');
});

test('translates common screens and categories into each supported language', () => {
  assert.equal(translate('mg', 'Topy maso'), 'Topy maso');
  assert.equal(translate('fr', 'Topy maso'), 'Vue d’ensemble');
  assert.equal(translate('en', 'Topy maso'), 'Overview');
  assert.equal(categoryLabel('fr', 'food'), 'Alimentation');
  assert.equal(categoryLabel('en', 'transport'), 'Transport');
});

test('interpolates account details in localized settings text', () => {
  assert.equal(
    translate('fr', 'Miditra amin’ny maha {email} anao.', { email: 'demo@example.com' }),
    'Connecté en tant que demo@example.com.',
  );
});

test('localizes password confirmation labels and mismatch feedback', () => {
  assert.equal(translate('mg', 'Hamarino ny tenimiafina'), 'Hamarino ny tenimiafina');
  assert.equal(translate('fr', 'Hamarino ny tenimiafina'), 'Confirmer le mot de passe');
  assert.equal(translate('en', 'Hamarino ny tenimiafina'), 'Confirm password');
  assert.equal(translate('fr', 'Tsy mitovy ny tenimiafina roa.'), 'Les deux mots de passe ne correspondent pas.');
});

test('localizes unexpected API response guidance', () => {
  assert.equal(
    translate('fr', 'Nahazo valiny tsy JSON ny app. Hamarino fa mandeha ny API ary andramo indray.'),
    'Réponse inattendue du serveur. Vérifiez que l’API fonctionne, puis réessayez.',
  );
  assert.equal(
    translate('en', 'Tsy hita ilay lalana nangatahina.'),
    'This API route was not found. Restart the API and try again.',
  );
});
