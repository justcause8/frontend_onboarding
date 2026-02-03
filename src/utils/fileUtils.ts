export const extractFileNameFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return 'Документ';
  
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split(/[/\\]/);
    let fileName = parts.pop() || '';
    
    while ((!fileName || fileName.length < 2) && parts.length > 0) {
      fileName = parts.pop() || '';
    }
    
    fileName = decodeURIComponent(fileName);
    fileName = fileName.trim();
    
    if (fileName && fileName !== 'Документ') {
      return fileName;
    }
    
    return 'Документ';
  } catch (error) {
    console.error('Ошибка при извлечении имени файла:', error, url);
    return 'Документ';
  }
};

export const formatFileName = (fileName: string, showExtension: boolean = true): string => {
  if (!fileName || fileName === 'Документ') return fileName;
  
  if (!showExtension) {
    // Убираем последнее расширение
    return fileName.replace(/\.[^/.]+$/, '');
  }
  
  return fileName;
};