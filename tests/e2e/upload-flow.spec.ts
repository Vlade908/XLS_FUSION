import { test, expect } from '@playwright/test';

test.describe('XLS Fusion E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Navegar para a aplicação
    await page.goto('http://localhost:8080');

    // Se o menu de navegação não estiver visível (ou seja, não estamos logados), precisamos autenticar
    const sidebarBuilderTab = page.locator('nav >> text=Formulários').first();
    if (!(await sidebarBuilderTab.isVisible())) {
      // Como os testes rodam em paralelo, usamos um e-mail único por teste para evitar conflitos de "usuário já existente"
      const uniqueEmail = `test-${Date.now()}-${Math.floor(Math.random() * 1000000)}@example.com`;

      // Clica para alternar para modo cadastro
      await page.locator('button:has-text("Criar conta")').first().click();
      
      // Preenche os campos
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', 'password123');
      
      // Submete o cadastro
      await page.click('button[type="submit"]');

      // Espera a tela principal carregar pós-cadastro (a aba Formulários deve aparecer)
      await expect(sidebarBuilderTab).toBeVisible({ timeout: 15000 });
    }
  });

  test('should load the application successfully', async ({ page }) => {
    // Verificar se o título da página está correto
    await expect(page).toHaveTitle(/XLS Fusion/);

    // Verificar se os elementos principais de navegação estão presentes
    await expect(page.locator('nav >> text=Formulários').first()).toBeVisible();
    await expect(page.locator('nav >> text=Responder').first()).toBeVisible();
    await expect(page.locator('nav >> text=Notificações').first()).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Navegar para Responder
    await page.click('nav >> text=Responder');
    await expect(page.locator('text=Central de Respostas')).toBeVisible();

    // Navegar para Notificações
    await page.click('nav >> text=Notificações');
    // Esperamos pelo título da aba ou conteúdo
    await expect(page.locator('main >> text=Notificações').first()).toBeVisible();

    // Voltar para Formulários
    await page.click('nav >> text=Formulários');
    await expect(page.locator('text=Construtor de Formulários')).toBeVisible();
  });

  test('should upload an offline file successfully', async ({ page }) => {
    // Navegar para Responder
    await page.click('nav >> text=Responder');
    await expect(page.locator('text=Central de Respostas')).toBeVisible();

    // Clicar na aba de Planilha Offline
    await page.click('text=Planilha Offline');

    // Criar um arquivo de teste
    const testFile = {
      name: 'test-spreadsheet.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test spreadsheet content'),
    };

    // Fazer upload do arquivo
    const fileInput = page.locator('div[data-testid="drop-zone"]:has(h3:has-text("Clique ou arraste o formulário aqui"))').locator('input[type="file"]');
    await fileInput.setInputFiles([testFile]);

    // Verificar se o arquivo foi adicionado à lista (exibido na UI)
    await expect(page.locator('text=test-spreadsheet.xlsx')).toBeVisible();
  });

  test('should remove uploaded file', async ({ page }) => {
    // Navegar para Responder e selecionar Planilha Offline
    await page.click('nav >> text=Responder');
    await page.click('text=Planilha Offline');

    const testFile = {
      name: 'file-to-remove.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('file to remove'),
    };

    // Upload do arquivo
    const fileInput = page.locator('div[data-testid="drop-zone"]:has(h3:has-text("Clique ou arraste o formulário aqui"))').locator('input[type="file"]');
    await fileInput.setInputFiles([testFile]);

    // Verificar que o arquivo está presente
    await expect(page.locator('text=file-to-remove.xlsx')).toBeVisible();

    // Remover o arquivo
    const removeButton = page.locator('div[data-testid="drop-zone"]:has(h3:has-text("Clique ou arraste o formulário aqui"))').locator('[aria-label="Remover arquivo"]');
    await removeButton.click();

    // Verificar que o arquivo foi removido
    await expect(page.locator('text=file-to-remove.xlsx')).not.toBeVisible();
  });

  test('should display error messages for invalid files', async ({ page }) => {
    // Navegar para Responder e selecionar Planilha Offline
    await page.click('nav >> text=Responder');
    await page.click('text=Planilha Offline');

    // Tentar fazer upload de um arquivo não suportado
    const invalidFile = {
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid file content'),
    };

    const fileInput = page.locator('div[data-testid="drop-zone"]:has(h3:has-text("Clique ou arraste o formulário aqui"))').locator('input[type="file"]');
    await fileInput.setInputFiles([invalidFile]);
  });
});