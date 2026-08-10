import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { listOsceStations, deleteOsceStation } from "../../lib/api/osce-api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, Edit, Trash2, Clock, Activity } from "lucide-react";

export default function OsceListPage() {
  const navigate = useNavigate();
  const studentShell = useStudentShell("/app/area-mentor");
  const queryClient = useQueryClient();

  const { data: stations, isLoading } = useQuery({
    queryKey: ["osce-stations"],
    queryFn: listOsceStations,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOsceStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-stations"] });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus stase OSCE ini?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-6 w-full py-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Daftar Stase OSCE
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola daftar stase OSCE yang tersedia untuk simulasi ujian.
            </p>
          </div>
          <Button onClick={() => navigate("/app/mentor/osce-builder")}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Stase
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !stations || stations.length === 0 ? (
          <div className="text-center p-12 bg-muted/30 rounded-2xl border border-border border-dashed">
            <h3 className="text-lg font-semibold mb-2">Belum ada stase OSCE</h3>
            <p className="text-muted-foreground mb-4">Mulai buat stase OSCE pertama Anda untuk simulasi ujian.</p>
            <Button onClick={() => navigate("/app/mentor/osce-builder")} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Buat Stase
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => (
              <Card key={station.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{station.title}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-3 mt-2">
                    <span className="flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded-md capitalize">
                      <Activity className="h-3 w-3 mr-1" /> {station.type}
                    </span>
                    <span className="flex items-center text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
                      <Clock className="h-3 w-3 mr-1" /> {station.duration_minutes} Menit
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {station.objective || "Tidak ada deskripsi objektif."}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-4 border-t mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/mentor/osce-builder?id=${station.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(station.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Hapus
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProductShell>
  );
}
