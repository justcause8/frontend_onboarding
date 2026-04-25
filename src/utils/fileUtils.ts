const FILE_ICON_MAP: Record<string, string> = {
  pdf:  new URL('../assets/icons/fileIcons/icon-pdf.png', import.meta.url).href,
  doc:  new URL('../assets/icons/fileIcons/icon-microsoft-word.png', import.meta.url).href,
  docx: new URL('../assets/icons/fileIcons/icon-microsoft-word.png', import.meta.url).href,
  xls:  new URL('../assets/icons/fileIcons/icon-microsoft-excel.png', import.meta.url).href,
  xlsx: new URL('../assets/icons/fileIcons/icon-microsoft-excel.png', import.meta.url).href,
  ppt:  new URL('../assets/icons/fileIcons/icon-microsoft-powerpoint.png', import.meta.url).href,
  pptx: new URL('../assets/icons/fileIcons/icon-microsoft-powerpoint.png', import.meta.url).href,
  png:  new URL('../assets/icons/fileIcons/icon-png.png', import.meta.url).href,
  jpg:  new URL('../assets/icons/fileIcons/icon-jpg.png', import.meta.url).href,
  jpeg: new URL('../assets/icons/fileIcons/icon-jpg.png', import.meta.url).href,
  txt:  new URL('../assets/icons/fileIcons/icon-txt.png', import.meta.url).href,
  zip:  new URL('../assets/icons/fileIcons/icon-zip.png', import.meta.url).href,
  rar:  new URL('../assets/icons/fileIcons/icon-rar.png', import.meta.url).href,
};

const DEFAULT_FILE_ICON = new URL('../assets/icons/fileIcon.svg', import.meta.url).href;
const LINK_ICON = new URL('../assets/icons/link.svg', import.meta.url).href;

/** Возвращает иконку по расширению файла или URL */
export const getFileIcon = (url: string, isExternalLink: boolean): string => {
  if (isExternalLink) return LINK_ICON;
  const segment = url.split('/').pop() ?? '';
  const ext = segment.includes('.') ? segment.split('.').pop()?.toLowerCase() ?? '' : '';
  if (!ext) return LINK_ICON;
  return FILE_ICON_MAP[ext] ?? DEFAULT_FILE_ICON;
};

export const extractFileNameFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return 'Документ';

  try {
    const isRelative = url.startsWith('/');
    const urlObj = new URL(url, isRelative ? 'http://local.test' : undefined);

    const pathParam = urlObj.searchParams.get('path');
    if (pathParam) {
      const segments = pathParam.split(/[/\\]/);
      return decodeURIComponent(segments[segments.length - 1]) || 'Документ';
    }
    
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