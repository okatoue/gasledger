import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const USE_TEST_ADS = __DEV__;

const prodUnits = {
  dashboardTop: Platform.select({
    android: 'ca-app-pub-3459755575720995/7414390191',
    ios: 'ca-app-pub-3459755575720995/2000178343',
  }) ?? '',
  dashboardBottom: Platform.select({
    android: 'ca-app-pub-3459755575720995/2162063511',
    ios: 'ca-app-pub-3459755575720995/3291312357',
  }) ?? '',
  history: Platform.select({
    android: 'ca-app-pub-3459755575720995/9766987728',
    ios: 'ca-app-pub-3459755575720995/7031246819',
  }) ?? '',
  vehicles: Platform.select({
    android: 'ca-app-pub-3459755575720995/2217903833',
    ios: 'ca-app-pub-3459755575720995/6949252697',
  }) ?? '',
};

export const adUnits = USE_TEST_ADS
  ? {
      dashboardTop: TestIds.BANNER,
      dashboardBottom: TestIds.BANNER,
      history: TestIds.BANNER,
      vehicles: TestIds.BANNER,
    }
  : prodUnits;
