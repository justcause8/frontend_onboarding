import React, { useEffect, useState, useCallback } from 'react';
import { materialService, type Material } from '../../services/material.service';
import { courseService, type Course } from '../../services/course.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { extractFileNameFromUrl, getFileIcon } from '../../utils/fileUtils';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';

import './MaterialsPage.css';
import folderIcon from '@/assets/icons/folderIcon.svg';
import backIcon from '@/assets/editMode/DownIcon.png';

type View = 'root' | 'category' | 'courses' | 'course';

const MaterialsPage = () => {
  const { setDynamicTitle } = usePageTitle();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>('root');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [validPaths, setValidPaths] = useState<Set<string>>(new Set());

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [matData, courseData] = await Promise.all([
        materialService.getGeneralMaterials(),
        courseService.getAllCoursesAdmin(),
      ]);

      // Проверка существования файлов
      const allMats = [...matData, ...courseData.flatMap(c => c.materials || [])];
      const checks = await Promise.all(
        allMats.map(async m => {
          const external = m.isExternalLink
            || m.urlDocument.startsWith('http://')
            || m.urlDocument.startsWith('https://');
          return {
            url: m.urlDocument,
            exists: external ? true : await materialService.checkFileExists(m.urlDocument)
          };
        })
      );

      const validSet = new Set(checks.filter(c => c.exists).map(c => c.url));
      setValidPaths(validSet);

      setMaterials(matData);
      // Показываем только курсы у которых есть хотя бы один валидный материал
      const validCourses = courseData.filter(c =>
        c.materials?.some(m => validSet.has(m.urlDocument))
      );
      setCourses(validCourses);
      setDynamicTitle('Документы и ресурсы');
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить список ресурсов');
    } finally {
      setLoading(false);
    }
  }, [setDynamicTitle]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  const groupedMaterials = materials.reduce((acc: Record<string, Material[]>, item) => {
    const category = item.category || 'Прочие материалы';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const handleOpen = (material: Material) => {
    const url = material.urlDocument || '';
    const external = material.isExternalLink
      || url.startsWith('http://')
      || url.startsWith('https://');
    if (external) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank', 'noreferrer');
    } else {
      window.open(materialService.getFileUrl(url), '_blank');
    }
  };

  const getDisplayName = (material: Material) => {
    if (material.title && material.title !== 'Документ') return material.title;
    const name = extractFileNameFromUrl(material.urlDocument);
    // Исправлен split с подчеркиванием
    return name.includes('_') ? name.split('_').slice(1).join('_') : name;
  };

  const goBack = () => {
    if (view === 'category' || view === 'courses') {
      setView('root');
      setActiveCategory(null);
      setActiveCourse(null);
    } else if (view === 'course') {
      setView('courses');
      setActiveCourse(null);
    }
  };

  const isLink = (item: Material): boolean =>
    item.isExternalLink ||
    item.urlDocument.startsWith('http://') ||
    item.urlDocument.startsWith('https://');

  const renderMaterialsList = (items: Material[]) => {
    const filteredItems = items.filter(item => validPaths.has(item.urlDocument));
    return (
      <div className="materials-grid">
        {filteredItems.map(item => {
          const external = isLink(item);
          return (
            <div key={item.id} className="card material-resource-card" onClick={() => handleOpen(item)}>
              <div className="resource-icon">
                <img src={getFileIcon(item.urlDocument, external)} alt={external ? 'link' : 'file'} />
              </div>
              <div className="resource-info">
                <p className="resource-title">{getDisplayName(item)}</p>
                <span className="resource-type">
                  {external
                    ? item.urlDocument.replace(/^https?:\/\//, '')
                    : (item.urlDocument.split('.').pop()?.toUpperCase() + ' файл')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  // ИСПРАВЛЕНО: добавлен fallback для ошибки, чтобы избежать передачи null в string
  if (error) return <ErrorState message={error || 'Произошла ошибка'} onRetry={loadMaterials} />;

  const hasGeneral = Object.keys(groupedMaterials).length > 0;
  const hasCourses = courses.length > 0;

  if (!hasGeneral && !hasCourses) {
    return (
      <div className="text">
        <div className="card empty-state"><h2>Пока здесь нет доступных материалов</h2></div>
      </div>
    );
  }

  return (
    <div className="text">
      {view === 'root' && (
        <div className="folders-grid">
          {Object.entries(groupedMaterials).map(([category, items]) => (
            <div
              key={category}
              className="card folder-card text"
              onClick={() => { setActiveCategory(category); setView('category'); }}
            >
              <img src={folderIcon} alt="folder" className="folder-large-icon" />
              <h2>{category}</h2>
              <div className="count-badge">{items.filter(i => validPaths.has(i.urlDocument)).length}</div>
            </div>
          ))}

          {hasCourses && (
            <div className="card folder-card text" onClick={() => setView('courses')}>
              <img src={folderIcon} alt="folder" className="folder-large-icon folder-large-icon--courses" />
              <h2>Курсы</h2>
              <div className="count-badge">{courses.length}</div>
            </div>
          )}
        </div>
      )}

      {view === 'category' && activeCategory && (
        <div className="active-folder-view">
          <div className="back-navigation" onClick={goBack}>
            <img src={backIcon} alt="back" className="back-arrow-icon" />
            <span>Назад к папкам</span>
          </div>
          <section className="category-section">
            <div className="category-header">
              <img src={folderIcon} alt="folder" className="folder-icon" />
              <h4>{activeCategory}</h4>
            </div>
            {renderMaterialsList(groupedMaterials[activeCategory])}
          </section>
        </div>
      )}

      {view === 'courses' && (
        <div className="active-folder-view">
          <div className="back-navigation" onClick={goBack}>
            <img src={backIcon} alt="back" className="back-arrow-icon" />
            <span>Назад к папкам</span>
          </div>
          <section className="category-section">
            <div className="category-header">
              <img src={folderIcon} alt="folder" className="folder-icon" />
              <h4>Курсы</h4>
            </div>
            <div className="folders-grid">
              {courses.map(course => (
                <div
                  key={course.id}
                  className="card folder-card text"
                  onClick={() => { setActiveCourse(course); setView('course'); }}
                >
                  <img src={folderIcon} alt="folder" className="folder-large-icon" />
                  <h2>{course.title}</h2>
                  <div className="count-badge">{course.materials.filter((m: Material) => validPaths.has(m.urlDocument)).length}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'course' && activeCourse && (
        <div className="active-folder-view">
          <div className="back-navigation" onClick={goBack}>
            <img src={backIcon} alt="back" className="back-arrow-icon" />
            <span>Назад к курсам</span>
          </div>
          <section className="category-section">
            <div className="category-header">
              <img src={folderIcon} alt="folder" className="folder-icon" />
              <h4>{activeCourse.title}</h4>
            </div>
            {renderMaterialsList(activeCourse.materials)}
          </section>
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;