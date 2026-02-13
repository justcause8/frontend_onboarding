import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Импортируем типы и сервисы
import { courseService, type Material, type Course } from '../../../../services/course.service';
import { testService } from '../../../../services/test.service'; 

import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../../contexts/PageTitleContext';

import './AdminEditCourse.css';
import cross from '@/assets/cross.png';
import downIcon from '@/assets/editMode/DownIcon.png';

interface TestShort {
    id: number;
    title: string;
    passingScore: number;
}

export const AdminEditCourse: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const isEditMode = courseId !== 'new';

    const [loading, setLoading] = useState(isEditMode);
    
    // Состояния данных курса
    const [courseName, setCourseName] = useState('');
    const [courseDesc, setCourseDesc] = useState('');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedTests, setSelectedTests] = useState<TestShort[]>([]);
    
    // Состояния поиска и выбора тестов
    const [allTests, setAllTests] = useState<TestShort[]>([]);
    const [searchTestQuery, setSearchTestQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [materialInput, setMaterialInput] = useState('');

    // Загрузка данных при старте
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

    // Закрытие выпадающего списка при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveCourse = async () => {
      try {
          setLoading(true);

          const courseData: any = {
              title: courseName,
              description: courseDesc,
              materials: materials.map(m => m.urlDocument),
              testIds: selectedTests.map(t => t.id)
          };

          if (!isEditMode) {
              courseData.orderIndex = 0;
              courseData.status = "active";
          }

          if (isEditMode) {
              await courseService.updateCourse(Number(courseId), courseData);
          } else {
              await courseService.createCourse(courseData);
          }
          
          navigate('/edit/courses');
          
      } catch (e: any) {
          console.error("Ошибка сохранения:", e);
          alert("Не удалось сохранить курс.");
      } finally {
          setLoading(false);
      }
    };

    const handleAddMaterial = () => {
        if (materialInput.trim()) {
            const newMaterial: Material = {
                id: Date.now(),
                urlDocument: materialInput.trim(),
                title: ''
            };
            setMaterials([...materials, newMaterial]);
            setMaterialInput(''); // Очищаем поле
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
                    <h4>Ссылки на дополнительные материалы</h4>
                    <div className="nested-courses">
                        {/* Контейнер для инпута и кнопки в одну строку */}
                        <div className="input-with-button" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            <input 
                                className="input-field ghost-input-style" 
                                placeholder="Вставьте ссылку"
                                value={materialInput}
                                onChange={e => setMaterialInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddMaterial();
                                    }
                                }}
                            />
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={handleAddMaterial}
                            >
                                Добавить
                            </button>
                        </div>

                        <div className="courses-grid">
                            {materials.map((mat, idx) => (
                                <div key={mat.id || idx} className="course-item-mini">
                                    <span className="truncate-text">{mat.urlDocument}</span>
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