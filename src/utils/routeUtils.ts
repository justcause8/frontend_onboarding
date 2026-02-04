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
  'edit': 'Редактирование'
};

// Функция для получения заголовка страницы
export const getPageTitle = (pathname: string, dynamicTitle?: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (dynamicTitle) {
    // Если мы на тесте, берем только вторую часть (название теста)
    if (pathname.includes('/test/')) {
      return dynamicTitle.split(' | ')[1] || dynamicTitle;
    }
    // Если на курсе, берем первую часть
    return dynamicTitle.split(' | ')[0];
  }
  
  if (pathname.includes('/course/')) return 'Просмотр курса';
  return 'Система онбординга';
};

const truncate = (text: string, maxLength: number = 10): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

// // Вспомогательная функция для обрезки
// const truncate = (text: string, maxLength: number = 10): string => {
//   return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
// };

// export const getBreadcrumbs = (pathname: string, dynamicTitle?: string): Array<{name: string, path: string}> => {
//   const segments = pathname.split('/').filter(Boolean);
//   const breadcrumbs: Array<{name: string, path: string}> = [{ name: 'Главная', path: '/' }];
  
//   let currentPath = '';
  
//   for (let i = 0; i < segments.length; i++) {
//     const segment = segments[i];
//     currentPath += `/${segment}`;
    
//     // Обработка курса
//     if (segment === 'course' && segments[i + 1]) {
//       const name = dynamicTitle ? truncate(dynamicTitle) : BREADCRUMB_NAMES[segment];
//       breadcrumbs.push({ 
//         name: name || segment, 
//         path: `/courses/course/${segments[i + 1]}` 
//       });
//       i++; continue;
//     }

//     // Добавляем обработку сегмента теста
//     if (segment === 'test' && segments[i + 1]) {
//       // Здесь dynamicTitle будет названием теста, если мы на странице теста
//       const name = dynamicTitle ? truncate(dynamicTitle) : 'Тест';
//       breadcrumbs.push({ 
//         name: name, 
//         path: currentPath + `/${segments[i + 1]}` 
//       });
//       i++; continue;
//     }
    
//     let name = BREADCRUMB_NAMES[segment] || segment;
//     breadcrumbs.push({ name: truncate(name), path: currentPath });
//   }
  
//   return breadcrumbs;
// };