import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode | LucideIcon;
  description?: string;
  trend?: 'up' | 'down';
  onClick?: () => void;
  className?: string;
}

export const StatCard = ({
  title,
  value,
  icon,
  description,
  trend,
  onClick,
  className,
}: StatCardProps) => {
  // Check if icon is a React component or JSX element
  const iconElement =
    typeof icon === 'function' ? <icon className="h-4 w-4 text-muted-foreground" /> : icon;

  return (
    <Card
      className={`border-border shadow-sm hover:shadow-md transition-shadow ${className || ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {iconElement}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};
