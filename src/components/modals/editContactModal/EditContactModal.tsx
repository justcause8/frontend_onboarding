import React, { useState, useEffect } from 'react';
import { userService, type UserShort } from '../../../services/user.service';
import type { SupportContact } from '../../../services/contacts.service';
import '../editModal/EditModal.css';
import searchIcon from '@/assets/icons/search.svg';
import cross from '@/assets/icons/cross.png';

interface EditContactModalProps {
    isOpen: boolean;
    contact: SupportContact | null;
    onClose: () => void;
    onSave: (data: {
        issueCategory: string;
        description: string;
        messengerLink: string;
        fkUserId: string;
    }) => void;
}

const EditContactModal: React.FC<EditContactModalProps> = ({ isOpen, contact, onClose, onSave }) => {
    const [issueCategory, setIssueCategory] = useState('');
    const [description, setDescription] = useState('');
    const [messengerLink, setMessengerLink] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserShort | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<UserShort[]>([]);

    useEffect(() => {
        if (isOpen) {
            userService.getAllUsers().then(setAllUsers).catch(() => {});
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && contact) {
            setIssueCategory(contact.issueCategory);
            setDescription(contact.description);
            setMessengerLink(contact.messengerLink || '');
            setUserSearch(contact.employeeName);
            setSelectedUser(null); // будет найден после загрузки users
        }
    }, [isOpen, contact]);

    useEffect(() => {
        if (contact && allUsers.length > 0) {
            const found = allUsers.find(u => u.id === contact.fkUserId) || null;
            setSelectedUser(found);
            if (found) setUserSearch(found.fullName);
        }
    }, [allUsers, contact]);

    const filteredUsers = allUsers.filter(u =>
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    const handleSave = () => {
        if (!issueCategory.trim() || !selectedUser) {
            alert('Заполните категорию и выберите сотрудника');
            return;
        }
        onSave({
            issueCategory: issueCategory.trim(),
            description: description.trim(),
            messengerLink: messengerLink.trim(),
            fkUserId: selectedUser.id,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay text" onClick={onClose}>
            <div className="modal-edit-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h2>Редактировать контакт</h2>
                </div>

                <div className="modal-body">
                    <div className="input-item">
                        <h4>Категория</h4>
                        <input
                            className="input-field"
                            value={issueCategory}
                            onChange={e => setIssueCategory(e.target.value)}
                            placeholder="Название категории"
                            autoFocus
                        />
                    </div>

                    <div className="input-item">
                        <h4>Описание</h4>
                        <textarea
                            className="textarea-field"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Описание"
                        />
                    </div>

                    <div className="input-item">
                        <h4>Сотрудник</h4>
                        <div className="input-search-wrapper">
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
                        {selectedUser && (
                            <div className="selected-employees-list" style={{ marginTop: '8px' }}>
                                <div className="employee-row employee-row--mentor">
                                    <div className="employee-row-info">
                                        <span className="employee-name">{selectedUser.fullName}</span>
                                        <span className="employee-dept">{selectedUser.department || selectedUser.position}</span>
                                    </div>
                                    <img
                                        src={cross}
                                        className="chip-remove-icon"
                                        alt="x"
                                        onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="input-item">
                        <h4>Ссылка для связи</h4>
                        <input
                            className="input-field"
                            value={messengerLink}
                            onChange={e => setMessengerLink(e.target.value)}
                            placeholder="https://t.me/... или mailto:..."
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
                </div>
            </div>
        </div>
    );
};

export default EditContactModal;
