import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import downIcon from '@/assets/editMode/DownIcon.png';
import { contactsService, type SupportContact } from '../../../services/contacts.service';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import { AdminTable } from '../../../components/adminTable/AdminTable';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import EditContactModal from '../../../components/modals/editContactModal/EditContactModal';
import editIcon from '@/assets/editMode/EditIcon.png';
import deleteIcon from '@/assets/editMode/DeleteIcon.png';
import searchIcon from '@/assets/icons/search.svg';
import cross from '@/assets/icons/cross.png';
import { userService, type UserShort } from '../../../services/user.service';
import '../adminMaterialsPage/AdminEditMaterialsPage.css';
import './AdminEditContactsPage.css';

export const AdminEditContactsPage: React.FC = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<SupportContact[]>([]);
    const [allUsers, setAllUsers] = useState<UserShort[]>([]);

    // Форма создания
    const DRAFT_KEY = 'admin_contact_draft';
    const savedDraft = (() => { try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; } })();
    const [issueCategory, setIssueCategory] = useState<string>(savedDraft?.issueCategory ?? '');
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);
    const [description, setDescription] = useState<string>(savedDraft?.description ?? '');
    const [messengerLink, setMessengerLink] = useState<string>(savedDraft?.messengerLink ?? '');
    const [selectedUser, setSelectedUser] = useState<UserShort | null>(null);
    const [userSearch, setUserSearch] = useState<string>(savedDraft?.userSearch ?? '');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const existingCategories = useMemo(
        () => [...new Set(contacts.map(c => c.issueCategory))],
        [contacts]
    );
    const filteredCategories = existingCategories.filter(c =>
        c.toLowerCase().includes(issueCategory.toLowerCase())
    );

    // Модальное окно редактирования
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<SupportContact | null>(null);

    const filteredUsers = allUsers.filter(u =>
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [data, users] = await Promise.all([
                contactsService.getSupportContacts(),
                userService.getAllUsers(),
            ]);
            setContacts(data);
            setAllUsers(users);
        } catch {
            alert('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setDynamicTitle('Управление контактами');
        loadData();
        return () => setDynamicTitle('');
    }, [setDynamicTitle, loadData]);

    useEffect(() => {
        if (!issueCategory && !description && !messengerLink && !userSearch) return;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ issueCategory, description, messengerLink, userSearch }));
    }, [issueCategory, description, messengerLink, userSearch]);

    const resetForm = () => {
        setIssueCategory('');
        setDescription('');
        setMessengerLink('');
        setSelectedUser(null);
        setUserSearch('');
        localStorage.removeItem(DRAFT_KEY);
    };

    const handleCreate = async () => {
        if (!issueCategory.trim() || !selectedUser) {
            alert('Заполните категорию и выберите сотрудника');
            return;
        }
        try {
            setLoading(true);
            await contactsService.createSupportContact({
                fkUserId: selectedUser.numericId!,
                issueCategory: issueCategory.trim(),
                description: description.trim(),
                messengerLink: messengerLink.trim() || undefined,
            });
            resetForm();
            await loadData();
        } catch {
            alert('Ошибка при сохранении');
        } finally {
            setLoading(false);
        }
    };

    const handleModalSave = async (data: {
        issueCategory: string;
        description: string;
        messengerLink: string;
        fkUserId: number;
    }) => {
        if (!editingContact) return;
        try {
            setLoading(true);
            await contactsService.updateSupportContact(editingContact.id, {
                ...data,
                messengerLink: data.messengerLink || undefined,
            });
            setIsModalOpen(false);
            setEditingContact(null);
            await loadData();
        } catch {
            alert('Ошибка при сохранении');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Удалить эту категорию контактов?')) return;
        try {
            await contactsService.deleteSupportContact(id);
            setContacts(prev => prev.filter(c => c.id !== id));
        } catch {
            alert('Ошибка при удалении');
        }
    };

    if (loading && contacts.length === 0) return <LoadingSpinner />;

    return (
        <div className="text">

            {/* Форма создания */}
            <section className="card">
                <h2>Новая категория контактов</h2>
                <div className="add-controls-column">
                    <div className="input-item">
                        <h4>1. Категория и описание</h4>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input-field"
                                placeholder="Название категории..."
                                value={issueCategory}
                                onChange={e => { setIssueCategory(e.target.value); setCatDropdownOpen(true); }}
                                onFocus={() => setCatDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setCatDropdownOpen(false), 150)}
                            />
                            <div className={`search-arrow${catDropdownOpen ? ' open' : ''}`} onClick={() => setCatDropdownOpen(v => !v)}>
                                <img className="search-dropdown" src={downIcon} alt="" />
                            </div>
                            {catDropdownOpen && filteredCategories.length > 0 && (
                                <div className="search-results">
                                    {filteredCategories.map(cat => (
                                        <div
                                            key={cat}
                                            className={`search-item${issueCategory === cat ? ' selected' : ''}`}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => { setIssueCategory(cat); setCatDropdownOpen(false); }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <textarea
                            className="textarea-field mt-8"
                            placeholder="Описание..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="input-item">
                        <h4>2. Сотрудник и ссылка</h4>
                        <div className="contact-add-row">
                            <div className="input-search-wrapper contact-add-search">
                                <input
                                    className="input-field"
                                    placeholder="Найти сотрудника..."
                                    value={userSearch}
                                    onChange={e => { setUserSearch(e.target.value); setUserDropdownOpen(true); setSelectedUser(null); }}
                                    onFocus={() => setUserDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setUserDropdownOpen(false), 150)}
                                />
                                <img src={searchIcon} alt="" className="input-search-icon" />
                                {userDropdownOpen && filteredUsers.length > 0 && (
                                    <div className="search-results">
                                        {filteredUsers.map(u => (
                                            <div
                                                key={u.id}
                                                className="search-item search-item--row"
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setUserSearch(u.fullName);
                                                    setUserDropdownOpen(false);
                                                }}
                                            >
                                                <span>{u.fullName}<small>{u.position}</small></span>
                                                {u.department && <small className="search-item-dept">{u.department}</small>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                className="input-field contact-add-link"
                                placeholder="Ссылка: https://xlnk.ms/..."
                                value={messengerLink}
                                onChange={e => setMessengerLink(e.target.value)}
                            />
                            <button className="btn btn-primary" onClick={handleCreate}>
                                Добавить
                            </button>
                        </div>
                        {selectedUser && (
                            <div className="selected-employees-list mt-8">
                                <div className="employee-row employee-row--mentor">
                                    <div className="employee-row-info">
                                        <span className="employee-name">{selectedUser.fullName}</span>
                                        <span className="employee-dept">{selectedUser.department || selectedUser.position}</span>
                                    </div>
                                    <img src={cross} className="chip-remove-icon" alt="x"
                                        onClick={() => { setSelectedUser(null); setUserSearch(''); }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Таблица */}
            <section className="card no-padding">
                <AdminTable
                    columns={[
                        { header: 'Категория', width: '20%' },
                        { header: 'Описание', width: '30%' },
                        { header: 'Сотрудник', width: '22%' },
                        { header: 'Действия', width: '8%' },
                    ]}
                    data={contacts}
                    emptyText="Категории не добавлены"
                    renderRow={(contact) => (
                        <tr key={contact.id}>
                            <td>
                                <b><span className="main-text">{contact.issueCategory}</span></b>
                            </td>
                            <td>
                                <span className="sub-text">{contact.description}</span>
                            </td>
                            <td>
                                <div className="material-title-cell">
                                    <span className="main-text">{contact.employeeName}</span>
                                    <span className="sub-text">{contact.employeeJobTitle}</span>
                                    <span className="sub-text">{contact.employeeDepartment}</span>
                                </div>
                            </td>
                            <td className="action-cell">
                                <div className="table-actions">
                                    <img src={editIcon} className="edit-icon-table" alt="edit"
                                        onClick={() => { setEditingContact(contact); setIsModalOpen(true); }} />
                                    <img src={deleteIcon} className="remove-icon" alt="delete"
                                        onClick={() => handleDelete(contact.id)} />
                                </div>
                            </td>
                        </tr>
                    )}
                />
            </section>

            <EditContactModal
                isOpen={isModalOpen}
                contact={editingContact}
                onClose={() => { setIsModalOpen(false); setEditingContact(null); }}
                onSave={handleModalSave}
            />

        </div>
    );
};

export default AdminEditContactsPage;
