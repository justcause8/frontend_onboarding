import React from 'react';
import './AdminTable.css';

interface Column {
    header: string;
    width?: string;
}

interface AdminTableProps<T> {
    columns: Column[];
    data: T[];
    renderRow: (item: T) => React.ReactNode;
    emptyText?: string;
}

export function AdminTable<T>({ columns, data, renderRow, emptyText = "Данные не найдены" }: AdminTableProps<T>) {
    return (
        <div className="admin-table-container">
            <table className="admin-table">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} style={{ width: col.width }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className=''>
                    {data.length > 0 ? (
                        data.map((item) => renderRow(item))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="table-empty-row">
                                {emptyText}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}