import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, MapPin, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { Warehouse } from "@shared/schema";

const costCenterFormSchema = z.object({
  costCenter: z.string().min(1, "Centro de costos es requerido"),
  location: z.string().optional(),
});

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

export default function CostCenterManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: warehouses, isLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: {
      costCenter: "",
      location: "",
    },
  });

  const createCostCenterMutation = useMutation({
    mutationFn: async (data: CostCenterFormData) => {
      const response = await apiRequest("POST", "/api/cost-centers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Centro de costos creado",
        description: "Se han creado todas las bodegas del centro de costos exitosamente.",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el centro de costos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CostCenterFormData) => {
    createCostCenterMutation.mutate(data);
  };

  // Group warehouses by cost center
  const warehousesByCostCenter = warehouses?.reduce((acc, warehouse) => {
    const costCenter = warehouse.costCenter;
    if (!acc[costCenter]) {
      acc[costCenter] = [];
    }
    acc[costCenter].push(warehouse);
    return acc;
  }, {} as Record<string, Warehouse[]>) || {};

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Centros de Costos</h1>
          <p className="text-muted-foreground">Gestiona los centros de costos y sus bodegas</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Centro de Costos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Centro de Costos</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="costCenter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Costos</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. CC252130" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ubicación general del centro de costos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="font-medium mb-1">Se crearán automáticamente:</p>
                  <ul className="space-y-1">
                    <li>• 1 Bodega Principal</li>
                    <li>• 4 Sub-bodegas: UM2, Plataforma, PEM, Integrador</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createCostCenterMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCostCenterMutation.isPending}
                  >
                    {createCostCenterMutation.isPending ? "Creando..." : "Crear Centro de Costos"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {Object.entries(warehousesByCostCenter)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([costCenter, costCenterWarehouses]) => (
          <Card key={costCenter}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Centro de Costos: {costCenter}
                <Badge variant="outline" className="ml-2">
                  {costCenterWarehouses.length} bodegas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterWarehouses
                      .sort((a, b) => {
                        if (a.warehouseType === 'main' && b.warehouseType === 'sub') return -1;
                        if (a.warehouseType === 'sub' && b.warehouseType === 'main') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                              {warehouse.warehouseType === 'main' ? 
                                <Building2 className="w-4 h-4 text-primary" /> : 
                                <MapPin className="w-4 h-4 text-primary" />
                              }
                            </div>
                            <div>
                              <p className="font-medium">
                                {warehouse.warehouseType === 'sub' && <ChevronRight className="w-3 h-3 inline mr-1" />}
                                {warehouse.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.warehouseType === 'main' ? "default" : "secondary"}>
                            {warehouse.warehouseType === 'main' ? 'Principal' : 
                             warehouse.subWarehouseType?.toUpperCase() || 'Sub-bodega'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {warehouse.location || "No especificada"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                            {warehouse.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {Object.keys(warehousesByCostCenter).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay centros de costos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer centro de costos para comenzar a gestionar bodegas
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Centro de Costos
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}