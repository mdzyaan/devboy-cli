export function languageForPath(filePath) {
  if (!filePath) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  return 'javascript';
}

export async function fetchDependencyNames() {
  const res = await fetch('/api/packages');
  const data = await res.json();
  if (!data.ok) return [];
  return [
    ...Object.keys(data.dependencies || {}),
    ...Object.keys(data.devDependencies || {}),
  ].sort();
}

export function registerPackageCompletions(monaco, getPackages) {
  return monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ["'", '"', '/', '@', '-'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const requireMatch = textUntilPosition.match(/require\s*\(\s*(['"])([^'"]*)$/);
      const fromMatch = textUntilPosition.match(/\bfrom\s+(['"])([^'"]*)$/);
      const importMatch = textUntilPosition.match(/import\s+(['"])([^'"]*)$/);
      const match = requireMatch || fromMatch || importMatch;
      if (!match) return { suggestions: [] };

      const quote = match[1];
      const prefix = match[2] || '';
      const packages = getPackages().filter((name) => name.startsWith(prefix));

      const startColumn = position.column - prefix.length;
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn,
        endColumn: position.column,
      };

      return {
        suggestions: packages.map((name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Module,
          insertText: name,
          detail: 'project dependency',
          range,
          filterText: name,
          sortText: `0_${name}`,
          documentation: `Installed package — require(${quote}${name}${quote})`,
        })),
      };
    },
  });
}
