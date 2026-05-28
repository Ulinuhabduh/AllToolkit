import { Hourglass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ComingSoon({ note }: { note?: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Hourglass className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {note ?? 'This feature is under development. The platform scaffold is ready; the engine integration will be added in a future release.'}
        </p>
      </CardContent>
    </Card>
  );
}
