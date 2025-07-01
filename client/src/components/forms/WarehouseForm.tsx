import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWarehouseSchema, type Warehouse } from "@shared/schema";
import { z } from "zod";

type WarehouseFormData = z.infer<typeof insertWarehouseSchema>;

interface WarehouseFormProps {
  onSuccess?: () => void;
}

const costCenterFormSchema = z.object({
  costCenter: z.string().min(1, "Centro de costos es requerido"),
  location: z.string().optional(),
});

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

export default function WarehouseForm({ onSuccess }: WarehouseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingCostCenter, setIsCreatingCostCenter] = useState(false);

  // Obtener lista de bodegas para la selección de bodega padre
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(insertWarehouseSchema),
    defaultValues: {
      name: "",
      location: "",
      costCenter: "",
      parentWarehouseId: undefined,
      warehouseType: "sub",
      isActive: true,
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseFormData) => {
      const response = await apiRequest("POST", "/api/warehouses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Bodega creada",
        description: "La bodega se ha creado exitosamente.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la bodega. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WarehouseFormData) => {
    createWarehouseMutation.mutate(data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nueva Bodega</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Bodega</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Bodega Central" {...field} />
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
                <FormLabel>Ubicación</FormLabel>
                <FormControl>
                  <Textarea placeholder="Dirección de la bodega" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costCenter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Costos</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el centro de costos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRINCIPAL">PRINCIPAL</SelectItem>
                      <SelectItem value="UM2">UM2</SelectItem>
                      <SelectItem value="PLATAFORMA">PLATAFORMA</SelectItem>
                      <SelectItem value="PEM">PEM</SelectItem>
                      <SelectItem value="INTEGRADOR">INTEGRADOR</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="warehouseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Bodega</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Bodega Principal</SelectItem>
                      <SelectItem value="sub">Sub-bodega</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bodega Padre (opcional)</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    value={field.value?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona bodega padre" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter(w => w.warehouseType === 'main').map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess?.()}
              disabled={createWarehouseMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createWarehouseMutation.isPending}
            >
              {createWarehouseMutation.isPending ? "Creando..." : "Crear Bodega"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
