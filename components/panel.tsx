import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Panel({ title, description, action, className, children }: { title: string; description?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("gap-4 [--card-spacing:--spacing(5.5)]", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
