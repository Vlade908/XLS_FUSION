import { ClipboardPaste } from 'lucide-react';

interface AssignmentRulesProps {
  rules: string;
  onRulesChange: (rules: string) => void;
}

export function AssignmentRules({ rules, onRulesChange }: AssignmentRulesProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Regras de Atribuição
      </label>
      <div className="relative">
        <textarea
          value={rules}
          onChange={(e) => onRulesChange(e.target.value)}
          placeholder="Exemplo:&#10;Lucimara 1.0 a 2.0&#10;João 2.1 a 3.5&#10;Maria 3.6 a 5.0"
          className="w-full h-40 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none font-mono text-sm"
        />
        <ClipboardPaste className="absolute top-3 right-3 h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Cole a lista de atribuições no formato: Nome início a fim (uma por linha)
      </p>
    </div>
  );
}
