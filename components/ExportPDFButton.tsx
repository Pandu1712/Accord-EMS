'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportPDFButtonProps {
    data: any[];
    title: string;
    filename: string;
    className?: string;
    headers: string[];
    formatRow: (row: any) => string[];
    iconSize?: number;
    buttonText?: string;
}

export default function ExportPDFButton({ data, title, filename, className, headers, formatRow, iconSize = 18, buttonText = "Export PDF" }: ExportPDFButtonProps) {
    const handleExport = () => {
        if (!data || data.length === 0) {
            alert("No records to export.");
            return;
        }
        
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(title, 14, 20);

        const rows = data.map(formatRow);

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [249, 115, 22] }
        });

        doc.save(filename);
    }

    return (
        <Button onClick={handleExport} className={className}>
            <Download size={iconSize} className="mr-2" />
            {buttonText}
        </Button>
    )
}
