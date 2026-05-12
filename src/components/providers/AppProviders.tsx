"use client";

import React from "react";
import { App as AntdApp } from 'antd';
import { DictionaryProvider } from "@/contexts/DictionaryContext";
import { GlobalLoadingProvider } from '@/components/providers/GlobalLoadingProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoadingProvider>
      <AntdApp component="div">
        <DictionaryProvider initialScenes={["category-admin"]}>{children}</DictionaryProvider>
      </AntdApp>
    </GlobalLoadingProvider>
  );
}
