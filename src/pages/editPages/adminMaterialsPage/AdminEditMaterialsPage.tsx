import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { materialService, type Material } from '../../../services/material.service';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import { extractFileNameFromUrl } from '../../../utils/fileUtils';
import { AdminTable } from '../../../components/adminTable/AdminTable';
import EditModal from '../../../components/modals/editModal/EditModal';

import './AdminEditMaterialsPage.css';
import cross from '@/assets/cross.png';
import editIcon from '@/assets/editMode/EditIcon.png';

export const AdminEditMaterialsPage: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Общее');
    const [newCategoryInput, setNewCategoryInput] = useState<string>('');
    const [materialInput, setMaterialInput] = useState('');

    // Состояние для модального окна
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        initialValue: string;
        type: 'category' | 'material';
        targetId?: number;
        materialData?: Material;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDynamicTitle('Управление материалами');
        loadData();
    }, [setDynamicTitle]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await materialService.getGeneralMaterials();
            setMaterials(data);
        } catch (e) {
            console.error("Ошибка загрузки материалов:", e);
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = Array.from(new Set(materials.map(m => m.category || 'Общее')));
        if (!cats.includes('Общее')) cats.push('Общее');
        return cats;
    }, [materials]);

    // --- Модальное окно ---
    
    const openCategoryEdit = (oldName: string) => {
        setModalConfig({ title: 'Переименовать категорию', initialValue: oldName, type: 'category' });
        setIsModalOpen(true);
    };

    const openMaterialEdit = (mat: Material) => {
        setModalConfig({ 
            title: 'Редактировать материал', 
            initialValue: mat.title, 
            type: 'material', 
            targetId: mat.id,
            materialData: mat
        });
        setIsModalOpen(true);
    };

    const handleModalSave = async (newValue: string, newCategory?: string) => {
        if (!modalConfig) return;

        try {
            setLoading(true);
            if (modalConfig.type === 'category') {
                const oldName = modalConfig.initialValue;
                const toUpdate = materials.filter(m => (m.category || 'Общее') === oldName);
                
                await Promise.all(toUpdate.map(m => 
                    materialService.updateMaterial(m.id, { 
                        title: m.title,
                        category: newValue 
                    })
                ));
            } else if (modalConfig.type === 'material' && modalConfig.targetId) {
                await materialService.updateMaterial(modalConfig.targetId, { 
                    title: newValue,
                    category: newCategory 
                });
            }
            await loadData();
        } catch (e) {
            console.error("Ошибка при сохранении:", e);
            alert("Ошибка при сохранении. Проверьте консоль.");
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const category = newCategoryInput.trim() || selectedCategory;

        try {
            setUploading(true);
            const uploadRes = await materialService.uploadFile(file);
            
            let fileName = uploadRes.fileName || extractFileNameFromUrl(uploadRes.relativePath);
            const underscoreIndex = fileName.indexOf('_');
            if (underscoreIndex !== -1 && underscoreIndex < 37) {
                fileName = fileName.substring(underscoreIndex + 1);
            }

            await materialService.createMaterial({
                title: fileName,
                urlDocument: uploadRes.relativePath,
                isExternalLink: false,
                category: category
            });
            
            setNewCategoryInput('');
            await loadData();
        } catch (e) {
            alert("Не удалось загрузить файл");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddLink = async () => {
        const url = materialInput.trim();
        const category = newCategoryInput.trim() || selectedCategory;

        if (url) {
            try {
                await materialService.createMaterial({
                    title: extractFileNameFromUrl(url),
                    urlDocument: url,
                    isExternalLink: true,
                    category: category
                });
                setMaterialInput('');
                setNewCategoryInput('');
                await loadData();
            } catch (e) {
                alert("Ошибка при добавлении ссылки");
            }
        }
    };

    // const handleRenameCategory = async (oldName: string) => {
    //     const newName = prompt(`Введите новое название для категории "${oldName}":`, oldName);
    //     if (!newName || newName === oldName) return;

    //     try {
    //         setLoading(true);
    //         const materialsToUpdate = materials.filter(m => (m.category || 'Общее') === oldName);
            
    //         // Обновляем все материалы этой категории
    //         await Promise.all(materialsToUpdate.map(m => 
    //             materialService.updateMaterial(m.id, { category: newName })
    //         ));
            
    //         await loadData();
    //     } catch (e) {
    //         alert("Ошибка при переименовании категории");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleDeleteCategory = async (categoryName: string) => {
        if (!window.confirm(`Удалить категорию "${categoryName}" и ВСЕ материалы в ней?`)) return;
        
        try {
            setLoading(true);
            const materialsToDelete = materials.filter(m => (m.category || 'Общее') === categoryName);
            await Promise.all(materialsToDelete.map(m => materialService.deleteMaterial(m.id)));
            await loadData();
        } catch (e) {
            alert("Ошибка при удалении категории");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        if (!window.confirm("Удалить этот материал?")) return;
        try {
            await materialService.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (e) { alert("Ошибка при удалении"); }
    };

    if (loading && materials.length === 0) return <LoadingSpinner />;

    return (
        <div className="admin-edit-container">            <section className="card text">
                <h2>Добавить новый контент</h2>
                <div className="add-controls-grid">
                    <div className="input-item">
                        <h4>1. Категория</h4>
                        <select className="input-field" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <input className="input-field mt-8" placeholder="Или новая..." value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} />
                    </div>
                    <div className="input-item">
                        <h4>2. Ссылка или файл</h4>
                        <div className="input-with-button">
                            <input className="input-field" placeholder="https://..." value={materialInput} onChange={e => setMaterialInput(e.target.value)} />
                            <button className="btn btn-secondary" onClick={handleAddLink}>Добавить</button>
                        </div>
                        <div className="upload-zone-mini">
                            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                            <button className="btn-upload-outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                {uploading ? 'Загрузка...' : 'Загрузить файл'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card text">
                <h2>Управление категориями</h2>
                <div className="category-manage-list">
                    {categories.filter(c => c !== 'Общее').map(cat => (
                        <div key={cat} className="category-manage-item">
                            <span>{cat}</span>
                            <div className="category-actions">
                                <button className="btn-icon" onClick={() => openCategoryEdit(cat)}>
                                    <img src={editIcon} className='btn-edit' alt="edit" />
                                </button>
                                <button className="btn-icon delete" onClick={() => handleDeleteCategory(cat)}>
                                    <img src={cross} className='remove-icon' alt="del" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card no-padding">
                <AdminTable
                    columns={[
                        { header: 'Название' },
                        { header: 'Категория', width: '180px' },
                        { header: 'Действия', width: '120px' }
                    ]}
                    data={materials}
                    emptyText="Материалы не добавлены"
                    renderRow={(mat) => (
                        <tr key={mat.id}>
                            <td>
                                <div className="material-title-cell">
                                    <span className="main-text">{mat.title}</span>
                                    <span className="sub-text">{mat.urlDocument}</span>
                                </div>
                            </td>
                            <td>
                                <span className="category-badge">{mat.category || 'Общее'}</span>
                            </td>
                            <td className="action-cell">
                                <div className="table-actions">
                                    <img src={editIcon} className="edit-icon-table" onClick={() => openMaterialEdit(mat)} alt="edit" />
                                    <img src={cross} className="remove-icon" onClick={() => handleDeleteMaterial(mat.id)} alt="delete" />
                                </div>
                            </td>
                        </tr>
                    )}
                />
            </section>

            <EditModal 
                isOpen={isModalOpen}
                title={modalConfig?.title || ''}
                initialValue={modalConfig?.initialValue || ''}
                onClose={() => setIsModalOpen(false)}
                onSave={handleModalSave}
                categories={modalConfig?.type === 'material' ? categories : undefined}
                currentCategory={modalConfig?.materialData?.category}
            />

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
            </div>
        </div>
    );
};

export default AdminEditMaterialsPage;