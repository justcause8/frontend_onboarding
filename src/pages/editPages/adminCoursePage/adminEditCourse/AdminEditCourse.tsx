import React, { useState, useEffect, useRef } from 'react';
import { MarkdownEditor } from '../../../../components/markdownEditor/MarkdownEditor';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { courseService } from '../../../../services/course.service';
import { materialService, type Material } from '../../../../services/material.service';
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
    status?: string;
}

export const AdminEditCourse: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const isEditMode = courseId !== 'new';

    const [loading, setLoading] = useState(isEditMode);
    
    const [courseName, setCourseName] = useState('');
    const [courseDesc, setCourseDesc] = useState('');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedTests, setSelectedTests] = useState<TestShort[]>([]);
    
    const [allTests, setAllTests] = useState<TestShort[]>([]);
    const [searchTestQuery, setSearchTestQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [allGeneralMaterials, setAllGeneralMaterials] = useState<Material[]>([]);
    const [matSearchQuery, setMatSearchQuery] = useState('');
    const [isMatDropdownOpen, setIsMatDropdownOpen] = useState(false);
    const [brokenLinks, setBrokenLinks] = useState<string[]>([]);

    const [pendingFiles, setPendingFiles] = useState<{ file: File; previewTitle: string }[]>([]);
    
    const searchRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const draftProcessedRef = useRef(false);
    const [searchParams] = useSearchParams();
    const newTestId = searchParams.get('newTestId');
    const returnToRoute = searchParams.get('returnToRoute');
    const returnStageId = searchParams.get('stageId');
    const [materialInput, setMaterialInput] = useState('');

    useEffect(() => {
        if (materials.length > 0) {
            const check = async () => {
                const broken: string[] = [];
                for (const m of materials) {
                    const exists = await materialService.checkFileExists(m.urlDocument);
                    if (!exists) broken.push(m.urlDocument);
                }
                setBrokenLinks(broken);
            };
            check();
        }
    }, [materials]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [allTestsData, generalMats] = await Promise.all([
                    testService.getAllTests(),
                    materialService.getGeneralMaterials(),
                ]);
                setAllTests(allTestsData);
                setAllGeneralMaterials(generalMats);

                const draft = sessionStorage.getItem('course_draft');

                if (draft && !draftProcessedRef.current) {
                    draftProcessedRef.current = true;
                    const parsed = JSON.parse(draft);
                    setCourseName(parsed.courseName || '');
                    setCourseDesc(parsed.courseDesc || '');
                    setMaterials(parsed.materials || []);

                    let testsFromDraft = parsed.selectedTests || [];

                    if (newTestId) {
                        const newId = Number(newTestId);
                        const testObject = allTestsData.find(t => t.id === newId);

                        if (testObject && !testsFromDraft.find((t: any) => t.id === newId)) {
                            testsFromDraft = [...testsFromDraft, { id: testObject.id, title: testObject.title }];
                        }
                    }

                    setSelectedTests(testsFromDraft);
                    sessionStorage.removeItem('course_draft');
                } 
                else if (isEditMode) {
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
    }, [courseId, isEditMode]);

    const handleCreateTestRedirect = () => {
        const draft = {
            courseName,
            courseDesc,
            materials,
            selectedTests
        };
        sessionStorage.setItem('course_draft', JSON.stringify(draft));
        navigate(`/edit/tests/new?returnToCourse=${courseId}`);
    };

    /** Санирует название курса для использования как имя папки */
    const getCourseFolder = (): string => {
        const name = courseName.trim();
        if (!name) return 'Onbording';
        const sanitized = name
            .replace(/[\\/:*?"<>|]/g, '')  // запрещённые символы файловой системы
            .replace(/\s+/g, '_')           // пробелы → подчёркивание
            .substring(0, 64);              // ограничение длины
        return `Onbording/${sanitized}`;
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPendingFiles(prev => [...prev, { file, previewTitle: file.name }]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddLink = () => {
        const url = materialInput.trim();
        if (url) {
            const extractedTitle = extractFileNameFromUrl(url);
            const finalTitle = formatFileName(extractedTitle, true); 

            const newMaterial: Material = {
                id: 0,
                title: finalTitle, 
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

            // Загружаем pending-файлы только здесь, в папку курса
            let uploadedMaterials: Material[] = [];
            if (pendingFiles.length > 0) {
                const folder = getCourseFolder();
                uploadedMaterials = await Promise.all(
                    pendingFiles.map(async ({ file }) => {
                        const data = await materialService.uploadFile(file, folder);
                        let title = extractFileNameFromUrl(data.relativePath);
                        if (title.includes('_') && title.length > 37) {
                            title = title.substring(title.indexOf('_') + 1);
                        }
                        return { id: 0, title, urlDocument: data.relativePath, isExternalLink: false, category: 'Документ курса' } as Material;
                    })
                );
                setPendingFiles([]);
            }

            const courseData = {
                title: courseName,
                description: courseDesc,
                materials: [...materials, ...uploadedMaterials],
                testIds: selectedTests.map(t => t.id),
                status: 'active',
                orderIndex: 0,
            };

            if (isEditMode) {
                await courseService.updateCourse(Number(courseId), courseData);
                navigate('/edit/courses');
            } else {
                const res = await courseService.createCourse(courseData);
                if (returnToRoute) {
                    navigate(`/edit/adaptationRoutes/${returnToRoute}?newCourseId=${res.id}&stageId=${returnStageId}`);
                } else {
                    navigate('/edit/courses');
                }
            }
        } catch (e) {
            alert("Не удалось сохранить курс.");
        } finally {
            setLoading(false);
        }
    };


    if (loading) return <LoadingSpinner />;

    // Фильтрация тестов для выпадающего списка (archived не показываем)
    const filteredTests = allTests
        .filter(t => t.status !== 'archived' && t.title.toLowerCase().includes(searchTestQuery.toLowerCase()))
        .slice(0, 20);

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
                    <MarkdownEditor
                        value={courseDesc}
                        onChange={setCourseDesc}
                        placeholder="О чем этот курс..."
                        minHeight="120px"
                    />
                </div>
            </section>

            <section className="card text">
                <h2>Материалы и тестирование</h2>
                
                <div className="input-item">
                    <h4>Дополнительные материалы</h4>
                    <div className="nested-courses">
                        {/* Выбор из существующих материалов */}
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <input
                                className="input-field"
                                value={matSearchQuery}
                                onChange={e => { setMatSearchQuery(e.target.value); setIsMatDropdownOpen(true); }}
                                onFocus={() => setIsMatDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsMatDropdownOpen(false), 150)}
                                placeholder="Выбрать из существующих материалов..."
                            />
                            <div className={`search-arrow${isMatDropdownOpen ? ' open' : ''}`} onClick={() => setIsMatDropdownOpen(v => !v)}>
                                <img className="search-dropdown" src={downIcon} alt="" />
                            </div>
                            {isMatDropdownOpen && (
                                <div className="search-results">
                                    {allGeneralMaterials
                                        .filter(m => (m.title || m.urlDocument).toLowerCase().includes(matSearchQuery.toLowerCase()))
                                        .slice(0, 20)
                                        .map(m => {
                                            const alreadyAdded = materials.some(ex => ex.urlDocument === m.urlDocument);
                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`search-item search-item--row${alreadyAdded ? ' selected' : ''}`}
                                                    onMouseDown={e => e.preventDefault()}
                                                    onClick={() => {
                                                        if (!alreadyAdded) setMaterials(prev => [...prev, m]);
                                                        setMatSearchQuery('');
                                                        setIsMatDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{m.title || m.urlDocument}</span>
                                                    {m.category && <small className="search-item-dept">{m.category}</small>}
                                                </div>
                                            );
                                        })
                                    }
                                    {allGeneralMaterials.filter(m => (m.title || m.urlDocument).toLowerCase().includes(matSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="search-item disabled">Материалы не найдены</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="assign-divider"><span>или добавить новый</span></div>

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
                                disabled={loading}
                            >
                                Выбор файла
                            </button>
                        </div>

                        <div className="courses-grid">
                            {materials.map((mat, idx) => {
                                // 1. Сначала вычисляем статус (внутри фигурных скобок)
                                const isBroken = brokenLinks.includes(mat.urlDocument);
                                
                                // 2. Возвращаем ОДИН контейнер для элемента
                                return (
                                    <div key={`mat-${idx}`} className={`course-item-mini ${isBroken ? 'broken-link' : ''}`}>
                                        <div className="material-info">
                                            <span className="truncate-text">{mat.title || mat.urlDocument}</span>
                                            {isBroken && (
                                                <span className="error-badge" title="Файл физически отсутствует на сервере">
                                                    Файл не найден!
                                                </span>
                                            )}
                                        </div>
                                        <img 
                                            src={cross} 
                                            className="remove-icon" 
                                            onClick={() => setMaterials(materials.filter((_, i) => i !== idx))} 
                                            alt="remove" 
                                        />
                                    </div>
                                );
                            })}
                            
                            {/* Список ожидающих загрузки файлов остается без изменений */}
                            {pendingFiles.map((pf, idx) => (
                                <div key={`pf-${idx}`} className="course-item-mini course-item-mini--pending">
                                    <div className="material-info">
                                        <span className="truncate-text">{pf.previewTitle}</span>
                                        <span className="pending-badge">не сохранён</span>
                                    </div>
                                    <img src={cross} className="remove-icon" onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))} alt="remove" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Секция тестов: Выпадающий список при фокусе */}
                <div className="input-item">
                    <h4>Привязанные тесты</h4>
                    <button 
                        className="add-test" 
                        onClick={handleCreateTestRedirect}
                    >
                        + Создать новый тест
                    </button>
                    
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