import { useEffect, useState, useCallback, useRef } from 'react';
import { userService, type UserShort } from '../../services/user.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useUserStore } from '../../store/useUserStore';
import { buildMailto } from '../../utils/mailtoBuilder';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import './EmployeesPage.css';
import searchIcon from '@/assets/search.svg';
import nextRight from '@/assets/next-right.png';
import nextLeft from '@/assets/next-left.png';

// TODO: при подключении внешнего API заменить вызов userService.getAllUsers()
// на соответствующий метод нового сервиса (например externalEmployeeService.getAll())
// и обновить интерфейс Employee при необходимости.

interface Employee extends UserShort {
  // поля для расширения при подключении внешнего API:
  // email?: string;
  // phone?: string;
  // avatarUrl?: string;
}

const DEPARTMENT_HEAD_ROLES = ['head', 'director', 'manager', 'Начальник', 'Руководитель'];

const isDepartmentHead = (emp: Employee): boolean =>
  DEPARTMENT_HEAD_ROLES.some(r => emp.role?.toLowerCase().includes(r.toLowerCase()) ||
    emp.position?.toLowerCase().includes(r.toLowerCase()));

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
};

const SCROLL_STEP = 200;

const EmployeesPage = () => {
  const { setDynamicTitle } = usePageTitle();
  const { user } = useUserStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDepart, setActiveDepart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const updateScrollState = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setEmployees(data);
      const firstDept = [...new Set(data.map(e => e.department || 'Без отдела'))][0] ?? null;
      setActiveDepart(prev => prev ?? firstDept);
    } catch {
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDynamicTitle('Сотрудники');
    loadData();
    return () => setDynamicTitle('');
  }, [setDynamicTitle, loadData]);

  useEffect(() => {
    updateScrollState();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [employees]);

  const scroll = (dir: 'left' | 'right') => {
    tabsRef.current?.scrollBy({ left: dir === 'right' ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' });
  };

  const allDepartments = [...new Set(employees.map(e => e.department || 'Без отдела'))].sort();
  const departments = allDepartments.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()));

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const departmentEmployees = filteredEmployees
    .filter(e => (e.department || 'Без отдела') === activeDepart)
    .sort((a, b) => {
      const aHead = isDepartmentHead(a);
      const bHead = isDepartmentHead(b);
      if (aHead && !bHead) return -1;
      if (!aHead && bHead) return 1;
      return a.fullName.localeCompare(b.fullName, 'ru');
    });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="text">
      {allDepartments.length > 0 && (
        <section className="card employees-section">
          <div className="section-header">
            <h2>Отделы</h2>
            <div className="input-search-wrapper dept-search">
              <input
                type="text"
                placeholder="Поиск по отделам..."
                className="input-field"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
              <img src={searchIcon} alt="" className="input-search-icon" />
            </div>
          </div>
          {departments.length === 0 ? (
            <p>Отдел не найден</p>
          ) : (
            <div className="department-tabs-wrapper">
              {canScrollLeft && (
                <button className="dept-scroll-btn" onClick={() => scroll('left')}>
                  <img src={nextLeft} alt="←" />
                </button>
              )}
              <div className="department-tabs" ref={tabsRef}>
                {departments.map(dept => (
                  <button
                    key={dept}
                    className={`dept-tab${activeDepart === dept ? ' dept-tab--active' : ''}`}
                    onClick={() => setActiveDepart(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
              {canScrollRight && (
                <button className="dept-scroll-btn" onClick={() => scroll('right')}>
                  <img src={nextRight} alt="→" />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section className="card employees-section">
        <div className="section-header">
          <h2>Сотрудники</h2>
          <div className="input-search-wrapper dept-search">
            <input
              type="text"
              placeholder="Поиск сотрудника..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <img src={searchIcon} alt="" className="input-search-icon" />
          </div>
        </div>

        {activeDepart && departmentEmployees.length === 0 ? (
          <p className="sub-text">В этом отделе нет сотрудников</p>
        ) : (
          <div className="employees-grid">
            {departmentEmployees.map(emp => (
              <div key={emp.id} className="card-item employee-card">
                <div className="employee-avatar">
                  {getInitials(emp.fullName)}
                </div>
                <div className="employee-info">
                  <h4>{emp.fullName}</h4>
                  <p className="employee-dept-label">{emp.department || '—'}</p>
                  <p className="employee-position-label">{emp.position}</p>
                </div>
                <a
                  href={emp.email ? buildMailto(emp.email, emp.fullName, user?.name ?? '') : undefined}
                  className={`btn btn-secondary employee-contact-btn${!emp.email ? ' btn-disabled' : ''}`}
                  onClick={!emp.email ? e => e.preventDefault() : undefined}
                >
                  Написать
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployeesPage;
