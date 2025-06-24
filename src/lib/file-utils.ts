/**
 * Utility functions for file operations
 */

/**
 * Read a text file and return its content as a string
 * @param file The file to read
 * @returns Promise that resolves to the file content as a string
 */
export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content.trim());
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Handle file upload for text files (e.g., nsec files)
 * @param event The file input change event
 * @param callback Function to call with the file content
 */
export const handleTextFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  callback: (content: string) => void
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const content = await readTextFile(file);
    callback(content);
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};