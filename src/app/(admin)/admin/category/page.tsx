"use client";

import { useEffect } from 'react';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/contexts/DictionaryContext';
import {
  CATEGORY_BUSINESS_DOMAIN_DICT_CODE,
  getCategoryBusinessDomainPath,
  getDefaultCategoryBusinessDomain,
} from '@/features/category/businessDomains';

export default function AdminCategoryIndexPage() {
  const router = useRouter();
  const { ensureBatch, getEntries } = useDictionary();

  useEffect(() => {
    void ensureBatch([CATEGORY_BUSINESS_DOMAIN_DICT_CODE]);
  }, [ensureBatch]);

  const businessDomainEntries = getEntries(CATEGORY_BUSINESS_DOMAIN_DICT_CODE);
  const defaultBusinessDomain = getDefaultCategoryBusinessDomain(businessDomainEntries);

  useEffect(() => {
    if (defaultBusinessDomain) {
      router.replace(getCategoryBusinessDomainPath(defaultBusinessDomain.code));
    }
  }, [defaultBusinessDomain, router]);

  return (
    <div style={{ height: 'calc(100vh - 163px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin description="正在加载业务领域..." />
    </div>
  );
}