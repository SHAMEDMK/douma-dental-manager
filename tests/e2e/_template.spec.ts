/**
 * Template pour nouveaux tests E2E – DOUMA Dental Manager
 * Copier ce fichier, le renommer (ex. ma-fonctionnalite.spec.ts) et l’ajouter
 * au testMatch du projet concerné dans playwright.config.ts (admin, client ou no-auth).
 *
 * - Projets admin/client : la session est déjà chargée (storageState), pas besoin de login.
 * - Projet no-auth : ex. test de login ou d’API publique ; faire le login dans beforeEach si besoin.
 */

import { test, expect } from '@playwright/test';

test.describe('Nom de la fonctionnalité', () => {
  test.beforeEach(async ({ page }) => {
    // Exemple pour un test no-auth qui nécessite une connexion :
    // await page.goto('/login');
    // await page.getByRole('textbox', { name: /email/i }).fill('admin@douma.com');
    // await page.getByLabel(/mot de passe/i).fill('password');
    // await page.getByTestId('login-submit').click();
    // await expect(page).toHaveURL(/\/admin\//, { timeout: 15000 });
    //
    // Pour admin/client : déjà connecté, aller directement sur la page à tester.
    await page.goto('/');
  });

  test('Scénario nominal', async ({ page }) => {
    // Arrange : état initial si besoin
    await page.goto('/admin/orders');

    // Act : privilégier getByTestId (stable), getByRole, puis getByText
    await page.getByTestId('exemple-bouton').click();

    // Assert : préférer expect avec timeout explicite plutôt que waitForTimeout
    await expect(page.getByTestId('order-form')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/orders\/.+/);
  });

  test('Scénario d’erreur ou cas limite', async ({ page }) => {
    // Exemple : vérifier un message d’erreur
    await page.getByRole('button', { name: /soumettre/i }).click();
    await expect(page.getByText(/erreur|invalide/i)).toBeVisible({ timeout: 5000 });
  });
});
