import React, { useEffect, useState, useCallback } from 'react';
import { courseService, type Material } from '../../services/course.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { formatFileName, extractFileNameFromUrl } from '../../utils/fileUtils';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';

import './MaterialsPage.css';
import folderIcon from '@/assets/folderIcon.svg';
import linkIcon from '@/assets/link.svg';
import fileIcon from '@/assets/fileIcon.svg';

const MaterialsPage = () => {
  const { setDynamicTitle } = usePageTitle();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getGeneralMaterials();
      setMaterials(data);
      setDynamicTitle('Материалы и ресурсы');
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить список ресурсов');
    } finally {
      setLoading(false);
    }
  }, [setDynamicTitle]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Группировка материалов по категориям
  const groupedMaterials = materials.reduce((acc: Record<string, Material[]>, item) => {
    const category = item.category || 'Прочие материалы';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const handleOpen = (material: Material) => {
    if (material.isExternalLink) {
      window.open(material.urlDocument, '_blank', 'noreferrer');
    } else {
      const fileUrl = courseService.getFileUrl(material.urlDocument);
      window.open(fileUrl, '_blank');
    }
  };

  const getDisplayName = (material: Material) => {
    if (material.title && material.title !== 'Документ') return material.title;
    const name = extractFileNameFromUrl(material.urlDocument);
    return name.includes('_') ? name.split('_').slice(1).join('_') : name;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadMaterials} />;

  return (
    <div className="text">
      {Object.keys(groupedMaterials).length === 0 ? (
        <div className="card empty-state">
          <h2>Пока здесь нет доступных материалов</h2>
        </div>
      ) : (
        Object.entries(groupedMaterials).map(([category, items]) => (
          <section key={category} className="category-section">
            <div className="category-header">
              <img src={folderIcon} alt="folder" className="folder-icon" />
              <h3>{category}</h3>
              <span className="count-badge">{items.length}</span>
            </div>

            <div className="materials-grid">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="card material-resource-card"
                  onClick={() => handleOpen(item)}
                >
                  <div className="resource-icon">
                    {item.isExternalLink ? (
                      <img src={linkIcon} alt="link" />
                    ) : (
                      <img src={fileIcon} alt="file" />
                    )}
                  </div>
                  <div className="resource-info">
                    <p className="resource-title">{getDisplayName(item)}</p>
                    <span className="resource-type">
                      {item.isExternalLink ? 'Внешняя ссылка' : 'Файл'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default MaterialsPage;