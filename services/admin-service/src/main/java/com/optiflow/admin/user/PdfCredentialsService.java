package com.optiflow.admin.user;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.optiflow.admin.user.dto.ImportResult;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PdfCredentialsService {

    private static final DeviceRgb HEADER_COLOR = new DeviceRgb(30, 64, 115);
    private static final DeviceRgb ROW_ALT_COLOR = new DeviceRgb(240, 245, 255);
    private static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);

    public byte[] generateCredentialsPdf(List<ImportResult.CreatedAccount> accounts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        // Titre
        document.add(new Paragraph("OptiFlow — Identifiants Clients")
                .setFontSize(18)
                .setBold()
                .setFontColor(HEADER_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(4));

        document.add(new Paragraph("Généré le : " +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .setFontSize(9)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(4));

        document.add(new Paragraph("Total comptes créés : " + accounts.size())
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(16));

        // Tableau
        Table table = new Table(UnitValue.createPercentArray(new float[]{15, 25, 25, 20, 15}))
                .setWidth(UnitValue.createPercentValue(100));

        // En-têtes
        String[] headers = {"Code Client", "Nom Prénom", "Email", "Nom d'utilisateur", "Mot de passe"};
        for (String h : headers) {
            table.addHeaderCell(new Cell()
                    .add(new Paragraph(h).setBold().setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(HEADER_COLOR)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(6));
        }

        // Lignes
        for (int i = 0; i < accounts.size(); i++) {
            ImportResult.CreatedAccount acc = accounts.get(i);
            DeviceRgb bg = (i % 2 == 0) ? WHITE : ROW_ALT_COLOR;

            table.addCell(cell(acc.getClientCode(), bg));
            table.addCell(cell(acc.getFullName(), bg));
            table.addCell(cell(acc.getEmail(), bg));
            table.addCell(cell(acc.getUsername(), bg));
            table.addCell(cell(acc.getPassword(), bg));
        }

        document.add(table);

        document.add(new Paragraph(
                "\nCe document est confidentiel. Veuillez le transmettre au RCM de manière sécurisée.")
                .setFontSize(8)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(20));

        document.close();
        return out.toByteArray();
    }

    private Cell cell(String value, DeviceRgb bg) {
        return new Cell()
                .add(new Paragraph(value != null ? value : "").setFontSize(9))
                .setBackgroundColor(bg)
                .setPadding(5);
    }
}
