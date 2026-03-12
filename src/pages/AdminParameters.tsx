import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Settings, Loader2, Upload, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = "https://apicarga.azurewebsites.net";

interface AppParameter {
  id?: number;
  key?: string;
  value?: string;
  description?: string;
  [k: string]: unknown;
}

const fetchParameters = async (): Promise<AppParameter[]> => {
  const res = await fetch(`${API_BASE}/AppParameter`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const AdminParameters = () => {
  const { t, i18n } = useTranslation();
  const [searched, setSearched] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = i18n.language as "pt" | "en" | "es";

  const titles: Record<string, string> = {
    pt: "Parâmetros do Administrador",
    en: "Admin Parameters",
    es: "Parámetros del Administrador",
  };

  const logoLabels: Record<string, { title: string; desc: string; btn: string; remove: string }> = {
    pt: { title: "Logotipo do Cliente", desc: "Faça upload do logotipo que será exibido no sistema", btn: "Selecionar imagem", remove: "Remover" },
    en: { title: "Client Logo", desc: "Upload the logo to be displayed in the system", btn: "Select image", remove: "Remove" },
    es: { title: "Logotipo del Cliente", desc: "Suba el logotipo que se mostrará en el sistema", btn: "Seleccionar imagen", remove: "Eliminar" },
  };

  const { data, isLoading, isError, error, refetch } = useQuery<AppParameter[]>({
    queryKey: ["admin-parameters"],
    queryFn: fetchParameters,
    enabled: searched,
  });

  const handleSearch = () => {
    setSearched(true);
    refetch();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const columns = data && data.length > 0
    ? Object.keys(data[0]).filter((k) => typeof data[0][k] !== "object")
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">
          {titles[lang]}
        </h1>
      </div>

      {/* Logo upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {logoLabels[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{logoLabels[lang].desc}</p>
          <div className="flex items-center gap-6">
            <div className="w-48 h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Client Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-40" />
                  <span className="text-xs">Logo</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoLabels[lang].btn}
              </Button>
              {logoPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  {logoLabels[lang].remove}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.search")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("common.search") + "..."} className="pl-10" />
            </div>
            <Button onClick={handleSearch}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.filter")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {isError && (
                <p className="text-sm text-destructive">
                  {(error as Error)?.message || "Erro ao carregar dados."}
                </p>
              )}
              {data && data.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
              )}
              {data && data.length > 0 && (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="capitalize whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col} className="whitespace-nowrap">
                              {String(row[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AdminParameters;
