import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { courseService, type Material } from '../../../../services/course.service';
import { testService } from '../../../../services/test.service'; 

import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../../contexts/PageTitleContext';

import { extractFileNameFromUrl, formatFileName } from '../../../../utils/fileUtils';

import './AdminEditCourse.css';
import cross from '@/assets/cross.png';
import downIcon from '@/assets/editMode/DownIcon.png';

interface TestShort {
    id: number;
    title: string;
}

export const AdminEditCourse: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const isEditMode = courseId !== 'new';

    const [loading, setLoading] = useState(isEditMode);
    const [uploading, setUploading] = useState(false);
    
    const [courseName, setCourseName] = useState('');
    const [courseDesc, setCourseDesc] = useState('');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedTests, setSelectedTests] = useState<TestShort[]>([]);
    
    const [allTests, setAllTests] = useState<TestShort[]>([]);
    const [searchTestQuery, setSearchTestQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const searchRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [materialInput, setMaterialInput] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const tests = await testService.getAllTests(); 
                setAllTests(tests);

                if (isEditMode) {
                    const course = await courseService.getCourseById(Number(courseId));
                    setCourseName(course.title);
                    setCourseDesc(course.description);
                    setMaterials(course.materials || []);
                    setSelectedTests(course.tests || []);
                    setDynamicTitle(course.title);
                } else {
                    setDynamicTitle('Создание нового курса');
                }
            } catch (e) {
                console.error("Ошибка загрузки:", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId, isEditMode, setDynamicTitle]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const data = await courseService.uploadFile(file);

            let extractedTitle = extractFileNameFromUrl(data.relativePath);
            
            if (extractedTitle.includes('_') && extractedTitle.length > 37) {
                extractedTitle = extractedTitle.substring(extractedTitle.indexOf('_') + 1);
            }

            const newMaterial: Material = {
                id: 0,
                title: extractedTitle,
                urlDocument: data.relativePath,
                isExternalLink: false,
                category: 'Документ курса'
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
        if (url) {
            // 1. Извлекаем имя из URL
            const extractedTitle = extractFileNameFromUrl(url);
            // 2. Опционально форматируем (например, убираем расширение для красоты)
            const finalTitle = formatFileName(extractedTitle, true); 

            const newMaterial: Material = {
                id: 0,
                title: finalTitle, // Используем полученное имя
                urlDocument: url,
                isExternalLink: true,
                category: 'Ссылка'
            };
            setMaterials([...materials, newMaterial]);
            setMaterialInput('');
        }
    };

    const handleSaveCourse = async () => {
        try {
            setLoading(true);
             const courseData = {
                title: courseName,
                description: courseDesc,
                materials: materials, 
                testIds: selectedTests.map(t => t.id),
                status: isEditMode ? "active" : "active",
                orderIndex: 0 
            };

            if (isEditMode) {
                await courseService.updateCourse(Number(courseId), courseData);
            } else {
                await courseService.createCourse(courseData);
            }
            navigate('/edit/courses');
        } catch (e) {
            alert("Не удалось сохранить курс.");
        } finally {
            setLoading(false);
        }
    };

    const autoResize = (target: HTMLTextAreaElement) => {
        target.style.height = 'inherit';
        target.style.height = `${target.scrollHeight}px`;
    };

    if (loading) return <LoadingSpinner />;

    // Фильтрация тестов для выпадающего списка
    const filteredTests = allTests
        .filter(t => t.title.toLowerCase().includes(searchTestQuery.toLowerCase()))
        .slice(0, 20); // Ограничиваем список для производительности

    return (
        <div className="admin-edit-container">
            <section className="card text">
                <h2>{isEditMode ? 'Редактирование курса' : 'Информация о курсе'}</h2>
                
                <div className="input-item">
                    <h4>Название курса</h4>
                    <input 
                        className="input-field" 
                        value={courseName}
                        onChange={e => setCourseName(e.target.value)} 
                        placeholder="Например: Знакомство с компанией" 
                    />
                </div>

                <div className="input-item">
                    <h4>Описание</h4>
                    <textarea 
                        className="textarea-field"
                        value={courseDesc} 
                        onChange={e => {
                            setCourseDesc(e.target.value);
                            autoResize(e.target);
                        }}
                        placeholder="О чем этот курс..." 
                    />
                </div>
            </section>

            <section className="card text">
                <h2>Материалы и тестирование</h2>
                
                <div className="input-item">
                    <h4>Дополнительные материалы</h4>
                    <div className="nested-courses">
                        <div className="input-with-button">
                            <input 
                                className="input-field ghost-input-style" 
                                placeholder="Вставьте ссылку (https://...)"
                                value={materialInput}
                                onChange={e => setMaterialInput(e.target.value)}
                            />
                            <button className="btn btn-secondary" onClick={handleAddLink}>Добавить ссылку</button>
                        </div>

                        <div className="upload-zone">
                            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                            <button 
                                className="btn-upload" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? 'Загрузка...' : 'Выбор файла'}
                            </button>
                        </div>

                        <div className="courses-grid">
                            {materials.map((mat, idx) => (
                                <div key={idx} className="course-item-mini">
                                    <div className="material-info">
                                        <span className="material-icon">{mat.isExternalLink}</span>
                                        <span className="truncate-text">{mat.title || mat.urlDocument}</span>
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

                {/* Секция тестов: Выпадающий список при фокусе */}
                <div className="input-item">
                    <h4>Привязанные тесты</h4>
                    <div className="search-container" ref={searchRef}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                className="input-field" 
                                value={searchTestQuery} 
                                onChange={e => {
                                    setSearchTestQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }} 
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Найти или выбрать тест из списка..." 
                            />
                            
                            <div 
                                className={`search-arrow ${isDropdownOpen ? 'open' : ''}`}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <img className='search-dropdown' src={downIcon} alt="" />
                            </div>

                            {isDropdownOpen && filteredTests.length > 0 && (
                                <div className="search-results">
                                    {filteredTests.map(t => {
                                        const isSelected = selectedTests.find(st => st.id === t.id);
                                        return (
                                            <div 
                                                key={t.id} 
                                                className={`search-item ${isSelected ? 'selected' : ''}`} 
                                                onClick={() => {
                                                    if (!isSelected) {
                                                        setSelectedTests([...selectedTests, t]);
                                                    }
                                                    setIsDropdownOpen(false);
                                                    setSearchTestQuery('');
                                                }}
                                            >
                                                {t.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="chips-display-zone">
                            {selectedTests.map(t => (
                                <div key={t.id} className="chip mentor-chip">
                                    {t.title}
                                    <img 
                                        src={cross} 
                                        className="chip-remove-icon" 
                                        onClick={() => setSelectedTests(selectedTests.filter(st => st.id !== t.id))} 
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
                <button className="btn btn-primary" onClick={handleSaveCourse}>
                    {isEditMode ? 'Сохранить изменения' : 'Создать курс'}
                </button>
            </div>
        </div>
    );
};

export default AdminEditCourse;