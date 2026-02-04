import { createContext, useContext, useState, type ReactNode } from 'react';

interface PageTitleContextType {
  dynamicTitle: string;
  setDynamicTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [dynamicTitle, setDynamicTitle] = useState('');
  
  return (
    <PageTitleContext.Provider value={{ dynamicTitle, setDynamicTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error('usePageTitle должен использоваться в PageTitleProvider');
  }
  return context;
};