import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { materialService, type Material } from '../../../services/material.service';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import { extractFileNameFromUrl } from '../../../utils/fileUtils';

import './AdminEditMaterialsPage.css';
import cross from '@/assets/cross.png';

export const AdminEditMaterials: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [newCategoryInput, setNewCategoryInput] = useState<string>('');
    
    const [materialInput, setMaterialInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDynamicTitle('Управление материалами');
        loadCategories();
    }, [setDynamicTitle]);

    const loadCategories = async () => {
        try {
            const data = await materialService.getGeneralMaterials();
            const categories = Array.from(new Set(data.map(m => m.category || 'Общее')));
            setExistingCategories(categories);
        } catch (e) {
            console.error("Ошибка загрузки категорий:", e);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const category = newCategoryInput.trim() || selectedCategory || 'Общее';

        try {
            setUploading(true);
            const data = await materialService.uploadFile(file);
            let fileName = extractFileNameFromUrl(data.relativePath);
            
            if (fileName.includes('_') && fileName.length > 37) {
                fileName = fileName.substring(fileName.indexOf('_') + 1);
            }

            const newMaterial: Material = {
                id: Date.now(),
                title: fileName,
                urlDocument: data.relativePath,
                isExternalLink: false,
                category: category
            };

            setMaterials([...materials, newMaterial]);
        } catch (e) {
            alert("Не удалось загрузить файл");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddLink = () => {
        const url = materialInput.trim();
        const category = newCategoryInput.trim() || selectedCategory || 'Общее';

        if (url) {
            const newMaterial: Material = {
                id: Date.now(),
                title: extractFileNameFromUrl(url),
                urlDocument: url,
                isExternalLink: true,
                category: category
            };
            setMaterials([...materials, newMaterial]);
            setMaterialInput('');
        }
    };

    const handleSaveAll = async () => {
        if (materials.length === 0) return;
        try {
            setLoading(true);
            for (const mat of materials) {
                const materialData = {
                    title: mat.title,
                    urlDocument: mat.urlDocument,
                    isExternalLink: mat.isExternalLink,
                    category: mat.category,
                    fkCourseId: null
                };
                await materialService.createMaterial(materialData);
            }
            navigate('/edit/materials');
        } catch (e) {
            alert("Ошибка при сохранении материалов");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="admin-edit-container">
            <section className="card text">
                <h2>Категория материалов</h2>
                <div className="input-item">
                    <h4>Выбрать существующую</h4>
                    <div className="chips-display-zone categories-chips">
                        {existingCategories.map(cat => (
                            <div 
                                key={cat} 
                                className={`chip ${selectedCategory === cat ? 'selected-category' : 'mentor-chip'}`}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setNewCategoryInput('');
                                }}
                            >
                                {cat}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="input-item">
                    <h4>Создать новую категорию</h4>
                    <input 
                        className="input-field" 
                        value={newCategoryInput}
                        onFocus={() => {
                            setSelectedCategory('');
                        }}
                        onChange={e => {
                            setNewCategoryInput(e.target.value);
                            if (selectedCategory) setSelectedCategory('');
                        }} 
                        placeholder="Введите название новой папки..." 
                    />
                </div>
            </section>

            <section className="card text">
                <h2>Добавление контента</h2>
                <p className="category-selection-info">
                    Выбранная категория: <strong>{newCategoryInput || selectedCategory || 'Общее'}</strong>
                </p>
                
                <div className="input-item">
                    <h4>Добавить ссылку или файл</h4>
                    <div className="nested-courses">
                        <div className="input-with-button">
                            <input 
                                className="input-field ghost-input-style" 
                                placeholder="Вставьте ссылку (https://...)"
                                value={materialInput}
                                onChange={e => setMaterialInput(e.target.value)}
                            />
                            <button className="btn btn-secondary" onClick={handleAddLink}>Добавить</button>
                        </div>

                        <div className="upload-zone">
                            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                            <button 
                                className="btn-upload" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? 'Загрузка...' : 'Выбрать файл'}
                            </button>
                        </div>

                        <div className="courses-grid">
                            {materials.map((mat, idx) => (
                                <div key={idx} className="course-item-mini">
                                    <div className="material-info-admin">
                                        <span className="material-type-icon">
                                            {mat.isExternalLink}
                                        </span>
                                        <span className="truncate-text material-title-admin">
                                            {mat.title}
                                        </span>
                                        <span className="category-badge-admin">
                                            {mat.category}
                                        </span>
                                    </div>
                                    <img 
                                        src={cross} 
                                        className="remove-icon" 
                                        onClick={() => setMaterials(materials.filter((_, i) => i !== idx))}
                                        alt="remove" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Отмена</button>
                <button 
                    className="btn btn-primary" 
                    onClick={handleSaveAll}
                    disabled={materials.length === 0}
                >
                    Сохранить все
                </button>
            </div>
        </div>
    );
};

export default AdminEditMaterials;