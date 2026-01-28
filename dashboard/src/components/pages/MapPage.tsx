import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { LiveMap } from '../LiveMap';

interface MapPageProps {
  currentPath: string;
  lang?: string;
}

export function MapPage({ currentPath, lang }: MapPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.liveMap')} currentPath={currentPath} lang={lang as SupportedLang}>
      <LiveMap fullHeight />
    </AppLayout>
  );
}
