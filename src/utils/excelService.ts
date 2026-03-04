import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export const generateStatementExcel = async (data: any[], user: any): Promise<string> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Account Statements');

    worksheet.mergeCells('A1:G1');
    const mainTitle = worksheet.getCell('A1');
    mainTitle.value = 'Account Statements';
    mainTitle.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0000FF' } }; // Blue Bold
    mainTitle.alignment = { horizontal: 'center' };

    
    worksheet.getCell('A3').value = 'First Name:';
    worksheet.getCell('B3').value = user.firstName;
    worksheet.getCell('A4').value = 'Email:';
    worksheet.getCell('B4').value = user.email;
    worksheet.getCell('A5').value = 'Address:';
    worksheet.getCell('B5').value = user.address || 'N/A';

    worksheet.getCell('E3').value = 'Last Name:';
    worksheet.getCell('F3').value = user.lastName || 'N/A';
    worksheet.getCell('E4').value = 'Phone:';
    worksheet.getCell('F4').value = user.phone || 'N/A';
    worksheet.getCell('E5').value = 'Location:';
    worksheet.getCell('F5').value = `${user.city || 'N/A'}, ${user.state || 'N/A'}`;

    ['A3', 'A4', 'A5', 'D3', 'D4', 'D5'].forEach(cell => {
        worksheet.getCell(cell).font = { size: 12, bold: true };
    });
    ['B3', 'B4', 'B5', 'E3', 'E4', 'E5'].forEach(cell => {
        worksheet.getCell(cell).font = { size: 12, bold: false };
    });

    const tableHeaderRow = 7;
    worksheet.getRow(tableHeaderRow).values = ['Date', 'Type', 'Category', 'Amount', 'Status', 'Transaction ID', 'Booking ID'];
    
    worksheet.getRow(tableHeaderRow).font = { size: 12, bold: true };
    
    data.forEach((item, index) => {
        const row = worksheet.addRow([
            item.createdAt.toISOString().split('T')[0],
            item.type,
            item.category || 'N/A',
            `₹${item.amount}`,
            item.status,
            item.transactionId || 'N/A',
            item.bookingId?._id ? item.bookingId._id.toString() : 'N/A'
        ]);
        row.font = { size: 12, bold: false };
    });

    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    const fileName = `Statement-${user.firstName}-${Date.now()}.xlsx`;
    const reportsDir = path.resolve('reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const filePath = path.join(reportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
};