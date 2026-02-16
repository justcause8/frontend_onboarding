import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { testService, type Question, type QuestionOption } from '../../../../services/test.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../../contexts/PageTitleContext';

import './AdminEditTest.css';

import deleteIcon from '@/assets/editMode/DeleteIcon.png';
import cross from '@/assets/cross.png';

export const AdminEditTest: React.FC = () => {
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();
  const params = useParams<{ testId: string; courseId?: string }>();
  const { testId } = params;
  const isEditMode = testId !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  
  // Поля теста
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [status, setStatus] = useState('active');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const returnToCourse = searchParams.get('returnToCourse');


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 2. Если создание — ставим заголовок сразу
        if (!isEditMode) {
          setDynamicTitle('Создание теста');
        }

        if (isEditMode) {
          const data = await testService.getTestById(Number(testId));
          setTitle(data.title);
          // 3. Если редактирование — ставим название теста
          setDynamicTitle(data.title); 
          
          setDescription(data.description || '');
          setPassingScore(data.passingScore);
          setStatus(data.status);
          setQuestions(data.questions || []);
          setCurrentCourseId(data.courseId);
        }
      } catch (e) {
        console.error("Ошибка загрузки теста:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // 4. Очистка при уходе
    return () => setDynamicTitle('');
  }, [testId, isEditMode, setDynamicTitle]);

  // 5. Обновление заголовка при вводе названия (чтобы в крошках менялось сразу)
  useEffect(() => {
    if (isEditMode && title) {
      setDynamicTitle(title);
    }
  }, [title, isEditMode, setDynamicTitle]);

  // --- ЛОГИКА ВОПРОСОВ ---

  const addQuestionByType = (typeId: number, typeName: string) => {
  const newQuestion: Question = {
    id: Date.now(), 
    testId: Number(testId) || 0,
    questionTypeId: typeId,
    typeName: typeName,
    textQuestion: '',
    options: [
      { id: Date.now() + 1, text: '', correctAnswer: false, orderIndex: 1 },
      { id: Date.now() + 2, text: '', correctAnswer: false, orderIndex: 2 }
    ]
  };
  setQuestions([...questions, newQuestion]);
};

  const removeQuestion = (qId: number) => {
    setQuestions(questions.filter(q => q.id !== qId));
  };

  const updateQuestionText = (qId: number, text: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, textQuestion: text } : q));
  };

  const addOption = (qId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOption: QuestionOption = {
          id: Date.now(),
          text: '',
          correctAnswer: false,
          orderIndex: q.options.length + 1
        };
        return { ...q, options: [...q.options, newOption] };
      }
      return q;
    }));
  };

  const removeOption = (qId: number, optId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter(o => o.id !== optId) };
      }
      return q;
    }));
  };

  const updateOption = (qId: number, optId: number, data: Partial<QuestionOption>) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map(o => o.id === optId ? { ...o, ...data } : o)
        };
      }
      return q;
    }));
  };

  const toggleCorrectAnswer = (qId: number, optId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        // ИСПРАВЛЕНО: Одиночный выбор теперь имеет ID 2
        const isSingleChoice = q.questionTypeId === 2; 
        return {
          ...q,
          options: q.options.map(o => {
            if (o.id === optId) return { ...o, correctAnswer: !o.correctAnswer };
            return isSingleChoice ? { ...o, correctAnswer: false } : o;
          })
        };
      }
      return q;
    }));
  };

  // --- СОХРАНЕНИЕ ---

  const handleSave = async () => {
    // Валидация перед отправкой
    if (!title.trim()) {
        alert("Заполните название теста");
        return;
    }

    if (questions.some(q => !q.textQuestion.trim())) {
        alert("Заполните текст всех вопросов");
        return;
    }

    try {
      setLoading(true);

      const testData = {
        title: title.trim(),
        description: description.trim(),
        passingScore: isNaN(Number(passingScore)) ? 70 : Number(passingScore),
        status: status,
        // Передаем ID курса (важно для бэкенда)
        courseId: params.courseId ? Number(params.courseId) : currentCourseId,
        
        questions: questions.map((q) => ({
          id: q.id > 1000000000000 ? 0 : q.id,
          questionTypeId: q.questionTypeId,
          textQuestion: q.textQuestion.trim(),
          options: q.options.map((o, oIdx) => ({
            id: o.id > 1000000000 ? 0 : o.id,
            text: o.text.trim(),
            correctAnswer: !!o.correctAnswer, 
            orderIndex: oIdx + 1
          }))
        }))
      };
      let savedTest: any;
      if (isEditMode) {
          await testService.updateTest(Number(testId), testData as any);
          savedTest = { id: Number(testId) };
      } else {
          const response = await testService.createTest(testData as any);
          savedTest = response; 
      }

      if (returnToCourse) {
          const createdId = savedTest?.id || savedTest; 
          navigate(`/edit/courses/${returnToCourse}?newTestId=${createdId}`);
      } else {
          navigate(-1);
      }
    } catch (e: any) {
       // Выводим подробности ошибки из тела ответа
       const serverError = e.response?.data?.errors;
       console.error("Детали ошибки:", serverError || e.response?.data);
       alert("Ошибка валидации на сервере. Проверьте заполнение всех полей.");
    } finally {
      setLoading(false);
    }
  };

  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'inherit';
    target.style.height = `${target.scrollHeight}px`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <section className="card text">
        <h2>{isEditMode ? 'Редактирование теста' : 'Новый тест'}</h2>
        <div className="input-item">
          <h4>Название теста</h4>
          <input 
            className="input-field" 
            value={title}
            onChange={e => setTitle(e.target.value)} 
            placeholder="Например: Тест по курсу Знакомство с культурой компании" 
          />
        </div>
        <div className="input-item">
          <h4>Описание</h4>
          <textarea 
            className="textarea-field"
            value={description} 
            onChange={e => {
              setDescription(e.target.value);
              autoResize(e.target);
            }}
            placeholder="О чем этот тест и какие правила прохождения?" 
          />
        </div>
        <div className="input-item" style={{ maxWidth: '200px' }}>
          <h4>Балл для прохождения (%)</h4>
          <input 
            type="number"
            className="input-field" 
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
      </section>

      <section className="card text">
        <h2>Вопросы теста</h2>
        <div className="stages-list">
          {questions.map((q, index) => (
            <div key={q.id} className="stage-card">
              <div className="stage-card-header">
                <div className="stage-number">{index + 1}</div>
                <input
                  className="input-field"
                  value={q.textQuestion}
                  placeholder="Введите текст вопроса..."
                  onChange={(e) => updateQuestionText(q.id, e.target.value)}
                />
                <div className="order-controls">
                  <button className="control-btn del-btn" onClick={() => removeQuestion(q.id)} title="Удалить вопрос">
                    <img src={deleteIcon} alt="X" />
                  </button>
                </div>
              </div>

              <div className="input-item">
                <h4 style={{ marginBottom: '12px' }}>Варианты ответов</h4>
                <div className="answers-section">
                  {q.options.map((opt, i) => (
                    <div key={opt.id} className="answer-row">
                      <div 
                        className={`answer-marker ${q.questionTypeId === 2 ? 'round' : 'square'} ${opt.correctAnswer ? 'active' : ''}`}
                        onClick={() => toggleCorrectAnswer(q.id, opt.id)}
                      ></div>
                      
                      <input
                        type="text"
                        className="input-field"
                        placeholder={`Вариант ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                      />
                      
                      <img
                        src={cross}
                        className="remove-icon"
                        onClick={() => removeOption(q.id, opt.id)}
                        alt="Удалить ответ"
                      />
                    </div>
                  ))}
                  
                  <button type="button" className="add-answer-link" onClick={() => addOption(q.id)}>
                    Добавить вариант ответа
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Блок добавления нового вопроса с выбором типа */}
        <div className="add-question-placeholder">
          <span className="add-question-title">Добавить новый вопрос</span>
          <div className="question-type-buttons">
            {/* Тип 2 - Одиночный (Close) */}
            <div className="q-type-btn" onClick={() => addQuestionByType(2, 'Одиночный выбор')}>
              <span className="q-type-label-btn">Закрытый</span>
            </div>
            {/* Тип 3 - Множественный (Multiple) */}
            <div className="q-type-btn" onClick={() => addQuestionByType(3, 'Множественный выбор')}>
              <span className="q-type-label-btn">Множественный</span>
            </div>
          </div>
        </div>
      </section>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSave}>
            {isEditMode ? 'Сохранить тест' : 'Создать тест'}
        </button>
      </div>
    </>
  );
};

export default AdminEditTest;