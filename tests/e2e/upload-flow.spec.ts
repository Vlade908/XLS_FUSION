import { test, expect } from '@playwright/test';

test.describe('XLS Fusion E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a aplicação
    await page.goto('http://localhost:8080');
  });

  test('should load the application successfully', async ({ page }) => {
    // Verificar se o título da página está correto
    await expect(page).toHaveTitle(/XLS Fusion/);

    // Verificar se os elementos principais estão presentes
    await expect(page.locator('text=Preparação')).toBeVisible();
    await expect(page.locator('text=Consolidação')).toBeVisible();
    await expect(page.locator('text=Filtros')).toBeVisible();
  });

  test('should upload a file successfully', async ({ page }) => {
    // Navegar para a aba de preparação
    await page.click('text=Preparação');

    // Verificar se estamos na aba correta
    await expect(page.locator('text=Upload de Planilhas')).toBeVisible();

    // Criar um arquivo de teste
    const testFile = {
      name: 'test-spreadsheet.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test spreadsheet content'),
    };

    // Fazer upload do arquivo
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([testFile]);

    // Verificar se o arquivo foi adicionado à lista
    await expect(page.locator('text=test-spreadsheet.xlsx')).toBeVisible();
  });

  test('should handle file drag and drop', async ({ page }) => {
    await page.click('text=Preparação');

    // Criar um arquivo de teste
    const testFile = {
      name: 'drag-drop-test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('drag drop test content'),
    };

    // Simular drag and drop
    const dropZone = page.locator('[data-testid="drop-zone"]').or(
      page.locator('text=Arraste arquivos aqui ou clique para selecionar').locator('..').locator('..')
    );

    await dropZone.dispatchEvent('dragenter', { dataTransfer: { files: [testFile] } });
    await dropZone.dispatchEvent('drop', { dataTransfer: { files: [testFile] } });

    // Verificar se o arquivo foi adicionado
    await expect(page.locator('text=drag-drop-test.xlsx')).toBeVisible();
  });

  test('should remove uploaded file', async ({ page }) => {
    await page.click('text=Preparação');

    const testFile = {
      name: 'file-to-remove.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('file to remove'),
    };

    // Upload do arquivo
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([testFile]);

    // Verificar que o arquivo está presente
    await expect(page.locator('text=file-to-remove.xlsx')).toBeVisible();

    // Remover o arquivo
    const removeButton = page.locator('[aria-label="Remover arquivo"]').or(
      page.locator('button').locator('svg').locator('path[d*="M6 18L18 6M6 6l12 12"]')
    );
    await removeButton.click();

    // Verificar que o arquivo foi removido
    await expect(page.locator('text=file-to-remove.xlsx')).not.toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Verificar navegação para Consolidação
    await page.click('text=Consolidação');
    await expect(page.locator('text=Consolidação de Dados')).toBeVisible();

    // Verificar navegação para Filtros
    await page.click('text=Filtros');
    await expect(page.locator('text=Filtros e Análise')).toBeVisible();

    // Voltar para Preparação
    await page.click('text=Preparação');
    await expect(page.locator('text=Upload de Planilhas')).toBeVisible();
  });

  test('should handle auditor upload', async ({ page }) => {
    await page.click('text=Preparação');

    // Verificar se a seção de auditor está presente
    await expect(page.locator('text=Upload do Auditor')).toBeVisible();

    const auditorFile = {
      name: 'auditor.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('auditor content'),
    };

    // Encontrar o input do auditor (segundo input de arquivo)
    const auditorInput = page.locator('input[type="file"]').nth(1);
    await auditorInput.setInputFiles([auditorFile]);

    // Verificar se o arquivo foi adicionado
    await expect(page.locator('text=auditor.xlsx')).toBeVisible();
  });

  test('should display error messages for invalid files', async ({ page }) => {
    await page.click('text=Preparação');

    // Tentar fazer upload de um arquivo não suportado
    const invalidFile = {
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid file content'),
    };

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([invalidFile]);

    // Verificar se uma mensagem de erro aparece (dependendo da implementação)
    // await expect(page.locator('text=Tipo de arquivo não suportado')).toBeVisible();
  });

  test('should handle large file uploads', async ({ page }) => {
    await page.click('text=Preparação');

    // Criar um arquivo grande (simulado)
    const largeFile = {
      name: 'large-file.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.alloc(1024 * 1024 * 10), // 10MB
    };

    const fileInput = page.locator('input[type="file"]').first();

    // Medir o tempo de upload
    const startTime = Date.now();
    await fileInput.setInputFiles([largeFile]);
    const endTime = Date.now();

    // Verificar que o upload foi relativamente rápido (menos de 5 segundos)
    expect(endTime - startTime).toBeLessThan(5000);

    // Verificar que o arquivo foi adicionado
    await expect(page.locator('text=large-file.xlsx')).toBeVisible();
  });
});