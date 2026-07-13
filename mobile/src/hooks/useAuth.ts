import { useAuth as useAuthCtx } from '../contexts/AuthContext';

export const useAuth = () => {
  return useAuthCtx();
};
