import { useLocation as useLocationCtx } from '../contexts/LocationContext';

export const useLocation = () => {
  return useLocationCtx();
};
