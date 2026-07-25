"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ChevronDown, Download, FileText, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ExportColumn<TData> = {
  header: string;
  key: keyof TData;
};

type MoreActionsProps<TData extends Record<string, unknown>> = {
  columns: ExportColumn<TData>[];
  data: TData[];
  filename: string;
  title: string;
};

export function MoreActions<TData extends Record<string, unknown>>({
  columns,
  data,
  filename,
  title,
}: MoreActionsProps<TData>) {
  const headers = columns.map((column) => column.header);

  function handleExportCsv() {
    const rows = [
      headers,
      ...data.map((row) => columns.map((column) => formatExportValue(row[column.key]))),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPdf() {
    const document = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    document.setFontSize(14);
    document.text(title, 40, 40);
    autoTable(document, {
      head: [headers],
      body: data.map((row) =>
        columns.map((column) => formatExportValue(row[column.key])),
      ),
      margin: { left: 40, right: 40, top: 56 },
      styles: {
        cellPadding: 6,
        fontSize: 8,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [17, 17, 17],
        textColor: [255, 255, 255],
      },
    });
    document.save(`${filename}.pdf`);
  }

  async function handlePrint() {
    const { default: printJS } = await import("print-js");

    printJS({
      printable: data.map((row) =>
        Object.fromEntries(
          columns.map((column) => [
            String(column.key),
            formatExportValue(row[column.key]),
          ]),
        ),
      ),
      properties: columns.map((column) => ({
        field: String(column.key),
        displayName: column.header,
      })),
      type: "json",
      header: title,
      gridHeaderStyle:
        "font-weight: 700; border: 1px solid #d4d4d8; padding: 8px; text-align: left;",
      gridStyle:
        "border: 1px solid #d4d4d8; padding: 8px; font-size: 12px;",
      style:
        "h1 { font-family: Arial, sans-serif; font-size: 18px; margin-bottom: 16px; } table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }",
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="px-0!">
          <span className="flex h-full items-center gap-2 px-2">
            More actions
          </span>
          <span className="flex h-full items-center border-l px-2">
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 gap-0! p-0!">
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs hover:bg-zinc-100"
          onClick={() => void handleExportPdf()}
        >
          <FileText className="size-3.5" />
          Export as PDF
        </button>
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs hover:bg-zinc-100"
          onClick={handleExportCsv}
        >
          <Download className="size-3.5" />
          Export as CSV
        </button>
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs hover:bg-zinc-100"
          onClick={handlePrint}
        >
          <Printer className="size-3.5" />
          Print
        </button>
      </PopoverContent>
    </Popover>
  );
}

function formatExportValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "--";
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  const trimmed = String(value ?? "").trim();

  return trimmed ? trimmed : "--";
}
