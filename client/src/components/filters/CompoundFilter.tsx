import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X, ChevronDown, ChevronUp, Search } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "daterange";
  options?: FilterOption[];
  placeholder?: string;
  advanced?: boolean; // true = goes in row 2 (collapsible)
  colSpan?: number; // default 1
  // For daterange: renders two date inputs (key becomes keyDesde/keyHasta)
  labelDesde?: string;
  labelHasta?: string;
}

interface CompoundFilterProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  activeCount: number;
}

export default function CompoundFilter({
  fields,
  values,
  onChange,
  onClear,
  showAdvanced,
  onToggleAdvanced,
  activeCount,
}: CompoundFilterProps) {
  const mainFields = fields.filter(f => !f.advanced);
  const advancedFields = fields.filter(f => f.advanced);

  const renderField = (field: FilterField) => {
    const colClass = field.colSpan === 2 ? "md:col-span-2" : "";

    if (field.type === "text") {
      return (
        <div key={field.key} className={colClass}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={field.placeholder || field.label}
              value={values[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key} className={colClass}>
          <Select value={values[field.key] || "all"} onValueChange={(v) => onChange(field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || field.label} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <div key={field.key} className={colClass}>
          <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
          <Input
            type="date"
            value={values[field.key] || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      );
    }

    if (field.type === "daterange") {
      const desdeKey = `${field.key}Desde`;
      const hastaKey = `${field.key}Hasta`;
      return (
        <React.Fragment key={field.key}>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{field.labelDesde || `${field.label} desde`}</label>
            <Input
              type="date"
              value={values[desdeKey] || ""}
              onChange={(e) => onChange(desdeKey, e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{field.labelHasta || `${field.label} hasta`}</label>
            <Input
              type="date"
              value={values[hastaKey] || ""}
              onChange={(e) => onChange(hastaKey, e.target.value)}
            />
          </div>
        </React.Fragment>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Row 1 -- Main filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {mainFields.map(renderField)}
          {/* Buttons */}
          <div className="flex items-center gap-2 justify-end">
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
            {advancedFields.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleAdvanced}
                className="whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-1" />
                {showAdvanced ? "Menos filtros" : "Mas filtros"}
                {activeCount > 0 && (
                  <Badge variant="default" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                    {activeCount}
                  </Badge>
                )}
                {showAdvanced ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
            )}
          </div>
        </div>

        {/* Row 2 -- Advanced filters (collapsible) */}
        {advancedFields.length > 0 && (
          <div
            className={`grid grid-cols-1 md:grid-cols-6 gap-4 overflow-hidden transition-all duration-300 ${
              showAdvanced ? "mt-4 max-h-[200px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {advancedFields.map(renderField)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
