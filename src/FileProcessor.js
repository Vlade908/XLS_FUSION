import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const FileProcessor = () => {
  const [baseFile, setBaseFile] = useState(null);
  const [employeeFiles, setEmployeeFiles] = useState([]);
  const [rules, setRules] = useState("");

  // Função para parsear a regra: "Lucimara 1.0 a 2.0"
  const parseRule = (ruleLine) => {
    const parts = ruleLine.split(" ");
    const name = parts[0];
    const range = ruleLine.substring(name.length).trim();
    
    let questions = [];
    if (range.includes(" a ")) {
      const [start, end] = range.split(" a ").map(parseFloat);
      questions = { type: 'range', start, end };
    } else {
      questions = { type: 'list', list: range.split(",") };
    }
    return { name, questions };
  };

  const processFiles = async () => {
    if (!baseFile || employeeFiles.length === 0) return alert("Selecione os arquivos!");

    const rulesArray = rules.split("\n").filter(line => line.trim() !== "").map(parseRule);
    let allAnswers = [];

    for (const rule of rulesArray) {
      const file = Array.from(employeeFiles).find(f => f.name.toLowerCase().includes(rule.name.toLowerCase()));
      
      if (file) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        // Filtra as questões baseadas na regra
        const filtered = json.filter(row => {
          const qId = parseFloat(row.Questao || row.ID); // Ajuste o nome da coluna conforme seu Excel
          if (rule.questions.type === 'range') {
            return qId >= rule.questions.start && qId <= rule.questions.end;
          }
          return rule.questions.list.includes(String(qId));
        });

        allAnswers.push(...filtered);
      }
    }

    // Gerar o arquivo final baseado no Base
    const baseData = await baseFile.arrayBuffer();
    const baseWorkbook = XLSX.read(baseData);
    const baseSheet = baseWorkbook.Sheets[baseWorkbook.SheetNames[0]];
    
    // Converte a base para String para substituir a tag {resposta}
    // Nota: Esta é uma abordagem simplificada para preencher dados em massa
    const newSheet = XLSX.utils.json_to_sheet(allAnswers);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Consolidado");
    
    XLSX.writeFile(newWorkbook, "Resultado_Final.xlsx");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4">Processador de Questionários</h2>
      
      <div className="mb-4">
        <label className="block font-medium">Arquivo Base (Template):</label>
        <input type="file" onChange={(e) => setBaseFile(e.target.files[0])} className="w-full p-2 border rounded" />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Arquivos dos Funcionários (Selecione todos):</label>
        <input type="file" multiple onChange={(e) => setEmployeeFiles(e.target.files)} className="w-full p-2 border rounded" />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Regras (Ex: Lucimara 1.0 a 2.0):</label>
        <textarea 
          value={rules} 
          onChange={(e) => setRules(e.target.value)}
          placeholder="Um por linha: Nome Inicio a Fim"
          className="w-full p-2 border rounded h-32"
        />
      </div>

      <button 
        onClick={processFiles}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        Gerar Arquivo Consolidado
      </button>
    </div>
  );
};

export default FileProcessor;