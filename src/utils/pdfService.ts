import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

export const generateStatementPDF = async (data: any[], user: any): Promise<string> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 255); // Blue
    doc.text("Account Statements", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Reset to Black
    
    let yPos = 40;
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;

    doc.setFont("helvetica", "bold"); doc.text("First Name:", leftCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.firstName}`, leftCol + 30, yPos);
    
    doc.setFont("helvetica", "bold"); doc.text("Last Name:", rightCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.lastName || "N/A"}`, rightCol + 30, yPos);

    yPos += 10;
    doc.setFont("helvetica", "bold"); doc.text("Email:", leftCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.email}`, leftCol + 30, yPos);
    
    doc.setFont("helvetica", "bold"); doc.text("Phone:", rightCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.phone || "N/A"}`, rightCol + 30, yPos);

    yPos += 10;
    doc.setFont("helvetica", "bold"); doc.text("Address:", leftCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.address || "N/A"}`, leftCol + 30, yPos);
    
    doc.setFont("helvetica", "bold"); doc.text("Location:", rightCol, yPos);
    doc.setFont("helvetica", "normal"); doc.text(`${user.city || "N/A"}, ${user.state || "N/A"}`, rightCol + 30, yPos);

    const tableData = data.map(item => [
        item.createdAt.toISOString().split('T')[0],
        item.type,
        item.category || "N/A",
        `Rs. ${item.amount}`,
        item.status,
        item.transactionId || item.bookingId?._id || "N/A"
    ]);

    autoTable(doc, {
        startY: yPos + 20,
        head: [['Date', 'Type', 'Category', 'Amount', 'Status', 'Reference ID']],
        body: tableData,
        headStyles: { fillColor: [0, 0, 255], textColor: 255, fontSize: 12, fontStyle: 'bold' },
        bodyStyles: { fontSize: 12, textColor: 50 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 }
    });

    const fileName = `Statement-${user.firstName}-${Date.now()}.pdf`;
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const filePath = path.join(reportsDir, fileName);
    const buffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(filePath, buffer);

    return filePath;
};