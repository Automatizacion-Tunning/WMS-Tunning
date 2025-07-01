import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertInventoryMovementSchema } from "@shared/schema";
import { z } from "zod";
import type { InventoryMovementWithDetails } from "@shared/schema";

const movementFormSchema = insertInventoryMovementSchema.extend({
  productId: z.number().min(1, "Selecciona un producto"),
  warehouseId: z.number().min(1, "Selecciona una bodega"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
});

type MovementFormData = z.infer<typeof movementFormSchema>;

export default function ProductMovements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["/api/inventory-movements"],
  });

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      productId: 0,
      warehouseId: 0,
      movementType: "in",
      quantity: 1,
      reason: "",
      userId: 1, // TODO: Get from auth context
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      const response = await apiRequest("POST", "/api/inventory-movements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha registrado exitosamente.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MovementFormData) => {
    createMovementMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movimientos de Productos</h1>
        <p className="text-muted-foreground">Registra entradas y salidas de inventario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products?.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bodega</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar bodega" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses?.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="movementType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Movimiento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in">Entrada</SelectItem>
                            <SelectItem value="out">Salida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descripción del movimiento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMovementMutation.isPending || productsLoading || warehousesLoading}
                  >
                    {createMovementMutation.isPending ? "Registrando..." : "Registrar Movimiento"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Movement History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements?.map((movement: InventoryMovementWithDetails) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{movement.product.name}</p>
                                <p className="text-xs text-muted-foreground">{movement.product.sku}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.warehouse.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={movement.movementType === "in" ? "default" : "destructive"}
                              className="gap-1"
                            >
                              {movement.movementType === "in" ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {movement.movementType === "in" ? "Entrada" : "Salida"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.quantity} unidades
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reason || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
