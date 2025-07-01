import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconClassName?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconClassName = "text-primary" 
}: MetricCardProps) {
  return (
    <Card className="metric-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            iconClassName.includes('text-primary') ? 'bg-primary/10' :
            iconClassName.includes('text-green') ? 'bg-green-100 dark:bg-green-900/20' :
            iconClassName.includes('text-red') ? 'bg-red-100 dark:bg-red-900/20' :
            iconClassName.includes('text-purple') ? 'bg-purple-100 dark:bg-purple-900/20' :
            'bg-muted'
          }`}>
            <Icon className={`w-6 h-6 ${iconClassName}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
