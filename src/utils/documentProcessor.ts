export interface Assignment {
  name: string;
  start: number;
  end: number;
}

export function parseAssignmentRules(rulesText: string): Assignment[] {
  const lines = rulesText.split('\n').filter(line => line.trim());
  const assignments: Assignment[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+([\d.]+)\s+a\s+([\d.]+)/i);
    if (match) {
      const [, name, start, end] = match;
      assignments.push({
        name: name.trim(),
        start: parseFloat(start),
        end: parseFloat(end),
      });
    }
  }

  return assignments;
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export function extractAnswersFromFile(content: string, start: number, end: number): Map<string, string> {
  const answers = new Map<string, string>();
  const lines = content.split('\n');

  let currentQuestion: string | null = null;
  let currentAnswer = '';

  for (const line of lines) {
    const questionMatch = line.match(/^([\d.]+)\s*[:-]?\s*(.*)$/);

    if (questionMatch) {
      if (currentQuestion) {
        answers.set(currentQuestion, currentAnswer.trim());
      }

      const questionNum = parseFloat(questionMatch[1]);

      if (questionNum >= start && questionNum <= end) {
        currentQuestion = questionMatch[1];
        currentAnswer = questionMatch[2] || '';
      } else {
        currentQuestion = null;
        currentAnswer = '';
      }
    } else if (currentQuestion) {
      currentAnswer += '\n' + line;
    }
  }

  if (currentQuestion) {
    answers.set(currentQuestion, currentAnswer.trim());
  }

  return answers;
}

export function findEmployeeFile(employeeName: string, files: File[]): File | undefined {
  const normalizedName = employeeName.toLowerCase().trim();

  return files.find(file => {
    const fileName = file.name.toLowerCase();
    return fileName.includes(normalizedName);
  });
}

export async function processDocuments(
  templateFile: File,
  employeeFiles: File[],
  assignments: Assignment[]
): Promise<string> {
  const templateContent = await readFileAsText(templateFile);
  let finalDocument = templateContent;

  const allAnswers = new Map<string, string>();

  for (const assignment of assignments) {
    const employeeFile = findEmployeeFile(assignment.name, employeeFiles);

    if (!employeeFile) {
      console.warn(`Arquivo não encontrado para: ${assignment.name}`);
      continue;
    }

    const fileContent = await readFileAsText(employeeFile);
    const answers = extractAnswersFromFile(fileContent, assignment.start, assignment.end);

    answers.forEach((answer, question) => {
      allAnswers.set(question, answer);
    });
  }

  allAnswers.forEach((answer, question) => {
    const tag = `{resposta ${question}}`;
    const regex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    finalDocument = finalDocument.replace(regex, answer);
  });

  const tagPattern = /\{resposta[^}]*\}/gi;
  finalDocument = finalDocument.replace(tagPattern, '[Resposta não encontrada]');

  return finalDocument;
}

export function downloadDocument(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
