export const extractFileNameFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return 'Документ';
  
  try {
    const isRelative = url.startsWith('/');
    const urlObj = new URL(url, isRelative ? 'http://local.test' : undefined);
    
    const hostname = urlObj.hostname.replace('www.', '');
    const pathname = urlObj.pathname.replace(/\/$/, '');
    
    if (!pathname || pathname === '') {
      return hostname;
    }

    const segments = url.split(/[/\\]/);
    let fileName = segments.pop() || '';
    fileName = decodeURIComponent(fileName);

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

    if (guidRegex.test(fileName)) {
        fileName = fileName.replace(guidRegex, '');
    } 
    else if (fileName.includes('_') && fileName.indexOf('_') >= 32) {
        fileName = fileName.substring(fileName.indexOf('_') + 1);
    }

    if (fileName.length <= 3) {
         const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
         return urlObj.hostname.replace('www.', '') + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    }

    return fileName || 'Документ';
  } catch (error) {
    return url.split(/[/\\]/).pop()?.replace(/.*_/, '') || 'Документ';
  }
};

// Форматирует имя файла для отображения
export const formatFileName = (fileName: string, showExtension: boolean = true): string => {
  if (!fileName || fileName === 'Документ') return fileName;
  
  const isWebUrl = fileName.includes('.') && !fileName.includes('/');
  
  if (!showExtension) {
    const fileExtensionRegex = /\.(pdf|docx|doc|xls|xlsx|ppt|pptx|png|jpg|jpeg|txt|zip|rar)$/i;
    return fileName.replace(fileExtensionRegex, '');
  }
  
  return fileName;
};