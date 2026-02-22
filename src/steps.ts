import { Step } from './types';

export function parseXml(response: string): Step[] {
  const steps: Step[] = [];

  console.log('🔍 Parsing response length:', response.length);

  // First try to parse XML format (preferred)
  const xmlPattern = /<boltAction\s+type="file"\s+filePath="([^"]+)"[^>]*>([\s\S]*?)<\/boltAction>/gi;
  const xmlMatches = [...response.matchAll(xmlPattern)];

  if (xmlMatches.length > 0) {
    console.log(`✅ Found ${xmlMatches.length} files in XML format`);
    xmlMatches.forEach((match, index) => {
      const filePath = match[1];
      const content = match[2].trim();

      steps.push({
        id: `step-${index}`,
        title: `Create ${filePath}`,
        status: 'completed',
        path: filePath,
        code: content
      });
    });

    console.log(`📊 Created ${steps.length} unique files from XML`);
    return steps;
  }

  // Fallback: Try to extract individual files from markdown-style response
  // Look for patterns like "**index.html:**", "**styles.css:**", etc.
  const fileHeaderPatterns = [
    /\*\*([A-Za-z0-9_\-\.]+\.(html?|css|jsx?|tsx?|json))\*\*/gi,  // **filename.ext**
    /###\s*([A-Za-z0-9_\-\.]+\.(html?|css|jsx?|tsx?|json))/gi,   // ### filename.ext
    /^([A-Za-z0-9_\-\.]+\.(html?|css|jsx?|tsx?|json)):?\s*$/gmi, // filename.ext: (on its own line)
  ];

  let sections: { name: string; content: string }[] = [];

  // Try to split by file headers first
  for (const pattern of fileHeaderPatterns) {
    const matches = [...response.matchAll(pattern)];
    if (matches.length > 1) {
      console.log(`✅ Found ${matches.length} file headers using pattern`);
      // Split content by file headers
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const fileName = match[1].trim();
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
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [, language, code] = match;
      if (code && code.trim().length > 20) { // Ignore tiny code blocks
        const fileName = extractFileName(code, language) || `Component${blockIndex + 1}.${getFileExtension(language || 'jsx')}`;
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
    // Determine proper path based on file type
    let filePath: string;
    const fileName = section.name;

    if (fileName === 'index.html' || fileName === 'projects.json') {
      // Root level files
      filePath = fileName;
    } else if (fileName.endsWith('.css') || fileName.endsWith('.js')) {
      // CSS and JS in root if they're standalone files  
      filePath = fileName;
    } else if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || fileName.endsWith('.ts')) {
      // React files go in src/
      filePath = `src/${fileName}`;
    } else {
      // Default to src/
      filePath = `src/${fileName}`;
    }

    steps.push({
      id: `step-${index}`,
      title: `Create ${fileName}`,
      status: 'completed',
      path: filePath,
      code: section.content
    });
  });

  // Fallback if nothing found
  if (sections.length === 0) {
    console.log('⚠️ No files or code blocks found in response');
  }

  console.log(`📊 Created ${steps.length} unique files`);
  return steps;
}

function extractCodeFromSection(content: string): string {
  // Extract code from a section, removing markdown and explanatory text
  const codeBlockMatch = content.match(/```(?:\w+)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code block, clean up the content
  return content
    .replace(/^\s*[\*#`\-\s]+/gm, '') // Remove markdown formatting
    .replace(/^[\s]*$/gm, '') // Remove empty lines
    .trim();
}

function extractFileName(code: string, _language: string): string | null {
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


