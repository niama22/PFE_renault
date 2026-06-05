package com.optiflow.responsable.cancellation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfGeneratorService {

    private static final DeviceRgb HEADER_COLOR = new DeviceRgb(31, 41, 55);
    private static final DeviceRgb ACCENT_COLOR  = new DeviceRgb(220, 38, 38);
    private static final DeviceRgb LIGHT_GRAY    = new DeviceRgb(243, 244, 246);

    private final ObjectMapper objectMapper;

    public byte[] generateCancellationDocument(CancellationRecord record) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);
            doc.setMargins(40, 40, 40, 40);

            String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            // ── Header ────────────────────────────────────────────────────────
            Table header = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .useAllAvailableWidth();
            Cell titleCell = new Cell()
                .add(new Paragraph("DOCUMENT D'ANNULATION DE COMMANDE")
                    .setFontSize(16).setBold().setFontColor(ColorConstants.WHITE))
                .add(new Paragraph("OptiFlow Logistics")
                    .setFontSize(10).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(HEADER_COLOR).setPadding(14).setBorder(null);
            Cell dateCell = new Cell()
                .add(new Paragraph("Date d'émission").setFontSize(8)
                    .setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph(now).setFontSize(10).setBold()
                    .setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Réf: ANN-" + record.getId().toString().substring(0, 8).toUpperCase())
                    .setFontSize(8).setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.RIGHT))
                .setBackgroundColor(ACCENT_COLOR).setPadding(14).setBorder(null);
            header.addCell(titleCell).addCell(dateCell);
            doc.add(header);
            doc.add(new Paragraph("\n"));

            // ── Statut ────────────────────────────────────────────────────────
            doc.add(new Paragraph("ANNULATION APPROUVÉE")
                .setFontSize(12).setBold().setFontColor(ACCENT_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ACCENT_COLOR, 1))
                .setPadding(8).setBackgroundColor(new DeviceRgb(254, 242, 242)));
            doc.add(new Paragraph("\n"));

            // ── Commande ──────────────────────────────────────────────────────
            addSection(doc, "INFORMATIONS COMMANDE");
            Table orderTable = twoColTable();
            addRow(orderTable, "Numéro de commande", record.getOrderNumber() != null ? record.getOrderNumber() : "—");
            addRow(orderTable, "ID Commande", record.getOrderId().toString());
            addRow(orderTable, "Motif d'annulation", record.getReason() != null ? record.getReason() : "—");
            addRow(orderTable, "Validé par responsable", record.getResponsableId() != null ? record.getResponsableId() : "—");
            addRow(orderTable, "Transmis par opérateur", record.getOperateurId() != null ? record.getOperateurId() : "—");
            doc.add(orderTable);
            doc.add(new Paragraph("\n"));

            // ── Client ────────────────────────────────────────────────────────
            addSection(doc, "INFORMATIONS CLIENT");
            Table clientTable = twoColTable();
            addRow(clientTable, "Code client", record.getClientCode() != null ? record.getClientCode() : "—");
            addRow(clientTable, "Nom / Société", buildClientName(record));
            addRow(clientTable, "Adresse de livraison", formatAddress(record.getDeliveryAddressJson()));
            doc.add(clientTable);
            doc.add(new Paragraph("\n"));

            // ── Véhicules annulés ─────────────────────────────────────────────
            addSection(doc, "VÉHICULES ANNULÉS");
            addVehiclesTable(doc, record.getRequestedVehiclesJson(), record.getAllVehiclesJson());
            doc.add(new Paragraph("\n"));

            // ── Pied de page ──────────────────────────────────────────────────
            doc.add(new Paragraph(
                "Ce document certifie l'annulation officielle de la commande susmentionnée. " +
                "Il est généré automatiquement par le système OptiFlow et est valable pour la facturation (RCM).")
                .setFontSize(8).setFontColor(ColorConstants.GRAY).setItalic()
                .setBorderTop(new SolidBorder(ColorConstants.LIGHT_GRAY, 1)).setPaddingTop(8));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF generation failed: {}", e.getMessage());
            return new byte[0];
        }
    }

    private void addSection(Document doc, String title) {
        doc.add(new Paragraph(title).setFontSize(10).setBold()
            .setFontColor(ColorConstants.WHITE).setBackgroundColor(HEADER_COLOR)
            .setPadding(6).setMarginBottom(0));
    }

    private Table twoColTable() {
        return new Table(UnitValue.createPercentArray(new float[]{35, 65}))
            .useAllAvailableWidth().setMarginBottom(0);
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setFontSize(9).setBold())
            .setBackgroundColor(LIGHT_GRAY).setPadding(6).setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 0.5f)));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "—").setFontSize(9))
            .setPadding(6).setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 0.5f)));
    }

    private void addVehiclesTable(Document doc, String requestedJson, String allJson) {
        try {
            String json = requestedJson != null ? requestedJson : allJson;
            if (json == null) { doc.add(new Paragraph("—").setFontSize(9)); return; }
            JsonNode arr = objectMapper.readTree(json);
            if (!arr.isArray() || arr.size() == 0) { doc.add(new Paragraph("—").setFontSize(9)); return; }

            Table t = new Table(UnitValue.createPercentArray(new float[]{10, 35, 30, 25}))
                .useAllAvailableWidth();
            for (String h : new String[]{"#", "Châssis", "Modèle", "Type"}) {
                t.addHeaderCell(new Cell().add(new Paragraph(h).setFontSize(9).setBold())
                    .setBackgroundColor(HEADER_COLOR).setFontColor(ColorConstants.WHITE).setPadding(5)
                    .setBorder(null));
            }
            int i = 1;
            for (JsonNode v : arr) {
                boolean odd = i % 2 == 0;
                DeviceRgb bg = odd ? LIGHT_GRAY : new DeviceRgb(255, 255, 255);
                String chassis = getField(v, "chassisId", "—");
                // Mask middle part: AB***XY
                if (chassis.length() > 4) {
                    chassis = chassis.substring(0, 2) + "***" + chassis.substring(chassis.length() - 2);
                }
                t.addCell(cell(String.valueOf(i++), bg));
                t.addCell(cell(chassis, bg));
                t.addCell(cell(getField(v, "vehicleModelLabel", getField(v, "vehicleType", "—")), bg));
                t.addCell(cell(getField(v, "vehicleType", "—"), bg));
            }
            doc.add(t);
        } catch (Exception e) {
            doc.add(new Paragraph("Erreur lecture véhicules").setFontSize(9));
        }
    }

    private Cell cell(String text, DeviceRgb bg) {
        return new Cell().add(new Paragraph(text).setFontSize(9))
            .setBackgroundColor(bg).setPadding(5)
            .setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 0.5f));
    }

    private String getField(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) return node.get(key).asText();
        }
        return "—";
    }

    private String buildClientName(CancellationRecord r) {
        String name = r.getClientName() != null ? r.getClientName() : "";
        String company = r.getClientCompany() != null ? r.getClientCompany() : "";
        if (!company.isEmpty() && !name.isEmpty()) return name + " — " + company;
        return !company.isEmpty() ? company : !name.isEmpty() ? name : "—";
    }

    private String formatAddress(String json) {
        if (json == null) return "—";
        try {
            JsonNode node = objectMapper.readTree(json);
            StringBuilder sb = new StringBuilder();
            for (String f : new String[]{"street", "city", "postalCode", "country"}) {
                if (node.has(f) && !node.get(f).asText().isBlank())
                    sb.append(node.get(f).asText()).append(", ");
            }
            String s = sb.toString();
            return s.endsWith(", ") ? s.substring(0, s.length() - 2) : s;
        } catch (Exception e) { return json; }
    }
}
