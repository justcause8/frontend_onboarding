// utils/routeUtils.ts
export const PAGE_TITLES: Record<string, string> = {
  '/': 'Мой план адаптации',
  '/courses': 'Обучение и тестирование',
  '/edit': 'Редактирование маршрута',
};

export const BREADCRUMB_NAMES: Record<string, string> = {
  '': 'Главная',
  'courses': 'Курсы',
  'course': 'Курс',
  'edit': 'Редактирование'
};

// Функция для получения заголовка страницы
export const getPageTitle = (pathname: string, dynamicTitle?: string): string => {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  
  if ((pathname.startsWith('/course/') || pathname.startsWith('/courses/course/')) && dynamicTitle) {
    return dynamicTitle;
  }
  
  if (pathname.startsWith('/course/') || pathname.startsWith('/courses/course/')) {
    return 'Просмотр курса';
  }
  
  return 'Система онбординга';
};

// Функция для получения хлебных крошек
export const getBreadcrumbs = (pathname: string, dynamicTitle?: string): Array<{name: string, path: string}> => {
  const segments = pathname.split('/').filter(Boolean);
  
  const breadcrumbs: Array<{name: string, path: string}> = [
    { name: 'Главная', path: '/' }
  ];
  
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Если это страница курса и есть динамическое название
    if (segment === 'course' && segments[i + 1]) {
      if (dynamicTitle) {
        breadcrumbs.push({ 
          name: dynamicTitle, 
          path: `/courses/course/${segments[i + 1]}` 
        });
      } else {
        breadcrumbs.push({ 
          name: BREADCRUMB_NAMES[segment] || segment, 
          path: currentPath 
        });
      }
      i++; // Пропускаем ID курса
      continue;
    }
    
    let name = BREADCRUMB_NAMES[segment] || 
               segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    breadcrumbs.push({ name, path: currentPath });
  }
  
  return breadcrumbs;
};