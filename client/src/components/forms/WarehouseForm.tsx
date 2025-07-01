import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWarehouseSchema } from "@shared/schema";
import { z } from "zod";

type WarehouseFormData = z.infer<typeof insertWarehouseSchema>;

interface WarehouseFormProps {
  onSuccess?: () => void;
}

export default function WarehouseForm({ onSuccess }: WarehouseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(insertWarehouseSchema),
    defaultValues: {
      name: "",
      location: "",
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
                  <Textarea placeholder="Dirección de la bodega" {...field} />
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
