import React, { useEffect, useState, useCallback } from 'react';
import { materialService, type Material } from '../../services/material.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { extractFileNameFromUrl } from '../../utils/fileUtils';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';

import './MaterialsPage.css';
import folderIcon from '@/assets/folderIcon.svg';
import linkIcon from '@/assets/link.svg';
import fileIcon from '@/assets/fileIcon.svg';
import backIcon from '@/assets/editMode/DownIcon.png';

const MaterialsPage = () => {
  const { setDynamicTitle } = usePageTitle();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialService.getGeneralMaterials();
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
      const fileUrl = materialService.getFileUrl(material.urlDocument);
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
        <>
            {!activeCategory && (
            <div className="folders-grid">
                {Object.entries(groupedMaterials).map(([category, items]) => (
                <div 
                    key={category} 
                    className="card folder-card text" 
                    onClick={() => setActiveCategory(category)}
                >
                    <img src={folderIcon} alt="folder" className="folder-large-icon" />
                    <h2>{category}</h2>
                    <div className='count-badge'>{items.length}</div>
                </div>
                ))}
            </div>
            )}
            
            {activeCategory && (
            <>
                <div className='text'>
                    <div className="back-navigation" onClick={() => setActiveCategory(null)}>
                        <img src={backIcon} alt="back" className="back-arrow-icon" />
                        <span>Назад к папкам</span>
                    </div>

                    <section className="category-section">
                        <div className="category-header">
                        <img src={folderIcon} alt="folder" className="folder-icon" />
                        <h4>{activeCategory}</h4>
                        </div>

                        <div className="materials-grid">
                        {groupedMaterials[activeCategory].map((item) => (
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
                                {item.isExternalLink ? (
                                  item.urlDocument.replace(/^https?:\/\//, '')
                                ) : (
                                  item.urlDocument.split('.').pop()?.toUpperCase() + ' файл'
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                        </div>
                    </section>
                </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MaterialsPage;