import { Step } from './types';

export function parseXml(response: string): Step[] {
  const steps: Step[] = [];
  
  console.log('🔍 Parsing response length:', response.length);
  
  // Try to extract individual files from the response
  // Look for patterns like "### filename.jsx" or "**filename.jsx**"
  const fileHeaderPatterns = [
    /###\s*([^`\n]+\.(jsx?|tsx?|css|html|json))/gi,
    /\*\*([^*\n]+\.(jsx?|tsx?|css|html|json))\*\*/gi,
    /(?:^|\n)([A-Za-z][A-Za-z0-9]*\.(jsx?|tsx?|css|html|json))/gi
  ];
  
  let sections: { name: string; content: string }[] = [];
  
  // Try to split by file headers first
  for (const pattern of fileHeaderPatterns) {
    const matches = [...response.matchAll(pattern)];
    if (matches.length > 1) {
      // Split content by file headers
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const fileName = match[1];
        const startPos = match.index! + match[0].length;
        const endPos = i < matches.length - 1 ? matches[i + 1].index! : response.length;
        const content = response.substring(startPos, endPos);
        
        sections.push({
          name: fileName,
          content: extractCodeFromSection(content)
        });
      }
      break;
    }
  }
  
  // If no file sections found, try code blocks
  if (sections.length === 0) {
    const codeBlockRegex = /``````/g;
    let match;
    let blockIndex = 0;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [, language, code] = match;
      if (code && code.trim().length > 20) { // Ignore tiny code blocks
        const fileName = extractFileName(code, language) || `Component${blockIndex + 1}.${getFileExtension(language)}`;
        sections.push({
          name: fileName,
          content: code.trim()
        });
        blockIndex++;
      }
    }
  }
  
  // Create steps from sections
  sections.forEach((section, index) => {
    steps.push({
      id: `step-${index}`,
      title: `Create ${section.name}`,
      status: 'completed',
      path: `src/${section.name}`,
      code: section.content
    });
  });
  
  // Fallback if nothing found
  if (sections.length === 0) {
    steps.push({
      id: 'step-0',
      title: 'Create App.jsx',
      status: 'completed',
      path: 'src/App.jsx',
      code: createDefaultTodoApp()
    });
  }
  
  console.log(`📊 Created ${steps.length} unique files`);
  return steps;
}

function extractCodeFromSection(content: string): string {
  // Extract code from a section, removing markdown and explanatory text
  const codeBlockMatch = content.match(/``````/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code block, clean up the content
  return content
    .replace(/^\s*[\*#`\-\s]+/gm, '') // Remove markdown formatting
    .replace(/^[\s]*$/gm, '') // Remove empty lines
    .trim();
}

function extractFileName(code: string, language: string): string | null {
  // Look for React component names
  const componentMatch = code.match(/(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/);
  if (componentMatch) {
    return `${componentMatch[1]}.jsx`;
  }
  
  return null;
}

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    'javascript': 'js',
    'jsx': 'jsx',
    'js': 'js',
    'typescript': 'ts',
    'tsx': 'tsx',
    'css': 'css',
    'html': 'html',
    'json': 'json'
  };
  
  return extensions[language?.toLowerCase()] || 'jsx';
}

function createDefaultTodoApp(): string {
  return `import { useState } from 'react';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="container">
      <h1 className="title">Todo App</h1>
      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add new task"
          className="input"
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo} className="btn">Add Task</button>
      </div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id} className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)} className="delete-btn">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;`;
}
