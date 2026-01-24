import { AppLayout } from '../AppLayout';
import { LiveMap } from '../LiveMap';

interface MapPageProps {
  currentPath: string;
}

export function MapPage({ currentPath }: MapPageProps) {
  return (
    <AppLayout title="Live Map" currentPath={currentPath}>
      <LiveMap fullHeight />
    </AppLayout>
  );
}
