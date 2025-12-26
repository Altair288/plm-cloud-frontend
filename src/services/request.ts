import axios from 'axios';
import { API_BASE_URL } from '@/config';

const baseURL = API_BASE_URL;

export const request = axios.create({
  baseURL,
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  // TODO: attach auth token
  return config;
});

request.interceptors.response.use(
  (resp) => resp.data,
  (error) => {
    // 简单错误处理，可扩展为全局消息
    return Promise.reject(error);
  },
);

export default request;
