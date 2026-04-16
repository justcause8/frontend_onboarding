import { useEffect, useState, useCallback } from 'react';
import { contactsService, type SupportContact, type EmployeeContact } from '../../services/contacts.service';
import { userService, type UserShort } from '../../services/user.service';
import { useUserStore } from '../../store/useUserStore';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { buildMailto } from '../../utils/mailtoBuilder';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import linkIcon from '@/assets/icons/link.svg';
import './ContactsPage.css';

const ContactsPage = () => {
  const { setDynamicTitle } = usePageTitle();
  const { user } = useUserStore();

  const [mentor, setMentor] = useState<EmployeeContact | null>(null);
  const [deptHead, setDeptHead] = useState<EmployeeContact | null>(null);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [allUsers, setAllUsers] = useState<UserShort[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [contacts, users] = await Promise.all([
        contactsService.getSupportContacts(),
        userService.getAllUsers(),
      ]);
      setSupportContacts(contacts);
      setAllUsers(users);

      const currentUser = users.find(u => u.fullName === user?.name);
      const userGuid = currentUser?.id ?? null;

      if (userGuid) {
        const [mentorData, headData] = await Promise.all([
          contactsService.getMentor(userGuid),
          contactsService.getDepartmentHead(userGuid),
        ]);
        setMentor(mentorData);
        setDeptHead(headData);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setDynamicTitle('Контактная информация');
    loadData();
    return () => setDynamicTitle('');
  }, [setDynamicTitle, loadData]);

  if (loading) return <LoadingSpinner />;

  const keyContacts: { role: string; contact: EmployeeContact }[] = [
    mentor   ? { role: 'Наставник',        contact: mentor   } : null,
    deptHead ? { role: 'Начальник отдела', contact: deptHead } : null,
  ].filter(Boolean) as { role: string; contact: EmployeeContact }[];

  return (
    <div className="text">

      {/* Ключевые контакты */}
      <section className="card">
        <h2>Ключевые контакты</h2>
        {keyContacts.length === 0 ? (
          <p>Ключевые контакты не назначены</p>
        ) : (
          <div className="key-contacts-grid">
            {keyContacts.map(({ role, contact }) => (
              <div key={role} className="contact-card-h card-item">
                <div className="contact-name-row">
                  <span className="employee-name">{contact.name}</span>
                  <span className="category-badge contact-role-badge">{role}</span>
                </div>
                <div className="employee-row-info">
                  <span className="employee-dept">{contact.jobTitle}</span>
                  <span className="employee-dept">{contact.department}</span>
                </div>
                <a
                  href={contact.email ? buildMailto(contact.email, contact.name, user?.name ?? '') : undefined}
                  className={`btn btn-secondary${!contact.email ? ' btn-disabled' : ''}`}
                  onClick={!contact.email ? e => e.preventDefault() : undefined}
                >
                  Написать
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* К кому обратиться */}
      <section className="card">
        <h2>К кому обратиться за помощью?</h2>
        {supportContacts.length === 0 ? (
          <p className="contacts-empty">Категории помощи не добавлены</p>
        ) : (
          <div className="help-contacts-grid">
            {supportContacts.map(contact => {
              const empEmail = (
                allUsers.find(u => u.id === contact.fkUserId) ??
                allUsers.find(u => u.fullName === contact.employeeName)
              )?.email;
              return (
                <div key={contact.id} className="contact-card-v card-item">
                  <div className="contact-problem">
                    <h4>{contact.issueCategory}</h4>
                    <p className="contact-sub">{contact.description}</p>
                  </div>
                  <div className="contact-card-footer">
                    <div className="employee-row-info">
                      <span className="employee-name">{contact.employeeName}</span>
                      <span className="employee-dept">{contact.employeeJobTitle}</span>
                      <span className="employee-dept">{contact.employeeDepartment}</span>
                    </div>
                    {contact.messengerLink && (
                      <a
                        href={contact.messengerLink}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-ext-link"
                      >
                        <img src={linkIcon} alt="" className="contact-ext-link-icon" />
                        {contact.messengerLink}
                      </a>
                    )}
                    <a
                      href={empEmail ? buildMailto(empEmail, contact.employeeName, user?.name ?? '') : undefined}
                      className={`btn btn-secondary contact-write-btn${!empEmail ? ' btn-disabled' : ''}`}
                      onClick={!empEmail ? e => e.preventDefault() : undefined}
                    >
                      Написать
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default ContactsPage;
