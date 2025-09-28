export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileItem[];
}

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'error';
  path?: string;
  code?: string;
}
