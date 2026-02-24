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
    // 如果后端返回了标准的错误结构，直接将 response 抛出，方便上层捕获
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  },
);

export default request;
