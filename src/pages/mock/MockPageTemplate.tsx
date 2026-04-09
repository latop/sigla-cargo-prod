import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Download, Filter, MoreHorizontal, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePageTitle } from "@/hooks/use-page-title";

interface StatCard {
  label: string;
  value: string | number;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  icon: React.ComponentType<{ className?: string }>;
}

interface Column {
  key: string;
  label: string;
}

interface MockPageProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  stats: StatCard[];
  columns: Column[];
  data: Record<string, React.ReactNode>[];
  statusField?: string;
  statusMap?: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
}

export function MockPage({ title, icon, stats, columns, data, statusField, statusMap }: MockPageProps) {
  usePageTitle(title, icon);
  const [search, setSearch] = useState("");

  const filtered = data.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      {/* Mock data banner */}
      <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        Dados simulados — pendente integração
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 opacity-60">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{s.value}</span>
                  {s.badge && (
                    <Badge variant={s.badge.variant} className="text-[10px] px-1.5 py-0">
                      {s.badge.text}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="opacity-60">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" /> Filtros
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className="text-xs font-semibold">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, i) => (
                <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="text-sm py-2.5">
                      {statusField && col.key === statusField && statusMap
                        ? (() => {
                            const val = String(row[col.key]);
                            const mapped = statusMap[val];
                            return mapped ? (
                              <Badge variant={mapped.variant} className="text-xs">
                                {mapped.label}
                              </Badge>
                            ) : row[col.key];
                          })()
                        : row[col.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-3 text-xs text-muted-foreground border-t">
            {filtered.length} registro(s) encontrado(s)
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
