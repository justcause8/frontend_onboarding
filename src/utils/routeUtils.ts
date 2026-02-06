export const PAGE_TITLES: Record<string, string> = {
  '/': 'Мой план адаптации',
  '/courses': 'Обучение и тестирование',
  '/test': 'Тест',
  '/edit': 'Редактирование маршрута',
};

export const BREADCRUMB_NAMES: Record<string, string> = {
  '': 'Главная',
  'courses': 'Курсы',
  'course': 'Курс',
  'test': 'Тест',
  'edit': 'Редактирование'
};

const truncate = (text: string, maxLength: number = 25): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Функция для получения заголовка страницы
export const getPageTitle = (pathname: string, dynamicTitle?: string): string => {
  // Проверяем статические заголовки
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Если есть динамический заголовок
  if (dynamicTitle) {
    const parts = dynamicTitle.split(' | ');
    
    // Если мы в пути курса ИЛИ теста — всегда возвращаем название курса (первая часть)
    if (pathname.includes('/course/') || pathname.includes('/test/')) {
      return parts[0]; 
    }
    
    return dynamicTitle;
  }
  return 'Система онбординга';
};

export const getBreadcrumbs = (pathname: string, dynamicTitle?: string): Array<{name: string, path: string}> => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{name: string, path: string}> = [{ name: 'Главная', path: '/' }];
  
  // Разделяем dynamicTitle, если там передано "Название курса | Название теста"
  const [courseTitle, testTitle] = dynamicTitle ? dynamicTitle.split(' | ') : [undefined, undefined];

  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // 1. Логика для курса
    if (segment === 'course' && segments[i + 1]) {
      const title = courseTitle || dynamicTitle || BREADCRUMB_NAMES[segment];
      breadcrumbs.push({ 
        name: truncate(title), 
        path: `/courses/course/${segments[i + 1]}` 
      });
      i++; // Пропускаем ID курса
      continue;
    }

    // 2. Логика для теста (ДОБАВЛЕНО)
    if (segment === 'test' && segments[i + 1]) {
      const title = testTitle || 'Тест';
      breadcrumbs.push({ 
        name: truncate(title), 
        path: currentPath + `/${segments[i + 1]}` 
      });
      i++; // Пропускаем ID теста
      continue;
    }

    // 3. Обычные сегменты (например, 'courses')
    if (BREADCRUMB_NAMES[segment] || isNaN(Number(segment))) {
        let name = BREADCRUMB_NAMES[segment] || segment;
        breadcrumbs.push({ name: truncate(name), path: currentPath });
    }
  }
  
  return breadcrumbs;
};